# CRV Triad API

Consolidated Bun/Elysia API for CRV Triad. It owns identity and public lead intake as isolated modules.

Current routes:

- `GET /health`
- `GET /ready`
- `/api/auth/*` — Better Auth
- `POST /leads` — protected public lead intake

## Development

```bash
bun --filter api dev
bun --filter api check
```

Runtime env:

- Copy `.env.example` to `.env` and provide the local PostgreSQL, Better Auth, Resend, and Turnstile values.
- Deployment values are loaded from Infisical `/api`; no server secret is exposed to the site bundle.
