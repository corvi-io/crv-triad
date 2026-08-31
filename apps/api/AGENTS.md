# API Agent Instructions

- Follow root `AGENTS.md`.
- Keep API modules under `src/modules/{module}`.
- Keep REST composition under `src/entrypoints/rest` and expose module-owned Elysia plugins.
- Keep identity concerns isolated under `src/modules/idp`; business modules live beside it.
- Wire dependencies explicitly through factories and narrow structural contracts.
- Use Drizzle for PostgreSQL persistence and keep migrations under `drizzle`.
- Keep unit tests under `tests/unit` and composed HTTP/database tests under `tests/integration`.
- Run `bun --filter api check` and `bun --filter api coverage:check` before handoff.
