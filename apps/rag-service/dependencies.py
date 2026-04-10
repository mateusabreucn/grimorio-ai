"""Dependências compartilhadas (autenticação, DB, etc.)."""

from typing import Generator

import psycopg2
from fastapi import HTTPException, Header
from psycopg2.pool import ThreadedConnectionPool

from config import settings

# ─── Connection Pool ──────────────────────────────────────────────────────────

_pool: ThreadedConnectionPool | None = None


def init_db_pool() -> None:
    """Inicializa o pool de conexões PostgreSQL."""
    global _pool
    _pool = ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=settings.database_url,
    )


def close_db_pool() -> None:
    """Fecha o pool de conexões."""
    global _pool
    if _pool:
        _pool.closeall()


def get_connection():
    """Obtém uma conexão do pool (uso fora do FastAPI, ex: scripts)."""
    if not _pool:
        raise RuntimeError("Database pool not initialized — call init_db_pool() first")
    return _pool.getconn()


def return_connection(conn) -> None:
    """Devolve uma conexão ao pool (uso fora do FastAPI, ex: scripts)."""
    if _pool:
        _pool.putconn(conn)


def get_db() -> Generator:
    """Dependency para obter conexão do pool."""
    if not _pool:
        raise RuntimeError("Database pool not initialized")

    conn = _pool.getconn()
    try:
        yield conn
    finally:
        _pool.putconn(conn)


# ─── Autenticação ─────────────────────────────────────────────────────────────


async def verify_internal_secret(authorization: str = Header(...)) -> None:
    """Verifica o secret interno do RAG service."""
    expected = f"Bearer {settings.rag_internal_secret}"

    if authorization != expected:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized — invalid internal secret",
        )
