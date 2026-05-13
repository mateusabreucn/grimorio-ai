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


# Score artificial atribuído a matches lexicais. Fica numa faixa "boa" sem
# mascarar matches vetoriais reais (que geralmente vão de 0.4 a 0.8). Quando
# o mesmo chunk aparece em ambos os tipos de busca, o merge pega o max.
_LEXICAL_BASE_SCORE = 0.75


def lexical_search_sync(
    conn: "PgConnection",
    keywords: list[str],
    top_k: int = 10,
    book_id: str | None = None,
) -> list[ChunkResult]:
    """
    Busca chunks que contenham literalmente alguma das keywords (case-insensitive).

    Usa ILIKE com OR. Resultados recebem similarity_score artificial alto
    (_LEXICAL_BASE_SCORE) para que matches exatos sejam priorizados no ranking
    final. Chunks que casam com várias keywords ganham bônus marginal.

    Args:
        conn: Conexão PostgreSQL.
        keywords: Termos a procurar (cada um vira um ILIKE OR).
        top_k: Limite de resultados.
        book_id: Filtra por livro (None = todos).

    Returns:
        Lista de ChunkResult ordenada por número de keywords que casaram (desc).
    """
    # Sanitiza e remove duplicatas mantendo ordem
    seen: set[str] = set()
    clean_kws: list[str] = []
    for kw in keywords:
        norm = (kw or "").strip()
        if not norm or len(norm) < 2:
            continue
        low = norm.lower()
        if low in seen:
            continue
        seen.add(low)
        clean_kws.append(norm)

    if not clean_kws:
        return []

    # Monta SELECT que conta quantas keywords casaram (pra desempate)
    match_exprs = []
    where_exprs = []
    params: list[object] = []
    for kw in clean_kws:
        like = f"%{kw}%"
        match_exprs.append("(CASE WHEN content ILIKE %s THEN 1 ELSE 0 END)")
        params.append(like)
        where_exprs.append("content ILIKE %s")
        params.append(like)

    match_count_sql = " + ".join(match_exprs)
    where_sql = "(" + " OR ".join(where_exprs) + ")"

    if book_id:
        sql = f"""
            SELECT
                id::text,
                book_id,
                book_title,
                content,
                page_number,
                chunk_index,
                ({match_count_sql}) AS match_count
            FROM document_chunks
            WHERE {where_sql}
              AND book_id = %s
            ORDER BY match_count DESC, chunk_index ASC
            LIMIT %s
        """
        params.append(book_id)
        params.append(top_k)
    else:
        sql = f"""
            SELECT
                id::text,
                book_id,
                book_title,
                content,
                page_number,
                chunk_index,
                ({match_count_sql}) AS match_count
            FROM document_chunks
            WHERE {where_sql}
            ORDER BY match_count DESC, chunk_index ASC
            LIMIT %s
        """
        params.append(top_k)

    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
    finally:
        cursor.close()

    total_kws = max(1, len(clean_kws))
    results: list[ChunkResult] = []
    for row in rows:
        match_count = int(row[6])
        # Bônus marginal: cada keyword extra adiciona até +0.05, sem ultrapassar 0.9
        boost = min(0.15, 0.05 * (match_count - 1))
        score = min(0.9, _LEXICAL_BASE_SCORE + boost) if match_count > 0 else _LEXICAL_BASE_SCORE
        results.append(
            ChunkResult(
                content=row[3],
                book_id=row[1],
                book_title=row[2],
                page_number=row[4],
                chunk_index=row[5],
                similarity_score=score,
            )
        )

    return results


async def lexical_search(
    conn: "PgConnection",
    keywords: list[str],
    top_k: int = 10,
    book_id: str | None = None,
) -> list[ChunkResult]:
    """Versão assíncrona do lexical_search_sync."""
    return await asyncio.to_thread(lexical_search_sync, conn, keywords, top_k, book_id)


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
