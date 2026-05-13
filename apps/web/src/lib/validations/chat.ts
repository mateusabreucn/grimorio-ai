import { z } from "zod"

// Parte de conteúdo usada pelo Vercel AI SDK em mensagens com tool calling
const contentPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("tool-call"),
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.record(z.unknown()),
  }),
  z.object({
    type: z.literal("tool-result"),
    toolCallId: z.string(),
    toolName: z.string(),
    result: z.unknown(),
  }),
])

// Aceita o formato completo do Vercel AI SDK (incluindo tool calls e tool results)
export const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: z.string().min(1).max(10_000),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.union([z.string().max(100_000), z.array(contentPartSchema)]),
  }),
  z.object({
    role: z.literal("tool"),
    content: z.array(contentPartSchema),
  }),
])

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  conversationId: z.string().uuid().optional(),
  supplementsEnabled: z.boolean().optional().default(true),
})

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255).default("Nova conversa"),
})

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(255),
})

export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
