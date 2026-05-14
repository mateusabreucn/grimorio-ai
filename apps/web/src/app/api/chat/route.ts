import { streamText, generateObject, type CoreMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { searchMulti, type MultiSearchResult } from "@/lib/rag/client";
import {
  PLANNER_SYSTEM_PROMPT,
  SYNTHESIZER_FALLBACK_PROMPT,
  synthesizerPromptForIntent,
  buildRagContext,
  type ChatIntent,
} from "@/lib/ai/prompts";
import { chatRequestSchema } from "@/lib/validations/chat";
import { logChatEvent } from "@/lib/observability/logger";
import {
  setSnapshot,
  type PipelineSnapshot,
} from "@/lib/observability/snapshot-cache";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const googleAI = createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY });

// Modelo do planner — sempre Flash (decisão estrutural, não criativa)
const PLANNER_MODEL = "gemini-2.5-flash";

/**
 * Config por intent — define profundidade de busca e modelo do synthesizer.
 *
 * - **lookup**: pergunta direta sobre 1 elemento. Pipeline enxuto e Flash basta.
 * - **composition**: cálculo multi-fonte. Mais chunks + Pro (raciocínio aritmético).
 * - **recommendation**: enumerar e curar. Muito mais chunks + Pro (síntese ampla).
 */
type IntentConfig = {
  topKPerQuery: number;
  topKLexical: number;
  maxTotalResults: number;
  synthesizerModel: string;
  synthesizerMode: "lookup" | "composition" | "recommendation";
};

const INTENT_CONFIG: Record<ChatIntent, IntentConfig> = {
  lookup: {
    topKPerQuery: 8,
    topKLexical: 14,
    maxTotalResults: 24,
    synthesizerModel: "gemini-2.5-flash",
    synthesizerMode: "lookup",
  },
  composition: {
    // composition exige TODOS os componentes presentes para fechar o cálculo;
    // uma peça faltante = resposta honesta mas incompleta. Aumentamos a
    // cobertura em relação ao lookup, mas sem inundar (chunks demais em
    // tabelas multi-coluna confundem o synthesizer entre linhas/colunas).
    topKPerQuery: 12,
    topKLexical: 22,
    maxTotalResults: 44,
    synthesizerModel: "gemini-2.5-pro",
    synthesizerMode: "composition",
  },
  recommendation: {
    topKPerQuery: 12,
    topKLexical: 22,
    maxTotalResults: 64,
    synthesizerModel: "gemini-2.5-pro",
    synthesizerMode: "recommendation",
  },
};

const plannerSchema = z.object({
  needsSearch: z.boolean(),
  intent: z.enum(["lookup", "composition", "recommendation"]).default("lookup"),
  queries: z.array(z.string().min(2).max(120)).max(12),
  keywords: z.array(z.string().min(2).max(60)).max(6).default([]),
  reasoning: z.string().max(500).optional(),
});

let ratelimit: Ratelimit | null = null;
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: false,
  });
}

type SanitizedMessage = { role: "user" | "assistant"; content: string };

/**
 * Extrai apenas texto de user/assistant. Remove role:"tool" e converte
 * content-arrays (vindos de versões antigas do client com tool calling)
 * para texto simples. Garante que tudo abaixo só lida com strings.
 */
