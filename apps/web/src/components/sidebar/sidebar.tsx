import { getConversations } from "@/actions/chat"
import { SidebarContent } from "./sidebar-content"

export async function Sidebar() {
  const conversations = await getConversations()

  return (
    <aside className="relative hidden h-full w-[19rem] shrink-0 border-r border-border/70 md:flex">
      <SidebarContent conversations={conversations} />
    </aside>
  )
}
