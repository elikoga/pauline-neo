from typing import Dict, Any

from pydantic import BaseModel


class Preferences(BaseModel):
    preferences: Dict[str, Any] = {}
