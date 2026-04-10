# Relatório — Fase 2: RAG Service (Setup Inicial)

**Status:** ✅ SETUP ESTRUTURA COMPLETA  
**Data:** 2026-04-10  
**Modelo:** Haiku 4.5

---

## 📋 O que foi feito

### ✅ FastAPI + Estrutura Base
- **main.py** — App FastAPI com lifespan, CORS, routers
- **config.py** — Pydantic Settings para variáveis de ambiente
- **dependencies.py** — Autenticação interna, pool PostgreSQL
- **models/schemas.py** — Schemas Pydantic (SearchQuery, DocumentChunk, SearchResponse, HealthResponse)

### ✅ Routers
- **routers/health.py** — GET `/health` (verifica DB e embeddings)
- **routers/search.py** — POST `/search` (skeleton com autenticação)

### ✅ Estrutura de Serviços (TODO)
- **services/embeddings.py** — Placeholder para GLM 5.1
- **services/vector_store.py** — Placeholder para busca pgvector
- **services/ingest.py** — Placeholder para ingestão de PDFs

### ✅ Ingestão de PDFs
- **scripts/ingest_books.py** — Script com detecção dos 4 PDFs + 8 análises NotebookLM
- Detecta automaticamente: `data/books/*.pdf` e `data/analysis/*.md`

### ✅ Configuração & Deploy
- **requirements.txt** — Todas as dependências (FastAPI, pgvector, google-generativeai, etc.)
- **.env.example** — Template com variáveis necessárias
- **.gitignore** — Exclui PDFs, .env, __pycache__, etc.
- **render.yaml** — Configuração deploy no Render (free tier)
- **README.md** — Setup local, endpoints, checklist

### ✅ Testes (TODO)
- **tests/test_health.py** — Skeleton para testes de health
- **tests/test_search.py** — Skeleton para testes de busca

---

## ⚠️ Próximos Passos (Fase 2 Completa)

**QUANDO USAR SONNET 4.6 / OPUS 4.6:**

### 1️⃣ Implementar Embeddings (GLM 5.1)
**Arquivo:** `services/embeddings.py`
```python
async def generate_embedding(text: str) -> list[float]:
    # Usar google.generativeai com texto-embedding-004
    # Retornar vetor de 768 dimensões
```

### 2️⃣ Implementar Busca Vetorial
**Arquivo:** `services/vector_store.py`
```python
async def search_similar_chunks(embedding, top_k):
    # Query: SELECT * FROM document_chunks 
    #        ORDER BY embedding <-> query_embedding LIMIT top_k
    # Retornar DocumentChunk com similarity_score
```

### 3️⃣ Implementar Ingestão de PDFs
**Arquivo:** `services/ingest.py` + `scripts/ingest_books.py`
```
Fluxo:
1. Ler PDFs com pdfplumber
2. Usar análises NotebookLM para contexto
3. Chunking inteligente (800 tokens, overlap 100)
4. Gerar embeddings com GLM 5.1
5. Salvar em document_chunks (pgvector)
```

### 4️⃣ Implementar Endpoint `/search`
**Arquivo:** `routers/search.py`
```
1. Validar query
2. Gerar embedding da query
3. Buscar chunks similares
4. Retornar top-5 chunks com scores
```

### 5️⃣ Implementar Testes
**Arquivo:** `tests/test_*.py`
- Testes de autenticação
- Testes de busca
- Testes de ingestão

---

## 📊 Estrutura Final (Fase 2)

```
apps/rag-service/
├── main.py              ✅
├── config.py            ✅
├── dependencies.py      ✅
├── requirements.txt     ✅
├── .env.example         ✅
├── .gitignore           ✅
├── render.yaml          ✅
├── README.md            ✅
├── models/
│   ├── __init__.py      ✅
│   └── schemas.py       ✅
├── routers/
│   ├── __init__.py      ✅
│   ├── health.py        ✅
│   └── search.py        ✅ (placeholder)
├── services/
│   ├── __init__.py      ✅
│   ├── embeddings.py    ❌ TODO (Sonnet/Opus)
│   ├── vector_store.py  ❌ TODO (Sonnet/Opus)
│   └── ingest.py        ❌ TODO (Sonnet/Opus)
├── scripts/
│   ├── __init__.py      ✅
│   └── ingest_books.py  ✅ (placeholder com detecção)
├── tests/
│   ├── __init__.py      ✅
│   ├── test_health.py   ❌ TODO
│   └── test_search.py   ❌ TODO
└── data/
    ├── books/           ✅ (4 PDFs já presentes)
    └── analysis/        ✅ (8 arquivos NotebookLM já presentes)
```

---

## 🚀 Como Proceder

**Quando quiser continuar a Fase 2 (implementação completa):**

1. Use **Sonnet 4.6** ou **Opus 4.6**
2. Implementar `services/` completo
3. Implementar `/search` funcional
4. Implementar ingestão
5. Testes E2E

**Como testar localmente:**
```bash
cd apps/rag-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Preencher DATABASE_URL, GOOGLE_AI_API_KEY, RAG_INTERNAL_SECRET
uvicorn main:app --reload --port 8000
# Visitar http://localhost:8000/docs
```

---

## 💡 Notas Importantes

1. **PDFs já estão em `data/books/`** — Script detecta automaticamente
2. **Análises NotebookLM em `data/analysis/`** — Use para contexto de chunking
3. **GLM 5.1** — Usar `google.generativeai` com modelo `text-embedding-004`
4. **Chunking:** 800 tokens, overlap 100 (conforme PHASES.md)
5. **pgvector:** Busca cosine similarity, top-5 chunks

---

## ⏭️ Próxima Sessão

Quando retornar para continuar a Fase 2:
- Aviso: **Use Sonnet 4.6 ou Opus 4.6**
- Foco: Implementar embeddings, busca, ingestão
- Testes: Validar chunks sendo retornados corretamente

