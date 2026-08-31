# CRV Triad

Internal product workspace for CRV Triad.

## Apps

- `apps/site`: public Astro marketing site.
- `apps/api`: Bun/Elysia modular API with Better Auth, invitations, sessions, and protected lead intake.
- `apps/studio`: TRIAD Studio authenticated barbershop-management frontend.

## Requirements

- Bun for JavaScript package operations.
- Turborepo for workspace orchestration.
- PostgreSQL for the API runtime database.

## Quick Start

```bash
bun install
bun --filter api dev
bun --filter api db:migrate
bun --filter api bootstrap:admin -- --email admin@example.com --name "Admin"
bun --filter studio dev
bun --filter site dev
```

Local ports:

- API: `http://localhost:8000`
- Studio: `http://localhost:3000`
- Site: `http://localhost:3001`

## Auth Model

The API identity module uses email/password. Public self-registration is not open: account creation is allowed only for an existing active user or a pending invitation. The bootstrap script creates the first pending admin invitation.

## Commands

- `bun run check`
- `bun run build`
- `bun --filter api check`
- `bun --filter studio check`
- `bun --filter site check`

## Initiatives

Initiative PRDs and execution plans live under `docs/initiatives`. Start from
the templates in `docs/initiatives/templates` and use
`triad-initiative-workflow` when planning new work.

## Delivery And Releases

Deployment environment metadata lives in `env-schema.yaml`; actual values belong in Infisical paths `/api`, `/site`, `/studio`, and `/infrastructure`. GitHub authenticates to Infisical with OIDC.

Custom GitHub configuration is categorized by ownership:

- `API__*`, `SITE__*`, and `STUDIO__*` are app runtime inputs.
- `CICD__*` controls pipelines and releases.
- `INFRA__*` identifies or authenticates infrastructure providers and deployed resources.

The Fly.io and Cloudflare identifiers in this repository define the intended Triad topology. Provision
Triad-owned resources and complete the matching Infisical environment before changes reach its
automatic deployment boundary. No resource or credential from the source project is reused.

Release preparation, required GitHub configuration, the first-release bootstrap,
and the release-versus-deploy boundary are documented in
[`docs/ci-cd/release-process.md`](docs/ci-cd/release-process.md). Use
`triad-release-workflow` when preparing or publishing a release.
