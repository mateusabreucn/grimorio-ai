"""Geração de embeddings via Voyage AI (voyage-4)."""

import asyncio
import logging

import voyageai

from config import settings

logger = logging.getLogger(__name__)

_client = voyageai.Client(api_key=settings.voyage_api_key)

# voyage-4 aceita até 128 textos por chamada embed()
_EMBED_BATCH_SIZE = 128


def embed_documents_batch_sync(texts: list[str]) -> list[list[float]]:
    """
    Gera embeddings para uma lista de textos (ingestão).

    Envia em batches de até _EMBED_BATCH_SIZE para respeitar limites da API.

    Args:
        texts: Lista de textos (chunks) para embeddar.

    Returns:
        Lista de embeddings na mesma ordem dos textos.
    """
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), _EMBED_BATCH_SIZE):
        batch = texts[i : i + _EMBED_BATCH_SIZE]
        result = _client.embed(
            texts=batch,
            model=settings.embedding_model,
            input_type="document",
        )
        all_embeddings.extend(result.embeddings)

    return all_embeddings


async def embed_documents_batch(texts: list[str]) -> list[list[float]]:
    """Versão assíncrona — roda em thread pool para não bloquear o event loop."""
    return await asyncio.to_thread(embed_documents_batch_sync, texts)


def embed_query_sync(query: str) -> list[float]:
    """
    Gera embedding para uma query de busca do usuário (runtime).

    Usa input_type="query" para otimizar o vetor para retrieval.
    """
    result = _client.embed(
        texts=[query],
        model=settings.embedding_model,
        input_type="query",
    )
    return result.embeddings[0]


async def embed_query(query: str) -> list[float]:
    """Versão assíncrona do embed_query_sync."""
    return await asyncio.to_thread(embed_query_sync, query)


async def test_connection() -> bool:
    """Testa se a Voyage AI está acessível e o modelo está disponível."""
    try:
        result = await embed_query("teste de conexão")
        return len(result) > 0
    except Exception as exc:
        logger.error("Falha ao conectar Voyage AI: %s", exc)
        return False
