import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { ChatInterface } from "@/components/chat/chat-interface"
import { getConversation } from "@/actions/chat"

interface ConversationPageProps {
  params: { id: string }
}

/** Conversa existente — carrega histórico do banco. */
export default async function ConversationPage({ params }: ConversationPageProps) {
  const session = await auth()
  const conversation = await getConversation(params.id)

  if (!conversation) notFound()

  const initialMessages = conversation.messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }))

  return (
    <ChatInterface
      conversationId={conversation.id}
      title={conversation.title}
      initialMessages={initialMessages}
      user={session?.user}
    />
  )
}
