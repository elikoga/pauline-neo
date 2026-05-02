import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, constr


class AccountAuthRequest(BaseModel):
    email: EmailStr
    challenge_token: str
    challenge_answer: constr(strip_whitespace=True, min_length=1)


class AccountVerify(BaseModel):
    token: constr(strip_whitespace=True, min_length=1)

class Account(BaseModel):
    id: int
    email: EmailStr
    display_name: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        orm_mode = True


class AccountAuthChallenge(BaseModel):
    question: str
    token: str


class AccountAuthEmailSent(BaseModel):
    email: EmailStr


class AccountSession(BaseModel):
    account: Account
    token: str