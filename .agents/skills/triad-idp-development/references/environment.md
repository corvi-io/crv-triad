# IDP Environment And Secrets

## Rules

- Validate runtime config through `src/modules/idp/config/env.ts`.
- Do not read `process.env` outside the API config boundary except narrow tooling or
  CLI entrypoints.
- Keep `.env.example` placeholders safe and non-realistic.
- Never print, log, or commit real `.env` values.
- Keep local `apps/api/.env` and `.env.example` runtime-shaped with names such
  as `DATABASE_URL` and `BETTER_AUTH_SECRET`.
- Deployment values come from uppercase app-prefixed Infisical `/api` source
  names such as `API__DATABASE_URL`, declared in root `env-schema.yaml`, and are translated
  to runtime names before syncing to Fly.
- Do not put API runtime `[env]` values back into `apps/api/fly.*.toml`; Fly
  runtime env is synchronized through `flyctl secrets import --stage` before
  deploy.
- Removing a schema mapping does not remove an existing Fly secret override.
  Never automate an unset; use the human-approved checklist in
  `docs/ci-cd/pipeline-strategy.md` when cleanup is required.
- Preserve the local API dev server on port `8000`.

## Required Configuration

Expect runtime configuration for:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `APP_ENV`
- `BETTER_AUTH_URL`
- `AUTH_TRUSTED_ORIGINS`

Keep session/password policy and optional invitation email configuration in safe
application defaults or app-local runtime env files. Add an override to
`env-schema.yaml` only when it is secret or truly target-specific.

Optional invitation email runtime configuration:

- `IDP_INVITATION_EMAILS_ENABLED`
- `IDP_INVITATION_EMAIL_FROM`
- `IDP_INVITATION_APP_URL`
- `IDP_RESEND_API_KEY`
- `IDP_RESEND_API_URL`

Update `apps/api/README.md` and `docs/idp/*` when config behavior or operational
expectations change.
