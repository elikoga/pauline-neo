from app.mail import auth_link, login_email_body


def test_auth_link_uses_base_url(monkeypatch):
    monkeypatch.setattr("app.mail.api_settings.BASE_URL", "https://example.test/")

    assert auth_link("abc123") == "https://example.test/auth/verify?token=abc123"


def test_login_email_body_contains_link(monkeypatch):
    monkeypatch.setattr("app.mail.api_settings.BASE_URL", "https://example.test")

    body = login_email_body("secret-token")

    assert "https://example.test/auth/verify?token=secret-token" in body
    assert "ignorieren" in body
