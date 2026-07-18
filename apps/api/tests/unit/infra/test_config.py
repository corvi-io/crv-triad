import pytest
from pydantic import ValidationError

from infra.config import Settings


def valid_settings(**overrides: object) -> Settings:
    values = {
        "_env_file": None,
        "database_url": "postgresql+psycopg://user:pass@localhost:5432/crv_triad_api",
    }
    values.update(overrides)
    return Settings(**values)


def test_settings_accept_postgres_database_url() -> None:
    database_url = (
        " postgresql+psycopg://user:pass@localhost:5432/crv_triad_api "
    )
    settings = valid_settings(database_url=database_url)

    assert (
        settings.database_url
        == "postgresql+psycopg://user:pass@localhost:5432/crv_triad_api"
    )


def test_settings_reject_non_postgres_database_url() -> None:
    with pytest.raises(ValidationError):
        valid_settings(database_url="sqlite:///tmp/crv_triad_api.db")
