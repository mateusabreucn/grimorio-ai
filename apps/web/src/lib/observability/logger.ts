/**
 * Logger estruturado JSON-line para o pipeline do chat.
 *
 * Cada chamada emite uma linha JSON em stdout, ingerível por Vercel/Datadog/etc.
 * Não usa libs externas — apenas console.log + JSON.stringify.
 */

export interface ChatEventBase {
  type: string
  request_id: string
  timestamp: string
  conversation_id?: string | null
  user_id?: string | null
}

export interface PlannerDoneEvent extends ChatEventBase {
  type: "planner.done"
  needs_search: boolean
  intent: "lookup" | "composition" | "recommendation"
  queries: string[]
  keywords: string[]
  elapsed_ms: number
}

export interface RagTopChunkRef {
  book_id: string
  page: number | null
  score: number
}

export interface RagDoneEvent extends ChatEventBase {
  type: "rag.done"
  chunk_count: number
  top_chunks: RagTopChunkRef[]
  error_type?: "timeout" | "http_5xx" | "http_4xx" | "network"
  attempts: number
  elapsed_ms: number
}

export interface SynthesizerDoneEvent extends ChatEventBase {
  type: "synthesizer.done"
  assistant_message_id: string
  intent: "lookup" | "composition" | "recommendation"
  model: string
  answer_preview: string
  used_fallback: boolean
  elapsed_ms: number
}

export interface PipelineErrorEvent extends ChatEventBase {
  type: "pipeline.error"
  stage: "planner" | "rag" | "synthesizer" | "persist" | "feedback_persist"
  message: string
}

export type ChatEvent =
  | PlannerDoneEvent
  | RagDoneEvent
  | SynthesizerDoneEvent
  | PipelineErrorEvent

/**
 * Emite um evento estruturado do pipeline.
 * Use sempre que finalizar uma etapa (sucesso ou falha controlada).
 */
export function logChatEvent(event: ChatEvent): void {
  // Cada linha é um JSON único — facilita parsing posterior
  console.log(JSON.stringify(event))
}
