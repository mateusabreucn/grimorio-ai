"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { conversations, messages } from "@/lib/db/schema"
import { eq, desc, and, exists } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/** Lista conversas do usuário logado que possuem ao menos uma mensagem. */
export async function getConversations() {
  const session = await auth()
  if (!session?.user?.id) return []

  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, session.user.id),
        exists(
          db
            .select({ one: messages.id })
            .from(messages)
            .where(eq(messages.conversationId, conversations.id))
            .limit(1),
        ),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(50)
}

/** Retorna uma conversa com suas mensagens (verifica ownership). */
export async function getConversation(conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, session.user.id),
      ),
    )

  if (!conversation) return null

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)

  return { ...conversation, messages: msgs }
}

/** Cria uma nova conversa e redireciona para ela. */
export async function createConversation() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [conv] = await db
    .insert(conversations)
    .values({ userId: session.user.id, title: "Nova conversa" })
    .returning({ id: conversations.id })

  revalidatePath("/chat")
  redirect(`/chat/${conv.id}`)
}

/** Renomeia uma conversa (verifica ownership). */
export async function renameConversation(conversationId: string, title: string) {
  const session = await auth()
  if (!session?.user?.id) return

  await db
    .update(conversations)
    .set({ title: title.slice(0, 255), updatedAt: new Date() })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, session.user.id),
      ),
    )

  revalidatePath("/chat")
  revalidatePath(`/chat/${conversationId}`)
}

/** Deleta uma conversa e redireciona para /chat (usar quando na conversa deletada). */
export async function deleteConversation(conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) return

  await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, session.user.id),
      ),
    )

  revalidatePath("/chat")
  redirect("/chat")
}

/** Remove uma conversa sem redirecionar (usar da sidebar quando em outra página). */
export async function removeConversation(conversationId: string) {
  const session = await auth()
  if (!session?.user?.id) return

  await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, session.user.id),
      ),
    )

  revalidatePath("/chat")
}
