from pydantic import BaseModel


class DetailMessage(BaseModel):
    detail: str

    class Config:
        schema_extra = {
            "example": {
                "detail": "something with XY"
            }
        }
