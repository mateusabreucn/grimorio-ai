import { auth } from "@/lib/auth"
import { Compass, MessageSquare, PenLine, Settings, Sword } from "lucide-react"
import Link from "next/link"
import { ChatNav } from "./chat-nav"
import { getConversations } from "@/actions/chat"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export async function Sidebar() {
  const conversations = await getConversations()
  const session = await auth()
  const name = session?.user?.name || "Mestre Velloran"

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

      <div className="relative px-4 pt-5">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-[hsl(var(--panel-raised))] p-1 shadow-inner">
          <Link
            href="/chat"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground shadow-[0_10px_30px_-18px_hsl(var(--primary))]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Conversas
          </Link>
          <span className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground/80">
            <PenLine className="h-3.5 w-3.5" />
            Journal
          </span>
          <span className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground/80">
            <Sword className="h-3.5 w-3.5" />
            Persona
          </span>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-4 py-5">
        <ChatNav conversations={conversations} />
      </nav>

      <div className="relative border-t border-border/70 p-4">
        <Link
          href="/settings"
          className="mb-3 flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-[hsl(var(--panel-raised))] hover:text-foreground"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Configurações</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--amber-deep))] font-display text-lg font-bold text-primary-foreground">
            {(name[0] || "V").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="font-rune text-[0.68rem] text-[hsl(var(--ink-faint))]">nv 7 · 142 ⊕</div>
          </div>
          <ThemeToggle className="border border-border/70 bg-[hsl(var(--panel-raised))]" />
        </div>
      </div>
    </aside>
  )
}
