"""Pydantic schemas para validação de dados."""

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Schema para requisição de busca."""

    query: str = Field(..., min_length=1, max_length=2000)
    book_id: str | None = None   # None = busca em todos os livros
    top_k: int = Field(default=5, ge=1, le=10)


class ChunkResult(BaseModel):
    """Chunk de documento retornado pela busca."""

    content: str
    book_id: str
    book_title: str
    page_number: int | None
    chunk_index: int
    similarity_score: float


class SearchResponse(BaseModel):
    """Resposta da busca vetorial."""

    query: str
    chunks: list[ChunkResult]


class HealthResponse(BaseModel):
    """Resposta do health check."""

    status: str
    database: str
    embeddings: str
    version: str = "0.1.0"
