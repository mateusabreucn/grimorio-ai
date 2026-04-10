import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { BookOpen, Sparkles } from "lucide-react"

export const metadata: Metadata = { title: "Chat" }

export default async function ChatPage() {
  const session = await auth()

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="max-w-md space-y-6">
        {/* Ícone */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>

        {/* Boas-vindas */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            Bem-vindo, {session?.user?.name?.split(" ")[0] ?? "Aventureiro"}!
          </h1>
          <p className="text-muted-foreground">
            Sou o <span className="font-semibold text-foreground">Grimório</span>, seu
            assistente especialista nos livros de RPG. Pergunte sobre classes, builds,
            regras, habilidades e muito mais.
          </p>
        </div>

        {/* Exemplos */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>Experimente perguntar:</span>
          </div>
          <div className="grid gap-2">
            {[
              "Quais são as classes disponíveis?",
              "Qual é o melhor build para iniciantes?",
              "Como funciona o sistema de habilidades?",
              "Recomende uma build para jogar solo",
            ].map((example) => (
              <div
                key={example}
                className="rounded-lg border bg-card px-4 py-2.5 text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
              >
                {example}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60">
          O chat será implementado na Fase 3 do projeto
        </p>
      </div>
    </div>
  )
}
