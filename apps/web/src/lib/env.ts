import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL inválida"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET deve ter pelo menos 32 caracteres"),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RAG_SERVICE_URL: z.string().url().optional(),
  RAG_INTERNAL_SECRET: z.string().min(32).optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:")
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error("Variáveis de ambiente inválidas — verifique o .env.local")
}

export const env = parsed.data
