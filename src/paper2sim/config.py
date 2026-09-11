"""Configuration module for Paper2Sim."""

import os
import tempfile


class Config:
    """Application configuration."""

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_WORKERS: int = int(os.getenv("API_WORKERS", "4"))

    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "3600"))
    RATE_LIMIT: str = os.getenv("RATE_LIMIT", "60/minute")

    TEMP_DIR: str = os.getenv("TEMP_DIR", tempfile.gettempdir())

    @classmethod
    def is_llm_configured(cls) -> bool:
        return bool(cls.GROQ_API_KEY or cls.OPENAI_API_KEY)
