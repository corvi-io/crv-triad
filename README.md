# CRV Triad

Internal product workspace for CRV Triad.

## Apps

- `apps/site`: neutral static Astro placeholder.
- `apps/api`: minimal FastAPI backend with `/health` and `/ready`.
- `apps/idp`: Elysia + Better Auth identity provider with email/password, invitations, sessions, and admin bootstrap.
- `apps/web`: authenticated React application shell.

## Requirements

- Bun for JavaScript package operations.
- Turborepo for workspace orchestration.
- uv for the FastAPI app.
- PostgreSQL for API and IDP runtime databases.

## Quick Start

```bash
bun install
bun --filter api dev
bun --filter idp db:migrate
bun --filter idp bootstrap:admin -- --email admin@example.com --name "Admin"
bun --filter idp dev
bun --filter web dev
bun --filter site dev
```

Local ports:

- API: `http://localhost:8000`
- IDP: `http://localhost:8001`
- Web: `http://localhost:3000`
- Site: `http://localhost:3001`

## Auth Model

The IDP uses email/password. Public self-registration is not open: account creation is allowed only for an existing active user or a pending invitation. The bootstrap script creates the first pending admin invitation.

## Commands

- `bun run check`
- `bun run build`
- `bun --filter api check`
- `bun --filter idp check`
- `bun --filter web check`
- `bun --filter site check`

## Initiatives

Initiative PRDs and execution plans live under `docs/initiatives`. Start from
the templates in `docs/initiatives/templates` and use
`triad-initiative-workflow` when planning new work.

Deployment environment metadata lives in `env-schema.yaml`; actual values belong in GitHub Environments. App source names use uppercase prefixes such as `API__DATABASE_URL`, while app-local runtime names remain unchanged.

The Fly.io and Cloudflare identifiers in this repository define the intended Triad topology. Provision
new Triad-owned resources and GitHub Environment values before enabling deployment workflows; no
resource or credential from the source project is reused.
