from app.auth_challenge import Challenge, issue_challenge, numeric_answers, verify_challenge


def test_numeric_answers_accept_digits_words_and_punctuation():
    assert {"14", "vierzehn", "=14"}.issubset(set(numeric_answers(14)))


def test_challenge_accepts_lenient_numeric_answer(monkeypatch):
    monkeypatch.setattr("app.auth_challenge.generate_challenge", lambda: Challenge("Was ist fünf plus neun?", numeric_answers(14)))
    _question, token = issue_challenge()

    assert verify_challenge(token, "  = 14 ")
    assert verify_challenge(token, "vier-zehn")
    assert verify_challenge(token, "vierzehn.")


def test_challenge_rejects_wrong_answer(monkeypatch):
    monkeypatch.setattr("app.auth_challenge.generate_challenge", lambda: Challenge("Welche Farbe hat Gras?", ("grün", "gruen")))
    _question, token = issue_challenge()

    assert not verify_challenge(token, "blau")
