import type { Metadata } from "next"
import { ChatInterface } from "@/components/chat/chat-interface"

export const metadata: Metadata = { title: "Chat — Grimório AI" }

/** Nova conversa — sem histórico inicial. */
export default function ChatPage() {
  return <ChatInterface />
}
