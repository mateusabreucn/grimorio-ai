import { MessageSquare, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getConversations, deleteConversation } from "@/actions/chat"
import { Button } from "@/components/ui/button"

export async function ConversationList() {
  const conversations = await getConversations()

  return (
    <div className="flex flex-col gap-1 px-3">
      {/* Nova conversa */}
      <Link
        href="/chat"
        className={cn(
          "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm",
          "text-muted-foreground hover:text-foreground hover:bg-accent/60",
          "border border-dashed border-border/60 hover:border-primary/20",
          "transition-all",
        )}
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>Nova conversa</span>
      </Link>

      {/* Lista */}
      <div className="mt-3 space-y-0.5">
        <p className="px-3 py-1 text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-widest">
          Histórico
        </p>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquare className="w-6 h-6 text-muted-foreground/25 mb-2" />
            <p className="text-xs text-muted-foreground/40">
              Sem conversas ainda
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
    <div className="group flex items-center gap-1 rounded-xl hover:bg-accent/40 transition-colors">
      <Link
        href={`/chat/${id}`}
        className="flex-1 flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground min-w-0"
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-40" />
        <span className="truncate">{title}</span>
      </Link>

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
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity mr-1 text-muted-foreground/50 hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="sr-only">Deletar</span>
        </Button>
      </form>
    </div>
  )
}
