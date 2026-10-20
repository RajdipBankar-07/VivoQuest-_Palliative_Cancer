from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    AI_SERVICE_API_KEY: str = "vivoquest_ai_dev_key_2026"
    CORE_API_URL: str = "http://localhost:4000"

    # Geo defaults for Pune / Maharashtra clusters
    DEFAULT_CLUSTER_LAT: float = 18.5204
    DEFAULT_CLUSTER_LNG: float = 73.8567
    AVERAGE_URBAN_SPEED_KMH: float = 25.0
    MAX_RECOMMENDED_BUNDLE_MINUTES: int = 120

    # External routing placeholders (optional)
    MAPBOX_ACCESS_TOKEN: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
