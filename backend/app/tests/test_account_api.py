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



class AccountStub:
    def __init__(self, calendar_state):
        self.calendar_state = calendar_state


def test_calendar_state_defaults_to_empty_appointments():
    state = _calendar_state(AccountStub(None))

    assert state.appointments == []


def test_calendar_state_preserves_course_and_small_group_shapes():
    raw_state = {
        "appointments": [
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
    }

    state = _calendar_state(AccountStub(raw_state))

    assert len(state.appointments) == 2
    assert state.appointments[0].dict()["description"] == "Beschreibung"
    assert state.appointments[1].dict() == {
        "cid": "L.123.45678",
        "name": "Gruppe 1",
        "appointments": [],
    }


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