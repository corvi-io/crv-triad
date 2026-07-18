# CRV Triad Agent Instructions

## Project Overview

- Use Bun for JavaScript package operations.
- Use Turborepo for monorepo task orchestration.
- Keep technical docs, code, routes, filenames, commits, and PRs in English.
- Keep user-facing UI labels, form messages, and validation text in Brazilian Portuguese.

## Product Boundaries

- `apps/site` owns the static public placeholder.
- `apps/api` owns FastAPI business APIs. It currently exposes only `/health` and `/ready`.
- `apps/idp` owns authentication, sessions, invitations, users, and identity contracts.
- `apps/web` owns the authenticated product interface.
- Do not put business-domain rules inside `apps/idp`.

## IDP Architecture

- IDP code lives under `apps/idp` and uses Elysia, Better Auth, Drizzle, PostgreSQL, Zod, Vitest, and Biome.
- Mount Better Auth directly at `/api/auth/*`; do not manually wrap every Better Auth endpoint.
- Email/password is the active login method.
- Do not add public self-registration. Access requires an existing active user or a valid pending invitation.
- Create the first admin invitation through the explicit bootstrap script.
- Keep IDP tables prefixed with `idp_`.
- Generate IDP entity IDs with UUIDv7 through `apps/idp/src/infra/ids.ts`.

## API Architecture

- API code lives under `apps/api` and uses FastAPI with `uv`.
- Keep API modules under `apps/api/src/modules/{module}` when new domain modules are added.
- Keep REST entrypoints under `apps/api/src/entrypoints/rest/{module}` and keep `main.py` as the REST composition root.
- Use `python-inject` for business dependency injection; do not use FastAPI dependency injection for business wiring.
- Do not add a `/v1` prefix unless a versioned external contract is explicitly required.

## Environment Management

- Keep app-local `.env` and `.env.example` files runtime-shaped inside each app.
- Do not introduce a single root `.env`.
- Preserve local ports: API `8000`, IDP `8001`, web `3000`, site `3001`.
- Use root `env-schema.yaml` as the metadata-only deployment env manifest; never store actual values there.
- Use GitHub Environments `dev`, `hml`, and `prd` for deployment env values.
- Name app runtime sources in GitHub Environments as `APP__RUNTIME_ENV_NAME`
  with an uppercase app prefix (`API__*`, `IDP__*`, `SITE__*`, `WEB__*`).
- Name pipeline and release controls with `CICD__*` and provider credentials,
  provider identifiers, and deployed-resource locations with `INFRA__*`.
- Do not add uncategorized custom GitHub variables or secrets. GitHub-provided
  variables such as `GITHUB_SHA` remain unchanged.
- Declare deployment inputs in `env-schema.yaml`; keep safe constants in app
  defaults and preserve runtime names in app-local env files.

## Package Management

- Use `bun install` to install dependencies.
- Use `bun add` and `bun add -d` to add dependencies.
- Use `bunx` for one-off CLIs.
- Do not manually edit `package.json` to add dependencies when Bun can do it.
- Keep Dependabot version-update pull requests targeting `staging`.
- Group only minor and patch dependency updates; review major updates in separate pull requests.

## Documentation

- Update README, app README, durable docs, AGENTS, and skills when workflow, architecture, runtime behavior, or conventions change.
- Initiative PRDs live in `docs/initiatives/prds` and execution plans live in `docs/initiatives/tasks`.
- Use `triad-initiative-workflow` when creating or updating initiative PRDs/tasks.
- Use `triad-release-workflow` for first-release bootstrap, release readiness,
  production promotion, release environment checks, tags, and GitHub Releases.
- Treat publishing a release and deploying applications as separate decisions.
  Do not enable deployment as a side effect of release work.
- Initiative planning must include brainstorm, gaps, counterpoints, performance/scalability, accessibility, security/privacy, API/IDP/web boundaries, logging/observability, and verification thinking.
- If documentation does not need updates, be prepared to state why during review or handoff.

## Safety

- Do not store secrets in frontend env vars.
- Client-visible env vars must use framework public prefixes and contain only public values.
- Do not log credentials, tokens, PII, user-submitted business payloads, or private request headers.
- Do not modify unrelated apps or modules unless explicitly requested.
