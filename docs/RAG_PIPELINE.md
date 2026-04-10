# RAG_PIPELINE.md — Pipeline de RAG

> Guia completo de como o RAG funciona neste projeto.
> Claude Code segue este documento para implementar o rag-service.

---

## VISÃO GERAL

```
PDFs dos livros
      ↓
  [INGESTÃO — roda uma vez]
      ↓
Extração de texto (pdfplumber)
      ↓
Chunking (800 tokens, overlap 100)
      ↓
Embeddings em batch por livro (voyage-context-3, input_type="document")
      ↓
Armazenamento no PostgreSQL (pgvector)

  [RUNTIME — a cada mensagem do usuário]
      ↓
Query do usuário
      ↓
Embedding da query
      ↓
Busca semântica no pgvector (top-5 chunks, cosine similarity)
      ↓
Chunks relevantes
      ↓
Monta prompt: system + histórico + chunks + query
      ↓
Gemini 2.5 Flash (streaming)
      ↓
Resposta em streaming para o usuário
```

---

## CONFIGURAÇÕES FIXAS (NÃO ALTERAR sem consultar humano)

```python
# Chunking
CHUNK_SIZE = 800        # tokens aproximados por chunk
CHUNK_OVERLAP = 100     # tokens de sobreposição entre chunks

# Embeddings
EMBEDDING_MODEL = "voyage-4"
EMBEDDING_DIMENSIONS = 1024
# Ingestão: input_type="document", batches de até 128 chunks por chamada
# Runtime:  input_type="query", chamada individual por query do usuário

# Retrieval
TOP_K = 5               # número de chunks retornados por busca
SIMILARITY_THRESHOLD = 0.3  # descarta chunks com similaridade abaixo disso

# LLM Runtime
LLM_MODEL = "gemini-2.5-flash"
MAX_HISTORY_MESSAGES = 10   # últimas N mensagens incluídas no contexto
```

---

## ESTRUTURA DO RAG SERVICE

```
apps/rag-service/
├── main.py                  ← inicialização FastAPI
├── config.py                ← variáveis de ambiente e configurações
├── routers/
│   ├── search.py            ← POST /search (endpoint principal)
│   └── health.py            ← GET /health
├── services/
│   ├── embeddings.py        ← gera embeddings via Google AI
│   ├── vector_store.py      ← busca semântica no pgvector
│   └── ingest.py            ← pipeline de ingestão dos PDFs
├── models/
│   └── schemas.py           ← Pydantic schemas (request/response)
├── scripts/
│   └── ingest_books.py      ← script de ingestão (roda uma vez)
├── data/
│   └── books/               ← PDFs dos livros (não commitados)
│       ├── book_1.pdf
│       └── book_2.pdf
├── requirements.txt
├── .env.example
└── render.yaml
```

---

## SCHEMAS PYDANTIC

```python
# models/schemas.py

from pydantic import BaseModel, Field
from typing import Optional

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    book_id: Optional[str] = None  # None = busca nos dois livros
    top_k: int = Field(default=5, ge=1, le=10)

class ChunkResult(BaseModel):
    content: str
    book_id: str
    book_title: str
    page_number: Optional[int]
    similarity_score: float

class SearchResponse(BaseModel):
    chunks: list[ChunkResult]
    query: str
```

---

## ENDPOINT PRINCIPAL

```python
# routers/search.py

@router.post("/search", response_model=SearchResponse)
async def search_books(
    request: SearchRequest,
    _=Depends(verify_internal_secret)
):
    # 1. Gera embedding da query
    query_embedding = await embeddings_service.embed_text(request.query)

    # 2. Busca chunks similares no pgvector
    chunks = await vector_store.similarity_search(
        embedding=query_embedding,
        top_k=request.top_k,
        book_id=request.book_id,
        threshold=SIMILARITY_THRESHOLD
    )

    return SearchResponse(chunks=chunks, query=request.query)
```

