# CLAUDE.md — Grimório AI

> Guia completo para o Claude Code. Leia este arquivo INTEIRO antes de qualquer ação.
> Atualizado a cada fase concluída pelo desenvolvedor humano.

---

## 🗺️ O QUE É ESTE PROJETO

**Grimório AI** é um chat conversacional especializado em dois livros de RPG (fornecidos como PDF).
A IA conhece os livros via RAG (Retrieval-Augmented Generation) e responde sobre classes, builds,
regras e recomendações. Usuários podem usar sem login, mas logados têm histórico de chats e um
Journal para registrar sessões de RPG.

**Monorepo com dois apps:**
- `apps/web` → Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui — hospedado na **Vercel**
- `apps/rag-service` → FastAPI (Python 3.11), LangChain, pgvector — hospedado no **Render**

**Banco:** PostgreSQL + pgvector via **Supabase** (já tem conta)

---

## 📁 ESTRUTURA DO MONOREPO

```
grimorio-ai/
├── CLAUDE.md                    ← ESTE ARQUIVO (leia sempre)
├── .claude/
│   ├── settings.json            ← permissões e comportamento do Claude Code
│   └── commands/                ← comandos slash customizados
│       ├── new-phase.md
│       ├── security-check.md
│       └── db-migrate.md
├── docs/
│   ├── ARCHITECTURE.md          ← arquitetura detalhada com diagramas
│   ├── DATABASE_SCHEMA.md       ← schema completo do PostgreSQL
│   ├── RAG_PIPELINE.md          ← como funciona o pipeline RAG
│   ├── SECURITY.md              ← regras de segurança obrigatórias
│   ├── AI_USAGE_GUIDE.md        ← qual IA usar para cada tarefa
│   └── PHASES.md                ← fases do projeto com status
├── apps/
│   ├── web/                     ← Next.js app
│   │   ├── CLAUDE.md            ← instruções específicas do frontend
│   │   └── ...
│   └── rag-service/             ← FastAPI app
│       ├── CLAUDE.md            ← instruções específicas do RAG service
│       └── ...
├── packages/
│   └── shared-types/            ← tipos TypeScript compartilhados
└── .env.example                 ← TODAS as variáveis necessárias documentadas
```

---

## 🤖 REGRAS ABSOLUTAS PARA O CLAUDE CODE

### ✅ SEMPRE faça
- Leia o `docs/PHASES.md` para saber qual fase está ativa antes de codar
- Leia o `docs/SECURITY.md` antes de criar qualquer endpoint ou função de auth
- Escreva tipos TypeScript explícitos — **nunca use `any`**
- Valide inputs no servidor com **Zod** em TODA rota de API
- Use variáveis de ambiente para TODOS os segredos — nunca hardcode
- Crie testes para funções críticas (auth, RAG pipeline, chat history)
- Prefira `server actions` do Next.js para mutações simples
- Documente funções complexas com JSDoc/docstrings
- Faça commit atômico por feature concluída

### ❌ NUNCA faça
- **NUNCA** exponha a `GOOGLE_AI_API_KEY` no client-side (apenas server-side)
- **NUNCA** faça queries SQL raw sem parameterização — use sempre Drizzle ORM
- **NUNCA** armazene senha em texto puro — use `bcryptjs` com salt 12
- **NUNCA** confie em dados do cliente sem revalidar no servidor
- **NUNCA** implemente lógica de negócio em componentes React
- **NUNCA** instale pacotes sem verificar se já existe equivalente no projeto
- **NUNCA** modifique `DATABASE_SCHEMA.md` sem criar migration correspondente
- **NUNCA** commite `.env` ou qualquer arquivo com segredos reais
- **NUNCA** pule validação de auth em rotas que retornam dados de usuário
- **NUNCA** faça duas fases ao mesmo tempo — uma fase por vez

### ⚠️ PERGUNTE AO HUMANO antes de
- Alterar o schema do banco (pode quebrar dados existentes)
- Mudar a estrutura de autenticação
- Adicionar um novo pacote de dependência grande (>500kb)
- Fazer deploy em produção
- Alterar configurações de CORS ou CSP
- Mudar a estratégia de chunking do RAG (afeta qualidade das respostas)

