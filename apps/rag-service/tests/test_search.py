"""Testes para busca vetorial."""

import pytest
from httpx import AsyncClient

# TODO: Importar app quando estrutura estiver pronta
# from main import app


@pytest.mark.asyncio
async def test_search_requires_auth():
    """Testa que /search exige Authorization header."""
    # TODO: Implementar teste
    pass


@pytest.mark.asyncio
async def test_search_with_valid_secret():
    """Testa busca com secret válido."""
    # TODO: Implementar teste
    pass


@pytest.mark.asyncio
async def test_search_with_invalid_secret():
    """Testa rejeição com secret inválido."""
    # TODO: Implementar teste
    pass


@pytest.mark.asyncio
async def test_search_returns_chunks():
    """Testa se busca retorna chunks relevantes."""
    # TODO: Implementar teste após ingestão
    pass
