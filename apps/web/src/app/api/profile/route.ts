import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Não autorizado", { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response("JSON inválido", { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return new Response("Dados inválidos", { status: 422 })
  }

  const { name } = parsed.data

  await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))

  return Response.json({ ok: true })
}
