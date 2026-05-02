from typing import Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.data.storage import models
from app.database import get_session
from app.routes.api_v1.endpoints.accounts import require_current_account

router = APIRouter()


@router.get("", response_model=schemas.Preferences)
def read_preferences(
    current_account: models.UserAccount = Depends(require_current_account),
):
    return schemas.Preferences(preferences=current_account.preferences or {})


@router.put("", response_model=schemas.Preferences)
def replace_preferences(
    body: schemas.Preferences,
    current_account: models.UserAccount = Depends(require_current_account),
    session: Session = Depends(get_session),
):
    current_account.preferences = body.preferences
    session.commit()
    session.refresh(current_account)
    return schemas.Preferences(preferences=current_account.preferences or {})
