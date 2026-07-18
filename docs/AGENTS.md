# Documentation Agent Instructions

## Scope

- These instructions apply to files under `docs/**`.
- Root `AGENTS.md` still applies for monorepo-wide rules.
- App-specific docs should also follow the relevant app `AGENTS.md` when applicable.

## Language

- Write technical documentation in English.
- Keep filenames, headings, links, routes, and technical examples in English.
- Use Brazilian Portuguese only when documenting user-facing UI copy examples.

## Documentation Structure

- Initiative PRDs live in `docs/initiatives/prds`.
- Initiative execution plans live in `docs/initiatives/tasks`.
- Durable site documentation lives in `docs/site`.
- Durable API documentation lives in `docs/api`.
- Durable IDP documentation lives in `docs/idp`.
- Cross-project backlog items live in root `TODO.md`.
- Candidate agent skills live in `docs/skills-candidates.md` until installed or rejected.

## Initiative PRDs

- Use initiative PRDs for decisions, scope, tradeoffs, requirements, risks, and acceptance criteria.
- Prefer sections such as Overview, Product Context, Goals, Non-Goals, Decisions, Requirements, Risks, Acceptance Criteria, Future Enhancements, Execution And Backlog, and Open Questions.
- Keep decisions explicit and traceable.
- Record non-goals to prevent scope creep.
- Each PRD must link to its matching task plan under `docs/initiatives/tasks`.

## Task Plans

- Use initiative task plans for executable work breakdowns.
- Each task plan must link back to its matching PRD under `docs/initiatives/prds`.
- Organize execution work by phases.
- Use checkboxes for every executable task.
- Keep tasks specific enough that another agent or developer can execute them without rediscovering the plan.
- Mark completed tasks when work is done.

## Durable Docs

- Use `docs/site` for site documentation that should outlive a single PRD.
- Use `docs/api` for API architecture, routing, dependency injection, testing, security, and backend conventions that should outlive a single PRD.
- Use `docs/idp` for identity provider architecture, authentication, access policy, operations, and integration conventions.
- Keep operational app setup in the app-level README after `apps/site` exists.
- Keep long-form architecture, deployment, analytics, SEO, testing, security, and conventions docs in `docs/site`.
- Do not duplicate large sections between initiative PRDs, task plans, and durable docs; link instead.

## Agent Instructions

- Use `AGENTS.md` for concise local rules that affect agent behavior.
- Do not put long-form documentation inside `AGENTS.md`.
- Add nested `AGENTS.md` files only when a folder has meaningful local rules not covered by parent instructions.
- Prefer root, app-level, and docs-level agent files before adding deeper instructions.

## Maintenance

- Update links when files move.
- Keep backlog items in root `TODO.md` only when they are not already covered by an active initiative task plan.
- Prefer updating an existing initiative PRD or task plan over creating duplicate documents for the same initiative.
