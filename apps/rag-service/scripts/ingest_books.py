#!/usr/bin/env python
"""Script de ingestão dos livros de RPG para o pgvector.

Execute a partir da pasta rag-service:
    python scripts/ingest_books.py

Requer .env com DATABASE_URL e GOOGLE_AI_API_KEY configurados.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Garante que o módulo raiz (rag-service/) está no PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings  # noqa: E402
from dependencies import init_db_pool, close_db_pool, _pool  # noqa: E402
from services.ingest import ingest_pdf  # noqa: E402
from services.vector_store import chunk_count_sync  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ingest_books")

# Mapeamento de livros: path relativo ao diretório rag-service/
BOOKS = [
    {
        "path": "data/books/T20-Livro Básico.pdf",
        "id": "core",
        "title": "Tormenta 20 — Livro Básico",
    },
    {
        "path": "data/books/Ameacas-de-Arton.pdf",
        "id": "ameacas",
        "title": "Ameaças de Arton",
    },
    {
        "path": "data/books/T20-Deuses-de-Arton.pdf",
        "id": "deuses",
        "title": "Deuses de Arton",
    },
    {
        "path": "data/books/T20-Herois-de-Arton.pdf",
        "id": "herois",
        "title": "Heróis de Arton",
    },
]

BASE_DIR = Path(__file__).parent.parent


async def ingest_all(skip_existing: bool = True) -> None:
    """Ingere todos os livros no banco de dados."""
    init_db_pool()
    logger.info("Pool de conexões iniciado.")

    try:
        total_saved = 0

        for book in BOOKS:
            pdf_path = BASE_DIR / book["path"]

            if not pdf_path.exists():
                logger.warning("PDF não encontrado, pulando: %s", pdf_path)
                continue

            # Pega uma conexão para checar se o livro já foi ingerido
            conn = _pool.getconn()
            try:
                existing = chunk_count_sync(conn, book_id=book["id"])
            finally:
                _pool.putconn(conn)

            if skip_existing and existing > 0:
                logger.info(
                    "Livro '%s' já tem %d chunks — pulando (use --force para reingerir).",
                    book["title"],
                    existing,
                )
                continue

            logger.info("=" * 60)
            logger.info("Ingerindo: %s", book["title"])
            logger.info("Arquivo  : %s", pdf_path.name)
            logger.info("=" * 60)

            conn = _pool.getconn()
            try:
                saved = await ingest_pdf(
                    conn=conn,
                    pdf_path=pdf_path,
                    book_id=book["id"],
                    book_title=book["title"],
                )
                total_saved += saved
            finally:
                _pool.putconn(conn)

        logger.info("")
        logger.info("Ingestão concluída! Total de chunks salvos: %d", total_saved)

    finally:
        close_db_pool()
        logger.info("Pool de conexões encerrado.")


def main() -> None:
    force = "--force" in sys.argv
    if force:
        logger.info("Modo --force: livros já ingeridos serão reingeridos.")

    asyncio.run(ingest_all(skip_existing=not force))


if __name__ == "__main__":
    main()
