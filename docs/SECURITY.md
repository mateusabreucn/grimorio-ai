# SECURITY.md — Regras de Segurança Obrigatórias

> Claude Code DEVE seguir estas regras em todo código gerado.
> Qualquer desvio é considerado bug crítico.

---

## 🔐 AUTENTICAÇÃO

### NextAuth.js v5
```typescript
// ✅ CORRETO — verificar sessão no servidor
import { auth } from "@/lib/auth"
const session = await auth()
if (!session?.user) redirect("/login")

// ❌ ERRADO — nunca confie apenas no cliente
// if (typeof window !== "undefined" && localStorage.getItem("user")) { ... }
```

### Senhas
```typescript
// ✅ CORRETO — sempre use bcryptjs com salt 12
import bcrypt from "bcryptjs"
const hash = await bcrypt.hash(password, 12)
const valid = await bcrypt.compare(password, hash)

// ❌ NUNCA armazene senha em texto puro
// ❌ NUNCA retorne password_hash em queries
```

### Queries que nunca devem retornar senha
```typescript
// ✅ CORRETO — exclua sempre o hash
const user = await db.select({
  id: users.id,
  email: users.email,
  name: users.name,
  // password_hash: NÃO INCLUIR
}).from(users).where(eq(users.email, email))

// ❌ ERRADO
const user = await db.select().from(users).where(...)  // retorna password_hash!
```

---

## 🛡️ VALIDAÇÃO DE INPUTS

### Todo endpoint de API DEVE validar com Zod
```typescript
// ✅ CORRETO
import { z } from "zod"

const messageSchema = z.object({
  content: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response("Unauthorized", { status: 401 })
  
  const body = await req.json()
  const parsed = messageSchema.safeParse(body)
  if (!parsed.success) return new Response("Bad Request", { status: 400 })
  
  // use apenas parsed.data daqui em diante
}

// ❌ ERRADO — nunca use dados não validados
export async function POST(req: Request) {
  const { content } = await req.json()  // sem validação!
  // ...
}
```

---

## 🗄️ BANCO DE DADOS

### Sempre use Drizzle ORM — zero SQL raw
```typescript
// ✅ CORRETO
const messages = await db
  .select()
  .from(messagesTable)
  .where(
    and(
      eq(messagesTable.conversationId, conversationId),
      eq(messagesTable.userId, session.user.id)  // isolamento por usuário!
    )
  )

// ❌ NUNCA faça isso
const messages = await db.execute(
  sql`SELECT * FROM messages WHERE conversation_id = ${conversationId}`
)
// (SQL injection se conversationId vier do cliente sem sanitização)
```

### Isolamento de dados por usuário
```typescript
// ✅ SEMPRE filtre por userId em dados sensíveis
.where(
  and(
    eq(table.id, resourceId),
    eq(table.userId, session.user.id)  // ← OBRIGATÓRIO
  )
)

// ❌ NUNCA busque recurso apenas por ID sem verificar ownership
.where(eq(table.id, resourceId))  // outro usuário pode acessar dados alheios!
```

---

## 🌐 API ROUTES

### Estrutura de autenticação em toda rota protegida
```typescript
// Template obrigatório para toda API route protegida
export async function POST(req: Request) {
  // 1. Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Rate limit
  const { success } = await ratelimit.limit(session.user.id)
  if (!success) {
    return Response.json({ error: "Too many requests" }, { status: 429 })
  }

  // 3. Validate input
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 })
  }

  // 4. Business logic com dados validados
  try {
    // ... sua lógica aqui usando parsed.data e session.user.id
  } catch (error) {
    console.error("[API_ROUTE_NAME]", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}
```

---

## 🤖 SEGURANÇA DO RAG SERVICE

### Autenticação interna obrigatória
```python
# ✅ CORRETO — toda rota do RAG service valida o secret
from fastapi import HTTPException, Header
import os

async def verify_internal_secret(authorization: str = Header(...)):
    expected = f"Bearer {os.getenv('RAG_INTERNAL_SECRET')}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.post("/search")
async def search(query: SearchQuery, _=Depends(verify_internal_secret)):
    # ...
```

### Nunca exponha o RAG service diretamente
```
Browser → [NEVER DIRECT] → RAG Service
Browser → Next.js API Route → RAG Service  ← CORRETO
```

---

## 🔑 VARIÁVEIS DE AMBIENTE

### Regras
1. Toda env var de segredos DEVE estar em `.env.local` (nunca commitado)
2. Todas as env vars DEVEM ter fallback de validação no startup
3. Env vars client-side (`NEXT_PUBLIC_*`) NUNCA devem conter segredos
4. A `GOOGLE_AI_API_KEY` é APENAS server-side

```typescript
// apps/web/src/lib/env.ts — validação de env vars no startup
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_AI_API_KEY: z.string(),
  RAG_SERVICE_URL: z.string().url(),
  RAG_INTERNAL_SECRET: z.string().min(32),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
})

export const env = envSchema.parse(process.env)
```

---

## 🚦 RATE LIMITING

```typescript
// apps/web/src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export const chatRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),  // 10 req/min por usuário
  analytics: false,
})

// Para usuários não logados: limite por IP
export const anonymousRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"),   // 3 req/min por IP
  analytics: false,
})
```

---

## 📋 CHECKLIST DE SEGURANÇA (rode antes de cada deploy)

```
AUTH
[ ] Toda rota /api/protected/* tem verificação de sessão
[ ] Não há dados de usuário retornados sem verificar ownership
[ ] password_hash nunca é retornado em nenhuma query

INPUTS
[ ] Todo endpoint POST/PUT/PATCH valida com Zod
[ ] Inputs de string têm .max() definido
[ ] IDs vindos do cliente são validados como UUID

BANCO
[ ] Zero SQL raw em todo o codebase (use: grep -r "db.execute" apps/web/src)
[ ] Toda query de dado sensível filtra por userId

ENV VARS
[ ] Nenhuma NEXT_PUBLIC_* contém segredo
[ ] .env.local está no .gitignore
[ ] .env.example está atualizado

API
[ ] Rate limiting ativo nas rotas de chat
[ ] RAG service não tem rota pública sem autenticação
[ ] CORS configurado para apenas o domínio de produção

DEPENDÊNCIAS
[ ] pnpm audit não tem vulnerabilidades críticas
```
