"use client"

import { type FormEvent, useRef, useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { BookOpen, Coins, HelpCircle, GraduationCap, Loader2, SendHorizontal, Plus, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const BOOKS = [
  { id: "core", label: "Livro Básico" },
  { id: "herois", label: "Heróis de Arton" },
  { id: "ameacas", label: "Ameaças de Arton" },
  { id: "deuses", label: "Deuses de Arton" },
] as const

type BookId = (typeof BOOKS)[number]["id"]

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  placeholder?: string
  selectedBooks?: BookId[]
  onBooksChange?: (books: BookId[]) => void
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  placeholder = "Pergunte ao Grimório...",
  selectedBooks = ["core"],
  onBooksChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showBookPicker, setShowBookPicker] = useState(false)

  const handleActionClick = (prefix: string) => {
    onInputChange(prefix)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  const toggleBook = (id: BookId) => {
    if (!onBooksChange) return
    if (selectedBooks.includes(id)) {
      if (selectedBooks.length === 1) return // mínimo 1 livro
      onBooksChange(selectedBooks.filter((b) => b !== id))
    } else {
      onBooksChange([...selectedBooks, id])
    }
  }

  // Fecha o picker ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBookPicker(false)
      }
    }
    if (showBookPicker) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showBookPicker])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const scrollHeight = el.scrollHeight
    el.style.height = `${Math.min(scrollHeight, 200)}px`
    el.style.overflowY = scrollHeight > 200 ? "auto" : "hidden"
  }, [input])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input.trim()) {
        e.currentTarget.form?.requestSubmit()
      }
    }
  }

  const bookLabel =
    selectedBooks.length === BOOKS.length
      ? "Todos os livros"
      : selectedBooks.length === 1
        ? (BOOKS.find((b) => b.id === selectedBooks[0])?.label ?? "1 livro")
        : `${selectedBooks.length} livros`

  return (
    <div className="relative border-t border-border/70 bg-background/80 px-2 py-3 backdrop-blur md:px-8 md:py-4">
      <div className="mx-auto max-w-5xl">
        <div className={cn(
          "mb-2 flex flex-wrap items-center gap-2 transition-all duration-300",
          !showSuggestions && "max-md:hidden"
        )}>
          {[
            { label: "Ver Preço", icon: Coins, prefix: "Me informe o valor em tibares do produto: " },
            { label: "Recomendar algo", icon: GraduationCap, prefix: "Me recomende algo para melhorar a minha build de: " },
            { label: "Questionar sobre o mundo", icon: HelpCircle, prefix: "Me explique o atributo/perícia/magia/equipamento: " },
          ].map(({ label, icon: Icon, prefix }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleActionClick(prefix)}
              className="flex items-center gap-2 rounded-full border border-border/70 bg-[hsl(var(--panel-raised))] px-3 py-1.5 text-xs md:text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
            >
              <Icon className="h-3 w-3 text-primary md:h-3.5 md:w-3.5" />
              {label}
            </button>
          ))}

          {onBooksChange && (
            <div ref={dropdownRef} className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowBookPicker((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-[hsl(var(--panel-raised))] px-3 py-1.5 text-xs md:text-sm text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
              >
                <BookOpen className="h-3 w-3 text-primary md:h-3.5 md:w-3.5" />
                <span className="font-rune uppercase tracking-[0.1em]">{bookLabel}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", showBookPicker && "rotate-180")} />
              </button>

              {showBookPicker && (
                <div className="absolute right-0 bottom-full mb-2 z-50 min-w-[180px] rounded-xl border border-border/70 bg-[hsl(var(--panel-raised))] shadow-lg py-1">
                  <div className="font-rune px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.2em] text-[hsl(var(--ink-faint))] border-b border-border/50">
                    Buscar nos livros
                  </div>
                  {BOOKS.map((book) => {
                    const active = selectedBooks.includes(book.id)
                    return (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => toggleBook(book.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[hsl(var(--panel))]",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <div className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/70",
                        )}>
                          {active && <Check className="h-2 w-2" />}
                        </div>
                        {book.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 rounded-xl border border-primary/25 bg-[hsl(var(--panel))] px-2 py-1 shadow-[0_0_0_4px_hsl(var(--amber-glow)),0_20px_60px_-45px_hsl(var(--primary))]"
        >
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-[hsl(var(--panel-raised))] text-muted-foreground transition-all md:hidden",
              showSuggestions && "rotate-45 border-primary/45 text-primary"
            )}
          >
            <Plus className="h-4 w-4" />
          </button>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className={cn(
              "max-h-[200px] min-h-[38px] flex-1 resize-none border-0 bg-transparent overflow-hidden",
              "px-1 py-2 text-sm md:text-base leading-relaxed shadow-none",
              "placeholder:text-muted-foreground/80 focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--amber-deep))] text-primary-foreground shadow-[0_10px_28px_-16px_hsl(var(--primary))] hover:opacity-95"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
            <span className="sr-only">Enviar</span>
          </Button>
        </form>

        <div className="mt-2 flex items-center justify-center text-[0.65rem] text-[hsl(var(--ink-faint))] md:text-[0.78rem]">
          <span className="font-body italic tracking-wider">"verifique no livro antes de aplicar na ficha"</span>
        </div>
      </div>
    </div>
  )
}
