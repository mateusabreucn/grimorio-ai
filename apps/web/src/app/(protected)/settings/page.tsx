import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <h1 className="text-xl font-bold mb-6">Configurações</h1>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
          <Settings className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">
          As configurações serão adicionadas em breve.
        </p>
      </div>
    </div>
  )
}
