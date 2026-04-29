from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

from app.config import api_settings

api_key_header = APIKeyHeader(name="API-Key")


def check_api_key(api_key: str = Security(api_key_header)):
    if not (api_key in [str(u) for u in api_settings.API_KEYS]):
        print(api_key, api_settings.API_KEYS)
        raise HTTPException(status_code=401, detail="API-Key header invalid")
    return api_key
