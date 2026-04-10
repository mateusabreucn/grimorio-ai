import { Sparkles, Settings } from "lucide-react"
import Link from "next/link"
import { ChatNav } from "./chat-nav"
import { JournalNav } from "./journal-nav"
import { getConversations } from "@/actions/chat"

export async function Sidebar() {
  const conversations = await getConversations()

  return (
    <aside className="w-72 shrink-0 border-r flex flex-col h-full bg-card/50">
      {/* Header */}
      <div className="h-16 flex items-center px-5 border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight">Grimório AI</span>
            <p className="text-[10px] text-muted-foreground/50 leading-none">Tormenta 20</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <ChatNav conversations={conversations} />
        <JournalNav />
      </nav>

      {/* Rodapé — Configurações */}
      <div className="border-t p-3">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Configurações</span>
        </Link>
      </div>
    </aside>
  )
}
