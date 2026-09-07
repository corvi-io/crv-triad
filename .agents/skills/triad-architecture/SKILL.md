---
name: triad-architecture
description: Decide where Triad workspace changes belong and preserve product boundaries across apps, modules, docs, AGENTS instructions, and skills. Use when planning new features, moving behavior between apps, introducing modules/packages, changing architecture conventions, or deciding what must be documented.
---

# Triad Architecture

Use this skill to place work in the right product boundary before implementing.
Keep the answer and any user-facing analysis in Brazilian Portuguese unless the
user asks otherwise. Keep code, routes, filenames, docs, commits, and PR titles
in English.

## Workflow

1. Identify the user-visible intent and the affected boundary.
2. Choose the owner:
   - `apps/site`: public Astro landing page and browser-visible marketing UX.
   - `apps/api`: Bun and Elysia modular monolith for business APIs and landing-page
     support.
   - `apps/api/src/modules/idp`: identity provider for authentication, sessions, invitations,
     and internal identity contracts.
   - `apps/studio`: authenticated barbershop-management product interface.
   - `packages/*`: only after real cross-app reuse exists.
   - docs/backlog only: when the change is planning, convention, or follow-up
     work without runtime behavior.
3. Read the relevant reference:
   - `references/boundaries.md` for app/module ownership decisions.
   - `references/documentation.md` for README, docs, AGENTS, backlog, and skill
     update decisions.
   - `references/skill-governance.md` before creating or editing skills.
4. If implementation follows, use the app-specific Triad skill:
   - `triad-site-development` for `apps/site`.
   - `triad-api-development` for `apps/api`.
   - `triad-idp-development` for `apps/api/src/modules/idp`.
   - `triad-studio-development` for `apps/studio`.

## Principles

- Prefer explicit product boundaries over catch-all services.
- Consider expected usage, critical paths, data growth, concurrency, latency
  sensitivity, and external service limits before choosing an implementation
  shape.
- Do not claim numeric capacity, such as requests per minute or concurrent
  users, unless it is measured or clearly marked as an estimate with explicit
  assumptions.
- Prefer the simplest architecture that meets near-term scale without creating
  obvious bottlenecks or premature abstractions.
- Preserve local development ports unless an explicit product decision changes
  them: API `8000`, studio `3000`, and site `3001`.
- Keep business domains out of the IDP.
- Do not add shared packages until reuse is real, repeated, and stable.
- Treat documentation as a design surface: update it when a durable contract,
  workflow, convention, or operational expectation changes.
- Treat Triad skills as local wrappers over project knowledge. Do not edit
  downloaded/vendor skills to customize Triad behavior.
