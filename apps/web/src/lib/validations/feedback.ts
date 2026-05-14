import { z } from "zod"

export const feedbackBodySchema = z.object({
  messageId: z.string().uuid(),
  vote:      z.enum(["up", "down"]),
  comment:   z.string().trim().max(2000).optional(),
})

export type FeedbackBody = z.infer<typeof feedbackBodySchema>
