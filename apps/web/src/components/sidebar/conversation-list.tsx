import { MessageSquare, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getConversations, deleteConversation } from "@/actions/chat"
import { Button } from "@/components/ui/button"

export async function ConversationList() {
  const conversations = await getConversations()

  return (
    <div className="flex flex-col gap-1 px-2">
      {/* Botão nova conversa */}
      <Link
        href="/chat"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "transition-colors",
        )}
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Nova conversa</span>
      </Link>

      {/* Lista de conversas */}
      <div className="mt-2 space-y-0.5">
        <p className="px-3 py-1 text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">
          Conversas
        </p>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="w-7 h-7 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground/60">
              Suas conversas aparecerão aqui
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              id={conv.id}
              title={conv.title}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ConversationItem({ id, title }: { id: string; title: string }) {
  return (
    <div className="group flex items-center gap-1 rounded-lg hover:bg-accent transition-colors">
      <Link
        href={`/chat/${id}`}
        className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground min-w-0"
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{title}</span>
      </Link>

      {/* Botão de deletar (visível no hover) */}
      <form
        action={async () => {
          "use server"
          await deleteConversation(id)
        }}
      >
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity mr-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="sr-only">Deletar conversa</span>
        </Button>
      </form>
    </div>
  )
}
