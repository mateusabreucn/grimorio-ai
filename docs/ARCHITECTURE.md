# ARCHITECTURE.md — Arquitetura do Grimório AI

---

## VISÃO GERAL

```
┌─────────────────────────────────────────────────┐
│                   BROWSER                        │
│         Next.js (React, Vercel AI SDK)          │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────┐
│              VERCEL (Next.js)                    │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  App Router  │  │     API Routes           │ │
│  │  (RSC + SSR) │  │  /api/chat               │ │
│  └──────────────┘  │  /api/journal            │ │
│                    │  /api/auth (NextAuth)     │ │
│                    └──────────┬───────────────┘ │
└───────────────────────────────│─────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
   ┌──────────▼──────┐  ┌───────▼────────┐  ┌────▼──────────┐
   │   SUPABASE      │  │  RENDER        │  │  GOOGLE AI    │
   │   PostgreSQL    │  │  FastAPI RAG   │  │  Gemini Flash │
   │   + pgvector    │  │  /search       │  │  Embeddings   │
   └─────────────────┘  └───────┬────────┘  └───────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   SUPABASE           │
                    │   PostgreSQL         │
                    │   document_chunks    │
                    │   (vetores)          │
                    └──────────────────────┘
```

---

## DECISÕES TÉCNICAS E JUSTIFICATIVAS

### Por que Next.js 14 App Router?
- Server Components eliminam round-trips desnecessários
- Streaming nativo com `ReadableStream` para respostas da IA
- API Routes colocadas junto ao frontend (menos infra)
- NextAuth.js v5 tem integração nativa

### Por que FastAPI separado para o RAG?
- Bibliotecas RAG (LangChain, pgvector) são Python-first
- Separação de responsabilidades: Next.js não precisa de Python runtime
- Escala independente do frontend
- Render free tier suficiente para uso inicial

### Por que PostgreSQL + pgvector ao invés de Pinecone/Qdrant?
- Um banco só para dados relacionais E vetoriais
- Supabase gerencia tudo, zero infra adicional
- pgvector com IVFFlat index é suficiente para até ~100k chunks
- Economiza $20-100/mês vs serviços vetoriais separados

### Por que Drizzle ORM ao invés de Prisma?
- TypeScript-first com inferência de tipos perfeita
- SQL explícito — você sabe exatamente o que está executando
- Mais leve que Prisma para edge runtime da Vercel
- Migrations mais previsíveis

### Por que Gemini 2.5 Flash como LLM de runtime?
- Gratuito via Google AI Studio
- 1M tokens de contexto (comporta histórico longo + muitos chunks)
- Velocidade adequada para streaming em chat
- Fácil de trocar para Pro se necessário

### Por que text-embedding-004 para embeddings?
- Gratuito via Google AI Studio
- 768 dimensões — boa qualidade com baixo custo de armazenamento
- Mesmo provedor que o LLM (consistência)

---

## FLUXO DE AUTENTICAÇÃO

```
Usuário acessa /chat
      ↓
middleware.ts verifica sessão NextAuth
      ↓
  Tem sessão?
  ├─ NÃO → modo anônimo (chat sem histórico)
  └─ SIM → acesso completo (histórico + journal)
      ↓
Login disponível em /login
├─ Credentials: email + senha → bcryptjs verify
└─ Google OAuth → NextAuth Google Provider
```

---

## FLUXO DE UMA MENSAGEM NO CHAT

```
1. Usuário digita mensagem
2. useChat (Vercel AI SDK) envia POST /api/chat
3. API Route:
   a. Verifica sessão (auth())
   b. Verifica rate limit (Upstash Redis)
   c. Valida input (Zod)
   d. Busca histórico (últimas 10 msgs, se logado)
   e. Chama RAG service: POST /search
4. RAG service:
   a. Verifica RAG_INTERNAL_SECRET
   b. Gera embedding da mensagem
   c. Busca top-5 chunks similares no pgvector
   d. Retorna chunks com metadata
5. API Route monta prompt final:
   - System prompt do Grimório
   - Chunks dos livros como contexto
   - Histórico de mensagens
   - Mensagem do usuário
6. Chama Gemini 2.5 Flash via Vercel AI SDK
7. Streaming da resposta via ReadableStream
8. Ao finalizar: salva msgs no banco (se logado)
9. Auto-gera título da conversa (primeira msg)
```

---

## RATE LIMITS E LIMITES

| Recurso | Usuário anônimo | Usuário logado |
|---------|----------------|----------------|
| Mensagens no chat | 3/min por IP | 10/min por userId |
| Conversas salvas | 0 | ilimitadas |
| Entradas de Journal | 0 | ilimitadas |
| Tamanho da mensagem | 1000 chars | 4000 chars |
| Histórico incluído | 0 msgs | últimas 10 |

---

## VARIÁVEIS DE AMBIENTE POR SERVIÇO

### apps/web (.env.local)
| Var | Obrigatória | Descrição |
|-----|-------------|-----------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL |
| `NEXTAUTH_SECRET` | ✅ | JWT secret (min 32 chars) |
| `NEXTAUTH_URL` | ✅ | URL base da aplicação |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth |
| `GOOGLE_AI_API_KEY` | ✅ | Gemini API (server-only) |
| `RAG_SERVICE_URL` | ✅ | URL do Render service |
| `RAG_INTERNAL_SECRET` | ✅ | Auth entre serviços |
| `UPSTASH_REDIS_REST_URL` | ✅ | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Rate limiting |

### apps/rag-service (.env)
| Var | Obrigatória | Descrição |
|-----|-------------|-----------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL |
| `GOOGLE_AI_API_KEY` | ✅ | Embeddings |
| `RAG_INTERNAL_SECRET` | ✅ | Auth entre serviços |
