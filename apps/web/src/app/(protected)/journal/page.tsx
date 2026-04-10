import type { Metadata } from "next"
import { ScrollText } from "lucide-react"

export const metadata: Metadata = { title: "Journal" }

export default function JournalPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="max-w-md space-y-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
          <ScrollText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Journal de Campanha</h1>
        <p className="text-muted-foreground">
          Registre suas sessões de RPG, acompanhe eventos, NPCs e a progressão dos
          seus personagens. O Journal será implementado na Fase 4.
        </p>
      </div>
    </div>
  )
}
