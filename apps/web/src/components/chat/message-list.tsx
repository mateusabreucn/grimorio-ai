"use client"

import { useEffect, useRef } from "react"
import { MessageBubble } from "./message-bubble"
import { Compass, Sparkles } from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant" | string
  content: string
}

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  onCardClick?: (text: string) => void
}

export function MessageList({ messages, isLoading, onCardClick }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-8 px-8 text-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-primary/35 bg-primary/10 shadow-[0_0_60px_hsl(var(--amber-glow))]">
            <Compass className="h-12 w-12 text-primary" />
          </div>
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-rune text-[0.72rem] uppercase tracking-[0.34em] text-primary">
            Mestre de tomos
          </p>
          <h2 className="font-display text-4xl font-semibold uppercase tracking-[0.06em]">Grimório AI</h2>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
            Consulte regras, classes, builds e estratégias dos livros de Tormenta 20.
          </p>
        </div>

        <div className="grid w-full max-w-2xl gap-3 md:grid-cols-3">
          {[
            { text: "Como funciona o teste de resistência?", icon: "Regras" },
            { text: "Me sugira uma build de Guerreiro focado em crítico.", icon: "Builds" },
            { text: "Quais são as divindades de Arton para um Clérigo?", icon: "Lore" },
          ].map((q) => (
            <div
              key={q.text}
              onClick={() => onCardClick?.(q.text)}
              className="group cursor-pointer rounded-2xl border border-border/70 bg-[hsl(var(--panel-raised))] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_45px_-32px_hsl(var(--primary))]"
            >
              <div className="font-rune mb-3 text-[0.65rem] uppercase tracking-[0.2em] text-primary">{q.icon}</div>
              <div className="text-sm font-semibold text-foreground">{q.text}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col py-6">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          role={msg.role as "user" | "assistant"}
          content={msg.content}
        />
      ))}

      {isLoading && (
        <div className="mx-auto flex w-full max-w-5xl gap-4 px-4 py-5 md:px-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[hsl(var(--panel-raised))]">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border/70 bg-[hsl(var(--panel-raised))] px-5 py-4">
            <span className="font-rune mr-2 text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground">
              consultando
            </span>
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
