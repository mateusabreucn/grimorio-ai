# Grimório RAG Service — FastAPI

Serviço de busca vetorial especializado em livros de RPG. Usa embeddings do Google AI (GLM 5.1) e busca com pgvector no PostgreSQL.

## Setup Local

### 1. Variáveis de Ambiente

```bash
cp .env.example .env
```

Preencha:
- `DATABASE_URL` — Connection Pooler do Supabase
- `GOOGLE_AI_API_KEY` — De https://aistudio.google.com/app/apikeys
- `RAG_INTERNAL_SECRET` — Secret gerado (40+ caracteres)

### 2. Instalação

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Desenvolvimento

```bash
uvicorn main:app --reload --port 8000
```

Docs: http://localhost:8000/docs

## Endpoints

### `GET /health`
Health check do serviço.

```bash
curl http://localhost:8000/health
```

### `POST /search`
Busca chunks relevantes.

```bash
curl -X POST http://localhost:8000/search \
  -H "Authorization: Bearer $RAG_INTERNAL_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"query": "quais são as classes disponíveis?"}'
```

## Ingestão de PDFs (Fase 2)

Os 4 livros estão em `data/books/`:
- T20-Livro Básico.pdf
- T20-Herois-de-Arton.pdf
- T20-Deuses-de-Arton.pdf
- Ameacas-de-Arton.pdf

Execute o script de ingestão (será implementado na Fase 2):

```bash
python scripts/ingest_books.py
```

Isso vai:
1. Extrair texto dos PDFs
2. Usar análises do NotebookLM para chunking inteligente
3. Gerar embeddings com GLM 5.1
4. Salvar em `document_chunks` (pgvector)

## Deploy no Render

1. Configure env vars no dashboard do Render
2. Push para GitHub
3. Render auto-deploya

## Checklist Fase 2

- [x] Setup FastAPI básico
- [x] Endpoints `/health` e `/search` (skeleton)
- [x] Autenticação via `RAG_INTERNAL_SECRET`
- [x] Conexão PostgreSQL com pool
- [x] Pydantic schemas
- [ ] Ingestão de PDFs (TODO — Sonnet/Opus)
- [ ] Embeddings com GLM 5.1 (TODO — Sonnet/Opus)
- [ ] Busca vetorial com pgvector (TODO — Sonnet/Opus)
- [ ] Testes (TODO — Sonnet/Opus)
