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


def _book_filter_sql(book_ids: list[str] | None) -> tuple[str, list]:
    """Retorna cláusula SQL e params para filtro de livros. '' = sem filtro."""
    if not book_ids:
        return "", []
    placeholders = ",".join(["%s"] * len(book_ids))
    return f"AND book_id IN ({placeholders})", list(book_ids)


def similarity_search_sync(
    conn: "PgConnection",
    embedding: list[float],
    top_k: int = 5,
    book_ids: list[str] | None = None,
    threshold: float | None = None,
) -> list[ChunkResult]:
    """
    Busca chunks similares no pgvector usando cosine similarity.

    Args:
        conn: Conexão PostgreSQL do pool.
        embedding: Vetor da query (1024 dimensões).
        top_k: Número máximo de resultados.
        book_ids: Filtrar por livros (None = todos).
        threshold: Similaridade mínima (default: settings.similarity_threshold).
    """
    min_similarity = threshold if threshold is not None else settings.similarity_threshold
    embedding_str = _format_embedding(embedding)

    book_clause, book_params = _book_filter_sql(book_ids)

    sql = f"""
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
          {book_clause}
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """
    params: list = [embedding_str, embedding_str, min_similarity] + book_params + [embedding_str, top_k]

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
    book_ids: list[str] | None = None,
    threshold: float | None = None,
) -> list[ChunkResult]:
    """Versão assíncrona da busca — roda em thread pool."""
    return await asyncio.to_thread(
        similarity_search_sync, conn, embedding, top_k, book_ids, threshold
    )


# Score base atribuído a matches lexicais (full-text search). Fica numa faixa
# "boa" sem mascarar matches vetoriais reais (que vão tipicamente de 0.4 a 0.8).
# Quando o mesmo chunk aparece em ambos os tipos de busca, o merge pega o max.
_LEXICAL_BASE_SCORE = 0.75
_LEXICAL_MAX_SCORE = 0.92
# Quanto cada keyword adicional que casou agrega (até saturar em _MAX_SCORE).
_LEXICAL_KW_BONUS = 0.05
# Multiplicador do ts_rank_cd para mapear ranking nativo (0..~1) num bônus extra.
_LEXICAL_RANK_BONUS_CAP = 0.10


def lexical_search_sync(
    conn: "PgConnection",
    keywords: list[str],
    top_k: int = 10,
    book_ids: list[str] | None = None,
) -> list[ChunkResult]:
    """
    Busca chunks via full-text search com dicionário 'portuguese'.

    Args:
        conn: Conexão PostgreSQL.
        keywords: Termos a procurar com stemming PT-BR automático.
        top_k: Limite de resultados.
        book_ids: Filtra por livros (None = todos).
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

    # Para cada keyword:
    #   - uma cláusula `content_tsv @@ plainto_tsquery('portuguese', %s)` no WHERE
    #   - um `(content_tsv @@ tsquery)::int` no SELECT (contador de matches)
    #   - um `ts_rank_cd(...)` no SELECT (rank nativo, somado pra ranking fino)
    where_clauses: list[str] = []
    match_exprs: list[str] = []
    rank_exprs: list[str] = []
    params: list[object] = []

    for kw in clean_kws:
        where_clauses.append("content_tsv @@ plainto_tsquery('portuguese', %s)")
        params.append(kw)

        match_exprs.append("(content_tsv @@ plainto_tsquery('portuguese', %s))::int")
        params.append(kw)

        rank_exprs.append("ts_rank_cd(content_tsv, plainto_tsquery('portuguese', %s))")
        params.append(kw)

    match_count_sql = " + ".join(match_exprs)
    rank_sum_sql = " + ".join(rank_exprs)
    where_sql = "(" + " OR ".join(where_clauses) + ")"

    book_clause, book_params = _book_filter_sql(book_ids)

    sql = f"""
        SELECT
            id::text,
            book_id,
            book_title,
            content,
            page_number,
            chunk_index,
            ({match_count_sql}) AS match_count,
            ({rank_sum_sql}) AS rank_sum
        FROM document_chunks
        WHERE {where_sql}
          {book_clause}
        ORDER BY match_count DESC, rank_sum DESC, chunk_index ASC
        LIMIT %s
    """
    params.extend(book_params)
    params.append(top_k)

    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
    finally:
        cursor.close()

    results: list[ChunkResult] = []
    for row in rows:
        match_count = int(row[6])
        rank_sum = float(row[7] or 0.0)

        # Bônus por keywords adicionais casadas (até +0.15 com 4 keywords)
        kw_bonus = min(0.15, _LEXICAL_KW_BONUS * max(0, match_count - 1))
        # Bônus proporcional ao rank do FTS — saturado em _LEXICAL_RANK_BONUS_CAP.
        # ts_rank_cd típico de match razoável fica entre 0.05 e 0.5 — usamos um
        # escala simples para mapear pra [0, _CAP].
        rank_bonus = min(_LEXICAL_RANK_BONUS_CAP, rank_sum * 0.2)

        score = min(_LEXICAL_MAX_SCORE, _LEXICAL_BASE_SCORE + kw_bonus + rank_bonus)

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
    book_ids: list[str] | None = None,
) -> list[ChunkResult]:
    """Versão assíncrona do lexical_search_sync."""
    return await asyncio.to_thread(lexical_search_sync, conn, keywords, top_k, book_ids)


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
