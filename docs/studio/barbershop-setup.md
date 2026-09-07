# Studio Barbershop Setup

## Role-aware activation

The authenticated workspace consumes server-derived readiness. Owners and administrators whose
tenant is not yet `schedule_ready` are routed to the existing setup module and receive one
persistent configuration dialog. The dialog reuses the real profile, catalog, and availability
surfaces; its step navigation and review use the same authoritative readiness projection. Managers
may dismiss it for the current browser session and tenant. Dismissal does not mark setup as complete,
and server readiness remains authoritative when a later session resumes the flow. Members do not
receive owner configuration as their primary task. Setup mutations invalidate readiness, and
completion may regress when authoritative facts change.

The wizard presents the five readiness conditions followed by a sixth review position. Completed
conditions replace their icon with a check, and an onboarding session that reaches
`schedule_ready` remains open long enough for the manager to review the result or dismiss it.
Unit, professional, and service onboarding steps render their existing validated forms inline and
advance after a successful creation. Unit creation confirms its Brazilian timezone together with
address and opening periods so the authoritative readiness state can advance atomically. An
existing primary unit that predates this requirement is resumed inline and completed instead of
creating a duplicate. The availability step likewise uses a focused inline first-schedule form and
advances directly to review; its calendar and editor drawer remain maintenance tools outside the
wizard. List search, filters, tables, pagination, and maintenance
drawers remain exclusive to the normal post-onboarding CRUD surfaces. Short progress and content
transitions acknowledge advancement and become non-spatial under reduced-motion preferences.

The dialog follows the designer reference's strong navy/gold hierarchy, horizontal progress,
focused stage content, and explicit review while retaining production identity, authorization, API,
and persistence boundaries. It never treats browser storage as completion proof and does not copy
the reference implementation or its public account-creation behavior.

ENG-41 integrates `/barbershop-setup` into the authenticated Studio workspace. Each configuration
section has its own route under `/barbershop-setup/{section}`; the base route redirects to the
overview. The module uses the
normal `AuthGate`, `WorkspaceShell`, secondary sidebar, active-navigation behavior, breadcrumbs, and
responsive shell. The secondary label is `Barbearia`; the page title and description identify the
active section without repeating a second visible content title.

Units, professionals, and services are production-backed when the configured source is `http`.
Local development may still use deterministic session-memory data for bounded product evaluation.
Availability, payment settings, commissions, and the full setup-completion projection remain
memory-only or disabled and are never mixed into the production catalog source.

## Experience Contract

The stable URL path contains the active section. Search state contains `availabilityView`,
`availabilityDate`, and an optional technical `scenario` identifier. Supported calendar views are
`day`, `week`, and `month`; the date
is a validated canonical local `YYYY-MM-DD` value. Invalid temporal values resolve to the current
local date and week view. Supported sections are `overview`, `units`, `professionals`, `services`,
and `availability`. Missing or invalid scenarios resolve to `single-unit`. The scenario value exists
only for dev/test reproducibility and has no ordinary visible selector. Search text, names,
addresses, notes, form values, and other PII-shaped values remain component-local.

The normal page does not expose preview/prototype terminology, scenario controls, reset controls,
fixture counts, latency, or failure modes. Loading, errors, retry, validation, confirmation, success,
and empty states use Brazilian Portuguese product language.

The overview remains the ongoing maintenance and review guide after onboarding. During first run,
the persistent dialog owns the focused sequence and leaves the underlying setup page inert. It
explains why each server-derived step matters, reports visual progress, recommends the next
incomplete dependency, and provides direct access to each existing setup surface.

Catalog sections use the same compact search and icon/menu filter language as Agenda. Units,
professionals, and services fill the remaining module body with a shared data table: the header and
pagination remain fixed while the table viewport owns vertical and horizontal scrolling. A vertical
scrollbar is mounted only when the body has real overflow; when present, it moves the body while the
sticky header and external pagination stay fixed. Horizontal overflow remains independently
operable. The catalogs support bounded search, status filtering, three-state sorting, pagination,
inspect, create, edit, archive, and restore. Archive commands block active dependencies instead of
silently orphaning records. Unit opening hours use a shadcn Select-based time picker and support
multiple periods for disjoint weekday groups. Entity forms use the same
placeholder and shared-mask conventions as client management; multi-selection relationships use
the shadcn/Base UI checkbox. Service
`professionalIds` are the canonical professional/service relationship; professional `serviceIds`
remain the inverse projection. The HTTP API persists replacements atomically, while the memory
adapter synchronizes both sides after create, update, archive, restore, scenario selection, and
reset. A selected professional must serve at least one active unit selected for the service.

Availability uses a real dated calendar filtered by professional and unit. Day and week views use a
time grid; month uses the complete Monday-to-Sunday grid around the selected month. Users can move
backward or forward, return to today, jump to a date, and open a month cell as a day. Available,
break/block, and absence intervals are separately labeled and keep meaning independent from color.
Pointer drag is a fast range-selection path in day/week; clicking/tapping the grid and the explicit
`Adicionar bloco` command open the same composed start/end editor, so dragging is never required.
Native buttons expose each projected occurrence and insertion surface to keyboard and assistive
technology.