function sanitizeHistory(input: unknown[]): SanitizedMessage[] {
  const out: SanitizedMessage[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as { role?: string; content?: unknown };

    if (m.role === "user" && typeof m.content === "string") {
      out.push({ role: "user", content: m.content });
      continue;
    }

    if (m.role === "assistant") {
      if (typeof m.content === "string") {
        out.push({ role: "assistant", content: m.content });
      } else if (Array.isArray(m.content)) {
        const text = m.content
          .filter(
            (p): p is { type: "text"; text: string } =>
              !!p &&
              typeof p === "object" &&
              (p as { type?: string }).type === "text" &&
              typeof (p as { text?: unknown }).text === "string",
          )
          .map((p) => p.text)
          .join("\n");
        if (text) out.push({ role: "assistant", content: text });
      }
    }
    // role: "tool" é deliberadamente ignorado
  }
  return out;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const nowIso = () => new Date().toISOString();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten() }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages: clientMessages, conversationId, selectedBooks } = parsed.data;

  // Nenhum filtro quando todos os 4 livros estão selecionados
  const ALL_BOOK_IDS = ["core", "herois", "ameacas", "deuses"];
  const bookIdsFilter =
    selectedBooks.length === ALL_BOOK_IDS.length ? undefined : selectedBooks;

  const session = await auth();
  const userId = session?.user?.id ?? null;
  let resolvedConversationId = conversationId;

  if (ratelimit) {
    const identifier =
      userId ?? req.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await ratelimit.limit(identifier);
    if (!success) {
      return new Response("Muitas requisições. Aguarde um momento.", { status: 429 });
    }
  }

  const history = sanitizeHistory(clientMessages);
  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return new Response("Nenhuma mensagem do usuário no histórico.", { status: 400 });
  }

  // Reserva um ID para a nova conversa sem inserir no banco ainda.
  // A inserção acontece em onFinish, apenas se a IA gerar uma resposta.
  // Isso previne conversas vazias no histórico quando a IA falha.
  const pendingConversationId = userId && !conversationId
    ? crypto.randomUUID()
    : null;

  if (userId && resolvedConversationId) {
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, resolvedConversationId),
          eq(conversations.userId, userId),
        ),
      )
      .limit(1);

    if (!conversation) {
      return new Response("Conversa não encontrada", { status: 404 });
    }
  }

  if (pendingConversationId) {
    resolvedConversationId = pendingConversationId;
  }

  // ─── Step 1: PLANNER — classifica intent + gera queries + keywords ───────
  const plannerStart = Date.now();
  let queries: string[] = [];
  let keywords: string[] = [];
  let needsSearch = false;
  let intent: ChatIntent = "lookup";
  try {
    const { object: plan } = await generateObject({
      model: googleAI(PLANNER_MODEL),
      schema: plannerSchema,
      system: PLANNER_SYSTEM_PROMPT,
      messages: history as CoreMessage[],
      temperature: 0,
    });
    needsSearch = plan.needsSearch;
    intent = plan.intent;
    queries = plan.queries
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 12);
    keywords = (plan.keywords ?? [])
      .map((k) => k.trim())
      .filter((k) => k.length >= 2)
      .slice(0, 6);
  } catch (err) {
    logChatEvent({
      type: "pipeline.error",
      request_id: requestId,
      timestamp: nowIso(),
      conversation_id: resolvedConversationId ?? null,
      user_id: userId,
      stage: "planner",
      message: err instanceof Error ? err.message : String(err),
    });
    // Fallback degradado: assume lookup com a pergunta literal
    needsSearch = true;
    intent = "lookup";
    queries = [lastUserMessage.content.slice(0, 120)];
    keywords = [];
  }
  const plannerElapsed = Date.now() - plannerStart;
  logChatEvent({
    type: "planner.done",
    request_id: requestId,
    timestamp: nowIso(),
    conversation_id: resolvedConversationId ?? null,
    user_id: userId,
    needs_search: needsSearch,
    intent,
    queries,
    keywords,
    elapsed_ms: plannerElapsed,
  });

  const config = INTENT_CONFIG[intent];

  // ─── Step 2: Busca híbrida com retorno estruturado ───────────────────────
  let ragResult: MultiSearchResult = {
    chunks: [],
    attempts: 0,
    elapsedMs: 0,
  };
  if (needsSearch && queries.length > 0) {
    ragResult = await searchMulti(queries, {
      keywords,
      topKPerQuery: config.topKPerQuery,
      topKLexical: config.topKLexical,
      maxTotalResults: config.maxTotalResults,
      bookIds: bookIdsFilter,
    });
  }
  logChatEvent({
    type: "rag.done",
    request_id: requestId,
    timestamp: nowIso(),
    conversation_id: resolvedConversationId ?? null,
    user_id: userId,
    chunk_count: ragResult.chunks.length,
    top_chunks: ragResult.chunks.slice(0, 5).map((c) => ({
      book_id: c.book_id,
      page: c.page_number,
      score: Number(c.similarity_score.toFixed(3)),
    })),
    error_type: ragResult.error,
    attempts: ragResult.attempts,
    elapsed_ms: ragResult.elapsedMs,
  });

  const ragFailed = needsSearch && ragResult.error !== undefined;

  // ─── Step 3: SYNTHESIZER — prompt e modelo dependem do intent ─────────────
  const synthesizerSystem = ragFailed
    ? SYNTHESIZER_FALLBACK_PROMPT
    : synthesizerPromptForIntent(intent);
  const synthesizerModel = ragFailed ? "gemini-2.5-flash" : config.synthesizerModel;
  const synthesizerMode: PipelineSnapshot["synthesizer"]["mode"] = ragFailed
    ? "fallback"
    : config.synthesizerMode;

  const synthesizerMessages: CoreMessage[] = history.map((m, i) => {
    const isLast = i === history.length - 1;
    if (isLast && m.role === "user" && needsSearch && !ragFailed) {
      return {
        role: "user",
        content: `${m.content}\n\n${buildRagContext(ragResult.chunks)}`,
      };
    }
    return m as CoreMessage;
  });

  const synthesizerStart = Date.now();

  const result = await streamText({
    model: googleAI(synthesizerModel),
    system: synthesizerSystem,
    messages: synthesizerMessages,
    temperature: 0,
    onFinish: async ({ text }) => {
      const synthesizerElapsed = Date.now() - synthesizerStart;
      const answerPreview = text.slice(0, 200);

      logChatEvent({
        type: "synthesizer.done",
        request_id: requestId,
        timestamp: nowIso(),
        conversation_id: resolvedConversationId ?? null,
        user_id: userId,
        assistant_message_id: assistantMessageId,
        intent,
        model: synthesizerModel,
        answer_preview: answerPreview,
        used_fallback: ragFailed,
        elapsed_ms: synthesizerElapsed,
      });

      if (userId && resolvedConversationId && text.trim().length > 0) {
        const snapshot: PipelineSnapshot = {
          question: lastUserMessage.content,
          needs_search: needsSearch,
          intent,
          queries,
          keywords,
          rag: {
            chunk_count: ragResult.chunks.length,
            top_chunks: ragResult.chunks.slice(0, 10).map((c) => ({
              book_id: c.book_id,
              book_title: c.book_title,
              page: c.page_number,
              score: Number(c.similarity_score.toFixed(3)),
              preview: c.content.slice(0, 240).replace(/\n/g, " "),
            })),
            error_type: ragResult.error,
            attempts: ragResult.attempts,
            elapsed_ms: ragResult.elapsedMs,
          },
          synthesizer: {
            used_fallback: ragFailed,
            mode: synthesizerMode,
            answer_preview: answerPreview,
            elapsed_ms: synthesizerElapsed,
          },
          model: synthesizerModel,
          created_at: nowIso(),
        };
        setSnapshot(assistantMessageId, snapshot);

        try {
          // Se for conversa nova, cria agora (após IA responder com sucesso).
          // Isso evita conversas vazias no histórico quando a IA falha.
          if (pendingConversationId) {
            const title = lastUserMessage.content.slice(0, 60);
            await db
              .insert(conversations)
              .values({ id: pendingConversationId, userId, title });
          }

          await db.insert(messages).values([
            {
              conversationId: resolvedConversationId,
              role: "user",
              content: lastUserMessage.content,
            },
            {
              id: assistantMessageId,
              conversationId: resolvedConversationId,
              role: "assistant",
              content: text,
            },
          ]);

          await db
            .update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, resolvedConversationId));
        } catch (err) {
          logChatEvent({
            type: "pipeline.error",
            request_id: requestId,
            timestamp: nowIso(),
            conversation_id: resolvedConversationId,
            user_id: userId,
            stage: "persist",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    },
  });

  const responseHeaders: Record<string, string> = {};
  if (resolvedConversationId) {
    responseHeaders["x-conversation-id"] = resolvedConversationId;
  }
  if (userId) {
    responseHeaders["x-assistant-message-id"] = assistantMessageId;
  }

  return result.toDataStreamResponse({
    headers: Object.keys(responseHeaders).length > 0 ? responseHeaders : undefined,
  });
}
