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
        try:
            cursor.execute("SELECT 1")
            db_status = "ok"
        finally:
            cursor.close()
    except psycopg2.Error:
        db_status = "error"

    # Testa conexão com Google AI
    from services import embeddings as embeddings_service
    try:
        ok = await embeddings_service.test_connection()
        embeddings_status = "ok" if ok else "error"
    except Exception:
        embeddings_status = "error"

    all_ok = db_status == "ok" and embeddings_status == "ok"
    return HealthResponse(
        status="ok" if all_ok else "degraded",
        database=db_status,
        embeddings=embeddings_status,
    )
