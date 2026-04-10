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

    # Google AI
    google_ai_api_key: str

    # Autenticação interna
    rag_internal_secret: str

    # Configurações RAG
    chunk_size: int = 800
    chunk_overlap: int = 100
    top_k: int = 5
    similarity_threshold: float = 0.3
    embedding_model: str = "models/gemini-embedding-001"
    embedding_dimensions: int = 768


settings = Settings()
