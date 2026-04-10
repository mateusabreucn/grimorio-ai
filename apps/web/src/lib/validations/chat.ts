import { z } from "zod"

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10_000),
})

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  conversationId: z.string().uuid().optional(),
})

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255).default("Nova conversa"),
})

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(255),
})

export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
