"use client"

import { useState, useRef, useEffect } from "react"
import { signOut } from "next-auth/react"
import { LogOut, User } from "lucide-react"
import Image from "next/image"
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
          "flex items-center justify-center w-9 h-9 rounded-lg",
          "hover:bg-accent transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring"
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
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
            {initials ?? <User className="w-4 h-4" />}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover shadow-md z-50">
          <div className="px-3 py-3 border-b">
            <p className="text-sm font-medium truncate">{user.name ?? "Usuário"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <div className="p-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                "text-destructive hover:bg-destructive/10",
                "transition-colors"
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
