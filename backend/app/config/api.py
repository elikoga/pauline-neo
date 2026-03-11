import uuid
from typing import List

from pydantic import BaseSettings


class APISettings(BaseSettings):
    BASE_URL: str = "http://localhost:8000"
    FRONTEND_BINARY_PATH: str | None = None

    PROJECT_NAME: str = "PAULINE"
    API_V1_STR: str = "/api/v1"
    API_KEYS: List[uuid.UUID] = []
    BROKER: str = "database"

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


api_settings = APISettings()
