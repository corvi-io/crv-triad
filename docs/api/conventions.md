# API Conventions

`apps/api` is the Bun/Elysia modular monolith for CRV Triad APIs, identity, and public lead intake.

- Keep domain code under `src/modules/{module}`.
- Keep REST composition under `src/entrypoints/rest` and expose module-owned Elysia plugins.
- Wire dependencies explicitly at the composition root.
- Use Drizzle for PostgreSQL persistence and migrations.
- Generate identity IDs with UUIDv7 through `src/modules/idp/infra/ids.ts`.
- Keep identity rules under `src/modules/idp` and business rules in their owning modules.
- Keep `/health` lightweight and `/ready` for readiness.
- Do not add `/v1` unless an external versioned contract is explicitly required.
