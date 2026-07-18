# CRV Triad API

Minimal FastAPI backend for CRV Triad.

Current routes:

- `GET /health`
- `GET /ready`

## Development

```bash
bun --filter api dev
bun --filter api check
```

Runtime env:

- `DATABASE_URL`
- `IDP_BASE_URL`
- `IDP_AUTH_TIMEOUT_SECONDS`
