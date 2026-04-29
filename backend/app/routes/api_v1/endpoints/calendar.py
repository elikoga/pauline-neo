from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.data.storage import models
from app.database import get_session
from app.routes.api_v1.endpoints.accounts import require_current_account

router = APIRouter()


def _migrate_calendar_state(raw_state):
    migrated = dict(raw_state or {})
    if "activeTimetableIds" not in migrated and "activeCandidateIds" in migrated:
        migrated["activeTimetableIds"] = migrated["activeCandidateIds"]
    if "timetables" not in migrated and "candidates" in migrated:
        migrated["timetables"] = migrated["candidates"]
    # Handle legacy PR #5 format where calendar_state held {appointments: [...]}
    if "timetables" not in migrated and "appointments" in migrated:
        migrated["timetables"] = [{
            "id": "migrated-legacy",
            "name": "Stundenplan",
            "semesterName": "",
            "appointments": migrated["appointments"],
            "updatedAt": "2026-01-01T00:00:00.000Z"
        }]
        migrated["activeTimetableIds"] = {}
    return migrated


def _calendar_state(account: models.UserAccount) -> schemas.CalendarState:
    raw_state = _migrate_calendar_state(account.calendar_state)
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
    existing = _calendar_state(current_account)
    existing_state = existing.dict()
    incoming_state = state.dict()
    merged = {**existing_state, **incoming_state}
    # Merge timetables by id (incoming replaces existing by id)
    if 'timetables' in incoming_state:
        existing_by_id = {t['id']: t for t in existing_state.get('timetables', [])}
        for t in incoming_state['timetables']:
            existing_by_id[t['id']] = t
        merged['timetables'] = list(existing_by_id.values())
    current_account.calendar_state = merged
    session.add(current_account)
    session.commit()
    session.refresh(current_account)
    return _calendar_state(current_account)
