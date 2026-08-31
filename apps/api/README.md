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

Runtime env:

- Copy `.env.example` to `.env` and provide the local PostgreSQL, Better Auth, Resend, and Turnstile values.
- Deployment values are loaded from Infisical `/api`; no server secret is exposed to the site bundle.
- `POSTHOG_UPSTREAM_URL` selects one of the explicitly supported PostHog US or EU ingestion
  origins. `/e/*` is not a general-purpose proxy: destinations are fixed, private browser headers
  are discarded, and upstream error bodies are never exposed.
