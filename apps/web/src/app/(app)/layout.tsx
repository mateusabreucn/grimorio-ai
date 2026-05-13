import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar/sidebar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const user = session?.user

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {user && <Sidebar />}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
