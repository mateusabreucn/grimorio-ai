import { and, eq } from "drizzle-orm"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { auth } from "@/lib/auth"
import { env } from "@/lib/env"
import { db } from "@/lib/db"
import { conversations, messageFeedback, messages } from "@/lib/db/schema"
import { feedbackBodySchema } from "@/lib/validations/feedback"
import { getSnapshot } from "@/lib/observability/snapshot-cache"
import { logChatEvent } from "@/lib/observability/logger"

let ratelimit: Ratelimit | null = null
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: false,
    prefix: "ratelimit:feedback",
  })
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return new Response("Não autenticado", { status: 401 })
  }

  if (ratelimit) {
    const { success } = await ratelimit.limit(`feedback:${userId}`)
    if (!success) {
      return new Response("Muitas requisições. Aguarde um momento.", { status: 429 })
    }
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response("JSON inválido", { status: 400 })
  }

  const parsed = feedbackBodySchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten() }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    )
  }

  const { messageId, vote, comment } = parsed.data

  // Verifica que a mensagem existe, é do assistant, e pertence a uma conversa do usuário.
  const [target] = await db
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.role, "assistant"),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1)

  if (!target) {
    return new Response("Mensagem não encontrada", { status: 404 })
  }

  const snapshot = getSnapshot(messageId)

  try {
    const inserted = await db
      .insert(messageFeedback)
      .values({
        messageId,
        userId,
        vote,
        comment: comment ?? null,
        pipelineSnapshot: snapshot,
      })
      .onConflictDoUpdate({
        target: [messageFeedback.messageId, messageFeedback.userId],
        set: {
          vote,
          comment: comment ?? null,
          pipelineSnapshot: snapshot,
          createdAt: new Date(),
        },
      })
      .returning({ id: messageFeedback.id, createdAt: messageFeedback.createdAt })

    const isNew =
      inserted[0]?.createdAt instanceof Date &&
      Date.now() - inserted[0].createdAt.getTime() < 5_000

    return new Response(JSON.stringify({ ok: true }), {
      status: isNew ? 201 : 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    logChatEvent({
      type: "pipeline.error",
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      conversation_id: null,
      user_id: userId,
      stage: "feedback_persist",
      message: err instanceof Error ? err.message : String(err),
    })
    return new Response("Erro ao registrar feedback", { status: 500 })
  }
}
