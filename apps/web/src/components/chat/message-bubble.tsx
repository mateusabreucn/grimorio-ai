"use client"

import { cn } from "@/lib/utils"
import { BookOpen, Compass, Copy, RotateCcw, Save, ThumbsDown, ThumbsUp, Check } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  onReload?: () => void
  isLast?: boolean
}

export function MessageBubble({ role, content, onReload, isLast }: MessageBubbleProps) {
  const isUser = role === "user"
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast({
        title: "Texto copiado",
        description: "A mensagem foi copiada para a área de transferência.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={cn("mx-auto flex w-full max-w-5xl gap-3 px-2 py-3 md:gap-4 md:px-6 md:py-5", isUser && "justify-end")}>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isUser && "hidden",
          !isUser && "border border-primary/35 bg-[hsl(var(--panel-raised))] shadow-[0_0_24px_hsl(var(--amber-glow))]",
        )}
      >
        <Compass className="h-5 w-5 text-primary" />
      </div>

      {isUser ? (
        <div className="max-w-[90%] md:max-w-[78%]">
          <div className="rounded-[1.1rem] rounded-br-md border border-border/70 bg-[hsl(var(--panel-raised))] px-5 py-4 text-base leading-relaxed shadow-sm">
            <div className="whitespace-pre-wrap break-words">{content}</div>
          </div>
          <div className="font-rune mt-2 text-right text-[0.68rem] uppercase tracking-[0.22em] text-[hsl(var(--ink-faint))]">
            Velloran · agora
          </div>
        </div>
      ) : (
        <article className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="font-display text-lg font-semibold uppercase tracking-[0.08em]">Grimório</div>
            <span className="h-px w-10 bg-primary/45" />
            <span className="font-rune text-[0.68rem] uppercase tracking-[0.2em] text-[hsl(var(--ink-faint))]">
              resposta sintetizada
            </span>
            <div className="flex-1" />
          </div>

          <div className="prose-grimorio text-base leading-8 text-foreground">
            <FormattedContent content={content} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-border/70 pt-4 text-sm text-muted-foreground">
            {isLast && onReload && (
              <button
                onClick={onReload}
                className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-[hsl(var(--panel-raised))] hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                Regenerar
              </button>
            )}
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-[hsl(var(--panel-raised))] hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-primary" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </button>
            
            <button
              disabled
              className="flex items-center gap-2 rounded-lg px-3 py-2 opacity-50 cursor-not-allowed"
              title="Em breve"
            >
              <Save className="h-3.5 w-3.5 text-muted-foreground" />
              Salvar no Journal
            </button>
            
            <div className="flex-1" />
            <button className="rounded-lg border border-border/70 p-2 transition-colors hover:border-primary/45 hover:text-foreground">
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button className="rounded-lg border border-border/70 p-2 transition-colors hover:border-primary/45 hover:text-foreground">
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        </article>
      )}
    </div>
  )
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split("\n")

  return (
    <div className="space-y-4">
      {lines.map((line, index) => {
        const trimmed = line.trim()

        if (!trimmed) return null

        if (/^#{1,3}\s/.test(trimmed)) {
          return (
            <h2
              key={index}
              className="font-display mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.06em] text-foreground"
            >
              {trimmed.replace(/^#{1,3}\s/, "")}
            </h2>
          )
        }

        if (/^[-*]\s/.test(trimmed)) {
          return (
            <div key={index} className="flex gap-3">
              <span className="mt-3 h-2 w-2 shrink-0 rotate-45 bg-primary" />
              <p>{renderInline(trimmed.replace(/^[-*]\s/, ""))}</p>
            </div>
          )
        }

        return <p key={index}>{renderInline(trimmed)}</p>
      })}
    </div>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }

    return <span key={index}>{part}</span>
  })
}