Weekly recurrence selects weekdays, requires a start date, and may include an end date. One-off
blocks carry an exact date. Recurring rules keep excluded dates and are projected only across the
bounded visible day/week/month range. Editing one occurrence atomically excludes the source date and
adds a dated override; deleting one occurrence adds the exclusion without changing later dates.
Editing or deleting the series remains an explicit separate scope. The memory adapter gives every
interval a block ID and series ID and applies recurrence/exception changes atomically through
`updateAvailabilityBatch`; simulated mutation failure rolls the whole batch back. A linked
professional/unit pair can create its first day directly; the memory adapter creates the missing
day record during the same validated batch instead of requiring pre-seeded availability. This is an
evaluation contract only. A future dated API must define persisted series, exceptions, effective
dates, `this and following` behavior, transactions/idempotency, tenancy, and authorization
independently.

Appointment occupancy is not manually editable in setup. Agenda remains the owner of appointments;
a future accepted cross-module contract may overlay that information read-only.

Entity drawers retain active content while Base UI observes entry and exit state changes. They
slide across their full width without fading, the exit transition completes before content
unmounts, and focus returns to the initiating control. Reduced-motion styles collapse the
transition to the minimum browser duration.

## Catalog source composition

`src/modules/barbershop-setup` owns view models, repository port, URL validation, query keys/hooks,
Zod/RHF forms, and UI composition. It does not import `src/dev`.

`src/dev/barbershop-setup` owns the memory adapter and deterministic scenarios. One typed
`MemoryScenarioEngine` collection coordinates units, professionals, services, and availability so
relationship checks and test resets operate on one snapshot. The concrete adapter retains
scenario/reset/snapshot helpers for development tests; these mechanics are not part of the module
presentation port.

Vite resolves `virtual:studio-barbershop-setup-source` to memory only when
`VITE_BARBERSHOP_SETUP_SOURCE=memory` and `VITE_DEPLOY_TARGET` is `local` or `dev`. This remains an
evaluation-only source. Set `VITE_BARBERSHOP_SETUP_SOURCE=http` to use the production-backed unit,
professional, and service catalogs in any target. HTTP failures never fall back to fixtures. All other
combinations resolve a disabled source. Local `bun --filter studio dev` enables memory explicitly;
deployed `dev` receives the source through `STUDIO__VITE_BARBERSHOP_SETUP_SOURCE`. Scenario
whitelisting and the `single-unit` default are exported by the memory source, so scenario names and
definitions are absent when Vite resolves the disabled source.

The HTTP adapter uses the authenticated tenant context, bounded API lists/options, optimistic
versions, and recoverable error mapping. It never falls back to fixtures after an HTTP,
authorization, validation, or conflict failure. Durable API, persistence, migration, and rollback
contracts live in `docs/api/barbershop-catalogs.md`.

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
`Checkbox`, `ToggleGroup`, and `Skeleton` cover the module contract. `FilterTrigger` was promoted from Agenda after setup
became its second concrete consumer. The dated calendar and composed time-range fields remain
module-owned because their semantics are specific to barbershop configuration. The official
shadcn/Base UI checkbox source was added for relationship selection; no custom primitive or token
was introduced.

## Verification And Residual Manual Work

Vitest covers URL/date/view validation, bounded occurrence projection, source targets, scenario
isolation, deterministic IDs, dependency blocking, failure behavior, stale-operation isolation,
relationships, atomic availability/exception batches, composed opening-hours validation, compact
filters, keyboard calendar entry, forms, route gating,
registry, breadcrumbs, and architecture boundaries. Playwright covers direct authenticated entry,
expanded/collapsed/mobile sidebar navigation, absence of preview chrome, guided overview,
fill-height tables, CRUD, retry, rollback, relationship validation, recurrence creation and scope,
pointer drag, keyboard alternative, drawer motion/focus, focused axe, 320 CSS-pixel reflow, keyboard
focus, and dark mode.

VoiceOver/NVDA, physical coarse-pointer hardware, and OS-native forced-colors visual inspection
remain manual residual checks unless later evidence records them as completed.

## ENG-55 First MLP Completion

The setup overview now derives six resumable steps from required operational facts: barbershop
data, hours, professionals, services, payments and commissions, and review. The same sections
remain available after completion, so onboarding does not create a second maintenance surface.
Barbershop data is intentionally limited to display name, phone, email, and the address of the
selected primary unit.

Professional onboarding is invitation-only. Identity name, email, phone, and credentials remain
owned by the invited user; the barbershop configures only the professional function, commission,
specialties, and linked units/services. Every professional invite receives basic `member` access;
administrator promotion belongs to the separate protected access configuration. An active
professional always links an IDP user and tenant membership. Pending
invites do not appear as active professionals. Development-memory invitations are accepted
synchronously to keep deterministic UI scenarios. The professional detail surface reads current-day Agenda,
availability, resolved service overrides, and commission facts through narrow public ports.

Payment configuration requires one active base method; mixed payment requires two. A development
checkout created after a settings change snapshots the active base methods and rejects disabled
tenders. Service resolution applies at most one price and/or duration override for an active,
eligible professional/service pair. Clearing it restores the service default. The development
scheduling coordinator consumes that resolved value when creating or reallocating an appointment.
Already-paid sale and commission snapshots are copied at completion and never rewritten by later
setup changes.

## Persisted availability

Initiative 22 supplies the HTTP Disponibilidade surface, explicit unit timezone confirmation, recurring rules and occurrence exceptions with archive/restore. Owner/admin capability controls mutation; members can inspect. See [Production scheduling](scheduling.md). Professional view and edit drawers show the same persisted upcoming appointments.
