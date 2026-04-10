"""Testes para o endpoint /health."""

from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from httpx import AsyncClient, ASGITransport

from main import app


def _make_conn():
    """Retorna um mock de conexão PostgreSQL."""
    conn = MagicMock()
    cursor = MagicMock()
    cursor.fetchone.return_value = (1,)
    conn.cursor.return_value = cursor
    return conn


@pytest.mark.asyncio
async def test_health_check_ok():
    """Health check retorna status ok quando DB e embeddings estão saudáveis."""
    conn = _make_conn()

    with (
        patch("dependencies.get_db", return_value=iter([conn])),
        patch("services.embeddings.test_connection", new=AsyncMock(return_value=True)),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["embeddings"] == "ok"


@pytest.mark.asyncio
async def test_health_check_db_error():
    """Health check retorna degraded quando banco falha."""
    import psycopg2

    conn = MagicMock()
    conn.cursor.side_effect = psycopg2.OperationalError("connection refused")

    with (
        patch("dependencies.get_db", return_value=iter([conn])),
        patch("services.embeddings.test_connection", new=AsyncMock(return_value=True)),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["database"] == "error"


@pytest.mark.asyncio
async def test_health_check_embeddings_error():
    """Health check retorna degraded quando Google AI falha."""
    conn = _make_conn()

    with (
        patch("dependencies.get_db", return_value=iter([conn])),
        patch("services.embeddings.test_connection", new=AsyncMock(return_value=False)),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["embeddings"] == "error"
