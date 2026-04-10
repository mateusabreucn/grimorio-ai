import { BookOpen } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

interface NavbarProps {
  user: {
    id:     string
    name?:  string | null
    email?: string | null
    image?: string | null
  }
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
      <Link
        href="/chat"
        className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity"
      >
        <BookOpen className="w-5 h-5 text-primary" />
        <span className="text-sm">Grimório AI</span>
      </Link>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
