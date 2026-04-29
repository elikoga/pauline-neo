import hashlib
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app import schemas
from app.data.storage import models
from app.database import get_session
from app.auth_challenge import issue_challenge, verify_challenge
from app.mail import send_auth_email

router = APIRouter()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def public_account(account: models.UserAccount) -> schemas.Account:
    return schemas.Account.from_orm(account)


def find_account_by_email(session: Session, email: str) -> models.UserAccount | None:
    return (
        session.query(models.UserAccount)
        .filter(models.UserAccount.email == email.lower())
        .first()
    )


def find_account_by_pending_token(
    session: Session, token: str
) -> models.UserAccount | None:
    return (
        session.query(models.UserAccount)
        .filter(models.UserAccount.pending_token_hash == hash_token(token))
        .first()
    )


def issue_pending_token(account: models.UserAccount) -> str:
    token = secrets.token_urlsafe(32)
    account.pending_token_hash = hash_token(token)
    return token


def create_session(account: models.UserAccount) -> str:
    token = secrets.token_urlsafe(32)
    account.auth_sessions.append(models.UserAccountSession(token_hash=hash_token(token)))
    return token


def get_or_create_account(session: Session, email: str) -> models.UserAccount:
    existing = find_account_by_email(session, email)
    if existing:
        return existing

    db_account = models.UserAccount(email=email)
    session.add(db_account)
    return db_account


@router.get("/auth-challenge", response_model=schemas.AccountAuthChallenge)
def read_auth_challenge():
    question, token = issue_challenge()
    return schemas.AccountAuthChallenge(question=question, token=token)


@router.post(
    "/auth-link",
    response_model=schemas.AccountAuthEmailSent,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_auth_link(
    account: schemas.AccountAuthRequest, session: Session = Depends(get_session)
):
    if not verify_challenge(account.challenge_token, account.challenge_answer):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid auth challenge"
        )
    email = account.email.lower()
    db_account = get_or_create_account(session, email)
    token = issue_pending_token(db_account)
    session.commit()
    session.refresh(db_account)
    send_auth_email(db_account.email, token)
    return schemas.AccountAuthEmailSent(email=db_account.email)


@router.post("/verify", response_model=schemas.AccountSession)
def verify_account(
    verification: schemas.AccountVerify, session: Session = Depends(get_session)
):
    db_account = find_account_by_pending_token(session, verification.token)
    if not db_account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token"
        )

    session_token = create_session(db_account)
    db_account.pending_token_hash = None
    session.commit()
    session.refresh(db_account)
    return schemas.AccountSession(account=public_account(db_account), token=session_token)


def require_current_account(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> models.UserAccount:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token"
        )

    token = authorization.removeprefix("Bearer ").strip()
    db_session = (
        session.query(models.UserAccountSession)
        .filter(models.UserAccountSession.token_hash == hash_token(token))
        .first()
    )
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token"
        )

    return db_session.account


@router.get("/me", response_model=schemas.Account)
def read_current_account(
    current_account: models.UserAccount = Depends(require_current_account),
):
    return public_account(current_account)
