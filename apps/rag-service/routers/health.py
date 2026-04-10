"""Endpoint de health check."""

from fastapi import APIRouter, Depends
import psycopg2

from dependencies import get_db
from models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(conn=Depends(get_db)) -> HealthResponse:
    """Verifica saúde do RAG service."""
    db_status = "error"
    embeddings_status = "error"

    # Testa conexão com banco
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        db_status = "ok"
    except psycopg2.Error:
        db_status = "error"

    # TODO: Testar conexão com Google AI
    embeddings_status = "ok"

    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        database=db_status,
        embeddings=embeddings_status,
    )
