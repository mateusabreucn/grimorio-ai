import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar/sidebar"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Sparkles, LogIn } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Chat — Grimório AI" }

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user

  if (user?.id) {
    return (
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    )
  }

  // Layout público
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-14 border-b flex items-center justify-between px-5 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Grimório AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link href="/login">
              <LogIn className="w-4 h-4 mr-1.5" />
              Entrar
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
