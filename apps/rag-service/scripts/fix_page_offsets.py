#!/usr/bin/env python
"""Corrige o page_number dos chunks já ingeridos.

A ingestão original usa o índice da página do PDF (começando em 1), que difere
da numeração impressa do livro porque cada PDF tem um frontmatter (capa,
contracapa, sumário etc.) antes da página "1" impressa.

Offsets aplicados (página_real = página_pdf − offset):
    core     : −6   (Livro Básico)
    ameacas  : −2   (Ameaças de Arton)
    herois   : −2   (Heróis de Arton)
    deuses   : −2   (Deuses de Arton)

Páginas que resultam em ≤ 0 são frontmatter — viram NULL.

Uso:
    uv run python scripts/fix_page_offsets.py            # dry-run (mostra apenas)
    uv run python scripts/fix_page_offsets.py --apply    # aplica de fato
"""

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dependencies import init_db_pool, close_db_pool, get_connection, return_connection  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("fix_page_offsets")

OFFSETS: dict[str, int] = {
    "core": 6,
    "ameacas": 2,
    "herois": 2,
    "deuses": 2,
}


def show_state(conn, label: str) -> None:
    """Loga o range de page_number atual por livro."""
    sql = """
        SELECT book_id, book_title,
               COUNT(*) AS total,
               COUNT(page_number) AS with_page,
               MIN(page_number) AS min_p,
               MAX(page_number) AS max_p
        FROM document_chunks
        GROUP BY book_id, book_title
        ORDER BY book_id
    """
    cursor = conn.cursor()
    cursor.execute(sql)
    rows = cursor.fetchall()
    cursor.close()

    logger.info("─" * 70)
    logger.info("Estado %s:", label)
    for r in rows:
        book_id, title, total, with_page, min_p, max_p = r
        logger.info(
            "  %-10s  %-32s  %d chunks (com pág: %d)  range: %s..%s",
            book_id, title[:32], total, with_page, min_p, max_p,
        )
    logger.info("─" * 70)


def apply_offsets(conn, apply: bool) -> None:
    """Aplica (ou simula) o ajuste de page_number por livro."""
    cursor = conn.cursor()
    try:
        for book_id, offset in OFFSETS.items():
            # 1. Frontmatter → NULL (páginas que ficariam ≤ 0)
            sql_null = """
                UPDATE document_chunks
                SET page_number = NULL
                WHERE book_id = %s
                  AND page_number IS NOT NULL
                  AND page_number <= %s
            """
            # 2. Subtrai o offset das demais
            sql_shift = """
                UPDATE document_chunks
                SET page_number = page_number - %s
                WHERE book_id = %s
                  AND page_number IS NOT NULL
                  AND page_number > %s
            """

            if apply:
                cursor.execute(sql_null, (book_id, offset))
                null_count = cursor.rowcount
                cursor.execute(sql_shift, (offset, book_id, offset))
                shift_count = cursor.rowcount
                logger.info(
                    "  %-10s offset=%d  → %d frontmatter→NULL, %d páginas ajustadas",
                    book_id, offset, null_count, shift_count,
                )
            else:
                # Conta o que seria afetado
                cursor.execute(
                    "SELECT COUNT(*) FROM document_chunks WHERE book_id = %s "
                    "AND page_number IS NOT NULL AND page_number <= %s",
                    (book_id, offset),
                )
                null_count = cursor.fetchone()[0]
                cursor.execute(
                    "SELECT COUNT(*) FROM document_chunks WHERE book_id = %s "
                    "AND page_number IS NOT NULL AND page_number > %s",
                    (book_id, offset),
                )
                shift_count = cursor.fetchone()[0]
                logger.info(
                    "  %-10s offset=%d  → seriam %d frontmatter→NULL, %d ajustes",
                    book_id, offset, null_count, shift_count,
                )

        if apply:
            conn.commit()
            logger.info("Commit aplicado.")
        else:
            conn.rollback()
            logger.info("Dry-run: nada foi commitado.")
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()


def main() -> None:
    apply = "--apply" in sys.argv

    init_db_pool()
    conn = get_connection()
    try:
        show_state(conn, "ANTES")
        logger.info("")
        logger.info("Aplicando offsets %s...", "DE FATO (--apply)" if apply else "em DRY-RUN")
        apply_offsets(conn, apply=apply)
        logger.info("")
        if apply:
            show_state(conn, "DEPOIS")
        else:
            logger.info("Rode com --apply para persistir.")
    finally:
        return_connection(conn)
        close_db_pool()


if __name__ == "__main__":
    main()
