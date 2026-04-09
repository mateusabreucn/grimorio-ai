# 🔮 Grimório AI

Chat conversacional com IA especializada em livros de RPG. Consulte regras, builds e recomendações diretamente dos seus livros favoritos.

## Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Auth:** NextAuth.js v5 (Google OAuth + email/senha)
- **Banco:** PostgreSQL + pgvector (Supabase)
- **RAG Service:** FastAPI + LangChain + pgvector (Render)
- **IA:** Gemini 2.5 Flash (Google AI Studio)
- **Deploy:** Vercel (web) + Render (rag-service)

## Funcionalidades

- 💬 Chat com IA especializada nos livros de RPG (RAG)
- 📚 Consulte classes, builds, regras e recomendações
- 🔐 Login com Google ou email/senha
- 📜 Histórico de conversas para usuários logados
- 📓 Journal para registrar sessões de campanha

## Setup para desenvolvimento

### Pré-requisitos
- Node.js 20+
- pnpm 9+
- Python 3.11+
- Conta no Supabase
- Conta no Google AI Studio
- Conta no Upstash

### 1. Clone e instale dependências
```bash
git clone https://github.com/seu-usuario/grimorio-ai
cd grimorio-ai
pnpm install
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example apps/web/.env.local
cp .env.example apps/rag-service/.env
# Edite os dois arquivos com suas credenciais
```

### 3. Configure o banco de dados
```bash
# No Supabase SQL Editor, execute:
# CREATE EXTENSION IF NOT EXISTS "pgcrypto";
# CREATE EXTENSION IF NOT EXISTS "vector";

pnpm db:generate
pnpm db:migrate
```

### 4. Instale dependências Python
```bash
cd apps/rag-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Ingira os livros de RPG
```bash
# Coloque os PDFs em:
# apps/rag-service/data/books/book_1.pdf
# apps/rag-service/data/books/book_2.pdf

# Edite apps/rag-service/scripts/ingest_books.py com os títulos corretos

pnpm rag:ingest
```

### 6. Rode em desenvolvimento
```bash
# Terminal 1 — Next.js
pnpm dev:web

# Terminal 2 — RAG Service
pnpm dev:rag
```

Acesse: http://localhost:3000

## Estrutura do projeto

```
grimorio-ai/
├── CLAUDE.md              ← guia para o Claude Code
├── docs/                  ← documentação técnica
├── apps/
│   ├── web/               ← Next.js app (Vercel)
│   └── rag-service/       ← FastAPI RAG (Render)
└── packages/
    └── shared-types/      ← tipos TypeScript compartilhados
```

## Documentação técnica

- [Arquitetura](docs/ARCHITECTURE.md)
- [Schema do banco](docs/DATABASE_SCHEMA.md)
- [Pipeline RAG](docs/RAG_PIPELINE.md)
- [Segurança](docs/SECURITY.md)
- [Guia de IA](docs/AI_USAGE_GUIDE.md)
- [Fases do projeto](docs/PHASES.md)
- [Tarefas humano vs IA](docs/HUMAN_TASKS.md)
