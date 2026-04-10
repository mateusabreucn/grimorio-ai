import { BookOpen, ScrollText, Sparkles } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ConversationList } from "./conversation-list"

export function Sidebar() {
  return (
    <aside className="w-72 shrink-0 border-r flex flex-col h-full bg-card/50">
      {/* Header */}
      <div className="h-16 flex items-center px-5 border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight">Grimório AI</span>
            <p className="text-[10px] text-muted-foreground/60 leading-none">Tormenta 20</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="p-3 border-b shrink-0 space-y-0.5">
        <Link
          href="/chat"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
            "bg-primary/10 text-primary",
            "transition-colors",
          )}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Chat</span>
        </Link>
        <Link
          href="/journal"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm",
            "text-muted-foreground hover:text-foreground hover:bg-accent/60",
            "transition-colors",
          )}
        >
          <ScrollText className="w-4 h-4 shrink-0" />
          <span>Journal</span>
        </Link>
      </nav>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto py-2">
        <ConversationList />
      </div>
    </aside>
  )
}
