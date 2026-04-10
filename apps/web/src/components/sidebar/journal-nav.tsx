"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ScrollText, Plus, Shield, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function JournalNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(pathname.startsWith("/journal"))

  return (
    <div>
      {/* Botão principal */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
          "text-foreground hover:bg-accent/60 transition-colors",
          pathname.startsWith("/journal") && "bg-accent/40",
        )}
      >
        <ScrollText className="w-4 h-4 shrink-0 text-primary" />
        <span className="flex-1 text-left">Journal</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-border/60 pl-3">
          <Link
            href="/journal"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
              "text-muted-foreground hover:text-foreground hover:bg-accent/40",
              "transition-colors",
            )}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Nova sessão</span>
          </Link>

          <Link
            href="/journal/characters"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
              "text-muted-foreground hover:text-foreground hover:bg-accent/40",
              "transition-colors",
              pathname === "/journal/characters" && "text-foreground bg-accent/30",
            )}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Personagens</span>
          </Link>
        </div>
      )}
    </div>
  )
}
