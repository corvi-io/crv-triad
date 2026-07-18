# IDP Testing And Handoff

## Tests

- Use Vitest.
- Keep tests under `apps/idp/tests/unit`.
- Mirror `src` where practical.
- Add tests for access decisions, invitation acceptance/rejection, env parsing,
  route contracts, and persistence behavior when touched.

## Commands

Prefer package-level commands:

- `bun --filter idp check`
- `bun --filter idp build`
- `bun --filter idp test`

## Documentation Check

Before handoff, decide whether the change affects:

- `apps/idp/README.md` for routes, env vars, auth flow, bootstrap, or operation.
- `docs/idp/*` for durable architecture, deployment, or operations.
- Root `README.md` for workspace overview or quick start.
- `AGENTS.md` for durable future-agent rules.
- `triad-idp-development` references when implementation workflow changes.
- `TODO.md` or initiative docs when work is deferred or planned status changes.
