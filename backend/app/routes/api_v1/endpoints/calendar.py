import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.data.storage import models
from app.database import get_session
from app.routes.api_v1.endpoints.accounts import require_current_account

router = APIRouter()


def _timetable_to_dict(t: models.Timetable) -> dict:
    """Convert a Timetable DB row to the dict shape the frontend expects."""
    return {
        "id": t.id,
        "name": t.name,
        "semesterName": t.semester_name,
        "appointments": t.appointments or [],
        "updatedAt": t.updated_at.isoformat() if t.updated_at else "",
        "order": t.order,
        "deleted": t.deleted,
    }


def _calendar_state(
    account: models.UserAccount, session: Session
) -> schemas.CalendarState:
    """Build CalendarState from the new timetable/active_timetable tables."""
    timetables = (
        session.query(models.Timetable)
        .filter(models.Timetable.user_account_id == account.id)
        .all()
    )
    active_rows = (
        session.query(models.ActiveTimetable)
        .filter(models.ActiveTimetable.user_account_id == account.id)
        .all()
    )
    return schemas.CalendarState(
        timetables=[_timetable_to_dict(t) for t in timetables],
        activeTimetableIds={a.semester_name: a.timetable_id for a in active_rows},
    )


@router.get("", response_model=schemas.CalendarState)
def read_calendar_state(
    current_account: models.UserAccount = Depends(require_current_account),
    session: Session = Depends(get_session),
):
    return _calendar_state(current_account, session)


@router.put("", response_model=schemas.CalendarState)
def replace_calendar_state(
    state: schemas.CalendarStateUpdate,
    current_account: models.UserAccount = Depends(require_current_account),
    session: Session = Depends(get_session),
):
    # Replace all timetables for this user
    session.query(models.Timetable).filter(
        models.Timetable.user_account_id == current_account.id
    ).delete()
    session.query(models.ActiveTimetable).filter(
        models.ActiveTimetable.user_account_id == current_account.id
    ).delete()
    session.flush()

    for tt in state.timetables:
        # Parse updatedAt string to datetime
        try:
            updated_at = datetime.datetime.fromisoformat(
                tt.updatedAt.replace("Z", "+00:00")
            )
        except (ValueError, AttributeError):
            updated_at = datetime.datetime.now(datetime.timezone.utc)

        session.add(
            models.Timetable(
                id=tt.id,
                user_account_id=current_account.id,
                name=tt.name,
                semester_name=tt.semesterName,
                appointments=[a.dict() for a in tt.appointments],
                updated_at=updated_at,
                order=tt.order,
                deleted=tt.deleted,
            )
        )

    for semester, timetable_id in state.activeTimetableIds.items():
        session.add(
            models.ActiveTimetable(
                user_account_id=current_account.id,
                semester_name=semester,
                timetable_id=timetable_id,
            )
        )

    session.commit()
    return _calendar_state(current_account, session)
