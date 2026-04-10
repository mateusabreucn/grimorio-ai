"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Plus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  title: string
}

export function ChatNav({ conversations }: { conversations: Conversation[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(pathname.startsWith("/chat"))

  return (
    <div>
      {/* Botão principal do dropdown */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
          "text-foreground hover:bg-accent/60 transition-colors",
          pathname.startsWith("/chat") && "bg-accent/40",
        )}
      >
        <MessageSquare className="w-4 h-4 shrink-0 text-primary" />
        <span className="flex-1 text-left">Chat</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown aberto */}
      {open && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-border/60 pl-3">
          <Link
            href="/chat"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
              "text-muted-foreground hover:text-foreground hover:bg-accent/40",
              "transition-colors",
              pathname === "/chat" && "text-foreground bg-accent/30",
            )}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Nova conversa</span>
          </Link>

          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
                "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                "transition-colors",
                pathname === `/chat/${conv.id}` && "text-foreground bg-accent/30",
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-40" />
              <span className="truncate">{conv.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
