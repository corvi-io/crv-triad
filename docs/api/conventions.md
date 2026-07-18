# API Conventions

`apps/api` is the FastAPI backend for CRV Triad business APIs.

- Keep domain code under `src/modules/{module}`.
- Keep REST entrypoints under `src/entrypoints/rest/{module}`.
- Keep `src/entrypoints/rest/main.py` as the composition root.
- Use `python-inject` for business dependency injection.
- Use SQLModel records only as persistence records.
- Generate application IDs with UUIDv7 through `src/modules/shared/ids.py`.
- Keep `/health` lightweight and `/ready` for readiness.
- Do not add `/v1` unless an external versioned contract is explicitly required.
