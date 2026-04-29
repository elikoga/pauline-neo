from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class UserAccount(Base):
    __tablename__ = "user_account"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(320), nullable=False, unique=True, index=True)
    display_name = Column(String(128), nullable=True)
    auth_sessions = relationship(
        "UserAccountSession", back_populates="account", cascade="all, delete-orphan"
    )
    calendar_state = Column(JSON, nullable=False, default=lambda: {"appointments": []})
    pending_token_hash = Column(String(64), nullable=True, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

class UserAccountSession(Base):
    __tablename__ = "user_account_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("user_account.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    account = relationship("UserAccount", back_populates="auth_sessions")