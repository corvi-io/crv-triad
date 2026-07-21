---
name: triad-initiative-workflow
description: Plan CRV Triad initiatives with PRDs, execution plans, brainstorms, counterproposals, performance/scalability analysis, accessibility, API/IDP/studio concerns, observability, and verification before implementation.
---

# Triad Initiative Workflow

Use this skill when creating, updating, reviewing, or executing initiative PRDs
and task plans under `docs/initiatives`.

Write user-facing analysis in Brazilian Portuguese. Keep docs, filenames,
routes, code, commits, and PR titles in English.

## Files

- PRDs: `docs/initiatives/prds/{nn-slug}.md`
- Task plans: `docs/initiatives/tasks/{nn-slug}.md`
- Templates:
  - `docs/initiatives/templates/prd-template.md`
  - `docs/initiatives/templates/task-template.md`

Use the same filename for the PRD and task plan.

## Required Brainstorm

Before recommending or implementing a solution, explicitly think through:

- problem framing and the real workflow being improved;
- gaps, unknowns, and assumptions;
- counterpoints to the requested approach;
- simpler alternatives and stronger long-term alternatives;
- performance and scalability, including what changes with millions of records;
- security, privacy, spam/abuse, and auth/session impact;
- accessibility, responsive behavior, loading/error/empty states for frontend;
- API boundaries, query bounds, pagination, N+1 risks, and persistence shape;
- IDP boundaries: do not put product business rules in identity;
- logging, metrics, tracing, alerts, and data that must not be logged;
- which existing Triad skills and docs apply.

If the requested approach is likely not the best path, present a clear
counterproposal with tradeoffs. Do not silently implement a weaker approach.

## Skill Routing

Use other project skills as needed:

- `triad-architecture` for boundaries and durable conventions.
- `triad-api-development` for API modules, routes, use cases, persistence, and tests.
- `triad-idp-development` for authentication, sessions, users, invitations, and IDP persistence.
- `triad-studio-development` for authenticated React UI.
- `triad-site-development` for static site changes.

Use framework/vendor skills when relevant, such as FastAPI, Elysia, Better Auth,
Drizzle, Vitest, accessibility, or GitHub Actions docs.

## Workflow

1. Read existing related PRDs, task plans, docs, AGENTS, and relevant skills.
2. Draft or update the PRD from the template.
3. Fill the Brainstorm section before acceptance criteria are treated as final.
4. Ask only for decisions that cannot be inferred safely; otherwise make
   conservative assumptions and record them.
5. Create or update the task plan after the PRD recommendation is clear.
6. Keep tasks verifiable and ordered by dependency.
7. During implementation, update task checkboxes only after evidence exists.
8. Record skipped checks, blockers, and follow-ups explicitly.

## Verification Expectations

Every initiative should define the relevant evidence:

- API: unit tests, route behavior, type/check/build commands.
- IDP: access policy tests, env parsing, migration checks, route contracts.
- Studio/site: component/unit tests, accessibility and responsive checks, build.
- Data-heavy work: pagination/filter/sort behavior and query-bound reasoning.
- Ops work: env schema, deploy scripts, provider requirements, rollback notes.

Do not claim capacity numbers unless measured or clearly estimated with
assumptions.
