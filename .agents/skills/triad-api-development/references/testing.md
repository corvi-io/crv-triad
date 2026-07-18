# API Testing And Handoff

## Tests

- Keep unit tests under `apps/api/tests/unit`.
- Mirror the `apps/api/src` package layout when practical.
- Use local fakes passed into use case functions for business tests.
- Add regression tests when changing behavior, error mapping, persistence, or
  security-sensitive logic.

## Commands

Prefer package-level commands from the workspace root:

- `bun --filter api check`
- `bun --filter api test:coverage`
- `bun --filter api coverage:check`

Inside `apps/api`, use `uv` when invoking native Python tooling directly.

## Documentation Check

Before handoff, decide whether the change affects:

- `apps/api/README.md` for commands, routes, env vars, or app operation.
- `docs/api/*` for durable architecture, deployment, persistence, or runtime
  conventions.
- Root `README.md` for workspace-wide setup or app overview.
- `AGENTS.md` for durable future-agent rules.
- `triad-api-development` references when implementation workflow changes.
- `TODO.md` or initiative docs when work is deferred or planned status changes.
