import { MessageSquare, Plus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Placeholder para a Fase 3 — quando o chat for implementado
export function ConversationList() {
  return (
    <div className="flex flex-col gap-1 px-2">
      <Link
        href="/chat"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "transition-colors"
        )}
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Nova conversa</span>
      </Link>

      {/* Lista de conversas — implementada na Fase 3 */}
      <div className="mt-2 space-y-1">
        <p className="px-3 text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">
          Conversas
        </p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground/60">
            Suas conversas aparecerão aqui
          </p>
        </div>
      </div>
    </div>
  )
}
