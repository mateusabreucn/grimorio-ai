# CLAUDE.md — apps/web (Next.js)

> Instruções específicas para o app Next.js.
> Leia também o CLAUDE.md raiz e docs/SECURITY.md.

---

## ESTRUTURA DE PASTAS (siga exatamente)

```
src/
├── app/
│   ├── layout.tsx                    ← root layout com providers
│   ├── page.tsx                      ← redirect para /chat
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   └── (protected)/                  ← rotas que requerem auth
│       ├── layout.tsx                ← verifica sessão
│       ├── chat/
│       │   ├── page.tsx              ← nova conversa
│       │   └── [id]/
│       │       └── page.tsx          ← conversa existente
│       └── journal/
│           ├── page.tsx              ← lista de entradas
│           └── [id]/
│               └── page.tsx          ← entrada individual
├── components/
│   ├── ui/                           ← shadcn/ui (não edite manualmente)
│   ├── chat/
│   │   ├── chat-interface.tsx        ← container do chat
│   │   ├── message-list.tsx          ← lista de mensagens
│   │   ├── message-bubble.tsx        ← bolha de mensagem
│   │   └── chat-input.tsx            ← campo de input
│   ├── sidebar/
│   │   ├── sidebar.tsx               ← sidebar principal
│   │   ├── conversation-list.tsx     ← lista de chats
│   │   └── journal-list.tsx          ← lista de journal entries
│   ├── journal/
│   │   ├── journal-editor.tsx        ← editor de entrada
│   │   └── journal-chat.tsx          ← chat do journal
│   └── shared/
│       ├── navbar.tsx
│       └── user-menu.tsx
├── lib/
│   ├── auth.ts                       ← config NextAuth
│   ├── env.ts                        ← validação de env vars
│   ├── db/
│   │   ├── index.ts                  ← instância Drizzle
│   │   └── schema.ts                 ← schema (fonte da verdade)
│   ├── rag/
│   │   └── client.ts                 ← cliente HTTP para o RAG service
│   ├── ai/
│   │   ├── prompts.ts                ← system prompts
│   │   └── stream.ts                 ← helpers de streaming
│   └── validations/
│       ├── auth.ts                   ← schemas Zod de auth
│       ├── chat.ts                   ← schemas Zod de chat
│       └── journal.ts                ← schemas Zod de journal
├── actions/                          ← Server Actions
│   ├── chat.ts
│   ├── journal.ts
│   └── auth.ts
└── middleware.ts                     ← proteção de rotas
```

---

## CONVENÇÕES DE CÓDIGO

### Componentes
- Sempre use `"use client"` apenas quando necessário (hooks, eventos)
- Prefira Server Components para componentes sem interatividade
- Props sempre tipadas com interface explícita

```typescript
// ✅ CORRETO
interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

export function MessageBubble({ role, content, createdAt }: MessageBubbleProps) {
  // ...
}

// ❌ ERRADO
export function MessageBubble(props: any) { ... }
```

### API Routes
- Sempre use o template de segurança de `docs/SECURITY.md`
- Arquivo: `app/api/[recurso]/route.ts`
- Nomeie claramente: `/api/chat/messages`, `/api/journal/entries`

### Server Actions
- Use para mutações simples que não precisam de streaming
- Sempre valide com Zod mesmo em Server Actions
- Prefixe com o domínio: `createConversation`, `deleteJournalEntry`

---

## SHADCN/UI

Instale componentes via CLI — nunca copie manualmente:
```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add textarea
pnpm dlx shadcn@latest add scroll-area
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add avatar
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add toast
pnpm dlx shadcn@latest add skeleton
```

---

## STREAMING DO CHAT

Use o Vercel AI SDK — não implemente streaming manualmente:

```typescript
// app/api/chat/route.ts
import { streamText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: Request) {
  // ... auth, rate limit, validation ...
  
  const result = await streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: formattedMessages,
  })
  
  return result.toDataStreamResponse()
}

// Componente cliente
import { useChat } from "ai/react"

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  })
  // ...
}
```

---

## MIDDLEWARE DE PROTEÇÃO

```typescript
// middleware.ts
import { auth } from "@/lib/auth"

export default auth((req) => {
  const isProtected = req.nextUrl.pathname.startsWith("/(protected)")
  if (isProtected && !req.auth) {
    return Response.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```
