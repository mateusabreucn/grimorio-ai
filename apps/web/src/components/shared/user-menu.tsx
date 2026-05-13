"use client"

import { useState, useRef, useEffect } from "react"
import { signOut } from "next-auth/react"
import { LogOut, User, UserCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface UserMenuProps {
  user: {
    name?:  string | null
    email?: string | null
    image?: string | null
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false)
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

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-xl",
          "hover:bg-accent/60 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring",
        )}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "Usuário"}
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
            {initials ?? <User className="w-4 h-4" />}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium truncate">{user.name ?? "Usuário"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <div className="p-1.5">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent/60 transition-colors"
            >
              <UserCircle className="w-4 h-4 text-muted-foreground" />
              Perfil
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/chat" })}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
                "text-destructive/80 hover:bg-destructive/10",
                "transition-colors",
              )}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
