# PHASES.md — Roadmap do Grimório AI

> O humano atualiza o STATUS de cada fase ao concluir.
> O Claude Code lê este arquivo antes de qualquer sessão de trabalho.

---

## STATUS ATUAL

```
FASE ATIVA: 2 — RAG Service
PROGRESSO:  [ ] Não iniciado
```

---

## FASE 1 — Fundação e Infraestrutura
**Estimativa:** Dia 1-2  
**Quem faz:** Claude Code (Sonnet 4.6) com supervisão humana nas configs de infra  
**Status:** `[x] Concluído ✅`

### Objetivos
- [ ] Setup do monorepo com pnpm workspaces
- [ ] Projeto Next.js 14 com TypeScript strict + Tailwind + shadcn/ui
- [ ] Configuração do Drizzle ORM + conexão com Supabase
- [ ] Schema inicial do banco + primeira migration
- [ ] NextAuth.js v5 com Credentials (email+senha) e Google OAuth
- [ ] Middleware de proteção de rotas
- [ ] Variáveis de ambiente documentadas e validadas
- [ ] Layout base da aplicação (navbar, sidebar, área de chat)
- [ ] Página de login/registro funcional
- [ ] Deploy base na Vercel (sem IA ainda)

### O que NÃO fazer nesta fase
- Não implementar chat ainda
- Não instalar pacotes de IA ainda
- Não criar o RAG service ainda

### Critério de conclusão
Login com Google e com email+senha funciona em produção na Vercel.
Usuário autenticado vê layout base. Usuário não autenticado é redirecionado.

### Arquivos principais desta fase
```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (protected)/
│   │       └── chat/page.tsx
│   ├── lib/
│   │   ├── auth.ts          ← config NextAuth
│   │   ├── db/
│   │   │   ├── index.ts     ← conexão Drizzle
│   │   │   └── schema.ts    ← schema das tabelas
│   │   └── validations/
│   │       └── auth.ts      ← schemas Zod de auth
│   └── middleware.ts        ← proteção de rotas
```

---

## FASE 2 — RAG Service e Ingestão dos PDFs
**Estimativa:** Dia 2-3  
**Quem faz:** Claude Code (Haiku 4.5 para setup FastAPI, Opus/Sonnet para pipeline RAG)  
**Status:** `[ ] Pronto para começar`

### Pré-requisito
Fase 1 concluída. PDFs dos quatro livros disponíveis em 
`apps/rag-service/data/books/`. Análises do NotebookLM 
disponíveis em `apps/rag-service/data/analysis/`.

### Objetivos
- [ ] Projeto FastAPI com estrutura limpa
- [ ] Script de ingestão de PDFs (chunking + embeddings)
- [ ] Tabela `document_chunks` com pgvector no Supabase
- [ ] Endpoint `/search` que recebe query e retorna chunks relevantes
- [ ] Endpoint `/health` para monitoramento
- [ ] Autenticação interna com `RAG_INTERNAL_SECRET`
- [ ] Deploy no Render (free tier)
- [ ] Teste de busca: perguntar algo dos livros e ver chunks corretos

### Estratégia de chunking (SEGUIR EXATAMENTE)
```
- Chunk size: 800 tokens
- Overlap: 100 tokens
- Metadata por chunk: book_id, page_number, chapter, chunk_index
- Embedding model: text-embedding-004 (Google) — 768 dimensões
- Similarity: cosine distance
- Top-K retrieval: 5 chunks por query
```

### O que NÃO fazer nesta fase
- Não integrar com o chat ainda
- Não criar interface de upload de PDF (ingestão é script manual)

### Critério de conclusão
`curl -X POST https://grimorio-rag.onrender.com/search -H "Authorization: Bearer $SECRET" -d '{"query": "quais são as classes disponíveis"}'` retorna chunks relevantes dos livros.

### Arquivos principais desta fase
```
apps/rag-service/
├── main.py
├── routers/
│   ├── search.py
│   └── health.py
├── services/
│   ├── embeddings.py        ← geração de embeddings via Gemini
│   ├── vector_store.py      ← operações pgvector
│   └── ingest.py            ← pipeline de ingestão dos PDFs
├── models/
│   └── schemas.py           ← Pydantic models
├── scripts/
│   └── ingest_books.py      ← script executado uma vez pelo humano
├── requirements.txt
└── render.yaml              ← config deploy Render
```

---

## FASE 3 — Chat com IA (coração do projeto)
**Estimativa:** Dia 3-4  
**Quem faz:** Claude Code (Sonnet 4.6)  
**Status:** `[ ] Bloqueado — aguarda Fase 2`

