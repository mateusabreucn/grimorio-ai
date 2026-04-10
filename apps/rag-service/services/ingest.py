"""Pipeline de ingestão: PDF → chunks → embeddings → PostgreSQL."""

# TODO: Implementar ingestão (Fase 2 - Sonnet/Opus)
# - Função: async def ingest_pdf_file(pdf_path: str, book_id: str, book_title: str)
# - Passos:
#   1. Extrair texto do PDF com pdfplumber
#   2. Usar NotebookLM insights em data/analysis/ para chunking inteligente
#   3. Gerar embeddings com GLM 5.1
#   4. Salvar chunks em document_chunks (pgvector)
