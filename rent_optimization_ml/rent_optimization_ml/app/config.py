from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the ML microservice."""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # API
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    environment: str = "development"
    debug: bool = True
    cors_origins: List[AnyHttpUrl | str] = ["http://localhost:3000", "http://localhost:3001"]

    # Model
    model_version: str = "1.0.0"
    model_path: Path = Path("./models/rent_predictor.joblib")
    confidence_threshold: float = 0.7
    min_training_samples: int = 100

    # Features
    use_market_data: bool = True
    use_seasonal_adjustment: bool = True
    use_economic_indicators: bool = False

    # Cache
    cache_ttl_seconds: int = 3600
    enable_prediction_cache: bool = True

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # External APIs (placeholders for future integration)
    zillow_api_key: str | None = None
    rentometer_api_key: str | None = None
    realtor_api_key: str | None = None

    # MLflow
    mlflow_tracking_uri: str | None = None
    mlflow_experiment_name: str = "rent_optimization"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance so the service stays fast."""
    return Settings()
