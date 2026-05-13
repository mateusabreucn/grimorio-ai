import { auth } from "@/lib/auth"
import type { Metadata } from "next"
import { ChatInterface } from "@/components/chat/chat-interface"
import { Compass, LogIn, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export const metadata: Metadata = { title: "Chat — Grimório AI" }

export default async function ChatPage() {
  const session = await auth()
  const user = session?.user

  if (user) {
    return <ChatInterface user={user} />
  }

  // Versão pública (Guest Mode)
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="h-20 border-b border-border/70 flex items-center justify-between px-6 md:px-10 shrink-0 bg-[hsl(var(--panel))]/50 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--amber-deep))] shadow-[0_0_20px_hsl(var(--amber-glow))]">
            <Compass className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight uppercase font-display">Grimório AI</span>
            <span className="text-[0.6rem] font-rune uppercase tracking-[0.2em] text-muted-foreground">Mestre de Tomos</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6 px-4 py-2 rounded-2xl border border-primary/20 bg-primary/5">
           <div className="flex items-center gap-2 text-xs text-primary font-medium">
             <ShieldAlert className="w-4 h-4" />
             <span>Modo Visitante: O histórico não será salvo</span>
           </div>
           <div className="h-4 w-px bg-primary/20" />
           <p className="text-[0.7rem] text-muted-foreground leading-tight max-w-[200px]">
             Faça login para salvar suas consultas e acessar o Journal.
           </p>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle className="border-border/70 bg-background/50" />
          <Button asChild size="lg" className="rounded-xl px-8 font-semibold shadow-lg shadow-primary/20">
            <Link href="/login">
              <LogIn className="w-4 h-4 mr-2" />
              Entrar Agora
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  )
}
