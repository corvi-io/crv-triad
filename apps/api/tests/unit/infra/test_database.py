from infra.database import normalize_database_url


def test_normalize_database_url_uses_psycopg_driver_for_postgres_urls() -> None:
    assert (
        normalize_database_url(
            "postgresql://user:pass@localhost:5432/crv_triad_api"
        )
        == "postgresql+psycopg://user:pass@localhost:5432/crv_triad_api"
    )
    assert (
        normalize_database_url(
            "postgres://user:pass@localhost:5432/crv_triad_api"
        )
        == "postgresql+psycopg://user:pass@localhost:5432/crv_triad_api"
    )


def test_normalize_database_url_preserves_explicit_driver() -> None:
    assert (
        normalize_database_url(
            "postgresql+psycopg://user:pass@localhost:5432/crv_triad_api"
        )
        == "postgresql+psycopg://user:pass@localhost:5432/crv_triad_api"
    )
