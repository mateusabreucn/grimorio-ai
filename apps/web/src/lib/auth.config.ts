import type { NextAuthConfig } from "next-auth"

/**
 * Configuração base do NextAuth — segura para Edge Runtime (middleware).
 * NÃO importa bcryptjs, postgres, ou qualquer módulo Node-only.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [], // Providers reais ficam em auth.ts (Node runtime)
} satisfies NextAuthConfig
