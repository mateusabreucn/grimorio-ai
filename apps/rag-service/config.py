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

    # Voyage AI (embeddings)
    voyage_api_key: str
    embedding_model: str = "voyage-4"
    embedding_dimensions: int = 1024

    # Configurações RAG
    chunk_size: int = 800
    chunk_overlap: int = 100
    top_k: int = 5
    similarity_threshold: float = 0.3


settings = Settings()
