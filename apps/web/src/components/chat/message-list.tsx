"use client"

import { useEffect, useRef } from "react"
import { MessageBubble } from "./message-bubble"
import { Sparkles } from "lucide-react"

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
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-6">
        {/* Logo grande */}
        <div className="relative">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary/20 border-2 border-background" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold">Grimório AI</h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Consulte regras, classes, builds e estratégias dos livros de Tormenta 20.
          </p>
        </div>

        {/* Sugestões */}
        <div className="grid gap-2 w-full max-w-md mt-2">
          {[
            { text: "Quais são as classes disponíveis?", icon: "⚔️" },
            { text: "Qual é o melhor build para iniciantes?", icon: "🛡️" },
            { text: "Como funciona o sistema de magia?", icon: "✨" },
          ].map((q) => (
            <div
              key={q.text}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-left text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-accent/50 cursor-pointer transition-all"
            >
              <span className="text-base shrink-0">{q.icon}</span>
              <span>{q.text}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col py-2">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          role={msg.role as "user" | "assistant"}
          content={msg.content}
        />
      ))}

      {/* Typing indicator animado */}
      {isLoading && (
        <div className="flex gap-3 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="bg-card border border-border/60 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/50" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/50" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/50" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
