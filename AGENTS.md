# CRV Triad Agent Instructions

## Project Overview

- Use Bun for JavaScript package operations.
- Use Turborepo for monorepo task orchestration.
- Keep technical docs, code, routes, filenames, commits, and PRs in English.
- Keep user-facing UI labels, form messages, and validation text in Brazilian Portuguese.

## Product Boundaries

- `apps/site` owns the public Astro marketing site and its lead form UI.
- `apps/api` owns business APIs, authentication, sessions, invitations, users, and identity contracts.
- `apps/studio` owns the authenticated barbershop-management product interface.
- Keep identity rules isolated under `apps/api/src/modules/idp`; do not put business-domain rules there.

## IDP Architecture

- Identity code lives under `apps/api/src/modules/idp` and uses Better Auth, Drizzle, PostgreSQL, Zod, Vitest, and Biome.
- Mount Better Auth directly at `/api/auth/*`; do not manually wrap every Better Auth endpoint.
- Email/password is the active login method.
- Do not add public self-registration. Access requires an existing active user or a valid pending invitation.
- Create the first admin invitation through the explicit bootstrap script.
- Keep IDP tables prefixed with `idp_`.
- Generate identity entity IDs with UUIDv7 through `apps/api/src/modules/idp/infra/ids.ts`.

## API Architecture

- API code lives under `apps/api` and uses Bun, Elysia, Better Auth, Drizzle, PostgreSQL, Zod, and Vitest.
- Keep API modules under `apps/api/src/modules/{module}` when new domain modules are added.
- Keep REST composition under `apps/api/src/entrypoints/rest`; modules expose Elysia plugins and receive explicit dependencies.
- Do not add a `/v1` prefix unless a versioned external contract is explicitly required.

## Environment Management

- Keep app-local `.env` and `.env.example` files runtime-shaped inside each app.
- Do not introduce a single root `.env`.
- Preserve local ports: API `8000`, studio `3000`, site `3001`.
- Use root `env-schema.yaml` as the metadata-only deployment env manifest; never store actual values there.
- Use Infisical environments `dev`, `hml`, and `prd` as the value source of truth.
- GitHub Environments retain protection rules and the non-secret Infisical OIDC identity/project identifiers only.
- Store app values in Infisical paths `/api`, `/site`, and `/studio`, with infrastructure values in `/infrastructure`.
- Name deployment sources with an uppercase app prefix (`API__*`, `SITE__*`, `STUDIO__*`).
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

## Documentation

- Update README, app README, durable docs, AGENTS, and skills when workflow, architecture, runtime behavior, or conventions change.
- Initiative PRDs live in `docs/initiatives/prds` and execution plans live in `docs/initiatives/tasks`.
- Use `triad-initiative-workflow` when creating or updating initiative PRDs/tasks.
- Use `triad-release-workflow` for first-release bootstrap, release readiness,
  production promotion, release environment checks, tags, and GitHub Releases.
- Treat release publication as an explicit decision. Application deployment follows the protected
  environment branch boundaries automatically.
- Initiative planning must include brainstorm, gaps, counterpoints, performance/scalability, accessibility, security/privacy, API/identity/studio boundaries, logging/observability, and verification thinking.
- If documentation does not need updates, be prepared to state why during review or handoff.

## Safety

- Do not store secrets in frontend env vars.
- Client-visible env vars must use framework public prefixes and contain only public values.
- Do not log credentials, tokens, PII, user-submitted business payloads, or private request headers.
- Do not modify unrelated apps or modules unless explicitly requested.
