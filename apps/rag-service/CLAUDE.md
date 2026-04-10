# CLAUDE.md — apps/rag-service (FastAPI)

> Instruções específicas para o serviço RAG em Python.
> Leia também o CLAUDE.md raiz e docs/RAG_PIPELINE.md.

---

## REGRAS ESPECÍFICAS DESTE SERVIÇO

1. **NUNCA** exponha este serviço sem autenticação via `RAG_INTERNAL_SECRET`
2. **NUNCA** aceite uploads de arquivo via API (apenas o script de ingestão local)
3. **SEMPRE** valide inputs com Pydantic
4. **SEMPRE** use connection pooling para o PostgreSQL
5. Este serviço **NÃO** gerencia sessões de usuário — apenas busca vetorial
6. Use `async/await` consistentemente — FastAPI é ASGI

---

## ESTRUTURA DE PASTAS

```
apps/rag-service/
├── main.py              ← app FastAPI + configuração de CORS
├── config.py            ← variáveis de ambiente com pydantic-settings
├── dependencies.py      ← depends: verify_internal_secret, get_db
├── routers/
│   ├── __init__.py
│   ├── search.py        ← POST /search
│   └── health.py        ← GET /health
├── services/
│   ├── __init__.py
│   ├── embeddings.py    ← Google AI embeddings
│   ├── vector_store.py  ← operações pgvector
│   └── ingest.py        ← chunking e ingestão de PDFs
├── models/
│   ├── __init__.py
│   └── schemas.py       ← Pydantic models
├── scripts/
│   └── ingest_books.py  ← roda uma vez, manualmente
├── data/
│   └── books/           ← PDFs (não commitados, .gitignore)
├── tests/
│   ├── test_search.py
│   └── test_embeddings.py
├── requirements.txt
├── .env.example
├── .gitignore
└── render.yaml
```

---

## CONFIGURAÇÃO (config.py)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    database_url: str
    rag_internal_secret: str

    # Voyage AI (embeddings)
    voyage_api_key: str
    embedding_model: str = "voyage-4"
    embedding_dimensions: int = 1024

    # Configurações do RAG
    chunk_size: int = 800
    chunk_overlap: int = 100
    top_k: int = 5
    similarity_threshold: float = 0.3

settings = Settings()
```

---

## AUTENTICAÇÃO INTERNA

```python
# dependencies.py
from fastapi import HTTPException, Header
from config import settings

async def verify_internal_secret(authorization: str = Header(...)):
    expected = f"Bearer {settings.rag_internal_secret}"
    if authorization != expected:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized — invalid internal secret"
        )
```

---

## CONEXÃO COM POSTGRESQL

```python
# dependencies.py
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from config import settings

pool = ThreadedConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=settings.database_url
)

def get_db():
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)
```

---

## REQUIREMENTS.TXT

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic==2.10.0
pydantic-settings==2.6.1
voyageai>=0.3.2
langchain-text-splitters==0.3.0
pdfplumber==0.11.0
psycopg2-binary==2.9.10
python-dotenv==1.0.1
pytest==8.3.0
pytest-asyncio==0.24.0
```

---

## TESTES OBRIGATÓRIOS

```python
# tests/test_search.py

import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_search_requires_auth():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/search", json={"query": "test"})
    assert response.status_code == 422  # sem header Authorization

@pytest.mark.asyncio
async def test_search_with_wrong_secret():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/search",
            json={"query": "test"},
            headers={"Authorization": "Bearer wrong-secret"}
        )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
```

---

## DEPLOY NO RENDER

O humano configura as env vars no dashboard do Render:
- `DATABASE_URL` → string de conexão do Supabase
- `GOOGLE_AI_API_KEY` → chave da Google AI Studio
- `RAG_INTERNAL_SECRET` → string aleatória segura (min 32 chars)

O Claude Code **não faz deploy** — apenas prepara o código e o `render.yaml`.
