"""Geração de embeddings via Ollama local (qwen3-embedding)."""

import asyncio
import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)


def embed_text_sync(text: str, task_type: str = "retrieval_document") -> list[float]:
    """
    Gera embedding de um texto via Ollama (síncrono).

    Args:
        text: Texto a ser convertido em embedding.
        task_type: Não usado pelo Ollama, mantido por compatibilidade.

    Returns:
        Lista de floats com embedding_dimensions dimensões.
    """
    response = httpx.post(
        f"{settings.ollama_base_url}/api/embed",
        json={
            "model": settings.embedding_model,
            "input": text,
            "options": {
                "num_ctx": 8192,
            },
        },
        timeout=httpx.Timeout(120.0),
    )
    response.raise_for_status()
    data = response.json()
    return data["embeddings"][0]


async def embed_text(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Versão assíncrona — roda em thread pool para não bloquear o event loop."""
    return await asyncio.to_thread(embed_text_sync, text, task_type)


async def embed_query(query: str) -> list[float]:
    """Gera embedding para uma query de busca do usuário."""
    return await embed_text(query, task_type="retrieval_query")


async def test_connection() -> bool:
    """Testa se o Ollama está rodando e o modelo está disponível."""
    try:
        result = await embed_text("teste de conexão")
        return len(result) > 0
    except Exception as exc:
        logger.error("Falha ao conectar Ollama: %s", exc)
        return False
