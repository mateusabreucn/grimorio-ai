import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL inválida"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET deve ter pelo menos 32 caracteres"),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().min(1, "GOOGLE_AI_API_KEY é obrigatória"),
  RAG_SERVICE_URL: z.string().url("RAG_SERVICE_URL inválida"),
  RAG_INTERNAL_SECRET: z.string().min(32, "RAG_INTERNAL_SECRET deve ter pelo menos 32 caracteres"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:")
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error("Variáveis de ambiente inválidas — verifique o .env.local")
}

export const env = parsed.data
