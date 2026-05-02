import pathlib

from pydantic import BaseSettings, validator


class MailSettings(BaseSettings):
    MAIL_SERVER: str = ""
    MAIL_PORT: int = 465
    MAIL_TIMEOUT_SECONDS: int = 10
    MAIL_USE_STARTTLS: bool = True
    MAIL_SENDER_NAME: str = ""
    MAIL_SENDER_EMAIL: str = ""
    MAIL_LOGIN_EMAIL: str = ""
    MAIL_LOGIN_PASSWORD_FILE: pathlib.Path | None = None
    MAIL_LOGIN_PASSWORD: str = ""

    @validator("MAIL_LOGIN_PASSWORD", pre=True, always=True)
    def read_password_file(cls, value: str | None, values: dict):
        if value:
            return value
        path = values.get("MAIL_LOGIN_PASSWORD_FILE")
        if path is None:
            return ""
        return pathlib.Path(path).read_text().strip()

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


mail_settings = MailSettings()
