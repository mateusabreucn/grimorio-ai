"""Pipeline de ingestão: PDF → páginas → chunks → embeddings → PostgreSQL."""

import asyncio
import logging
from pathlib import Path
from typing import TYPE_CHECKING

import pdfplumber
from langchain_text_splitters import RecursiveCharacterTextSplitter

from services import embeddings as embeddings_service
from services import vector_store

if TYPE_CHECKING:
    from psycopg2.extensions import connection as PgConnection

logger = logging.getLogger(__name__)

# ~4 chars por token → 800 tokens ≈ 3200 chars | overlap 100 tokens ≈ 400 chars
_CHUNK_SIZE_CHARS = 3200
_CHUNK_OVERLAP_CHARS = 400

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=_CHUNK_SIZE_CHARS,
    chunk_overlap=_CHUNK_OVERLAP_CHARS,
    separators=["\n\n", "\n", ".", " ", ""],
)


def extract_pages(pdf_path: str | Path) -> list[dict]:
    """
    Extrai texto de cada página do PDF.

    Returns:
        Lista de dicts com keys: page_number (int), text (str).
    """
    pages = []

    with pdfplumber.open(str(pdf_path)) as pdf:
        total = len(pdf.pages)
        logger.info("PDF com %d páginas: %s", total, pdf_path)

        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text and text.strip():
                pages.append({
                    "page_number": page_num,
                    "text": text.strip(),
                })

    logger.info("Extraídas %d páginas com texto de %s", len(pages), pdf_path)
    return pages


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Divide as páginas em chunks de ~800 tokens com overlap de ~100 tokens.

    Returns:
        Lista de dicts com keys: content (str), page_number (int).
    """
    chunks = []

    for page in pages:
        page_chunks = _splitter.split_text(page["text"])
        for text in page_chunks:
            text = text.strip()
            if len(text) > 50:   # descarta chunks muito pequenos
                chunks.append({
                    "content": text,
                    "page_number": page["page_number"],
                })

    logger.info("Gerados %d chunks de %d páginas", len(chunks), len(pages))
    return chunks


async def ingest_pdf(
    conn: "PgConnection",
    pdf_path: str | Path,
    book_id: str,
    book_title: str,
    batch_size: int = 10,
    delay_seconds: float = 1.5,
) -> int:
    """
    Ingere um PDF completo: extrai → chunkeia → embeds → salva.

    Args:
        conn: Conexão PostgreSQL.
        pdf_path: Caminho para o arquivo PDF.
        book_id: Identificador único do livro (ex: "core").
        book_title: Título legível (ex: "Tormenta 20 — Livro Básico").
        batch_size: Quantos chunks processar antes de logar progresso.
        delay_seconds: Pausa entre cada embedding para respeitar rate limits.

    Returns:
        Número de chunks ingeridos.
    """
    pages = await asyncio.to_thread(extract_pages, pdf_path)
    chunks = await asyncio.to_thread(chunk_pages, pages)

    if not chunks:
        logger.warning("Nenhum chunk gerado para %s", pdf_path)
        return 0

    logger.info("Iniciando ingestão de %d chunks para '%s'...", len(chunks), book_title)
    logger.info("Rate limit: %.1fs de pausa entre requests", delay_seconds)
    saved = 0

    for i, chunk in enumerate(chunks):
        try:
            embedding = await embeddings_service.embed_text(
                chunk["content"],
                task_type="retrieval_document",
            )

            await asyncio.to_thread(
                vector_store.save_chunk_sync,
                conn,
                book_id,
                book_title,
                chunk["content"],
                chunk["page_number"],
                i,          # chunk_index
                embedding,
            )

            saved += 1

            if (i + 1) % batch_size == 0:
                logger.info("  Progresso: %d/%d chunks", i + 1, len(chunks))

            # Pausa para respeitar rate limit do Google AI free tier
            if delay_seconds > 0:
                await asyncio.sleep(delay_seconds)

        except Exception as exc:
            logger.error("Erro no chunk %d de '%s': %s", i, book_title, exc)

            # Se foi rate limit (429), espera mais e tenta retomar
            if "429" in str(exc) or "quota" in str(exc).lower():
                wait = 60
                logger.warning("Rate limit atingido. Aguardando %ds antes de continuar...", wait)
                await asyncio.sleep(wait)
                # Retry uma vez
                try:
                    embedding = await embeddings_service.embed_text(
                        chunk["content"],
                        task_type="retrieval_document",
                    )
                    await asyncio.to_thread(
                        vector_store.save_chunk_sync,
                        conn, book_id, book_title,
                        chunk["content"], chunk["page_number"], i, embedding,
                    )
                    saved += 1
                    logger.info("  Retry do chunk %d OK", i)
                except Exception as retry_exc:
                    logger.error("Retry do chunk %d também falhou: %s", i, retry_exc)

    logger.info("✅ '%s' concluído: %d/%d chunks salvos", book_title, saved, len(chunks))
    return saved
