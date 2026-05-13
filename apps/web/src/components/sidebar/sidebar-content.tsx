import { Compass } from "lucide-react"
import { ChatNav } from "./chat-nav"
import { SidebarUser } from "./sidebar-user"
import { SidebarTabs } from "./sidebar-tabs"

interface Conversation {
  id: string
  title: string
}

interface SidebarContentProps {
  conversations: Conversation[]
}

export function SidebarContent({ conversations }: SidebarContentProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--panel))] text-foreground relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--amber-glow)),transparent_55%)]" />

      <div className="relative flex h-20 shrink-0 items-center gap-3 border-b border-border/70 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/45 bg-primary/10 shadow-[0_0_22px_hsl(var(--amber-glow))]">
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-xl font-semibold uppercase tracking-[0.08em] text-foreground">
            Grimório
          </div>
          <p className="font-rune mt-1 text-[0.62rem] uppercase tracking-[0.36em] text-[hsl(var(--ink-faint))]">
            mestre de tomos
          </p>
        </div>
      </div>

      <SidebarTabs />

      <nav className="relative flex-1 overflow-y-auto px-4 py-5 scrollbar-thin scrollbar-thumb-border">
        <ChatNav conversations={conversations} />
      </nav>

      <SidebarUser />
    </div>
  )
}
