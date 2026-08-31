# API Testing And Handoff

## Tests

- Keep Vitest unit tests under `apps/api/tests/unit`.
- Keep composed HTTP contract tests under `apps/api/tests/integration`.
- Mirror the `apps/api/src` package layout when practical.
- Use local fakes passed into use-case factories for business tests.
- Test Elysia plugins through `app.handle(new Request(...))` without starting a
  network listener.
- Enforce at least 80% statements, branches, functions, and lines through
  `coverage:check`; both pre-commit and CI must execute the threshold-bearing
  command.
- Follow `triad-testing` for test-level selection, doubles, and coverage policy.
- Add regression tests when changing behavior, error mapping, persistence, or
  security-sensitive logic.

## Commands

Prefer package-level commands from the workspace root:

- `bun --filter api check`
- `bun --filter api test:coverage`
- `bun --filter api coverage:check`

Inside `apps/api`, use Bun scripts and `bunx` for one-off TypeScript tooling.

## Documentation Check

Before handoff, decide whether the change affects:

- `apps/api/README.md` for commands, routes, env vars, or app operation.
- `docs/api/*` for durable architecture, deployment, persistence, or runtime
  conventions.
- Root `README.md` for workspace-wide setup or app overview.
- `AGENTS.md` for durable future-agent rules.
- `triad-api-development` references when implementation workflow changes.
- `TODO.md` or initiative docs when work is deferred or planned status changes.
