"""Pydantic schemas para validação de dados."""

from pydantic import BaseModel, Field


class SearchQuery(BaseModel):
    """Schema para requisição de busca."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Pergunta ou query de busca",
    )


class DocumentChunk(BaseModel):
    """Schema para um chunk de documento retornado."""

    id: str
    book_id: str
    book_title: str
    content: str
    page_number: int | None = None
    chunk_index: int
    similarity_score: float = Field(ge=0.0, le=1.0)

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    """Schema para resposta de busca."""

    query: str
    chunks: list[DocumentChunk]
    total_chunks: int


class HealthResponse(BaseModel):
    """Schema para health check."""

    status: str
    database: str
    embeddings: str
    version: str = "0.1.0"
