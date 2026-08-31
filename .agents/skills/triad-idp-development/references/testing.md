# IDP Testing And Handoff

## Tests

- Use Vitest.
- Keep identity tests under `apps/api/tests/unit` and mirror the module boundary.
- Mirror `src` where practical.
- Add tests for access decisions, invitation acceptance/rejection, env parsing,
  route contracts, and persistence behavior when touched.

## Commands

Prefer package-level commands:

- `bun --filter api check`
- `bun --filter api build`
- `bun --filter api test`

## Documentation Check

Before handoff, decide whether the change affects:

- `apps/api/README.md` for routes, env vars, auth flow, bootstrap, or operation.
- `docs/idp/*` for durable architecture, deployment, or operations.
- Root `README.md` for workspace overview or quick start.
- `AGENTS.md` for durable future-agent rules.
- `triad-idp-development` references when implementation workflow changes.
- `TODO.md` or initiative docs when work is deferred or planned status changes.
