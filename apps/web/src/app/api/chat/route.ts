/**
 * POST /api/chat
 *
 * Endpoint principal do chat com streaming.
 * Fluxo (definido em PHASES.md):
 *  1. Valida request (Zod)
 *  2. Verifica rate limit
 *  3. Chama RAG service para buscar chunks relevantes
 *  4. Monta prompt: system + chunks + mensagens do cliente
 *  5. Chama Gemini 2.5 Flash com streaming
 *  6. Ao finalizar: salva mensagens no banco (usuários logados)
 *  7. Envia conversationId ao cliente via StreamData
 */

import { streamText, StreamData } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { auth } from "@/lib/auth"
import { env } from "@/lib/env"
import { db } from "@/lib/db"
import { conversations, messages } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { searchChunks } from "@/lib/rag/client"
import { buildSystemPromptWithContext } from "@/lib/ai/prompts"
import { chatRequestSchema } from "@/lib/validations/chat"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const googleAI = createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY })

// Rate limiter: 10 req/min por IP ou user_id
// Inicializado apenas se as vars Upstash estiverem configuradas
let ratelimit: Ratelimit | null = null
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: false,
  })
}

export async function POST(req: Request) {
  // 1. Validar request
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response("JSON inválido", { status: 400 })
  }

  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten() }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    )
  }

  const { messages: clientMessages, conversationId } = parsed.data

  // 2. Rate limit
  if (ratelimit) {
    const session = await auth()
    const identifier = session?.user?.id ?? req.headers.get("x-forwarded-for") ?? "anonymous"
    const { success } = await ratelimit.limit(identifier)
    if (!success) {
      return new Response("Muitas requisições. Aguarde um momento.", { status: 429 })
    }
  }

  // 3. Auth
  const session = await auth()
  const userId = session?.user?.id ?? null

  // 4. Buscar chunks no RAG com a última mensagem do usuário
  const lastUserMessage = [...clientMessages].reverse().find((m) => m.role === "user")
  const ragChunks = lastUserMessage
    ? await searchChunks(lastUserMessage.content, 5)
    : []

  // StreamData para enviar conversationId ao cliente após salvar
  const streamData = new StreamData()

  // 5. Stream com Gemini 2.5 Flash
  const result = await streamText({
    model: googleAI("gemini-2.5-flash-preview-04-17"),
    system: buildSystemPromptWithContext(ragChunks),
    messages: clientMessages,
    onFinish: async ({ text }) => {
      // 6. Salvar no banco apenas para usuários logados
      if (userId && lastUserMessage) {
        try {
          let convId = conversationId

          // Criar conversa se não existir
          if (!convId) {
            const title = lastUserMessage.content.slice(0, 60)
            const [newConv] = await db
              .insert(conversations)
              .values({ userId, title })
              .returning({ id: conversations.id })
            convId = newConv.id
          }

          await db.insert(messages).values([
            { conversationId: convId, role: "user", content: lastUserMessage.content },
            { conversationId: convId, role: "assistant", content: text },
          ])

          await db
            .update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, convId))

          // 7. Enviar o ID da conversa ao cliente para redirecionamento
          streamData.append({ conversationId: convId })
        } catch (err) {
          console.error("[chat] Erro ao salvar mensagens:", err)
        }
      }

      streamData.close()
    },
  })

  return result.toAIStreamResponse({ data: streamData })
}
