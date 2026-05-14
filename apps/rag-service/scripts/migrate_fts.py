"""
Migração: adiciona coluna `content_tsv` (tsvector português) e índice GIN
em `document_chunks`, habilitando full-text search com stemming PT-BR.

Idempotente: pode ser rodado várias vezes — verifica existência antes de criar.

Uso:
    cd apps/rag-service
    python scripts/migrate_fts.py            # aplica
    python scripts/migrate_fts.py --check    # apenas inspeciona estado atual

Razão de existência: a busca lexical anterior usava ILIKE %frase%, que não
tolera variações morfológicas do português (de/da/dos, singular/plural,
contrações). O índice GIN sobre tsvector com dicionário `portuguese` faz
stemming nativo no Postgres — "posturas" e "postura" passam a casar,
"das"/"de"/"dos" são tratadas como stopwords.

Custo: 1 coluna gerada (~200KB adicionais para ~2400 chunks) + 1 índice GIN
(~2MB). Coluna é GENERATED ALWAYS AS STORED, então é recalculada
automaticamente em UPDATE/INSERT — sem trigger manual.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# Permite rodar como script direto: `python scripts/migrate_fts.py`
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2

from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _column_exists(cursor: "psycopg2.extensions.cursor", table: str, column: str) -> bool:
    cursor.execute(
        """
        SELECT 1 FROM information_schema.columns
         WHERE table_name = %s AND column_name = %s
         LIMIT 1
        """,
        (table, column),
    )
    return cursor.fetchone() is not None


def _index_exists(cursor: "psycopg2.extensions.cursor", index_name: str) -> bool:
    cursor.execute(
        "SELECT 1 FROM pg_indexes WHERE indexname = %s LIMIT 1",
        (index_name,),
    )
    return cursor.fetchone() is not None


def _portuguese_config_exists(cursor: "psycopg2.extensions.cursor") -> bool:
    cursor.execute(
        "SELECT 1 FROM pg_ts_config WHERE cfgname = 'portuguese' LIMIT 1"
    )
    return cursor.fetchone() is not None


def _chunk_count(cursor: "psycopg2.extensions.cursor") -> int:
    cursor.execute("SELECT COUNT(*) FROM document_chunks")
    row = cursor.fetchone()
    return int(row[0]) if row else 0


def _tsv_populated_count(cursor: "psycopg2.extensions.cursor") -> int:
    cursor.execute("SELECT COUNT(*) FROM document_chunks WHERE content_tsv IS NOT NULL")
    row = cursor.fetchone()
    return int(row[0]) if row else 0


def check_state() -> None:
    """Inspeciona o estado atual e imprime relatório."""
    with psycopg2.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            total = _chunk_count(cur)
            has_pt = _portuguese_config_exists(cur)
            has_col = _column_exists(cur, "document_chunks", "content_tsv")
            has_idx = _index_exists(cur, "document_chunks_content_tsv_idx")

            logger.info("=== FTS Migration State ===")
            logger.info("chunks_total              = %d", total)
            logger.info("portuguese_config         = %s", "OK" if has_pt else "MISSING")
            logger.info("column content_tsv        = %s", "OK" if has_col else "MISSING")
            logger.info("index GIN content_tsv_idx = %s", "OK" if has_idx else "MISSING")

            if has_col:
                pop = _tsv_populated_count(cur)
                logger.info("chunks_with_tsv           = %d / %d", pop, total)


def apply_migration() -> None:
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL não configurada")

    with psycopg2.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            if not _portuguese_config_exists(cur):
                raise RuntimeError(
                    "Configuração de full-text search 'portuguese' não encontrada no Postgres. "
                    "Esperado em qualquer Postgres padrão (Supabase inclusive)."
                )

            # ALTER TABLE com coluna gerada requer memória pra processar todos os
            # rows existentes (~41MB para 2438 chunks de ~3KB). Elevamos o limite
            # apenas para esta sessão — não persiste, não afeta outras conexões.
            cur.execute("SET maintenance_work_mem = '256MB'")

            if _column_exists(cur, "document_chunks", "content_tsv"):
                logger.info("Coluna `content_tsv` já existe — pulando ALTER TABLE")
            else:
                logger.info("Adicionando coluna `content_tsv` (generated stored)...")
                cur.execute(
                    """
                    ALTER TABLE document_chunks
                    ADD COLUMN content_tsv tsvector
                    GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED
                    """
                )
                conn.commit()
                logger.info("Coluna criada. Postgres preencheu valores de todos os rows.")

            if _index_exists(cur, "document_chunks_content_tsv_idx"):
                logger.info("Índice GIN `document_chunks_content_tsv_idx` já existe")
            else:
                logger.info("Criando índice GIN sobre `content_tsv`...")
                cur.execute(
                    """
                    CREATE INDEX document_chunks_content_tsv_idx
                    ON document_chunks USING GIN (content_tsv)
                    """
                )
                conn.commit()
                logger.info("Índice criado.")

            total = _chunk_count(cur)
            populated = _tsv_populated_count(cur)
            logger.info("Migração concluída — %d/%d chunks com tsvector", populated, total)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Apenas inspeciona o estado atual, não altera nada.",
    )
    args = parser.parse_args()

    try:
        if args.check:
            check_state()
        else:
            apply_migration()
        return 0
    except Exception as exc:  # noqa: BLE001
        logger.exception("Migração falhou: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
