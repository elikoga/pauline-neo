from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, func
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
    calendar_state = Column(JSON, nullable=False, default=lambda: {"appointments": []})  # deprecated, kept for migration
    preferences = Column(JSON, nullable=False, default=dict)
    timetables = relationship(
        "Timetable", back_populates="account", cascade="all, delete-orphan"
    )
    active_timetables = relationship(
        "ActiveTimetable", back_populates="account", cascade="all, delete-orphan"
    )
    pending_token_hash = Column(String(64), nullable=True, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


class Timetable(Base):
    __tablename__ = "timetable"

    id = Column(String(36), primary_key=True)
    user_account_id = Column(Integer, ForeignKey("user_account.id"), nullable=False, index=True)
    name = Column(String(256), nullable=False)
    semester_name = Column(String(128), nullable=False)
    appointments = Column(JSON, nullable=False, default=list)
    updated_at = Column(DateTime, nullable=False)
    order = Column(Integer, nullable=True)
    deleted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    account = relationship("UserAccount", back_populates="timetables")


class ActiveTimetable(Base):
    __tablename__ = "active_timetable"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_account_id = Column(Integer, ForeignKey("user_account.id"), nullable=False, index=True)
    semester_name = Column(String(128), nullable=False)
    timetable_id = Column(String(36), ForeignKey("timetable.id"), nullable=False)

    account = relationship("UserAccount", back_populates="active_timetables")
    timetable = relationship("Timetable")


class UserAccountSession(Base):
    __tablename__ = "user_account_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("user_account.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    account = relationship("UserAccount", back_populates="auth_sessions")