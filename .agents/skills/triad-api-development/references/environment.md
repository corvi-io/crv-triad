# API Environment And Deployment

- Keep `apps/api/.env` and `.env.example` runtime-shaped with conventional names such as `DATABASE_URL`, `BETTER_AUTH_URL`, and `GOOGLE_CLIENT_ID`.
- Deployment sources use categorized `API__*` names in the Infisical `/api` path and `env-schema.yaml`; translate them to runtime names only at the process boundary.
- GitHub Actions loads `/api` and `/infrastructure` through Infisical OIDC; do not introduce long-lived Infisical credentials or duplicate runtime secrets in GitHub.
- Do not create a root `.env` or put runtime values in `apps/api/fly.*.toml`.
- Fly values are synchronized before deploy and are never pruned automatically.
- Never print, log, or commit real values.
- Preserve local API port `8000`; Better Auth uses the same origin at `/api/auth/*`.

Deployment configuration currently includes database, Better Auth secret/origin, Google OAuth credentials, trusted browser origins, application environment, and session expiry. Add new values only when a real module requires them and classify secrets correctly.

Commercial Intelligence uses the server-only `OPENAI_API_KEY` runtime secret.
Its Infisical/deployment source is `API__OPENAI_API_KEY`; it must never be
translated into a public studio environment variable or sent to the browser.

Durable Commercial Intelligence execution uses Trigger.dev. Keep
`API__TRIGGER_SECRET_KEY` and `API__TRIGGER_PROJECT_REF` in `/api`. Keep the Trigger CLI credential
`CICD__TRIGGER_ACCESS_TOKEN` in `/infrastructure`. The delivery gate deploys
the API and its database migration before promoting the matching Trigger task
bundle, and the task bundle receives only `DATABASE_URL`, `OPENAI_API_KEY`, and
`COMMERCIAL_INTELLIGENCE_MODEL`.

Voice activity transcription uses the server-only
`COMMERCIAL_TRANSCRIPTION_MODEL` runtime variable, sourced from
`API__COMMERCIAL_TRANSCRIPTION_MODEL`. It contains a model identifier, not a
secret, and defaults to `gpt-4o-mini-transcribe`.

Update `apps/api/README.md`, `env-schema.yaml`, workflows, and `docs/api` when runtime or deployment behavior changes.
