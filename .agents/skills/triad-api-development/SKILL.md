---
name: triad-api-development
description: Build or refactor the CRV Bun and Elysia modular monolith in apps/api, including the IDP bounded context, Better Auth, Drizzle persistence, REST/OpenAPI entrypoints, Vitest, and future business modules.
---

# CRV Triad API Development

Use this skill for every change under `apps/api`. Follow root and app-local
`AGENTS.md` first. Write user-facing analysis in Brazilian Portuguese and keep
code, routes, filenames, docs, commits, and PR titles in English.

## Reference Routing

- REST endpoints: `references/routes.md`.
- Application actions and use cases: `references/use-cases.md`.
- Explicit dependency wiring: `references/dependency-injection.md`.
- Drizzle persistence and migrations: `references/persistence.md`.
- Errors and HTTP mappings: `references/errors.md`.
- Runtime and deployment environment: `references/environment.md`.
- Validation and handoff: `references/testing.md`.

## Architecture

- `apps/api` is one deployable modular monolith.
- `src/modules/idp` owns Better Auth, Google OAuth, sessions, invitations,
  users, and broad access policy.
- Future business capabilities belong beside `idp` under
  `src/modules/{module}`. Never put their rules or tables inside `idp`.
- Mount Better Auth directly at `/api/auth/*` and compose modules in
  `src/entrypoints/rest/app.ts`.
- Keep `src/server.ts` limited to environment loading, infrastructure creation,
  composition, process lifecycle, and startup logging.
- Prefer explicit factory wiring and narrow structural contracts. Add an
  interface or adapter only when a real boundary benefits from inversion.
- Keep IDP tables prefixed with `idp_`, use UUIDv7 identifiers, and manage all
  API-owned schema through `apps/api/drizzle`.

## Default Workflow

1. Confirm the bounded-context owner.
2. Keep HTTP-only concerns under `src/entrypoints/rest` and module rules inside
   the owning module.
3. Keep focused application actions under `application/use-cases` when a
   module requires that layer; avoid catch-all services.
4. Wire dependencies explicitly from the composition root.
5. Bound queries, external calls, transaction scope, and result sizes.
6. Add Vitest coverage under `tests/unit`, mirroring source boundaries, and
   test Elysia behavior with `app.handle(new Request(...))`.
7. Check README, durable docs, AGENTS, skills, initiative docs, environment
   schema, pipeline, and backlog impact.

## Identity Rules

- Google proves identity only. A new user requires a valid invitation and every
  session requires an active user.
- Public self-registration is prohibited.
- Do not log credentials, tokens, cookies, OAuth payloads, invitation proofs,
  PII, or private request headers.
- Treat every HTTP error as a public contract. Expose stable machine codes and
  intentionally safe copy only; never forward raw exceptions or upstream
  provider/database messages through Elysia or Better Auth routes.
- Create the first administrator through the explicit bootstrap command.
- Keep business authorization in the owning module; broad identity roles are
  not a substitute for domain policy.

## Hard Boundaries

- Do not add generic upstream proxies or generic utility modules.
- Do not expose secrets or private headers through browser contracts.
- Sanitize error bodies at framework and upstream-adapter boundaries, preserve
  a safe request identifier in headers, and test negative paths with sensitive
  sentinel values that must not appear in responses.
- Do not add `/v1` unless an explicitly versioned external contract requires it.
- Do not claim capacity numbers unless measured or clearly estimated with
  assumptions.
