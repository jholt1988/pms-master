from functools import lru_cache
from pathlib import Path
from typing import List, Any

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the ML microservice."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=('settings_',)  # Fix warning about model_ namespace conflicts
    )

    # API
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    environment: str = "development"
    debug: bool = True
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    @model_validator(mode='before')
    @classmethod
    def parse_cors_origins_before(cls, data: Any) -> Any:
        """Parse CORS origins before field validation to prevent JSON parsing errors."""
        import os
        import json
        
        # Handle dict input (from env vars or config)
        if isinstance(data, dict):
            cors_value = data.get('cors_origins')
            
            # If not set or empty, use default
            if not cors_value:
                data['cors_origins'] = ["http://localhost:3000", "http://localhost:3001"]
                return data
            
            # Already a list, return as-is
            if isinstance(cors_value, list):
                return data
            
            # Handle string values
            if isinstance(cors_value, str):
                # Empty string -> use default
                if not cors_value.strip():
                    data['cors_origins'] = ["http://localhost:3000", "http://localhost:3001"]
                    return data
                
                # Try to parse as JSON first
                try:
                    parsed = json.loads(cors_value)
                    if isinstance(parsed, list):
                        data['cors_origins'] = parsed
                        return data
                except (json.JSONDecodeError, ValueError, TypeError):
                    pass
                
                # Try comma-separated values
                if ',' in cors_value:
                    origins = [origin.strip() for origin in cors_value.split(',') if origin.strip()]
                    if origins:
                        data['cors_origins'] = origins
                        return data
                
                # Single value
                if cors_value.strip():
                    data['cors_origins'] = [cors_value.strip()]
                    return data
                
                # Default fallback
                data['cors_origins'] = ["http://localhost:3000", "http://localhost:3001"]
        
        return data

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
    try:
        return Settings()
    except Exception as e:
        # If there's an error parsing settings (e.g., cors_origins), 
        # try to fix it by temporarily unsetting the problematic env var
        import os
        if 'CORS_ORIGINS' in os.environ:
            cors_origins_backup = os.environ.get('CORS_ORIGINS')
            # Try without CORS_ORIGINS to use defaults
            try:
                del os.environ['CORS_ORIGINS']
                settings = Settings()
                os.environ['CORS_ORIGINS'] = cors_origins_backup
                return settings
            except:
                # Restore and raise original error
                if cors_origins_backup:
                    os.environ['CORS_ORIGINS'] = cors_origins_backup
                raise e
        raise e
