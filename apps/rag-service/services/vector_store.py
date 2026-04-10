"""Operações com pgvector — busca semântica por similaridade coseno."""

import asyncio
import logging
from typing import TYPE_CHECKING

import psycopg2

from config import settings
from models.schemas import ChunkResult

if TYPE_CHECKING:
    from psycopg2.extensions import connection as PgConnection

logger = logging.getLogger(__name__)


def _format_embedding(embedding: list[float]) -> str:
    """Formata embedding como string pgvector '[x1,x2,...]'."""
    return "[" + ",".join(str(v) for v in embedding) + "]"


def similarity_search_sync(
    conn: "PgConnection",
    embedding: list[float],
    top_k: int = 5,
    book_id: str | None = None,
    threshold: float | None = None,
) -> list[ChunkResult]:
    """
    Busca chunks similares no pgvector usando cosine similarity.

    Usa queries parametrizadas — sem SQL injection.

    Args:
        conn: Conexão PostgreSQL do pool.
        embedding: Vetor da query (768 dimensões).
        top_k: Número máximo de resultados.
        book_id: Filtrar por livro específico (None = todos).
        threshold: Similaridade mínima (default: settings.similarity_threshold).

    Returns:
        Lista de ChunkResult ordenados por relevância.
    """
    min_similarity = threshold if threshold is not None else settings.similarity_threshold
    embedding_str = _format_embedding(embedding)

    # Query base com cosine similarity — queries parametrizadas evitam SQL injection
    if book_id:
        sql = """
            SELECT
                id::text,
                book_id,
                book_title,
                content,
                page_number,
                chunk_index,
                1 - (embedding <=> %s::vector) AS similarity
            FROM document_chunks
            WHERE book_id = %s
              AND 1 - (embedding <=> %s::vector) >= %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        params = (embedding_str, book_id, embedding_str, min_similarity, embedding_str, top_k)
    else:
        sql = """
            SELECT
                id::text,
                book_id,
                book_title,
                content,
                page_number,
                chunk_index,
                1 - (embedding <=> %s::vector) AS similarity
            FROM document_chunks
            WHERE 1 - (embedding <=> %s::vector) >= %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        params = (embedding_str, embedding_str, min_similarity, embedding_str, top_k)

    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
    finally:
        cursor.close()

    return [
        ChunkResult(
            content=row[3],
            book_id=row[1],
            book_title=row[2],
            page_number=row[4],
            chunk_index=row[5],
            similarity_score=float(row[6]),
        )
        for row in rows
    ]


async def similarity_search(
    conn: "PgConnection",
    embedding: list[float],
    top_k: int = 5,
    book_id: str | None = None,
    threshold: float | None = None,
) -> list[ChunkResult]:
    """Versão assíncrona da busca — roda em thread pool."""
    return await asyncio.to_thread(
        similarity_search_sync, conn, embedding, top_k, book_id, threshold
    )


def save_chunk_sync(
    conn: "PgConnection",
    book_id: str,
    book_title: str,
    content: str,
    page_number: int | None,
    chunk_index: int,
    embedding: list[float],
    metadata: str | None = None,
) -> None:
    """Salva um chunk com embedding no banco de dados."""
    embedding_str = _format_embedding(embedding)

    sql = """
        INSERT INTO document_chunks
            (book_id, book_title, content, page_number, chunk_index, embedding, metadata)
        VALUES (%s, %s, %s, %s, %s, %s::vector, %s)
        ON CONFLICT DO NOTHING
    """

    cursor = conn.cursor()
    try:
        cursor.execute(sql, (
            book_id, book_title, content, page_number,
            chunk_index, embedding_str, metadata,
        ))
        conn.commit()
    except psycopg2.Error as exc:
        conn.rollback()
        logger.error("Erro ao salvar chunk [%s idx=%d]: %s", book_id, chunk_index, exc)
        raise
    finally:
        cursor.close()


def chunk_count_sync(conn: "PgConnection", book_id: str | None = None) -> int:
    """Retorna o número de chunks no banco."""
    if book_id:
        sql = "SELECT COUNT(*) FROM document_chunks WHERE book_id = %s"
        params: tuple = (book_id,)
    else:
        sql = "SELECT COUNT(*) FROM document_chunks"
        params = ()

    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        row = cursor.fetchone()
        return int(row[0]) if row else 0
    finally:
        cursor.close()
