import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Grimório AI",
    template: "%s | Grimório AI",
  },
  description: "Seu assistente especialista em RPG — consulte regras, builds e estratégias dos livros.",
  keywords: ["RPG", "grimório", "inteligência artificial", "regras", "builds"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
