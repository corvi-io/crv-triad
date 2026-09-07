---
name: triad-backstage-development
description: Build or refactor the TRIAD Backstage internal React frontend in apps/backstage, including operator authorization, tenant administration, lifecycle controls, support sessions, tests, design, and deployment boundaries.
---

# TRIAD Backstage Development

Use this skill for changes to `apps/backstage`.

## Boundaries

- Read root and `apps/backstage/AGENTS.md` before editing.
- Keep Backstage as the internal system-administration plane. Tenant business workflows belong in Studio.
- Require both an authenticated Better Auth session and an active server-confirmed platform operator.
- Never infer operator role from the browser or reuse tenant membership as platform authority.
- Keep support access explicit, expiring, revocable, audited, and read-only.

## Frontend conventions

- Use Vite, React, TanStack Router, TanStack Query, Tailwind CSS v4, and existing shadcn/Base UI primitives.
- Keep routes in `src/routes`; private routes belong under `_authenticated`.
- Keep HTTP contracts and safe error mapping in `src/modules/backstage`.
- Keep shareable UI state in typed TanStack Router search params, including opened records and
  view/edit intent. Define explicit defaults and use `stripSearchParams` so default pagination,
  sorting, filters, tabs, and view modes are omitted from generated URLs. Prefer search params when
  the underlying route remains a list with an overlay rather than a standalone detail page.
- Read public environment values only through `src/modules/shared/config/env.ts`.
- Keep UI copy in Brazilian Portuguese and technical names/docs in English.
- Preserve the TRIAD navy-and-gold design system, light/dark/system themes, keyboard navigation,
  visible focus, reduced motion, and 320px operability.
- Represent visual content loading with the shared `Skeleton` primitive shaped to the eventual
  layout, including tables, cards, forms, drawers, and detail views. Preserve an accessible named
  `role="status"` around the skeleton composition; visible `Carregando...` text is not the primary
  loading presentation for these surfaces.

## Verification

Run `bun --filter backstage check`. For authority or lifecycle work, also run focused API tests and
verify unauthenticated, non-operator, read-only operator, stale-version, and tenant-not-found states.
Scan production output to ensure no Studio business fixtures or memory repositories are bundled.
