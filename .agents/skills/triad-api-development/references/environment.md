# API Environment And Deployment Env

## Rules

- Keep local `apps/api/.env` and `.env.example` runtime-shaped with names such
  as `DATABASE_URL` and `IDP_BASE_URL`.
- Deployment values come from uppercase app-prefixed GitHub Environment source
  names such as `API__DATABASE_URL`, declared in root `env-schema.yaml`, and are translated
  to runtime names before syncing to Fly.
- Do not introduce a single root `.env` for API runtime values.
- Do not put API runtime `[env]` values back into `apps/api/fly.*.toml`; Fly
  runtime env is synchronized through `flyctl secrets import --stage` before
  deploy.
- Removing a schema mapping does not remove an existing Fly secret override.
  Never automate an unset; use the human-approved checklist in
  `docs/ci-cd/pipeline-strategy.md` when cleanup is required.
- Never print, log, or commit real env values.
- Preserve the local API dev server on port `8000`.

## Required Runtime Configuration

Expect deployment configuration only for values that are secret or vary by target:

- `DATABASE_URL`
- `IDP_BASE_URL`

Keep safe constants such as `IDP_AUTH_TIMEOUT_SECONDS` in application defaults.
Add campaign-link or telemetry values to the deployment schema only when their feature exists and the value is secret or target-specific.

Update `apps/api/README.md` and `docs/api/*` when config behavior or
operational expectations change.
