"use client"

import { useEffect, useRef } from "react"
import { MessageBubble } from "./message-bubble"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen } from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant" | string
  content: string
}

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">Grimório pronto para consulta</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Pergunte sobre classes, builds, regras e habilidades dos livros de RPG.
          </p>
        </div>

        {/* Sugestões de perguntas */}
        <div className="grid gap-2 w-full max-w-sm mt-2">
          {[
            "Quais são as classes disponíveis?",
            "Qual é o melhor build para iniciantes?",
            "Como funciona o sistema de magia?",
          ].map((q) => (
            <div
              key={q}
              className="rounded-lg border bg-card px-4 py-2.5 text-sm text-left text-muted-foreground"
            >
              {q}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col py-4">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          role={msg.role as "user" | "assistant"}
          content={msg.content}
        />
      ))}

      {isLoading && (
        <div className="flex gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-2 mt-1">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
