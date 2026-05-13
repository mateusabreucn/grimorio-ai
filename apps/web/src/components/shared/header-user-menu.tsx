"use client"

import { useState, useRef, useEffect } from "react"
import { signOut } from "next-auth/react"
import { LogOut, UserCircle, ChevronDown, Menu } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/sidebar/sidebar-content"
import { getConversations } from "@/actions/chat"

interface HeaderUserMenuProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function HeaderUserMenu({ user }: HeaderUserMenuProps) {
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<{id: string, title: string}[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    getConversations().then(setConversations).catch(console.error)
  }, [])

  const name = user.name || "Mestre"
  const initials = name[0].toUpperCase()

  return (
    <div className="flex items-center gap-2 md:gap-4" ref={ref}>
      {/* Menu Mobile */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-[hsl(var(--panel-raised))] transition-colors hover:border-primary/45 md:hidden">
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[19rem] border-r-border/70 overflow-hidden">
          <SidebarContent conversations={conversations} />
        </SheetContent>
      </Sheet>

      <ThemeToggle className="h-10 w-10 border-border/70 bg-black/5 backdrop-blur-sm hidden md:flex" />
      
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2 md:gap-4 rounded-2xl border border-border/70 bg-[hsl(var(--panel-raised))] p-1.5 md:p-2 transition-all hover:border-primary/45",
            open && "border-primary/45 ring-2 ring-primary/10"
          )}
        >
          <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--amber-deep))] font-display text-sm md:text-base font-bold text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--primary))]">
            {initials}
          </div>
          <div className="hidden min-w-[100px] flex-col text-left md:flex">
            <span className="truncate text-sm font-bold leading-tight">{name}</span>
            <span className="mt-1 font-rune text-[0.7rem] leading-none text-primary uppercase tracking-wider">Herói de Arton</span>
          </div>
          <ChevronDown className={cn("hidden md:block h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/70 bg-popover shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="p-1.5">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <UserCircle className="w-4 h-4 text-muted-foreground" />
                Perfil do Mestre
              </Link>
              <div className="my-1 border-t border-border/50 md:hidden" />
              <div className="md:hidden flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">Tema</span>
                <ThemeToggle className="h-8 w-8" />
              </div>
              <div className="my-1 border-t border-border/50" />
              <button
                onClick={() => signOut({ callbackUrl: "/chat" })}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair do Sistema
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
