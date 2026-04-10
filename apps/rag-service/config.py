from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações do RAG Service via variáveis de ambiente."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    # Banco de dados
    database_url: str

    # Autenticação interna
    rag_internal_secret: str

    # Ollama (embeddings locais)
    ollama_base_url: str = "http://localhost:11434"
    embedding_model: str = "qwen3-embedding"
    embedding_dimensions: int = 4096

    # Configurações RAG
    chunk_size: int = 800
    chunk_overlap: int = 100
    top_k: int = 5
    similarity_threshold: float = 0.3


settings = Settings()
