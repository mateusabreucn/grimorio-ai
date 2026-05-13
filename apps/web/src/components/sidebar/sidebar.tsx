import { auth } from "@/lib/auth"
import { Compass, MessageSquare, PenLine, Sword } from "lucide-react"
import Link from "next/link"
import { ChatNav } from "./chat-nav"
import { getConversations } from "@/actions/chat"
import { SidebarUser } from "./sidebar-user"
import { SidebarTabs } from "./sidebar-tabs"

export async function Sidebar() {
  const conversations = await getConversations()
  const session = await auth()
  const user = session?.user

  return (
    <aside className="relative hidden h-full w-[19rem] shrink-0 flex-col overflow-hidden border-r border-border/70 bg-[hsl(var(--panel))] text-foreground md:flex">
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

      <nav className="relative flex-1 overflow-y-auto px-4 py-5">
        <ChatNav conversations={conversations} />
      </nav>

      <SidebarUser />
    </aside>
  )
}
