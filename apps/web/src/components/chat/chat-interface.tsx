"use client"

import { useEffect, useRef } from "react"
import { useChat } from "ai/react"
import { useRouter } from "next/navigation"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"

interface InitialMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatInterfaceProps {
  conversationId?: string
  initialMessages?: InitialMessage[]
}

export function ChatInterface({ conversationId, initialMessages = [] }: ChatInterfaceProps) {
  const router = useRouter()
  const redirectedRef = useRef(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, data } = useChat({
    api: "/api/chat",
    initialMessages,
    body: { conversationId },
    onError: (err: Error) => {
      console.error("[chat] Erro:", err)
    },
  })

  // Redirecionar para /chat/{id} após primeira mensagem numa nova conversa
  useEffect(() => {
    if (!conversationId && !redirectedRef.current && data && data.length > 0) {
      const lastData = data[data.length - 1] as Record<string, unknown>
      const newConvId = lastData?.conversationId as string | undefined
      if (newConvId) {
        redirectedRef.current = true
        router.push(`/chat/${newConvId}`)
        router.refresh()
      }
    }
  }, [data, conversationId, router])

  // Atualizar sidebar quando a conversa já existe e há novas mensagens
  useEffect(() => {
    if (conversationId && !isLoading && messages.length > 0) {
      router.refresh()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Erro ao conectar com o Grimório. Tente novamente.
        </div>
      )}

      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