---

## 🏗️ FASE ATUAL

> **Consulte sempre `docs/PHASES.md` para o status atual.**
> O humano atualiza esse arquivo ao concluir cada fase.

---

## 🔐 RESUMO DE SEGURANÇA (detalhes em `docs/SECURITY.md`)

1. **Auth:** NextAuth.js v5 com JWT + adapter Drizzle para PostgreSQL
2. **Senhas:** bcryptjs salt 12, nunca retornadas em queries
3. **API Routes:** middleware de auth em todas as rotas `/api/protected/*`
4. **RAG Service:** comunicação interna autenticada via `RAG_INTERNAL_SECRET`
5. **CORS:** apenas origins permitidas em produção
6. **Rate limiting:** `@upstash/ratelimit` nas rotas de chat (10 req/min por usuário)
7. **CSP headers:** configurados no `next.config.ts`
8. **SQL:** Drizzle ORM sempre — zero SQL raw
9. **Uploads:** PDFs apenas no server, nunca expostos publicamente
10. **Env vars:** separadas por app, validadas com Zod no startup

---

## 🗄️ BANCO DE DADOS (resumo, detalhes em `docs/DATABASE_SCHEMA.md`)

- **ORM:** Drizzle ORM (TypeScript-first, zero magic)
- **Migrations:** `drizzle-kit` — SEMPRE gere migration ao mudar schema
- **Conexão:** pool via `@neondatabase/serverless` ou `postgres` (Supabase)
- **Vetores:** extensão `pgvector` — tabela `document_chunks` com `embedding vector(1536)`

Tabelas principais:
- `users` — id, name, email, password_hash, provider, created_at
- `conversations` — id, user_id, title, created_at, updated_at
- `messages` — id, conversation_id, role, content, created_at
- `journal_entries` — id, user_id, title, content, session_date, created_at
- `document_chunks` — id, book_id, content, metadata, embedding vector(1536)

---

## 🧠 STACK COMPLETA

### Frontend (`apps/web`)
```
next@14           → App Router, Server Components, Streaming
typescript@5      → strict mode
tailwindcss@3     → styling
shadcn/ui         → componentes (instale via CLI, não copie manualmente)
next-auth@5       → autenticação
drizzle-orm       → ORM + migrations
zod               → validação
@ai-sdk/google    → Vercel AI SDK com Gemini
ai                → Vercel AI SDK (useChat, streaming)
bcryptjs          → hash de senhas
@upstash/ratelimit → rate limiting
```

### RAG Service (`apps/rag-service`)
```
fastapi           → API framework
langchain         → RAG pipeline
langchain-google-genai → Gemini embeddings + LLM
pypdf2 / pdfplumber → extração de texto dos PDFs
pgvector          → client pgvector Python
psycopg2-binary   → PostgreSQL driver
python-dotenv     → variáveis de ambiente
pydantic          → validação de dados
uvicorn           → ASGI server
```

---

## 📡 COMUNICAÇÃO ENTRE SERVIÇOS

```
Browser → Next.js API Routes → RAG Service (FastAPI)
                ↓                      ↓
          PostgreSQL (auth,      PostgreSQL (vetores,
          chat history)          document_chunks)
```

O Next.js chama o RAG service via HTTP interno com header:
`Authorization: Bearer ${process.env.RAG_INTERNAL_SECRET}`

O RAG service NUNCA é exposto diretamente ao browser.

---

## 📋 COMANDOS ÚTEIS

```bash
# Instalar dependências (monorepo com pnpm workspaces)
pnpm install

# Rodar em desenvolvimento
pnpm dev:web          # Next.js na porta 3000
pnpm dev:rag          # FastAPI na porta 8000

# Banco de dados
pnpm db:generate      # gera migration Drizzle
pnpm db:migrate       # aplica migrations
pnpm db:studio        # Drizzle Studio (visualizar dados)

# RAG
pnpm rag:ingest       # indexa os PDFs dos livros

# Testes
pnpm test             # todos os testes
pnpm test:web         # apenas frontend
pnpm test:rag         # apenas RAG service

# Build
pnpm build            # build de produção
```
