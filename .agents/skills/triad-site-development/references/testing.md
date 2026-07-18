# Site Testing And Handoff

## Commands

Prefer package-level commands:

- `bun --filter site check`
- `bun --filter site typecheck`
- `bun --filter site build`
- `bun --filter site lighthouse:report` when performance/SEO changes justify it

Run E2E or browser checks when routes, navigation, forms, tracking, or responsive
behavior changed and an E2E setup exists.

## Documentation Check

Before handoff, decide whether the change affects:

- `apps/site/README.md` for commands, env vars, routing, or app operation.
- `docs/site/*` for durable SEO, analytics, deployment, conventions, or privacy
  behavior.
- Root `README.md` for workspace overview or quick start.
- `AGENTS.md` for durable future-agent rules.
- `triad-site-development` references when implementation workflow changes.
- `TODO.md` or initiative docs when work is deferred or planned status changes.
