import { Sparkles } from "lucide-react"
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
    <header className="h-14 border-b flex items-center justify-between px-5 shrink-0 bg-card/30">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-muted-foreground">
          Grimório AI
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
