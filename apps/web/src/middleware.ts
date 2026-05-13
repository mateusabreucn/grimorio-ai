import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Journal, Persona, Chat (logado) e Settings requerem auth
  const isProtectedRoute = 
    pathname.startsWith("/journal") || 
    pathname.startsWith("/persona") || 
    pathname.startsWith("/chat") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/profile")

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register")

  if (isProtectedRoute && !isLoggedIn) {
    // Se for chat, permite o acesso público mas sem a proteção de rota logada
    // (O layout tratará a exibição do modo visitante)
    if (pathname.startsWith("/chat")) return NextResponse.next()
    
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/chat", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
