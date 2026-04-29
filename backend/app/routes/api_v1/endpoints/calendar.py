from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.data.storage import models
from app.database import get_session
from app.routes.api_v1.endpoints.accounts import require_current_account

router = APIRouter()


def _calendar_state(account: models.UserAccount) -> schemas.CalendarState:
    raw_state = account.calendar_state or {}
    return schemas.CalendarState.parse_obj(raw_state)


@router.get("", response_model=schemas.CalendarState)
def read_calendar_state(
    current_account: models.UserAccount = Depends(require_current_account),
):
    return _calendar_state(current_account)


@router.put("", response_model=schemas.CalendarState)
def replace_calendar_state(
    state: schemas.CalendarStateUpdate,
    current_account: models.UserAccount = Depends(require_current_account),
    session: Session = Depends(get_session),
):
    current_account.calendar_state = state.dict()
    session.add(current_account)
    session.commit()
    session.refresh(current_account)
    return _calendar_state(current_account)
