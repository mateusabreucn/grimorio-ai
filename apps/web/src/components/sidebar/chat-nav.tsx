"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  title: string
}

export function ChatNav({ conversations }: { conversations: Conversation[] }) {
  const pathname = usePathname()

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

      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-[hsl(var(--panel-raised))] px-3 py-2.5 text-muted-foreground">
        <Search className="h-4 w-4" />
        <span className="text-sm">Buscar nos tomos...</span>
      </div>

      <div>
        <SectionTitle>Histórico de Consultas</SectionTitle>
        <div className="space-y-1">
          {conversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 px-3 py-4 text-sm leading-relaxed text-muted-foreground">
              Nenhuma conversa gravada ainda. Comece uma consulta ao Grimório.
            </div>
          ) : (
            conversations.map((conv, index) => {
              const active = pathname === `/chat/${conv.id}`
              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={cn(
                    "group relative block rounded-r-xl border-l-2 px-3 py-3 transition-all",
                    active
                      ? "border-primary bg-[linear-gradient(90deg,hsl(var(--amber-glow)),transparent_92%)] text-foreground"
                      : "border-transparent text-muted-foreground hover:border-primary/45 hover:bg-[hsl(var(--panel-raised))] hover:text-foreground",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{conv.title || "Conversa sem título"}</div>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
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
