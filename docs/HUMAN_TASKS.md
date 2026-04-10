# HUMAN_TASKS.md — O que EU faço vs o que a IA faz

> Guia claro para o desenvolvedor sobre responsabilidades.
> Evita que você passe tarefas para a IA que ela não deve fazer
> (configurações de infra, segredos, deploys).

---

## 🧑 TAREFAS DO HUMANO (você faz, não a IA)

### Infra e Contas (antes de começar)
- [ ] Criar projeto no Supabase e habilitar extensão `pgvector`
- [ ] Criar app no Google Cloud Console para OAuth
- [ ] Criar conta no Render e conectar repositório
- [ ] Criar conta no Upstash e criar banco Redis
- [ ] Conectar repositório GitHub ao Vercel
- [ ] Adicionar variáveis de ambiente na Vercel
- [ ] Adicionar variáveis de ambiente no Render

### SQL manual no Supabase (após migration)
```sql
-- Executar uma vez após a migration inicial
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Executar após ingestão dos PDFs
CREATE INDEX ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 64);
```

### Ingestão dos PDFs (você executa o script)
```bash
# Coloque os PDFs em:
apps/rag-service/data/books/book_1.pdf
apps/rag-service/data/books/book_2.pdf

# Edite o script com os nomes corretos:
apps/rag-service/scripts/ingest_books.py (linhas BOOKS = [...])

# Execute:
pnpm rag:ingest
```

### Deploy (você faz, nunca a IA)
```bash
git push origin main  # Vercel faz deploy automático
# Render: deploy automático via git push ou manual no dashboard
```

### Revisar antes de aplicar migrations
Quando a IA rodar `/db-migrate`, revise o SQL gerado antes de confirmar.

---

## 🤖 TAREFAS DA IA (Claude Code faz)

### Fase 1 — Fundação
- Setup do monorepo (package.json, tsconfig, etc.)
- Estrutura de pastas do Next.js
- Schema Drizzle e migration
- Config NextAuth.js
- Middleware de proteção de rotas
- Layout e páginas base
- Componentes de login/register
- Validações Zod

### Fase 2 — RAG Service
- Estrutura do FastAPI
- Serviços de embeddings e vector store
- Endpoint `/search`
- Script de ingestão (você executa, ela escreve)
- Pydantic schemas
- Testes do service

### Fase 3 — Chat
- Integração Vercel AI SDK
- API route do chat com streaming
- Componentes de chat (interface, messages, input)
- Orquestração RAG → Gemini
- Histórico de conversas
- Rate limiting

### Fase 4 — Journal
- Componentes do journal
- API routes do journal
- Chat do journal com system prompt específico
- CRUD de entradas

### Fase 5 — Polish
- Error boundaries
- Loading states / skeletons
- SEO e metadata
- Testes E2E básicos
- README.md

---

## 🔄 PROTOCOLO DE TRABALHO DIÁRIO

### Início de sessão (você faz)
1. Abra o Claude Code
2. Digite: "Leia o CLAUDE.md e docs/PHASES.md e me diga o status atual"
3. Defina UM objetivo claro para a sessão
4. Comunique ao Claude: "O objetivo de hoje é: [objetivo específico]"

### Durante a sessão
- Se Claude propor mudança de arquitetura → revise antes de aprovar
- Se Claude pedir para fazer deploy → você faz, não ele
- Se Claude pedir confirmação de migration → revise o SQL primeiro
- Use `/compact` quando o contexto ficar longo

### Fim de sessão (você faz)
1. Revise o código gerado
2. Rode os testes: `pnpm test`
3. Atualize `docs/PHASES.md` com os itens concluídos
4. Faça commit: `git commit -m "feat: [o que foi feito]"`
5. Faça push: `git push origin main`

---

## 📋 CHECKLIST DE SEGURANÇA ANTES DE CADA DEPLOY

Execute no Claude Code:
```
/security-check apps/web/src/app/api
/security-check apps/web/src/lib/auth.ts
/security-check apps/rag-service/routers
```

Só faça deploy se todos os checks passarem.

---

## 🆘 QUANDO PEDIR AJUDA EXTRA

### Use Gemini 2.5 Pro (Google AI Studio) quando:
- Precisar analisar os PDFs dos livros inteiros para validar o RAG
- O contexto do Claude Code estiver muito longo e lento
- Quiser uma segunda opinião sobre uma decisão de arquitetura

### Use Claude Opus 4.6 quando:
- Um bug levar mais de 30 minutos sem resolução
- Estiver tomando uma decisão que afeta toda a arquitetura
- O pipeline RAG não estiver funcionando e o problema não for óbvio

### Sinais de que algo está errado com a IA:
- Está alterando arquivos fora da fase atual → pare e redirecione
- Está propondo adicionar muitos pacotes novos → questione a necessidade
- Está mudando o schema sem avisar → reverta e exija migration
- Está escrevendo código sem validação → peça para refazer com Zod
