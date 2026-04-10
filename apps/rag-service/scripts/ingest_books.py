#!/usr/bin/env python
"""Script de ingestão dos livros de RPG.

Execute com:
    python scripts/ingest_books.py

TODO: Implementar (Fase 2 - Sonnet/Opus)
- Carregar os 4 PDFs de data/books/
- Usar análises do NotebookLM em data/analysis/
- Chunking inteligente (800 tokens, overlap 100)
- Gerar embeddings com GLM 5.1
- Salvar em document_chunks (pgvector)
"""

import asyncio
import os
from pathlib import Path


async def main():
    """Função principal de ingestão."""
    books_dir = Path(__file__).parent.parent / "data" / "books"
    analysis_dir = Path(__file__).parent.parent / "data" / "analysis"

    # TODO: Implementar lógica de ingestão
    print(f"Books directory: {books_dir}")
    print(f"Analysis directory: {analysis_dir}")

    books = list(books_dir.glob("*.pdf"))
    analyses = list(analysis_dir.glob("*.md"))

    print(f"Found {len(books)} books and {len(analyses)} analysis files")
    print("TODO: Implement ingestion logic")


if __name__ == "__main__":
    asyncio.run(main())
