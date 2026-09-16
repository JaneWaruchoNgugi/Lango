from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ocr_service_token: str = "dev-token-change-in-prod"
    ocr_demo_mode: bool = False
    max_file_bytes: int = 5 * 1024 * 1024  # 5 MB
    log_level: str = "INFO"
    tesseract_timeout_seconds: int = 20
    # Confidence thresholds
    high_confidence_threshold: float = 0.90
    medium_confidence_threshold: float = 0.70


settings = Settings()


def get_settings() -> Settings:
    """Return a fresh Settings instance (reads current env vars). Used via FastAPI Depends."""
    return Settings()
