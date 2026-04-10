import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const saveSchema = z.object({
  conversationId: z.string().uuid().optional(),
  userMessage: z.string().min(1).max(10_000),
  assistantMessage: z.string().min(1).max(50_000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Não autorizado", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Dados inválidos", { status: 422 });
  }

  const { conversationId, userMessage, assistantMessage } = parsed.data;

  try {
    let convId = conversationId;

    if (!convId) {
      const title = userMessage.slice(0, 60);
      const [newConv] = await db
        .insert(conversations)
        .values({ userId: session.user.id, title })
        .returning({ id: conversations.id });
      convId = newConv.id;
    }

    await db.insert(messages).values([
      { conversationId: convId, role: "user", content: userMessage },
      { conversationId: convId, role: "assistant", content: assistantMessage },
    ]);

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, convId));

    return Response.json({ conversationId: convId });
  } catch (err) {
    console.error("[chat/save] Erro:", err);
    return new Response("Erro interno", { status: 500 });
  }
}
