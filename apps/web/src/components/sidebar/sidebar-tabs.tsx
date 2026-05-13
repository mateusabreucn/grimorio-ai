"use client"

import { MessageSquare, PenLine, Sword } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "chat", href: "/chat", label: "Chat", icon: MessageSquare },
  { id: "journal", href: "/journal", label: "Journal", icon: PenLine },
  { id: "persona", href: "/persona", label: "Persona", icon: Sword },
]

export function SidebarTabs() {
  const pathname = usePathname()
  
  // Identifica qual aba está ativa com base na URL
  const activeTab = tabs.find(tab => 
    pathname === tab.href || (tab.href !== "/chat" && pathname.startsWith(tab.href))
  ) || tabs[0]

  return (
    <div className="relative px-4 pt-5">
      <div className="relative grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-[hsl(var(--panel-raised))] p-1 shadow-inner overflow-hidden">
        {/* Background Animado (Toggle) */}
        <motion.div
          className="absolute inset-y-1 rounded-lg bg-primary shadow-[0_10px_30px_-18px_hsl(var(--primary))]"
          initial={false}
          animate={{
            left: `calc(${tabs.indexOf(activeTab) * 33.33}% + 4px)`,
            width: "calc(33.33% - 6px)",
          }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />

        {tabs.map((tab) => {
          const isActive = activeTab.id === tab.id
          const Icon = tab.icon

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold transition-colors duration-200",
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
