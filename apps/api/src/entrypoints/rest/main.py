from fastapi import FastAPI

from entrypoints.rest.exceptions import register_rest_exception_handlers
from infra.config import Settings
from infra.di import configure_dependencies


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or Settings()  # pyright: ignore[reportCallIssue]
    configure_dependencies(resolved_settings)

    app = FastAPI(
        title="CRV Triad API",
        version="0.1.0",
    )

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready", tags=["health"])
    def ready() -> dict[str, str]:
        return {"status": "ready"}

    register_rest_exception_handlers(app)

    return app


app = create_app()


def run() -> None:
    import uvicorn

    uvicorn.run(
        "entrypoints.rest.main:app", app_dir="src", host="0.0.0.0", port=8000
    )
