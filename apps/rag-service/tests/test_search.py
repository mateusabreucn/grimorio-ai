"""Testes para o endpoint /search."""

from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from httpx import AsyncClient, ASGITransport

from config import settings
from main import app
from models.schemas import ChunkResult

_AUTH = {"Authorization": f"Bearer {settings.rag_internal_secret}"}

_FAKE_EMBEDDING = [0.1] * 768

_FAKE_CHUNK = ChunkResult(
    content="Guerreiro recebe +2 em Força.",
    book_id="core",
    book_title="Tormenta 20 — Livro Básico",
    page_number=42,
    chunk_index=0,
    similarity_score=0.91,
)


def _make_conn():
    return MagicMock()


@pytest.mark.asyncio
async def test_search_requires_auth():
    """POST /search sem Authorization header retorna 422."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/search", json={"query": "o que é guerreiro?"})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_search_with_invalid_secret():
    """POST /search com secret errado retorna 401."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/search",
            json={"query": "o que é guerreiro?"},
            headers={"Authorization": "Bearer wrong-secret"},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_search_returns_chunks():
    """POST /search com secret válido retorna chunks do vector store."""
    conn = _make_conn()

    with (
        patch("dependencies.get_db", return_value=iter([conn])),
        patch(
            "services.embeddings.embed_query",
            new=AsyncMock(return_value=_FAKE_EMBEDDING),
        ),
        patch(
            "services.vector_store.similarity_search",
            new=AsyncMock(return_value=[_FAKE_CHUNK]),
        ),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/search",
                json={"query": "o que é guerreiro?"},
                headers=_AUTH,
            )

    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "o que é guerreiro?"
    assert len(body["chunks"]) == 1
    assert body["chunks"][0]["book_id"] == "core"
    assert body["chunks"][0]["similarity_score"] == pytest.approx(0.91)


@pytest.mark.asyncio
async def test_search_empty_results():
    """POST /search sem chunks relevantes retorna lista vazia."""
    conn = _make_conn()

    with (
        patch("dependencies.get_db", return_value=iter([conn])),
        patch(
            "services.embeddings.embed_query",
            new=AsyncMock(return_value=_FAKE_EMBEDDING),
        ),
        patch(
            "services.vector_store.similarity_search",
            new=AsyncMock(return_value=[]),
        ),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/search",
                json={"query": "algo inexistente xyzabc"},
                headers=_AUTH,
            )

    assert response.status_code == 200
    body = response.json()
    assert body["chunks"] == []


@pytest.mark.asyncio
async def test_search_filters_by_book_id():
    """POST /search com book_id passa o filtro para o vector store."""
    conn = _make_conn()

    mock_search = AsyncMock(return_value=[])

    with (
        patch("dependencies.get_db", return_value=iter([conn])),
        patch(
            "services.embeddings.embed_query",
            new=AsyncMock(return_value=_FAKE_EMBEDDING),
        ),
        patch("services.vector_store.similarity_search", new=mock_search),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            await client.post(
                "/search",
                json={"query": "paladino", "book_id": "herois"},
                headers=_AUTH,
            )

    call_kwargs = mock_search.call_args.kwargs
    assert call_kwargs.get("book_id") == "herois"


@pytest.mark.asyncio
async def test_search_validates_query_length():
    """POST /search com query vazia retorna 422."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/search",
            json={"query": ""},
            headers=_AUTH,
        )

    assert response.status_code == 422