### Pré-requisito
Fase 2 concluída. RAG service respondendo em produção.

### Objetivos
- [ ] Integração Vercel AI SDK com Gemini 2.5 Flash
- [ ] Streaming de respostas no chat
- [ ] Orquestração RAG → Gemini (busca chunks → monta prompt → streaming)
- [ ] Salvar histórico de mensagens (usuários logados)
- [ ] Carregar conversas anteriores na sidebar
- [ ] Criar nova conversa
- [ ] Chat funciona sem login (sem salvar histórico)
- [ ] Rate limiting nas rotas de chat
- [ ] System prompt do "Grimório" (especialista em RPG)
- [ ] Interface de chat completa e responsiva

### System prompt base (USAR EXATAMENTE ESTE)
```
Você é o Grimório, um sábio especialista nos livros de RPG fornecidos.
Responda APENAS com base no conteúdo dos livros fornecidos no contexto.
Se a informação não estiver nos livros, diga claramente que não encontrou.
Seja específico: cite classes, habilidades, páginas quando relevante.
Recomende builds e estratégias baseadas nas regras dos livros.
Responda sempre em português do Brasil.
Nunca invente regras que não estejam nos livros.
```

### Fluxo de uma mensagem (IMPLEMENTAR EXATAMENTE ASSIM)
```
1. Usuário envia mensagem
2. API Route recebe e valida (Zod)
3. Verifica rate limit
4. Se logado: carrega últimas 10 mensagens do histórico (contexto)
5. Chama RAG service: POST /search com a mensagem do usuário
6. RAG retorna 5 chunks dos livros
7. Monta prompt: system + histórico + chunks + mensagem do usuário
8. Chama Gemini 2.5 Flash com streaming
9. Stream vai para o cliente via ReadableStream
10. Ao finalizar: salva mensagem do usuário + resposta no banco
```

### O que NÃO fazer nesta fase
- Não implementar Journal ainda
- Não fazer upload de novos PDFs pela interface

### Critério de conclusão
Usuário consegue perguntar sobre os livros e receber resposta correta com streaming.
Histórico persiste após refresh para usuários logados.

---

## FASE 4 — Journal de Campanha
**Estimativa:** Dia 4-5  
**Quem faz:** Claude Code (Sonnet 4.6)  
**Status:** `[ ] Bloqueado — aguarda Fase 3`

### Pré-requisito
Fase 3 concluída.

### Objetivos
- [ ] Aba "Journal" na sidebar (apenas para usuários logados)
- [ ] Criar/editar/deletar entradas de journal
- [ ] Chat do Journal: IA ajuda a estruturar e registrar a sessão
- [ ] System prompt específico do Journal (registrar sessão, não consultar livro)
- [ ] Listar entradas anteriores ordenadas por data
- [ ] Visualização de entrada individual
- [ ] Exportar entrada como Markdown (bonus)

### System prompt do Journal (USAR ESTE)
```
Você é o Cronista do Grimório, especializado em registrar sessões de RPG.
Ajude o usuário a documentar o que aconteceu na sessão: eventos, decisões,
NPCs encontrados, itens obtidos, progressão do personagem.
Faça perguntas para extrair detalhes importantes.
Organize as informações de forma clara e narrativa.
Ao final, produza um resumo estruturado da sessão.
Responda sempre em português do Brasil.
```

### Critério de conclusão
Usuário logado consegue criar entradas de journal, conversar com a IA do Journal
para estruturar a sessão, e visualizar o histórico de entradas.

---

## FASE 5 — Polish, Segurança e Deploy Final
**Estimativa:** Dia 5-7  
**Quem faz:** Humano (configurações) + Claude Code (Sonnet 4.6) para código  
**Status:** `[ ] Bloqueado — aguarda Fase 4`

### Objetivos
- [ ] Auditoria de segurança (seguir checklist em `docs/SECURITY.md`)
- [ ] Error boundaries e páginas de erro customizadas
- [ ] Loading states e skeleton screens
- [ ] SEO básico (metadata, og:tags)
- [ ] Mobile responsiveness revisado
- [ ] Variáveis de ambiente de produção configuradas
- [ ] Testes E2E básicos (Playwright) nos fluxos críticos
- [ ] Monitoramento básico (Vercel Analytics)
- [ ] README.md completo
- [ ] Deploy final revisado

---

## COMO ATUALIZAR ESTE ARQUIVO

Quando concluir uma fase, o humano muda o status:
```
`[ ] Não iniciado` → `[x] Concluído ✅`
```

E atualiza o bloco "STATUS ATUAL" no topo.
