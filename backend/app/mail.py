import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from app.config.api import api_settings
from app.config.mail import MailSettings, mail_settings


def auth_link(token: str) -> str:
    base_url = api_settings.BASE_URL.rstrip("/")
    return f"{base_url}/auth/verify?token={token}"


def login_email_body(token: str) -> str:
    link = auth_link(token)
    return (
        "Hallo,\n\n"
        "mit diesem Link meldest du dich bei Pauline an:\n"
        f"{link}\n\n"
        "Wenn du diese E-Mail nicht angefordert hast, kannst du sie ignorieren.\n"
    )


def send_auth_email(receiver_email: str, token: str, settings: MailSettings = mail_settings) -> None:
    missing = [
        name
        for name in (
            "MAIL_SERVER",
            "MAIL_SENDER_NAME",
            "MAIL_SENDER_EMAIL",
            "MAIL_LOGIN_EMAIL",
            "MAIL_LOGIN_PASSWORD",
        )
        if not getattr(settings, name)
    ]
    if missing:
        raise RuntimeError(f"Missing mail configuration: {', '.join(missing)}")

    msg = EmailMessage()
    msg["Subject"] = "Dein Pauline-Anmeldelink"
    msg["From"] = formataddr((settings.MAIL_SENDER_NAME, settings.MAIL_SENDER_EMAIL))
    msg["Reply-To"] = settings.MAIL_SENDER_EMAIL
    msg["To"] = receiver_email
    msg["Message-ID"] = make_msgid(domain=settings.MAIL_SENDER_EMAIL.split("@", 1)[1])
    msg.set_content(login_email_body(token))

    context = ssl.create_default_context()
    if settings.MAIL_USE_STARTTLS:
        with smtplib.SMTP(
            settings.MAIL_SERVER,
            settings.MAIL_PORT,
            timeout=settings.MAIL_TIMEOUT_SECONDS,
        ) as server:
            server.starttls(context=context)
            server.login(settings.MAIL_LOGIN_EMAIL, settings.MAIL_LOGIN_PASSWORD)
            server.send_message(msg)
    else:
        with smtplib.SMTP_SSL(
            settings.MAIL_SERVER,
            settings.MAIL_PORT,
            context=context,
            timeout=settings.MAIL_TIMEOUT_SECONDS,
        ) as server:
            server.login(settings.MAIL_LOGIN_EMAIL, settings.MAIL_LOGIN_PASSWORD)
            server.send_message(msg)
