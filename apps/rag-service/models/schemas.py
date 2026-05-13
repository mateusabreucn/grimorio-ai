"""Pydantic schemas para validação de dados."""

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Schema para requisição de busca."""

    query: str = Field(..., min_length=1, max_length=2000)
    book_id: str | None = None   # None = busca em todos os livros
    top_k: int = Field(default=12, ge=1, le=20)


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


class MultiSearchRequest(BaseModel):
    """Schema para busca híbrida (vetorial + lexical) com N queries."""

    queries: list[str] = Field(..., min_length=1, max_length=10)
    keywords: list[str] = Field(default_factory=list, max_length=10)
    book_id: str | None = None
    top_k_per_query: int = Field(default=8, ge=1, le=20)
    top_k_lexical: int = Field(default=12, ge=1, le=30)
    max_total_results: int = Field(default=30, ge=1, le=60)
    threshold: float | None = Field(default=None, ge=0.0, le=1.0)


class MultiSearchResponse(BaseModel):
    """Resposta da busca multi-query — chunks deduplicados."""

    queries: list[str]
    chunks: list[ChunkResult]
    total_unique: int


class HealthResponse(BaseModel):
    """Resposta do health check."""

    status: str
    database: str
    embeddings: str
    version: str = "0.1.0"
