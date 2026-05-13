"use client"

import { Settings } from "lucide-react"
import Link from "next/link"

export function SidebarUser() {
  return (
    <div className="relative border-t border-border/70 p-4">
      <Link
        href="/settings"
        className="flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-[hsl(var(--panel-raised))] hover:text-foreground"
      >
        <Settings className="w-4 h-4 shrink-0" />
        <span>Configurações</span>
      </Link>
    </div>
  )
}
