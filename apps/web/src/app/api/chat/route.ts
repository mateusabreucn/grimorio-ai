import { streamText, tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { searchChunks } from "@/lib/rag/client";
import { GRIMORIO_SYSTEM_PROMPT, buildRagContext } from "@/lib/ai/prompts";
import { chatRequestSchema } from "@/lib/validations/chat";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const googleAI = createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY });

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

export async function POST(req: Request) {
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

  const { messages: clientMessages, conversationId } = parsed.data;

  if (ratelimit) {
    const session = await auth();
    const identifier =
      session?.user?.id ?? req.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await ratelimit.limit(identifier);
    if (!success) {
      return new Response("Muitas requisições. Aguarde um momento.", { status: 429 });
    }
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const lastUserMessage = [...clientMessages].reverse().find((m) => m.role === "user");

  const result = await streamText({
    model: googleAI("gemini-2.5-flash"),
    system: GRIMORIO_SYSTEM_PROMPT,
    messages: clientMessages,
    maxSteps: 5,
    tools: {
      buscar_livros: tool({
        description:
          "Busca trechos relevantes nos livros de RPG. " +
          "Para perguntas abrangentes, faça múltiplas buscas com termos diferentes.",
        parameters: z.object({
          query: z.string().describe("Termos de busca específicos e objetivos"),
        }),
        execute: async ({ query }) => {
          try {
            const chunks = await searchChunks(query, 8);
            return { resultado: buildRagContext(chunks) };
          } catch {
            return { resultado: "Não foi possível buscar nos livros agora." };
          }
        },
      }),
    },
    onFinish: async ({ text }) => {
      if (!userId || !lastUserMessage) return;
      try {
        let convId = conversationId;

        if (!convId) {
          const title = lastUserMessage.content.slice(0, 60);
          const [newConv] = await db
            .insert(conversations)
            .values({ userId, title })
            .returning({ id: conversations.id });
          convId = newConv.id;
        }

        await db.insert(messages).values([
          { conversationId: convId, role: "user", content: lastUserMessage.content },
          { conversationId: convId, role: "assistant", content: text },
        ]);

        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, convId));
      } catch (err) {
        console.error("[chat] Erro ao salvar:", err);
      }
    },
  });

  return result.toDataStreamResponse();
}
