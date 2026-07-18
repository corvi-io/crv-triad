# API Agent Instructions

- Follow root `AGENTS.md`.
- Keep API modules under `src/modules/{module}`.
- Keep REST entrypoints under `src/entrypoints/rest/{module}`.
- Keep `src/entrypoints/rest/main.py` as the REST composition root.
- Use `python-inject` for business dependency wiring.
- Use SQLModel records only as persistence records.
- Keep tests under `tests/unit` mirroring `src`.
