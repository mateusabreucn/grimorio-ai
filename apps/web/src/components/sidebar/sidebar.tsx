import { BookOpen, ScrollText } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ConversationList } from "./conversation-list"

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r flex flex-col h-full bg-card">
      {/* Header da sidebar */}
      <div className="h-14 flex items-center px-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Grimório AI</span>
        </div>
      </div>

      {/* Navegação principal */}
      <nav className="p-2 border-b shrink-0">
        <Link
          href="/chat"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "transition-colors"
          )}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Chat com Grimório</span>
        </Link>
        <Link
          href="/journal"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "transition-colors"
          )}
        >
          <ScrollText className="w-4 h-4 shrink-0" />
          <span>Journal de Campanha</span>
        </Link>
      </nav>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto py-2">
        <ConversationList />
      </div>
    </aside>
  )
}
