import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar/sidebar"
import { Navbar } from "@/components/shared/navbar"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { BookOpen, LogIn } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Grimório AI — Chat" }

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user

  // Layout autenticado: sidebar completa + navbar com user menu
  if (user?.id) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
            }}
          />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    )
  }

  // Layout público: navbar minimalista + área de chat
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <Link href="/" className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-sm">Grimório AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
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
