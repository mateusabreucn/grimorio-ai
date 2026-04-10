import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { BookOpen } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = { title: "Entrar" }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Grimório AI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Seu assistente especialista em RPG
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Entrar na conta</h2>
            <p className="text-sm text-muted-foreground">
              Bem-vindo de volta, aventureiro
            </p>
          </div>

          <LoginForm />

          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
