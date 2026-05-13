"use client"

import { type FormEvent, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Coins, HelpCircle, GraduationCap, Loader2, SendHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  placeholder?: string
  supplementsEnabled?: boolean
  onSupplementsToggle?: (enabled: boolean) => void
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  placeholder = "Pergunte ao Grimório...",
  supplementsEnabled = true,
  onSupplementsToggle,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleActionClick = (prefix: string) => {
    onInputChange(prefix)
    textareaRef.current?.focus()
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input.trim()) {
        e.currentTarget.form?.requestSubmit()
      }
    }
  }

  return (
    <div className="relative border-t border-border/70 bg-background/80 px-4 py-4 backdrop-blur md:px-8 md:py-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {[
            { label: "Ver Preço", icon: Coins, prefix: "Me informe o valor em tibares do produto: " },
            { label: "Recomendar algo", icon: GraduationCap, prefix: "Me recomende algo para melhorar a minha build de: " },
            { label: "Questionar sobre o mundo", icon: HelpCircle, prefix: "Me explique o atributo/perícia/magia/equipamento: " },
          ].map(({ label, icon: Icon, prefix }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleActionClick(prefix)}
              className="flex items-center gap-2 rounded-full border border-border/70 bg-[hsl(var(--panel-raised))] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </button>
          ))}

          {onSupplementsToggle && (
            <div className="ml-auto flex items-center gap-2 rounded-full border border-border/70 bg-[hsl(var(--panel-raised))] px-3 py-1.5">
              <label
                htmlFor="supplements-toggle"
                className="font-rune cursor-pointer select-none text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {supplementsEnabled ? "Todos os livros" : "Básico"}
              </label>
              <Switch
                id="supplements-toggle"
                checked={supplementsEnabled}
                onCheckedChange={onSupplementsToggle}
                className="scale-75"
              />
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-end gap-3 rounded-2xl border border-primary/25 bg-[hsl(var(--panel))] p-3 shadow-[0_0_0_4px_hsl(var(--amber-glow)),0_20px_60px_-45px_hsl(var(--primary))]"
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className={cn(
              "max-h-[200px] min-h-[48px] flex-1 resize-none border-0 bg-transparent",
              "px-3 py-3 text-base leading-relaxed shadow-none",
              "placeholder:text-muted-foreground/80 focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--amber-deep))] text-primary-foreground shadow-[0_10px_28px_-16px_hsl(var(--primary))] hover:opacity-95"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
            <span className="sr-only">Enviar</span>
          </Button>
        </form>

        <div className="mt-3 flex items-center justify-center text-[0.62rem] text-[hsl(var(--ink-faint))] md:text-[0.8rem]">
          <span className="font-body italic uppercase tracking-wider">“verifique no livro antes de aplicar”</span>
        </div>
      </div>
    </div>
  )
}