---

## BUSCA VETORIAL NO PGVECTOR

```python
# services/vector_store.py

async def similarity_search(
    embedding: list[float],
    top_k: int = 5,
    book_id: str | None = None,
    threshold: float = 0.3
) -> list[ChunkResult]:

    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

    book_filter = f"AND book_id = '{book_id}'" if book_id else ""

    query = f"""
        SELECT
            content,
            book_id,
            book_title,
            page_number,
            1 - (embedding <=> '{embedding_str}'::vector) as similarity
        FROM document_chunks
        WHERE 1 - (embedding <=> '{embedding_str}'::vector) > {threshold}
        {book_filter}
        ORDER BY embedding <=> '{embedding_str}'::vector
        LIMIT {top_k}
    """

    # Executa via psycopg2 (conexão direta ao PostgreSQL)
    ...
```

---

## SCRIPT DE INGESTÃO

```python
# scripts/ingest_books.py
# Rodado MANUALMENTE pelo humano uma vez após deploy

import asyncio
from pathlib import Path

BOOKS = [
    {"path": "data/books/T20-Livro Básico.pdf",  "id": "core",    "title": "Tormenta 20 — Livro Básico"},
    {"path": "data/books/T20-Ameacas-de-Arton.pdf",     "id": "supl_01", "title": "Ameaças de Arton"},
    {"path": "data/books/T20-Deuses-de-Arton.pdf",     "id": "supl_02", "title": "Deuses de Arton"},
    {"path": "data/books/T20-Herois-de-Arton.pdf",     "id": "supl_03", "title": "Heróis de Arton"},
]

async def ingest_all():
    for book in BOOKS:
        print(f"Ingerindo: {book['title']}")
        chunks = extract_and_chunk_pdf(book['path'])
        print(f"  {len(chunks)} chunks extraídos")

        for i, chunk in enumerate(chunks):
            embedding = await embed_text(chunk['content'])
            await save_chunk(
                book_id=book['id'],
                book_title=book['title'],
                content=chunk['content'],
                page_number=chunk['page_number'],
                chunk_index=i,
                embedding=embedding
            )

            if i % 10 == 0:
                print(f"  Progresso: {i}/{len(chunks)}")

        print(f"  ✅ {book['title']} concluído!")

if __name__ == "__main__":
    asyncio.run(ingest_all())
```

---

## MONTAGEM DO PROMPT NO NEXT.JS

```typescript
// Como o Next.js monta o prompt final para o Gemini

function buildPrompt(
  userMessage: string,
  ragChunks: ChunkResult[],
  history: Message[],
): string {
  const context = ragChunks
    .map((c) => `[${c.book_title} - p.${c.page_number}]\n${c.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `Você é o Grimório, um sábio especialista nos livros de RPG fornecidos.
Responda APENAS com base no conteúdo dos livros no contexto abaixo.
Se a informação não estiver nos livros, diga claramente que não encontrou.
Seja específico: cite classes, habilidades, páginas quando relevante.
Responda sempre em português do Brasil.
Nunca invente regras que não estejam nos livros.

CONTEXTO DOS LIVROS:
${context}`;

  return systemPrompt;
}
```

---

## DEPLOY NO RENDER

```yaml
# render.yaml
services:
  - type: web
    name: grimorio-rag
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: VOYAGE_API_KEY
        sync: false
      - key: RAG_INTERNAL_SECRET
        sync: false
```

---

## CHECKLIST DE QUALIDADE DO RAG

Após ingestão, valide com estas perguntas aos livros:

- "Quais são as classes disponíveis?"
- "Como funciona o sistema de magia?"
- "Qual a diferença entre [classe A] e [classe B]?"
- "Quais são os atributos principais do personagem?"
- "Como funciona o combate?"

Se as respostas forem precisas e citarem partes corretas do livro, o RAG está funcionando.
