"""Endpoint de busca vetorial RAG."""

from fastapi import APIRouter, Depends

from dependencies import verify_internal_secret, get_db
from models.schemas import SearchRequest, SearchResponse
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
    1. Gera embedding da query com Google AI (task_type=retrieval_query)
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
