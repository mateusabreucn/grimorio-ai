"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { MessageSquare, Plus, Search, Pencil, Trash2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useRef, useTransition, useEffect } from "react"
import { renameConversation, removeConversation, deleteConversation } from "@/actions/chat"

interface Conversation {
  id: string
  title: string
}

export function ChatNav({ conversations }: { conversations: Conversation[] }) {
  const pathname = usePathname()
  const router = useRouter()

  // Só mostra o histórico na aba de Chat
  const isChatTab = pathname === "/chat" || pathname.startsWith("/chat/")

  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : conversations

  function startEdit(conv: Conversation, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditingId(conv.id)
    setEditValue(conv.title)
    setDeletingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue("")
  }

  function commitEdit(id: string) {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === conversations.find((c) => c.id === id)?.title) {
      cancelEdit()
      return
    }
    startTransition(async () => {
      await renameConversation(id, trimmed)
      setEditingId(null)
    })
  }

  function handleEditKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(id) }
    if (e.key === "Escape") cancelEdit()
  }

  function startDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(id)
    setEditingId(null)
  }

  function confirmDelete(id: string) {
    const isActive = pathname === `/chat/${id}`
    startTransition(async () => {
      if (isActive) {
        await deleteConversation(id) // redireciona para /chat
      } else {
        await removeConversation(id)
        router.refresh()
      }
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <Link
        href="/chat"
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-primary/35 px-4 py-3 text-sm font-semibold",
          "bg-transparent text-foreground shadow-[0_0_0_1px_hsl(var(--amber-glow))] transition-all",
          "hover:border-primary/60 hover:bg-primary/10",
          pathname === "/chat" && "border-primary/60 bg-primary/10",
        )}
      >
        <Plus className="h-4 w-4 text-primary transition-transform group-hover:rotate-90" />
        <span className="flex-1">Nova consulta</span>
      </Link>

      {/* Search — só visível na aba de chat */}
      {isChatTab && (
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-[hsl(var(--panel-raised))] px-3 py-2.5 text-muted-foreground focus-within:border-primary/40 transition-colors">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nos tomos..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="shrink-0 hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Lista de conversas — só na aba de chat */}
      {isChatTab && (
        <div>
          <SectionTitle>Histórico de Consultas</SectionTitle>
          <div className="space-y-0.5">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 px-3 py-4 text-sm leading-relaxed text-muted-foreground">
                {search
                  ? "Nenhuma consulta encontrada."
                  : "Nenhuma conversa gravada ainda. Comece uma consulta ao Grimório."}
              </div>
            ) : (
              filtered.map((conv) => {
                const active = pathname === `/chat/${conv.id}`
                const isEditing = editingId === conv.id
                const isDeleting = deletingId === conv.id

                return (
                  <div
                    key={conv.id}
                    className={cn(
                      "group relative rounded-r-xl border-l-2 transition-all",
                      active
                        ? "border-primary bg-[linear-gradient(90deg,hsl(var(--amber-glow)),transparent_92%)]"
                        : "border-transparent hover:border-primary/45 hover:bg-[hsl(var(--panel-raised))]",
                    )}
                  >
                    {isEditing ? (
                      /* ── Modo edição inline ── */
                      <div className="flex items-center gap-1.5 px-3 py-2.5">
                        <MessageSquare className="h-4 w-4 shrink-0 text-primary/70" />
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, conv.id)}
                          onBlur={() => commitEdit(conv.id)}
                          maxLength={255}
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none border-b border-primary/50 pb-px"
                        />
                        <button
                          onMouseDown={(e) => { e.preventDefault(); commitEdit(conv.id) }}
                          className="shrink-0 rounded p-0.5 text-green-500 hover:bg-green-500/10 transition-colors"
                          title="Salvar"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); cancelEdit() }}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--panel))] transition-colors"
                          title="Cancelar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : isDeleting ? (
                      /* ── Confirmação de delete ── */
                      <div className="flex items-center gap-1.5 px-3 py-2.5">
                        <Trash2 className="h-4 w-4 shrink-0 text-destructive" />
                        <span className="min-w-0 flex-1 truncate text-xs text-destructive font-medium">
                          Excluir esta consulta?
                        </span>
                        <button
                          onClick={() => confirmDelete(conv.id)}
                          disabled={isPending}
                          className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold text-destructive border border-destructive/40 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="shrink-0 rounded px-2 py-0.5 text-xs text-muted-foreground border border-border/70 hover:text-foreground transition-colors"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      /* ── Modo normal ── */
                      <Link
                        href={`/chat/${conv.id}`}
                        className={cn(
                          "flex items-start gap-2.5 px-3 py-3",
                          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {conv.title || "Conversa sem título"}
                          </div>
                        </div>

                        {/* Ações — aparecem no hover */}
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => startEdit(conv, e)}
                            className="rounded p-1 hover:bg-[hsl(var(--panel))] hover:text-foreground transition-colors"
                            title="Renomear"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => startDelete(conv.id, e)}
                            className="rounded p-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </Link>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <span className="h-1.5 w-1.5 rotate-45 bg-primary" />
      <span className="font-rune text-[0.64rem] uppercase tracking-[0.32em] text-[hsl(var(--ink-faint))]">
        {children}
      </span>
      <span className="h-px flex-1 bg-border/80" />
    </div>
  )
}
