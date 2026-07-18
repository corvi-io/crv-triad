---
name: triad-api-development
description: Build or refactor Triad FastAPI backend code in apps/api using project architecture, module layout, python-inject use cases, SQLModel persistence, REST schemas, error mapping, tests, and documentation expectations. Use for API routes, use cases, repositories, persistence, migrations, telemetry, campaign links, or API docs.
---

# Triad API Development

Use this skill for changes under `apps/api`. Follow the local `AGENTS.md` files
first, then use these references as implementation workflow guides.

Write user-facing analysis in Brazilian Portuguese. Keep code, filenames,
routes, docs, commit messages, and PR titles in English.

## Reference Routing

- Creating or changing REST endpoints: read `references/routes.md`.
- Creating or changing use cases: read `references/use-cases.md`.
- Wiring dependencies: read `references/dependency-injection.md`.
- Adding persistence or migrations: read `references/persistence.md`.
- Adding errors or HTTP mappings: read `references/errors.md`.
- Runtime env, deployment env sync, or Fly config: read
  `references/environment.md`.
- Validating or handing off work: read `references/testing.md`.

## Default Workflow

1. Confirm the module owner under `src/modules/{module}`.
2. Keep REST-only concerns under `src/entrypoints/rest/{module}`.
3. Keep business commands and use cases in the module layer.
4. Wire business dependencies through `python-inject`, not FastAPI dependency
   injection.
5. Keep SQLModel records and database concerns behind repository
   implementations.
6. Check performance and scalability fit for changed endpoints or use cases:
   expected request rate, data growth, query bounds, N+1 risk, blocking external
   calls, transaction scope, and latency-sensitive paths. Do not claim numeric
   capacity unless measured or explicitly estimated with assumptions.
7. Add focused unit tests under `tests/unit` mirroring `src`.
8. Check whether README, durable docs, AGENTS, skills, initiative docs, or
   backlog need updates.

## Hard Boundaries

- Do not put authentication ownership or Better Auth routes in `apps/api`.
- Do not add generic arbitrary upstream proxies.
- Do not parse, persist, enrich, or log telemetry payload bodies.
- Do not expose provider secrets, private headers, browser cookies, or
  authorization headers through telemetry proxy routes.
- Do not add `/v1` unless a versioned external contract is explicitly required.
