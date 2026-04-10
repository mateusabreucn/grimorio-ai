import { z } from "zod"

export const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
})

export const registerSchema = z.object({
  name:     z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email:    z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(100)
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

export type LoginInput    = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
