import { Sword } from "lucide-react"
import { auth } from "@/lib/auth"
import { HeaderUserMenu } from "@/components/shared/header-user-menu"

export default async function PersonaPage() {
  const session = await auth()
  
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="relative flex shrink-0 items-center justify-between gap-6 border-b border-border/70 px-5 py-5 md:px-8 md:py-6">
        <div className="min-w-0">
          <div className="font-rune mb-2 flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.28em]">
            <span className="text-primary">Herói</span>
            <span className="h-1 w-1 rotate-45 bg-primary" />
            <span className="truncate text-[hsl(var(--ink-faint))]">Ficha de Personagem</span>
          </div>
          <h1 className="font-display max-w-3xl truncate text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-foreground md:text-4xl">
            Persona
          </h1>
        </div>

        {session?.user && (
          <div className="hidden shrink-0 md:block">
            <HeaderUserMenu user={session.user} />
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 mb-6 shadow-[0_0_30px_hsl(var(--amber-glow))]">
          <Sword className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest mb-2 text-foreground">Em Breve</h1>
        <p className="text-muted-foreground max-w-sm">
          O sistema de fichas e gestão de personagens será adicionado em breve ao Grimório.
        </p>
      </div>
    </div>
  )
}
