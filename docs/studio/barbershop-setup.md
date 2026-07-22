# Studio Barbershop Setup

ENG-41 integrates `/barbershop-setup` into the authenticated Studio workspace. The module uses the
normal `AuthGate`, `WorkspaceShell`, secondary sidebar, active-navigation behavior, breadcrumbs, and
responsive shell. The secondary label is `Barbearia`; the page and breadcrumb title are
`Configuração da barbearia`.

The experience is realistic but not persistent. Local development and a configured deployed `dev`
build use deterministic session-memory data. `hml` and `prd` resolve the setup source as disabled
until a separate initiative accepts API, persistence, tenancy, and authorization contracts.

## Experience Contract

The stable URL state contains `section` and an optional technical `scenario` identifier. Supported
sections are `overview`, `units`, `professionals`, `services`, and `availability`. Missing or invalid
scenarios resolve to `single-unit`. The scenario value exists only for dev/test reproducibility and
has no ordinary visible selector. Search text, names, addresses, notes, form values, and other
PII-shaped values remain component-local.

The normal page does not expose preview/prototype terminology, scenario controls, reset controls,
fixture counts, latency, or failure modes. Loading, errors, retry, validation, confirmation, success,
and empty states use Brazilian Portuguese product language.

The overview is an ongoing setup guide rather than a disposable wizard. It explains why each step
matters, reports visual progress, recommends the next incomplete dependency, and remains available
for later review after the operation is complete.

Catalog sections use the same compact search and icon/menu filter language as Agenda. Units,
professionals, and services fill the remaining module body with a shared data table: the header and
pagination remain fixed while the table viewport owns vertical and horizontal scrolling. They
support bounded search, status filtering, three-state sorting, pagination, inspect, create, edit,
archive, and restore. Archive commands block active dependencies instead of silently orphaning
records. Unit opening hours are a structured composed period with selectable weekdays instead of a
free-text summary. Service
`professionalIds` are the canonical professional/service relationship in the memory adapter;
professional `serviceIds` are synchronized after create, update, archive, restore, scenario
selection, and reset. A selected professional must serve at least one active unit selected for the
service.

Availability uses a weekly time grid filtered by professional and unit. Available, break/block, and
absence intervals are separately labeled and keep meaning independent from color. Pointer drag is a
fast range-selection path; clicking/tapping the grid and the explicit `Adicionar bloco` command open
the same composed start/end editor, so dragging is never required. Native buttons expose each block
and every day insertion surface to keyboard and assistive technology.

Weekly recurrence selects weekdays and may include an optional end date to express a month, year,
or custom operating period. Editing and deletion require explicit selected-day versus entire-series
scope. The memory adapter gives every interval a block ID and series ID and applies recurrence
changes atomically through `updateAvailabilityBatch`; simulated mutation failure rolls the whole
batch back. A linked professional/unit pair can create its first day directly; the memory adapter
creates the missing day record during the same validated batch instead of requiring pre-seeded
availability. This is an evaluation contract only. A future dated API must define persisted series,
exceptions, effective dates, `this and following` behavior, transactions/idempotency, tenancy, and
authorization independently.

Appointment occupancy is not manually editable in setup. Agenda remains the owner of appointments;
a future accepted cross-module contract may overlay that information read-only.

Entity drawers retain active content while Base UI observes entry and exit state changes. They
slide across their full width without fading, the exit transition completes before content
unmounts, and focus returns to the initiating control. Reduced-motion styles collapse the
transition to the minimum browser duration.

## Memory Source And Future Adapter

`src/modules/barbershop-setup` owns view models, repository port, URL validation, query keys/hooks,
Zod/RHF forms, and UI composition. It does not import `src/dev`.

`src/dev/barbershop-setup` owns the memory adapter and deterministic scenarios. One typed
`MemoryScenarioEngine` collection coordinates units, professionals, services, and availability so
relationship checks and test resets operate on one snapshot. The concrete adapter retains
scenario/reset/snapshot helpers for development tests; these mechanics are not part of the module
presentation port.

Vite resolves `virtual:studio-barbershop-setup-source` to memory only when
`VITE_BARBERSHOP_SETUP_SOURCE=memory` and `VITE_DEPLOY_TARGET` is `local` or `dev`. All other
combinations resolve a disabled source. Local `bun --filter studio dev` enables memory explicitly;
deployed `dev` receives the source through `STUDIO__VITE_BARBERSHOP_SETUP_SOURCE`. Scenario
whitelisting and the `single-unit` default are exported by the memory source, so scenario names and
definitions are absent when Vite resolves the disabled source.

A future accepted HTTP adapter may implement the same repository port. This document does not
define API payloads, persistence shape, tenant keys, authorization, indexes, concurrency,
idempotency, migrations, or observability.

## Deterministic Test Infrastructure

The memory source retains these bounded scenarios:

- `new-business`
- `incomplete-setup`
- `single-unit`
- `multi-unit`
- `dense-catalogs`
- `availability-conflicts`
- `slow`
- `next-failure`
- `persistent-error`

They validate UI states and regression behavior only. Scenario changes reconstruct canonical
records, and delayed operations use generation guards so stale work cannot mutate a newer state.
No record persists across a browser runtime.

`dense-catalogs` is bounded UX stress data, not API, database, browser, or concurrency capacity
evidence.

## Security, Privacy, And Production Boundary

The memory adapter performs no `fetch`, auth interception, browser storage, cookies, service-worker
work, external image requests, logging, analytics, polling, or realtime behavior. All records are
synthetic. Fixture data, form payloads, auth/session values, and private headers must not be logged.

Production-boundary builds explicitly use target `prd` and source `disabled`. The artifact scan
rejects the memory adapter, mock engine, scenarios, fixture identifiers, dense records, and failure
markers. Production browser coverage authenticates the normal route, verifies the disabled source
state, and confirms fixtures are absent. `/workspace-preview/barbershop-setup` no longer exists.

## Component Discovery

The original ENG-41 implementation inspected the existing Base UI/Vite and installed Studio
components. `DataTable`, `FilterTrigger`, `ActionDrawer`, `ConfirmationDialog`, `FormSection`, field
primitives, `EmptyState`, `StatusBadge`, `Button`, `Card`, `Select`, `Switch`, `Input`, `Textarea`,
and `Skeleton` cover the module contract. `FilterTrigger` was promoted from Agenda after setup
became its second concrete consumer. The weekly grid and composed time-range fields remain
module-owned because their semantics are specific to barbershop configuration. No dependency,
registry item, or token was added.

## Verification And Residual Manual Work

Vitest covers URL validation, source targets, scenario isolation, deterministic IDs, dependency
blocking, failure behavior, stale-operation isolation, relationships, atomic availability batches,
composed opening-hours validation, compact filters, keyboard calendar entry, forms, route gating,
registry, breadcrumbs, and architecture boundaries. Playwright covers direct authenticated entry,
expanded/collapsed/mobile sidebar navigation, absence of preview chrome, guided overview,
fill-height tables, CRUD, retry, rollback, relationship validation, recurrence creation and scope,
pointer drag, keyboard alternative, drawer motion/focus, focused axe, 320 CSS-pixel reflow, keyboard
focus, and dark mode.

VoiceOver/NVDA, physical coarse-pointer hardware, and OS-native forced-colors visual inspection
remain manual residual checks unless later evidence records them as completed.
