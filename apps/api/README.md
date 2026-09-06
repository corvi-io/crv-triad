# CRV Triad API

Consolidated Bun/Elysia API for CRV Triad. It owns identity and public lead intake as isolated modules.

Current routes:

- `GET /health`
- `GET /ready`
- `/api/auth/*` — Better Auth
- `POST /leads` — protected public lead intake
- `GET|POST|OPTIONS /e/*` — dedicated first-party PostHog ingestion proxy
- `/api/units/*`, `/api/professionals/*`, and `/api/services/*` — tenant-scoped barbershop catalogs
- `/api/clients/*` — tenant-scoped client management and catalog preferences

## Development

```bash
bun --filter api dev
bun --filter api check
bun --filter api test:integration:postgres
```

The opt-in PostgreSQL suite requires `TEST_DATABASE_URL` to point to an isolated loopback database
on a non-default port whose database name ends in `_test`. Before the first production release, the
schema is represented by one clean baseline migration with no data backfill.

Runtime env:

- Copy `.env.example` to `.env` and provide the local PostgreSQL, Better Auth, Resend, and Turnstile values.
- Deployment values are loaded from Infisical `/api`; no server secret is exposed to the site bundle.
- `POSTHOG_UPSTREAM_URL` selects one of the explicitly supported PostHog US or EU ingestion
  origins. `/e/*` is not a general-purpose proxy: destinations are fixed, private browser headers
  are discarded, and upstream error bodies are never exposed.
- `POSTHOG_PROJECT_KEY` is the public project key used for consent-correlated, server-confirmed
  lead analytics. An empty value disables server-side capture outside production; the deployment
  manifest requires the corresponding source value for the `prd` target.
- Profile images use local `.data/profile-images` storage only when `APP_ENV=local|test`. Every
  deployed environment must set `PROFILE_IMAGE_STORAGE_DRIVER=r2` plus the private R2 endpoint,
  access credentials and bucket, and a public delivery base URL. Upload and deletion remain
  authenticated API operations; storage credentials are never returned to Studio.

## Persisted availability and scheduling

Recurring availability, appointments, collision exclusion, command receipts and connected projections are documented in [API scheduling contracts](../../docs/api/availability-and-scheduling.md). The explicit root `bun scripts/scheduling-local-qa.ts` command runs an isolated synthetic local stack.
