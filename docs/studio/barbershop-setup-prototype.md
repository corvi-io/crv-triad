# Studio Barbershop Setup Visual Prototype

ENG-41 adds `/workspace-preview/barbershop-setup` as a local development presentation for validating
barbershop setup information architecture before accepting a business API, persistence, tenancy, or
authorization contract. The route runs inside `WorkspacePreviewShell` and is unavailable in built
`hml` and `prd` artifacts.

## Experience Contract

The stable URL state contains only `section` and `scenario` identifiers. Supported sections are
`overview`, `units`, `professionals`, `services`, and `availability`. Search text, names, addresses,
notes, form values, and other PII-shaped values remain component-local and never enter the URL.

The overview explains visual completion without claiming production readiness. The catalog sections
support bounded search, status filtering, three-state sorting, pagination, inspect, create, edit,
archive, and restore. Archive commands block active dependencies instead of silently orphaning
records. Service `professionalIds` are the canonical professional/service relationship in the
presentation adapter; professional `serviceIds` are derived after create, update, archive, restore,
scenario selection, and reset so both visible directions stay coherent. A selected professional
must serve at least one active unit selected for the service. Availability uses explicit day/time
fields, closed-day switches, breaks, time-off feedback, conflict descriptions filtered to the
visible professional/unit week, and one atomic Monday-to-Friday copy command; dragging is not
required. Copy replicates recurring work periods, breaks, and closed state. Day-specific absences
remain attached to their destination day and are not copied. Clean destination cards refresh from
committed copy results while an actively edited destination draft is preserved.

All UI and validation copy is Brazilian Portuguese. Tables own bounded horizontal overflow, forms
reflow to one column, statuses include text, and Base UI/shadcn overlays retain keyboard focus
management. Loading, empty, filtered-empty, conflict, one-shot failure, persistent error, retry, and
optimistic rollback states are visible and deterministic.

Entity drawers retain their active form/detail content while Base UI observes closed-to-open and
open-to-closed state changes. Entry and exit transitions therefore run before content unmounts and
focus returns to the initiating control after close completion. Existing reduced-motion styles
collapse that transition to the minimum browser duration.

## Scenarios And Reset

The presentation exposes these synthetic scenarios:

- `new-business`
- `incomplete-setup`
- `single-unit`
- `multi-unit`
- `dense-catalogs`
- `availability-conflicts`
- `slow`
- `next-failure`
- `persistent-error`

Scenario selection restores the selected seed before rendering it, so mutations never leak between
scenarios. `Restaurar cenário` confirms loss of local changes, resets the coordinated record
collection and deterministic ID sequence, clears pending failure behavior and TanStack Query state,
closes module overlays through a new composition epoch, and returns focus to the section heading.
Refresh reconstructs the URL-selected seed; no record is persisted.

Every delayed repository operation captures its scenario and operation generation. Reads use the
records captured when requested, while scenario selection and reset increment the generation so a
delayed mutation cannot modify the restored or newly selected seed. Query-cache generations also
prevent stale optimistic callbacks from restoring removed setup queries after reset or switch.

`dense-catalogs` is bounded UX stress data. Its counts do not describe API, database, browser, or
concurrency capacity.

## Architecture And Production Boundary

`src/modules/barbershop-setup` owns presentation records, repository port, URL validation, query
keys/hooks, Zod/RHF forms, and UI composition. It does not import `src/dev`. The development adapter
under `src/dev/barbershop-setup` coordinates units, professionals, services, and availability as one
typed `MemoryScenarioEngine` collection so reset and relationship checks operate on one snapshot.

Vite resolves `virtual:studio-barbershop-setup-prototype` to the memory adapter only while serving a
development runtime. Builds resolve the same module to a null shim, the route redirects to `/login`,
and the production-boundary script rejects adapter, fixture, scenario-control, and dense-record
markers from output. The adapter performs no `fetch`, auth interception, browser storage, cookies,
service-worker work, external image request, logging, analytics, polling, or realtime behavior.

The contracts are presentation-facing view models. A future production initiative must separately
decide tenancy, authorization, API and persistence shapes, query bounds, indexes, concurrency,
idempotency, observability, and migration behavior.

## Component Discovery

On 2026-07-22, `bunx --bun shadcn@latest info --json` confirmed the existing Base UI/Vite, Tailwind
v4, Lucide, and installed component configuration. `bunx --bun shadcn@latest docs` resolved the
official documentation for the candidate button, card, field, input, select, switch, textarea,
skeleton, dialog, and tabs compositions. Local installed source and focused tests were then
inspected.

Existing Studio `DataTable`, `ActionDrawer`, `ConfirmationDialog`, `FormSection`, field primitives,
`EmptyState`, `StatusBadge`, `Button`, `Card`, `Select`, `Switch`, `Input`, `Textarea`, and `Skeleton`
cover the required primitive and shared-composite contracts. `ConfirmationDialog` gained configurable
labels and confirmation treatment because its existing focus-managed anatomy was suitable but its
discard-only copy was too narrow. No registry item, community component, dependency, token, or new
shared visual primitive was needed. The overview, catalog, entity-form, and availability
compositions remain module-owned because their vocabulary and relationships are initiative-specific.

## Verification And Residual Manual Work

Focused Vitest covers URL validation, scenario isolation, deterministic reset/IDs, dependency
blocking, one-shot and persistent failure, availability validation, stale scenario isolation,
relationship synchronization and unit intersection, delayed mutation invalidation, atomic copy
rollback with destination-specific absences, filtered availability conflicts, forms, navigation,
reset, and optimistic rollback. Playwright covers stable navigation, axe, in-memory create/reset,
drawer entry/exit and reduced motion, Portuguese numeric and relationship error focus, one-shot
recovery, persistent failure, copy refresh and active-draft preservation, dependency blocking,
visible-week conflict feedback, 320 CSS-pixel reflow, keyboard focus, and dark mode. Production
checks cover redirect and bundle exclusion.

VoiceOver/NVDA, a physical coarse-pointer device, OS-level forced-colors visual inspection, and a
deployed authenticated `dev` review remain manual follow-ups unless recorded as completed in the
ENG-41 execution evidence.
