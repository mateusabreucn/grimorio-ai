"""Pipeline de ingestão: PDF → páginas → chunks → embeddings → PostgreSQL."""

import asyncio
import logging
from pathlib import Path
from typing import TYPE_CHECKING

import pdfplumber
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import settings
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


def extract_pages(pdf_path: str | Path, page_offset: int = 0) -> list[dict]:
    """
    Extrai texto de cada página do PDF.

    Args:
        pdf_path: Caminho do PDF.
        page_offset: Número de páginas de frontmatter a descontar para alinhar
            com a numeração impressa do livro. Páginas com número <= 0 após o
            ajuste recebem page_number=None (frontmatter).

    Returns:
        Lista de dicts com keys: page_number (int|None), text (str).
    """
    pages = []

    with pdfplumber.open(str(pdf_path)) as pdf:
        total = len(pdf.pages)
        logger.info("PDF com %d páginas (offset=%d): %s", total, page_offset, pdf_path)

        for pdf_page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if text and text.strip():
                printed = pdf_page_num - page_offset
                pages.append({
                    "page_number": printed if printed > 0 else None,
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
    page_offset: int = 0,
    batch_size: int = 10,
) -> int:
    """
    Ingere um PDF completo: extrai → chunkeia → embeds → salva.

    Args:
        conn: Conexão PostgreSQL.
        pdf_path: Caminho para o arquivo PDF.
        book_id: Identificador único do livro (ex: "core").
        book_title: Título legível (ex: "Tormenta 20 — Livro Básico").
        page_offset: Páginas de frontmatter a descontar (ver extract_pages).
        batch_size: Quantos chunks processar antes de logar progresso.

    Returns:
        Número de chunks ingeridos.
    """
    pages = await asyncio.to_thread(extract_pages, pdf_path, page_offset)
    chunks = await asyncio.to_thread(chunk_pages, pages)

    if not chunks:
        logger.warning("Nenhum chunk gerado para %s", pdf_path)
        return 0

    logger.info("Iniciando ingestão de %d chunks para '%s'...", len(chunks), book_title)

    # voyage-4: lista plana de textos, API batch interno cuida do paging
    chunk_texts = [chunk["content"] for chunk in chunks]

    logger.info(
        "Gerando embeddings via Voyage AI (%s) para '%s' (%d chunks)...",
        settings.embedding_model, book_title, len(chunks),
    )
    try:
        embeddings = await embeddings_service.embed_documents_batch(chunk_texts)
    except Exception as exc:
        logger.error("Falha ao gerar embeddings para '%s': %s", book_title, exc)
        raise

    if len(embeddings) != len(chunks):
        raise ValueError(
            f"Mismatch: {len(chunks)} chunks mas {len(embeddings)} embeddings retornados"
        )

    logger.info("Embeddings gerados. Salvando no banco...")
    saved = 0

    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        try:
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
                logger.info("  Progresso: %d/%d chunks salvos", i + 1, len(chunks))

        except Exception as exc:
            logger.error("Erro ao salvar chunk %d de '%s': %s", i, book_title, exc)
            # Continua os demais chunks mesmo em caso de falha

    logger.info("✅ '%s' concluído: %d/%d chunks salvos", book_title, saved, len(chunks))
    return saved
