from app.routes.api_v1.endpoints.accounts import (
    create_session,
    find_account_by_email,
    find_account_by_pending_token,
    hash_token,
    issue_pending_token,
)
from app.routes.api_v1.endpoints.calendar import _calendar_state


class QueryStub:
    def __init__(self):
        self.filtered_email = None

    def filter(self, expression):
        self.filtered_email = expression.right.value
        return self

    def first(self):
        return None


class SessionStub:
    def __init__(self):
        self.query_stub = QueryStub()

    def query(self, _model):
        return self.query_stub


def test_hash_token_is_sha256_hex():
    token_hash = hash_token("secret-token")

    assert len(token_hash) == 64
    assert token_hash != "secret-token"
    assert token_hash == hash_token("secret-token")


def test_find_account_by_email_normalizes_email():
    session = SessionStub()

    assert find_account_by_email(session, "USER@MAIL.UPB.DE") is None
    assert session.query_stub.filtered_email == "user@mail.upb.de"


import datetime as _dt

from app.data.storage.models import Timetable as _TimetableModel, ActiveTimetable as _ActiveModel

class AccountStub:
    def __init__(self, calendar_state):
        self.calendar_state = calendar_state
        self.id = 1


class TimetableStub:
    def __init__(self, id, name, semester_name, appointments, updated_at, order=None, deleted=False):
        self.id = id
        self.name = name
        self.semester_name = semester_name
        self.appointments = appointments
        self.updated_at = updated_at
        self.order = order
        self.deleted = deleted


class ActiveTimetableStub:
    def __init__(self, semester_name, timetable_id):
        self.semester_name = semester_name
        self.timetable_id = timetable_id


class _MockQuery:
    def __init__(self, results):
        self._results = results

    def filter(self, *args):
        return self

    def all(self):
        return self._results


class CalendarSessionStub:
    def __init__(self, timetables=None, active_timetables=None):
        self._tt = timetables or []
        self._active = active_timetables or []

    def query(self, model):
        if model is _TimetableModel:
            return _MockQuery(self._tt)
        if model is _ActiveModel:
            return _MockQuery(self._active)
        return _MockQuery([])


def test_calendar_state_defaults_to_empty_timetables():
    state = _calendar_state(AccountStub(None), CalendarSessionStub())

    assert state.activeTimetableIds == {}
    assert state.timetables == []


def test_calendar_state_preserves_timetable_course_and_small_group_shapes():
    appointments = [
        {
            "cid": "L.123.45678",
            "name": "Vorlesung",
            "description": "Beschreibung",
            "ou": None,
            "instructors": "Prof. Example",
            "appointments": [
                {
                    "start_time": "2026-04-13T09:00:00",
                    "end_time": "2026-04-13T11:00:00",
                    "room": "C1",
                    "instructors": "Prof. Example",
                }
            ],
            "small_groups": [],
        },
        {
            "cid": "L.123.45678",
            "name": "Gruppe 1",
            "appointments": [],
        },
    ]
    tt = TimetableStub(
        id="timetable-1",
        name="Sommer 2026 \u2013 Stundenplan",
        semester_name="Sommer 2026",
        appointments=appointments,
        updated_at=_dt.datetime(2026, 4, 29),
    )
    active = ActiveTimetableStub(semester_name="Sommer 2026", timetable_id="timetable-1")

    state = _calendar_state(AccountStub(None), CalendarSessionStub([tt], [active]))

    assert state.activeTimetableIds == {"Sommer 2026": "timetable-1"}
    assert len(state.timetables) == 1
    assert len(state.timetables[0].appointments) == 2
    assert state.timetables[0].appointments[0].dict()["description"] == "Beschreibung"
    assert state.timetables[0].appointments[1].dict() == {
        "cid": "L.123.45678",
        "name": "Gruppe 1",
        "appointments": [],
    }


def test_calendar_state_returns_timetable_data_from_tables():
    tt = TimetableStub(
        id="candidate-1",
        name="Alter Plan",
        semester_name="Sommer 2026",
        appointments=[],
        updated_at=_dt.datetime(2026, 4, 29),
    )
    active = ActiveTimetableStub(semester_name="Sommer 2026", timetable_id="candidate-1")

    state = _calendar_state(AccountStub(None), CalendarSessionStub([tt], [active]))

    assert state.activeTimetableIds == {"Sommer 2026": "candidate-1"}
    assert len(state.timetables) == 1
    assert state.timetables[0].name == "Alter Plan"

class AccountTokenStub:
    def __init__(self):
        self.pending_token_hash = None
        self.auth_sessions = []


def test_issue_pending_token_stores_hash_not_token():
    account = AccountTokenStub()

    token = issue_pending_token(account)

    assert account.pending_token_hash == hash_token(token)
    assert account.pending_token_hash != token


def test_find_account_by_pending_token_hashes_token():
    session = SessionStub()

    assert find_account_by_pending_token(session, "pending-token") is None
    assert session.query_stub.filtered_email == hash_token("pending-token")


def test_create_session_appends_hashed_session_token():
    account = AccountTokenStub()

    token = create_session(account)

    assert len(account.auth_sessions) == 1
    assert account.auth_sessions[0].token_hash == hash_token(token)
    assert account.auth_sessions[0].token_hash != token
