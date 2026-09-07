# CRV Triad API

Consolidated Bun/Elysia API for CRV Triad. It owns identity and public lead intake as isolated modules.

Current routes:

- `GET /health`
- `GET /ready`
- `/api/auth/*` — Better Auth
- `POST /leads` — protected public lead intake
- `GET|POST|OPTIONS /e/*` — dedicated first-party PostHog ingestion proxy

## Development

```bash
bun --filter api dev
bun --filter api check
```

`bun --filter api dev` loads Infisical `dev:/api`, translates the `API__*` source names at the
process boundary, and starts both the Elysia API and the Trigger.dev development worker. The worker
registers the tasks in the authenticated developer's Trigger.dev Development environment. Use
`bun --filter api dev:local` to use a runtime-shaped `.env` instead, `dev:api` when only the HTTP
server is needed, or `dev:trigger` when only the worker is needed.

Runtime env:

- Copy `.env.example` to `.env` and provide the local PostgreSQL, Better Auth, Resend, and Turnstile values.
- Deployment values are loaded from Infisical `/api`; no server secret is exposed to the site bundle.
- Local Trigger.dev requires an authenticated Infisical CLI and Trigger.dev CLI profile. The
  Infisical development values supply the hosted Preview key plus
  `API__TRIGGER_DEVELOPMENT_SECRET_KEY`; the local launcher maps that `tr_dev_...` key to
  `TRIGGER_SECRET_KEY` and removes Preview branch targeting. A runtime-shaped `.env` supplies the
  same runtime names when using `dev:local`. Hosted `dev` uses Preview branch `dev`, `hml` uses
  Staging, and `prd` uses Production.
- `POSTHOG_UPSTREAM_URL` selects one of the explicitly supported PostHog US or EU ingestion
  origins. `/e/*` is not a general-purpose proxy: destinations are fixed, private browser headers
  are discarded, and upstream error bodies are never exposed.
- `POSTHOG_PROJECT_KEY` is the public project key used for consent-correlated, server-confirmed
  lead analytics. An empty value disables server-side capture outside production; the deployment
  manifest requires the corresponding source value for the `prd` target.

Availability and scheduling are production modules and are included in the single initial database migration. See [contracts and rollout](../../docs/api/availability-and-scheduling.md).
