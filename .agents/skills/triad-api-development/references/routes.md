# API REST Routes

## File Placement

- REST entrypoints live under `apps/api/src/entrypoints/rest/{module}`.
- Keep request DTOs, response DTOs, and response mappers in that module's
  `schemas.py`.
- Keep module exception handlers in that module's `exceptions.py`.
- Keep `src/entrypoints/rest/main.py` as the composition root only.

## Route Shape

- Management routers should include the module path in the prefix, for example
  `APIRouter(prefix="/campaign-links", tags=["campaign_links"])`.
- Public short routes can sit outside management prefixes when the URL is the
  product contract, for example `/r/{slug}`.
- Do not catch expected module errors in route handlers. Register FastAPI
  exception handlers instead.
- Use FastAPI default serialization for normal responses.
- Use `fastapi.responses.JSONResponse` for explicit JSON exception handlers.

## Handler Responsibilities

Route handlers should:

- Parse HTTP request data.
- Build command dataclasses.
- Call use case modules through `execute()`.
- Map successful results to REST response DTOs.

Route handlers should not:

- Own business rules.
- Instantiate concrete repositories.
- Read runtime config directly unless it is an HTTP-only concern.
- Contain broad `try/except` blocks for expected domain errors.
