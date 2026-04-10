"""FastAPI app para RAG service."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from dependencies import init_db_pool, close_db_pool
from routers import health, search


# ─── Lifecycle ────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup e shutdown do app."""
    # Startup
    init_db_pool()
    yield
    # Shutdown
    close_db_pool()


# ─── App Setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Grimório RAG Service",
    description="Serviço de busca vetorial para livros de RPG",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — apenas o Next.js pode acessar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

# Routers
app.include_router(health.router)
app.include_router(search.router)


# ─── Root ─────────────────────────────────────────────────────────────────────


@app.get("/", tags=["root"])
async def root():
    """Root endpoint."""
    return {
        "service": "Grimório RAG Service",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
