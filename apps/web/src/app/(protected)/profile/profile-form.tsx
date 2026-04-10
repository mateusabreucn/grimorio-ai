"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ProfileFormProps {
  user: {
    name: string
    email: string
    image: string | null | undefined
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name}
            width={64}
            height={64}
            className="w-16 h-16 rounded-2xl object-cover border border-border/60"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/10 flex items-center justify-center text-primary text-xl font-bold">
            {initials || <User className="w-7 h-7" />}
          </div>
        )}
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Nome */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(
            "w-full rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary/30",
          )}
          placeholder="Seu nome"
        />
      </div>

      {/* Email (somente leitura) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">E-mail</label>
        <div className="w-full rounded-xl border border-border/40 bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
          {user.email}
        </div>
        <p className="text-xs text-muted-foreground/50">O e-mail não pode ser alterado.</p>
      </div>

      {/* Salvar */}
      <button
        type="submit"
        disabled={saving || !name.trim() || name === user.name}
        className={cn(
          "rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium",
          "hover:bg-primary/90 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
      </button>
    </form>
  )
}
