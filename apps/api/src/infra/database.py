from collections.abc import Callable

from sqlalchemy import Engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session, SQLModel, create_engine

NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

SQLModel.metadata.naming_convention = NAMING_CONVENTION
metadata = SQLModel.metadata

SessionFactory = Callable[[], Session]


def create_database_engine(database_url: str, *, echo: bool = False) -> Engine:
    normalized_url = normalize_database_url(database_url)
    if not normalized_url:
        raise ValueError("database_url must be set")

    return create_engine(normalized_url, echo=echo, pool_pre_ping=True)


def normalize_database_url(database_url: str) -> str:
    normalized_url = database_url.strip()
    if normalized_url.startswith("postgresql://"):
        return normalized_url.replace(
            "postgresql://", "postgresql+psycopg://", 1
        )
    if normalized_url.startswith("postgres://"):
        return normalized_url.replace("postgres://", "postgresql+psycopg://", 1)
    return normalized_url


def create_session_factory(engine: Engine) -> SessionFactory:
    factory = sessionmaker(
        bind=engine,
        class_=Session,
        expire_on_commit=False,
    )
    return factory
