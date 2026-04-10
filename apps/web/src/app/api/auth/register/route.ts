import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { registerSchema } from "@/lib/validations/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      return Response.json(
        { error: "Email já cadastrado" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await db.insert(users).values({
      name,
      email,
      passwordHash,
      provider: "credentials",
    })

    return Response.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("[REGISTER]", error)
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
