"""Geração de embeddings via Google AI (gemini-embedding-001)."""

import asyncio
import logging

import google.generativeai as genai

from config import settings

logger = logging.getLogger(__name__)

# Configura o cliente uma vez no startup
genai.configure(api_key=settings.google_ai_api_key)


def embed_text_sync(text: str, task_type: str = "retrieval_document") -> list[float]:
    """
    Gera embedding de um texto (síncrono).

    Args:
        text: Texto a ser convertido em embedding.
        task_type: "retrieval_document" para chunks, "retrieval_query" para queries.

    Returns:
        Lista de floats com 768 dimensões.
    """
    result = genai.embed_content(
        model=settings.embedding_model,
        content=text,
        task_type=task_type,
        output_dimensionality=settings.embedding_dimensions,
    )
    return result["embedding"]


async def embed_text(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Versão assíncrona — roda em thread pool para não bloquear o event loop."""
    return await asyncio.to_thread(embed_text_sync, text, task_type)


async def embed_query(query: str) -> list[float]:
    """Gera embedding para uma query de busca do usuário."""
    return await embed_text(query, task_type="retrieval_query")


async def test_connection() -> bool:
    """Testa se a API do Google AI está acessível."""
    try:
        await embed_text("teste de conexão", task_type="retrieval_query")
        return True
    except Exception as exc:
        logger.error("Falha ao conectar Google AI: %s", exc)
        return False
