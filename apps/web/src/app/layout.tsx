import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

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
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
