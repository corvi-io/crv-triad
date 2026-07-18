import os
from typing import Any

from fastapi.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://user:pass@localhost:5432/crv_triad_api",
)

from entrypoints.rest import main
from infra.config import Settings


def valid_settings() -> Settings:
    return Settings(
        _env_file=None,
        database_url="postgresql+psycopg://user:pass@localhost:5432/crv_triad_api",
    )


def test_create_app_exposes_health_and_readiness_routes() -> None:
    client = TestClient(main.create_app(valid_settings()))

    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"status": "ready"}


def test_create_app_uses_safe_validation_error_response() -> None:
    app = main.create_app(valid_settings())

    @app.get("/requires-int")
    def requires_int(value: int) -> dict[str, int]:
        return {"value": value}

    response = TestClient(app).get("/requires-int", params={"value": "invalid"})

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "validation_error",
            "message": "Request input is invalid.",
            "fields": None,
        }
    }


def test_run_starts_uvicorn_with_rest_app(monkeypatch: Any) -> None:
    captured: dict[str, Any] = {}

    def fake_run(app: str, **kwargs: object) -> None:
        captured["app"] = app
        captured["kwargs"] = kwargs

    monkeypatch.setattr("uvicorn.run", fake_run)

    main.run()

    assert captured == {
        "app": "entrypoints.rest.main:app",
        "kwargs": {"app_dir": "src", "host": "0.0.0.0", "port": 8000},
    }
