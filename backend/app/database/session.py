from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_database_settings

engine = create_engine(get_database_settings().SQLALCHEMY_DATABASE_URI, pool_pre_ping=True, pool_size=100, max_overflow=-1)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session() -> Generator:
    try:
        session = SessionLocal()
        yield session
    finally:
        session.close()
