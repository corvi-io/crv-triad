---
name: triad-idp-development
description: Build or refactor Triad Identity Provider code in apps/api/src/modules/idp using Elysia, Better Auth, Drizzle, PostgreSQL, Zod, Vitest, invite-gated email/password access, UUIDv7 IDs, OpenAPI, and Triad security boundaries. Use for auth routes, sessions, invitations, admin bootstrap, IDP persistence, env config, or IDP tests.
---

# Triad IDP Development

Use this skill for changes under `apps/api/src/modules/idp`. The IDP is a single identity
bounded context, not a generic internal backend.

Write user-facing analysis in Brazilian Portuguese. Keep code, filenames,
routes, docs, commit messages, and PR titles in English.

## Reference Routing

- Auth and access model: read `references/auth-access.md`.
- Elysia routes and OpenAPI: read `references/routes.md`.
- Drizzle schema and migrations: read `references/persistence.md`.
- Runtime env and secrets: read `references/environment.md`.
- Tests and handoff: read `references/testing.md`.

## Hard Boundaries

- Mount Better Auth directly at `/api/auth/*`.
- Do not manually wrap every Better Auth endpoint.
- Keep Better Auth email/password enabled and invite-gated.
- Do not open public self-registration.
- Access requires an existing active user or a valid pending invitation.
- Create the first pending admin invitation through the bootstrap script, not
  public signup or startup magic.
- Keep product workflows, quotes, requirements, form submissions, and other
  business-domain rules out of the IDP.
- Do not add audit tables/events, canonical request logs, or tracing spans for
  the MVP unless a product decision changes scope.

## Performance And Scalability

- Treat auth, session, invitation, and bootstrap paths as latency-sensitive and
  availability-sensitive.
- Check query bounds, index needs, password hashing and reset delivery,
  database-backed session lookups, invitation validation and acceptance,
  cookie/session size, and blocking work in request paths before handoff.
- Do not claim supported requests per minute or concurrent users unless the
  number is measured or clearly estimated with explicit assumptions.
