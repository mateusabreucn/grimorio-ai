"""Endpoint de busca vetorial RAG."""

from fastapi import APIRouter, Depends

from dependencies import verify_internal_secret, get_db
from models.schemas import (
    ChunkResult,
    MultiSearchRequest,
    MultiSearchResponse,
    SearchRequest,
    SearchResponse,
)
from services import embeddings as embeddings_service
from services import vector_store

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    _=Depends(verify_internal_secret),
    conn=Depends(get_db),
) -> SearchResponse:
    """
    Busca chunks relevantes dos livros via embeddings vetoriais.

    Fluxo:
    1. Gera embedding da query via Voyage AI (input_type=query)
    2. Busca chunks similares no pgvector por cosine similarity
    3. Retorna top-K chunks ordenados por relevância
    """
    embedding = await embeddings_service.embed_query(request.query)

    chunks = await vector_store.similarity_search(
        conn=conn,
        embedding=embedding,
        top_k=request.top_k,
        book_id=request.book_id,
    )

    return SearchResponse(
        query=request.query,
        chunks=chunks,
    )


@router.post("/search/multi", response_model=MultiSearchResponse)
async def search_multi(
    request: MultiSearchRequest,
    _=Depends(verify_internal_secret),
    conn=Depends(get_db),
) -> MultiSearchResponse:
    """
    Busca híbrida: combina busca vetorial (semântica) com busca lexical (literal).

    Fluxo:
    1. Gera embeddings para todas as queries em uma chamada batch Voyage AI
    2. Para cada embedding, faz similarity_search no pgvector
    3. Se houver keywords, faz lexical_search por ILIKE (em paralelo às vetoriais)
    4. Mergeia: chunks de ambas fontes deduplicados por (book_id, chunk_index),
       mantendo o maior score (vetorial real OU base lexical 0.75 + bônus)
    5. Retorna ordenado por similarity_score desc, limitado a max_total_results
    """
    embeddings = await embeddings_service.embed_queries_batch(request.queries)

    aggregated: dict[tuple[str, int], ChunkResult] = {}

    def merge(chunk: ChunkResult) -> None:
        key = (chunk.book_id, chunk.chunk_index)
        existing = aggregated.get(key)
        if existing is None or chunk.similarity_score > existing.similarity_score:
            aggregated[key] = chunk

    # Busca vetorial — uma por query
    for embedding in embeddings:
        chunks = await vector_store.similarity_search(
            conn=conn,
            embedding=embedding,
            top_k=request.top_k_per_query,
            book_id=request.book_id,
            threshold=request.threshold,
        )
        for chunk in chunks:
            merge(chunk)

    # Busca lexical — uma única passada com todas as keywords
    if request.keywords:
        lexical_chunks = await vector_store.lexical_search(
            conn=conn,
            keywords=request.keywords,
            top_k=request.top_k_lexical,
            book_id=request.book_id,
        )
        for chunk in lexical_chunks:
            merge(chunk)

    deduped = sorted(
        aggregated.values(),
        key=lambda c: c.similarity_score,
        reverse=True,
    )

    return MultiSearchResponse(
        queries=request.queries,
        chunks=deduped[: request.max_total_results],
        total_unique=len(deduped),
    )
