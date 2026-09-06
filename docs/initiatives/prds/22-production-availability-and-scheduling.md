# 22 Production Availability And Scheduling

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: Complete — approved for local testing on 2026-09-05
- Owner: CRV Triad
- Last updated: 2026-09-05
- Approved by/date: User / 2026-09-05

## Summary

Deliver the first production scheduling vertical slice for TRIAD by persisting professional
availability and appointments, replacing the normal Studio Agenda and setup availability memory
sources with tenant-isolated HTTP behavior. Owners and administrators will configure dated working
rules, breaks, blocks, absences, and exceptions; authorized tenant members will find valid times and
create, inspect, edit, confirm, reschedule, check in, cancel, and mark no-shows. The slice integrates
the catalogs from Initiative 21, the existing Client module, professional detail, and the operational
Dashboard while preserving the established Studio interaction system down to field labels,
placeholders, masks, spacing ownership, feedback, URL behavior, and failure recovery.

Execution plan: [22-production-availability-and-scheduling.md](../tasks/22-production-availability-and-scheduling.md)

## Context

- Current state:
  - Initiative 21 is complete, as explicitly confirmed by the user. Its current worktree establishes production units,
    invited IDP-backed professionals, services, assignments, client catalog preferences, and bounded
    catalog option contracts. This initiative depends on the completed, documented version rather
    than freezing an earlier PRD assumption or partially implemented shape.
  - `/agenda`, Agenda-backed Dashboard projections, and setup availability are sophisticated
    local/development prototypes backed by session-memory sources. They are disabled in production.
  - Agenda already demonstrates day/week boards, a list alternative, filters, appointment drawers,
    status presentation, pointer/keyboard rescheduling, conflict feedback, rollback, and bounded
    scenarios.
  - Setup availability demonstrates day/week/month projections, weekly recurrence, dated exceptions,
    one-occurrence versus series editing, breaks, blocks, absences, pointer range selection, and an
    explicit keyboard/click alternative.
  - The production Client module already supplies the strongest current reference for page headers,
    search/filter bars, tables, pagination, drawers, form anatomy, masks, confirmations, loading,
    errors, empty states, toasts, URL-restorable overlays, and tenant-aware HTTP behavior.
  - The prototype appointment form still accepts duplicated client name/phone, hard-coded unit IDs,
    synthetic professional/service defaults, a placeholder containing prototype language, and
    status/payment fields that should not be freely editable during appointment creation.
- Problem:
  - A barbershop cannot persist real working availability or bookings, so catalog and client data
    cannot yet support daily operation.
  - Memory-only behavior hides the production concerns that matter most: timezone correctness,
    recurrence bounds, atomic collision prevention, stale writes, idempotency, tenant isolation,
    audit attribution, and cross-module cache coherence.
  - Small inconsistencies between modules—labels, placeholders, masks, field density, spacing,
    action placement, loaders, errors, URL defaults, and partial handoffs—make the product feel like
    disconnected prototypes and allow later implementation continuations to silently diverge from
    accepted decisions.
- Why now:
  - Clients and the three scheduling catalogs provide the stable IDs and eligibility relationships
    needed by bookings.
  - Availability and appointments form one useful journey; implementing either alone would leave a
    configuration-only or unsafe scheduling surface.
  - Capturing the consistency contract before implementation protects the product against the completed Initiative
    21 contracts and makes continuation evidence explicit.
- Related docs/issues:
  - [Initiative 21](21-production-barbershop-catalogs-and-client-preferences.md)
  - [Studio Agenda prototype](../../studio/schedule-prototype.md)
  - [Studio barbershop setup](../../studio/barbershop-setup.md)
  - [Studio client management](../../studio/client-management.md)
  - [Studio component system](../../studio/component-system.md)
  - [Studio theme system](../../studio/theme-system.md)
  - [Business context and access](../../api/business-context-and-access.md)
- Repository evidence:
  - `apps/studio/src/modules/scheduling/contracts.ts` contains the accepted appointment/status/range
    vocabulary but still hard-codes `centro` and `artesao` unit IDs.
  - `apps/studio/src/modules/scheduling/appointment-drawer.tsx` contains synthetic client fields and
    defaults instead of production client/catalog selectors.
  - `apps/studio/src/modules/scheduling/schedule-page.tsx` already owns Agenda interactions and
    optimistic feedback, while `src/dev/scheduling` owns the memory implementation.
  - `apps/studio/src/modules/barbershop-setup/contracts.ts` exposes availability recurrence and batch
    operations inside a repository that also contains catalog/setup prototype concerns.
  - `apps/studio/src/modules/clients/client-directory-page.tsx` and `client-form.tsx` demonstrate the
    incumbent production form/list vocabulary this initiative must match.

## Actors And Workflows

- Primary actors:
  - Tenant owner/admin: configures unit timezones and professional availability and can perform all
    appointment operations.
  - Tenant member/receptionist: reads availability and manages appointments but cannot mutate
    availability rules.
  - Professional: an invited, active tenant member represented by a professional record; this slice
    does not introduce self-service-only schedule permissions.
  - Client: a tenant-owned business record selected by an appointment, never an authorization actor.
- Current workflow:
  - A user exercises synthetic schedules that reset after a new browser runtime and cannot be used in
    `hml` or `prd`.
  - The appointment drawer retypes customer name and phone and independently exposes catalog-like
    choices, creating duplication and drift from Client and Initiative 21.
- Target availability workflow:
  1. Owner/admin opens `Configuração da barbearia / Disponibilidade`.
  2. The user selects an active unit and a professional assigned to it.
  3. If the unit lacks an explicitly confirmed IANA timezone, the UI explains the dependency and
     links to unit editing; no schedule mutation is allowed.
  4. The user navigates day, week, or month and creates a weekly or one-off available, break, blocked,
     or absence interval using the same composed editor from pointer selection or `Adicionar bloco`.
  5. For a recurring occurrence, edit/archive explicitly asks for `Somente esta ocorrência` or
     `Toda a série`; one-occurrence changes create an exclusion plus dated override atomically.
  6. Conflicts, stale versions, network errors, and rejected intervals preserve the editor state and
     explain the next valid action.
- Target appointment workflow:
  1. User opens `/agenda`, chooses a real active unit, date/scope, and view.
  2. Agenda requests a bounded server projection of unit hours, availability, private occupancy,
     appointments, and active catalog options. Filtered-out bookings still occupy time without
     leaking their details.
  3. User creates from `Novo agendamento` or a valid free slot. Date, time, unit, and optionally
     professional are prefilled from context but remain reviewable.
  4. User searches and selects an existing active client. The drawer displays catalog-backed client
     preferences as suggestions without silently choosing them.
  5. If the client does not exist, `Cadastrar cliente` opens the canonical Client creation flow,
     including duplicate warnings and masks, then returns to the preserved appointment draft with
     the created client selected.
  6. User selects an eligible service and professional. The server resolves duration and price and
     returns available choices; hidden or stale client values never decide eligibility.
  7. Create is idempotent and atomically rechecks tenant, lifecycle, assignments, unit hours,
     availability, blocks, and collision before committing.
  8. User may inspect, edit appointment details, confirm, reschedule, check in, cancel, or mark a
     no-show according to the server-owned transition matrix. No generic status dropdown bypasses it.
  9. Changes persist across reload and update Agenda, Dashboard, client next-appointment/history, and
     professional schedule projections through tenant-scoped cache invalidation.
- Alternate/failure/recovery flows:
  - No unit, missing timezone, no active professional, no eligible service, no availability, source
    error, filtered-empty, and genuinely empty schedules have distinct instructions and actions.
  - A known foreign tenant ID always produces safe not-found/forbidden behavior and no existence leak.
  - Concurrent create/reschedule collision commits at most one valid booking; the rejected draft is
    retained with a refreshed availability explanation.
  - Archived client/catalog records remain readable through appointment snapshots but cannot be used
    for a new booking or reschedule without choosing active replacements.
  - A canceled appointment releases future occupancy but remains in history and cannot be restored
    through an invented generic action.
  - A stale deep link keeps the selected range and shows a bounded unavailable-record message rather
    than silently opening another appointment.

## Goals

- Persist correct, tenant-isolated professional availability and appointment lifecycles.
- Deliver one complete configuration-to-booking journey using real clients and Initiative 21
  catalogs.
- Preserve the strongest accepted Agenda interactions while replacing synthetic data and hard-coded
  IDs with production contracts.
- Make Dashboard, client, and professional projections coherent immediately after appointment
  changes.
- Enforce a written, testable cross-module quality floor so continuation does not erode labels,
  placeholders, masks, spacing, feedback, accessibility, or source boundaries.
- Provide safe concurrency, idempotency, audit, observability, rollout, and rollback behavior.

## Non-Goals

- Queue/reception stages beyond appointment check-in, walk-ins, automatic allocation, service
  sessions, checkout, payment, cash closing, commission snapshots, or operational notifications.
- Public/customer booking, reminders, WhatsApp/SMS/email delivery, recurring appointments, waitlists,
  packages, rooms/chairs/equipment, group bookings, or calendar-provider synchronization.
- Professional self-service permission rules, shifts/payroll, time clock, vacation approval, or IDP
  role redesign.
- Persisting prototype payment status, rating, tags, development scenarios, portraits, or fabricated
  appointment/customer facts.
- Month/year appointment board, unbounded timeline queries, automatic use of client preferences, or
  an optimization/recommendation engine.
- Redesigning the TRIAD visual identity, creating a second component library, or rewriting Clientes
  merely to make implementation easier.

## Requirements

### Functional

- REQ-001: Every availability and appointment request shall derive the active tenant from the
  authenticated server session; caller-supplied organization IDs shall never authorize access.
- REQ-002: An active unit shall require an explicitly confirmed valid IANA timezone before it can
  own availability or appointments. Existing units without one remain catalog-valid but visibly
  scheduling-incomplete; no migration shall guess their timezone.
- REQ-003: Owner/admin shall create, inspect, update, archive, and restore bounded availability
  series for an active professional/unit assignment. Tenant members may read effective availability
  through scheduling projections but may not mutate rules.
- REQ-004: Availability series shall contain type, local start/end time, selected weekdays,
  effective start date, optional effective end date, status, version, and tenant/professional/unit
  ownership. End shall follow start and all occurrences shall stay inside unit opening hours.
- REQ-005: Availability types shall be `available`, `break`, `blocked`, and `absence`, presented as
  distinct text/icon semantics. Appointment occupancy is read-only and shall never be manufactured
  through availability editing.
- REQ-006: The server shall project recurrence only for a required bounded date range and apply
  dated exclusions/overrides deterministically. It shall not materialize an unbounded future.
- REQ-007: Editing or archiving one recurring occurrence shall atomically add the source-date
  exclusion and optional override. Editing or archiving a whole series shall use an explicit scope
  and optimistic version.
- REQ-008: Availability writes shall reject missing, archived, foreign, or incompatible
  professional/unit references; overlaps and unit-hours violations shall return stable conflict or
  validation codes without partial writes.
- REQ-009: Authorized tenant members shall retrieve bounded day/week Agenda projections and a
  paginated list for one active unit, with server-side professional, client, service, status, date,
  and private free-text search filters, allowlisted sorting, and deterministic ordering.
- REQ-010: Appointment create shall require one active client, unit, professional, and service from
  the same tenant; the professional must be assigned to the unit/service, and the service must be
  offered at the unit.
- REQ-011: The server shall resolve appointment duration and price from current catalog defaults at
  create or material service/professional change and persist event-time IDs, labels, duration,
  price, unit timezone, and local/UTC schedule snapshots. Caller-supplied price/duration shall not
  override the resolved result.
- REQ-012: Appointment create/reschedule shall fit inside unit hours and one effective available
  interval, shall intersect no break/block/absence, and shall not overlap another occupying
  appointment for the same professional.
- REQ-013: Create, edit, reschedule, and transitions shall use idempotency and optimistic concurrency;
  concurrent conflicting writes shall commit at most one valid outcome.
- REQ-014: Appointment states shall be `scheduled`, `confirmed`, `arrived`, `waiting`, `in-progress`,
  `completed`, `canceled`, and `no-show`. This initiative exposes only create, edit, confirm,
  reschedule, check-in, cancel, and no-show commands; later service/checkout modules receive narrow
  trusted transition ports for `waiting`, `in-progress`, and `completed`.
- REQ-015: Cancellation shall require a bounded reason category and optional bounded note, retain the
  appointment/event history, release future occupancy, and be idempotent. No hard delete or generic
  restore shall be exposed.
- REQ-016: Appointment detail shall expose an ordered, bounded lifecycle event history containing
  actor, action, timestamp, from/to status, and changed field names without duplicating payload/PII
  values.
- REQ-017: Agenda shall consume bounded catalog options from Initiative 21 and shall not hard-code
  unit, professional, service, client, price, or duration options.
- REQ-018: Appointment creation shall select a canonical active client rather than accepting copied
  name/phone fields. `Cadastrar cliente` shall reuse the canonical Client creation/duplicate/mask
  behavior and return to the intact appointment draft after success or cancellation.
- REQ-019: Client unit/professional/service preferences shall be labeled suggestions only. They may
  be highlighted or ordered but shall not automatically select, authorize, or bypass availability
  and eligibility validation.
- REQ-020: Client detail shall show a bounded appointment history and next active appointment;
  client lists shall project the next appointment without per-row queries. `lastVisitAt` remains
  unavailable until completed service facts exist.
- REQ-021: Professional detail shall show a bounded current-day/upcoming appointment projection and
  deep-link to Agenda with non-PII unit/professional/date filters. Unit/service detail may expose
  bounded Agenda links but shall not load unbounded appointment collections.
- REQ-022: The operational Dashboard shall use the same server-backed appointment projections as
  Agenda and shall invalidate coherently after appointment mutation without copying records into a
  second source.
- REQ-023: Studio shall use HTTP for normal availability, Agenda, and Dashboard behavior in every
  production-capable target; it shall never fall back to memory after network, authorization,
  validation, or conflict failure.
- REQ-024: Existing deterministic scheduling/availability fixtures may remain only in explicitly
  development-owned QA routes or tests. Normal authenticated product routes shall not expose
  scenario/reset controls or combine real catalog/client data with synthetic operational records.

### Product Consistency And UX

- REQ-025: Clientes is the baseline for shared operational vocabulary. Agenda/availability shall use
  the existing `WorkspaceShell`, `ModuleLayout`, `PageHeader`, list search/filter controls,
  `DataTable`, pagination, `ActionDrawer`, confirmation dialog, form sections/fields, masks,
  `DatePicker`, status, skeleton, empty state, and Sonner contracts whenever their semantics fit.
- REQ-026: Page titles, descriptions, breadcrumbs, primary actions, filter placement, drawer headers,
  footer action ordering, table fallback `-`, status terminology, and action verbs shall be
  consistent across Clientes, catálogos, availability, Agenda, Dashboard, and linked detail views.
  A deliberate difference shall be recorded in a parity matrix with a product reason.
- REQ-027: Every editable control shall have a persistent visible Portuguese label. Placeholders
  shall never replace labels, carry required instructions, or contain prototype/synthetic language.
  Examples shall use consistent `Ex.: ...` wording; selection prompts shall use `Selecione ...`;
  search placeholders shall use the established `Buscar por ...` vocabulary.
- REQ-028: Phone, currency, date, date-range, and time values shall use the shared mask/composed
  controls and canonical value rules. No feature-local masking, browser-native date field, duplicated
  formatting helper, or synthetic default value shall be introduced.
- REQ-029: Forms shall use React Hook Form and Zod, `noValidate`, required-label markers, linked
  field errors, `aria-invalid`, first-invalid focus, dependency clearing, draft preservation after
  recoverable errors, and stable button labels with shared loading state. A default shall represent
  a safe product choice, never merely make a test pass.
- REQ-030: `WorkspaceShellContent` shall remain the single owner of page inset, `ModuleLayout` the
  single module scroll owner, and `ActionDrawer` the single drawer-body inset/scroll owner. Agenda
  boards, lists, filters, cards, and forms shall not add duplicated outer spacing or idle scrollbars.
- REQ-031: Creation commands shall live in `PageHeader.actions`; list row actions shall use the
  existing primary row action and contextual menu without a dedicated `Ações` column; destructive
  and lifecycle commands shall use explicit confirmation with consequence-specific verbs.
- REQ-032: Loading shall use layout-shaped named skeletons without content jumps; initial empty,
  filtered-empty, unavailable dependency, permission denial, subscription denial, recoverable
  network error, validation error, conflict, stale deep link, saving, and success states shall be
  distinct and use concise actionable Portuguese copy.
- REQ-033: Agenda date, unit, day/week scope, board/list view, stable filter IDs, and opened
  appointment/mode shall use validated typed URL state with defaults stripped. Client text, search
  text, notes, cancellation text, names, phone, and other PII shall never enter the URL.
- REQ-034: Pointer drag/drop shall remain an accelerator only. Every create/reschedule/range-edit
  action shall have an equivalent click/tap/keyboard path, restore meaningful focus, announce the
  result in Portuguese, and respect reduced motion.
- REQ-035: Day/week board and list shall express the same underlying result. Filtered-out private
  appointments shall remain unlabeled occupied intervals for collision safety, and no visual free
  slot may contradict server availability.
- REQ-036: The interface shall preserve the established restrained navy/gold design, Geist type,
  semantic tokens, light/dark/system themes, status meaning independent from color, visible focus,
  320 CSS-pixel reflow, 200% zoom, forced-colors usability, and minimum target sizing.
- REQ-037: No user-visible `TODO`, placeholder card, fake counter, disabled future action, fabricated
  record, debug/scenario label, raw technical error, or “coming soon” control shall ship on normal
  routes. An out-of-scope capability shall be absent or explained as an unavailable dependency only
  when that explanation helps complete the current task.

### Non-Functional And Delivery Discipline

- REQ-038: Availability range shall be bounded to at most 42 local dates and Agenda range to at most
  seven dates per board request; list pagination shall use bounded page sizes and deterministic
  cursors/order. Option hydration shall remain bounded and avoid N+1 queries.
- REQ-039: Database constraints/transactions shall prevent cross-tenant links and overlapping
  occupying appointment ranges. Query predicates and indexes shall begin with tenant/unit/time
  dimensions appropriate to the access path.
- REQ-040: Logs, traces, metrics, analytics, audit events, errors, and idempotency storage shall not
  contain client/professional names, contacts, notes, cancellation text, search terms, appointment
  payloads, credentials, tokens, cookies, or private headers.
- REQ-041: Structured telemetry shall expose route template, tenant/actor IDs, opaque entity ID,
  command, result/error code, duration, range length, result count, conflict class, and request ID
  with bounded dimensions. Alerts shall cover sustained server errors, collision anomalies, and
  recurrence-projection failures.
- REQ-042: The rollout shall be additive and reversible: schema/API compatibility first, Studio HTTP
  source second, normal-route enablement last. Rollback shall not require deleting appointment or
  availability data or re-enabling fixture fallback.
- REQ-043: Before implementation begins or resumes, the executor shall read the approved PRD/plan,
  Initiative 21's current contracts/status, nearest `AGENTS.md`, applicable skills, `git status`, and
  overlapping diffs. Existing user work shall not be overwritten or normalized away.
- REQ-044: Every handoff or interruption shall update the execution plan's Continuation Checkpoint
  with active task, completed/remaining behavior, decisions, changed files, migrations, commands and
  results, known failures, exact next action, and dirty-worktree risks. A task shall not be marked
  done without its required evidence.
- REQ-045: Material discoveries that change fields, states, permissions, persistence, source
  composition, UX hierarchy, or acceptance behavior shall return the PRD to `Awaiting approval`;
  implementation shall not silently substitute a convenient behavior.
- REQ-046: Quality review shall compare Agenda/availability against a committed Client-baseline
  parity matrix and real browser screenshots at desktop and 320 CSS pixels in light and dark themes.
  Mechanical tests alone shall not close visual-consistency acceptance criteria.
- REQ-047: API and Studio coverage gates shall remain at least 80% for statements, branches,
  functions, and lines, while behavioral assertions—not covered lines—prove transition,
  concurrency, recurrence, accessibility, and recovery contracts.

## UI Consistency Contract

This matrix is mandatory implementation evidence. “Match” means reuse the same shared contract and
interaction semantics, not make Agenda visually identical to a client directory.

| Concern | Client Baseline | Scheduling Requirement | Evidence |
| --- | --- | --- | --- |
| Page anatomy | Shell → `ModuleLayout` → `PageHeader` → controls → content | Same hierarchy; board/list specialize only content | DOM/source contract and screenshots |
| Primary action | Named verb in `PageHeader.actions` | `Novo agendamento`; `Adicionar bloco` in availability context | Component and browser test |
| Search/filter | Compact search plus shared filter triggers | Same components; server-backed values; no raw selects as list filters | URL/request and screenshot evidence |
| List | Shared table, sortable headers, owned overflow, external pagination | Agenda list uses identical table/pagination conventions | Component/E2E tests |
| Row action | Primary named record action plus contextual menu; no action column | Open appointment plus allowed lifecycle commands | Keyboard/context-menu test |
| Drawer | Context/action header, one scroll owner, left secondary/right primary footer | View/edit/reschedule/cancel modes keep the same anatomy | Screenshot, focus, motion test |
| Fields | Persistent label, required marker, linked error, 40px default control | Same; composed date/time/catalog/client selectors | Form inventory and computed styles |
| Placeholder | Supporting example only (`Ex.: ...`) or selection/search prompt | No instructions/prototype text; consistent vocabulary | Static detector and visual review |
| Masks/format | Shared canonical phone/date/currency behavior | Reuse shared controls; server owns resolved money/duration | Unit/component tests |
| Feedback | Stable loading label, named skeleton, specific toast/alert, recoverable draft | Same feedback grammar for every command/conflict | Failure-path E2E |
| Empty states | Distinguish initial empty from filtered empty | Also distinguish missing setup/no availability | Scenario matrix |
| Spacing/scroll | Shell, module, drawer, and table each own one inset/scroll boundary | No duplicated page/drawer inset or idle scrollbar | Computed styles and 320px screenshots |
| URL/privacy | Typed, default-stripped, non-PII overlay/filter state | Same, including appointment mode and date context | Parser and browser URL assertions |
| Status | Text carries meaning; semantic color is supplementary | Appointment/availability states use text + icon/badge | Contrast/forced-colors review |

## Brainstorm

### Problem Framing

- The real outcome is not “an appointment CRUD”; it is confidence that a slot offered by Studio can
  actually be performed by the selected professional at that unit.
- The quality problem is cumulative. Each inconsistent placeholder, mask, inset, loader, or recovery
  path is small, but together they make routine operation slower and weaken trust.
- Continuation is part of delivery quality: accepted decisions must survive pauses and agent changes.

### Gaps And Unknowns

- Product gaps:
  - No validated demand exists for public booking, recurring appointments, waitlists, resources, or
    provider calendar sync.
  - Professional self-service schedule limits are not yet defined, so availability mutation remains
    owner/admin-only.
- Technical gaps:
  - Initiative 21 is still changing professional identity/invitation and unit-hours contracts.
  - Current Agenda, Dashboard, setup availability, and Service Desk share memory coordinators; the
    production source split must avoid leaving normal routes in a hybrid state.
  - PostgreSQL overlap enforcement may require a generated/raw migration beyond Drizzle schema DSL.
- Data/model gaps:
  - Units currently have no confirmed timezone.
  - Existing fixtures are not production data and shall not be migrated.
  - Completed/in-progress states exist visually but their authoritative commands belong to later
    service and checkout modules.
- Operational gaps:
  - No measured booking volume, range latency, conflict rate, or recurrence volume baseline exists.
  - Realtime multi-reception reconciliation is desirable but needs a measured load and delivery
    mechanism; correctness shall rely on server transactions and refresh/invalidation first.

### Counterpoints

- Availability first and appointments later would reduce each PR, but it leaves no valuable user
  outcome and risks designing recurrence without its primary consumer.
- Copying the memory repository behind HTTP would ship faster but preserve synthetic IDs, client
  duplication, browser-derived recurrence, and weak collision semantics.
- Combining queue/service fulfillment now would complete more of the daily journey, but introduces a
  separate concurrency/state machine and makes a scheduling initiative too difficult to verify and
  roll back.
- Adding WebSockets immediately would make changes feel live, but transport does not solve database
  correctness and introduces connection/ordering/recovery work before usage is measured.
- Pixel-copying Clientes would ignore Agenda's temporal task. Shared anatomy and interaction grammar
  should match while the time board remains purpose-built.
- Doing nothing leaves production catalogs disconnected from operations and lets prototype-specific
  inconsistencies become accidental contracts.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Availability + appointments + Agenda/Dashboard/client/professional projections | Complete useful journey, one collision model, strong cross-module coherence | Broad but bounded; depends on Initiative 21 | Selected |
| B | Availability only, then appointment CRUD | Smaller migrations and review | No immediate operating value; duplicated integration effort | Only if Initiative 21 cannot stabilize catalog consumers |
| C | Scheduling + queue + fulfillment | Longer end-to-end journey | Two state machines, larger concurrency/privacy/rollback surface | Later, after production appointments are proven |

### Recommendation

Choose Option A. Create sibling `availability` and `scheduling` business modules in the API with
explicit cross-module ports to catalogs and clients. Let the server project bounded effective
availability and own all booking validation/collision decisions. Preserve the accepted day/week
Agenda and setup calendar in Studio, replace their normal sources with HTTP, and integrate Client,
professional detail, and Dashboard through narrow projections. Treat the UI parity matrix and
Continuation Checkpoint as release gates, not optional polish.

## Architecture And Boundaries

- Site impact: none.
- API impact:
  - Add `apps/api/src/modules/availability` for recurrence, exceptions, bounded occurrence
    projection, and rule lifecycle.
  - Add `apps/api/src/modules/scheduling` for appointment aggregate, transitions, collision,
    snapshots, events, queries, and projections.
  - Consume Initiative 21 catalog/client facts through narrow structural dependencies; do not move
    rules into `clients`, catalog modules, or IDP.
  - Add `availability.read/manage` and `scheduling.read/manage` capabilities and entitlements.
- IDP impact: no authentication or invitation change. Session user and tenant context identify the
  actor; professional linkage remains Initiative 21-owned.
- Studio impact:
  - Replace normal Agenda, setup availability, and scheduling-backed Dashboard sources with HTTP.
  - Adapt existing presentation instead of creating parallel scheduling UI.
  - Reuse canonical Client create behavior inside appointment composition without duplicating the
    Client aggregate or form rules.
- Data/persistence impact:
  - Add unit timezone compatibility column/change, availability series, dated exceptions/overrides,
    appointments, idempotency records, and immutable appointment lifecycle events.
  - No fixture migration. Existing catalog/client records remain intact.
- External provider impact: none. No messaging, calendar, payment, or realtime provider.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Configuration-to-booking, lifecycle, alternate and recovery journeys | `requirements-analysis`, prototype docs |
| Architecture | Applicable | Adds availability/scheduling modules and cross-module projections | `triad-architecture`, Initiative 21 |
| API | Applicable | Bounded range/list routes, commands, errors, auth, idempotency, OpenAPI | `triad-api-development`, `elysia` |
| Identity and authorization | Applicable | Tenant session, actor audit, availability/scheduling capability matrix | business context/access doc |
| Persistence | Applicable | Recurrence, exceptions, range collision, events, constraints, migrations | `postgres-drizzle` |
| Studio UI | Applicable | Replaces three normal-route memory projections and integrates Client | `triad-studio-development`, `impeccable`, component docs |
| Site UI | Not applicable | No public booking or marketing change | Product boundary instructions |
| Accessibility | Applicable | Temporal grid, dragging alternative, drawers, forms, live feedback | `accessibility`, Agenda docs |
| Performance and scale | Applicable | Bounded recurrence/range projection and high-read Agenda path | API/Studio skills |
| Security and privacy | Applicable | Appointment/client PII, private occupancy, tenant isolation | API conventions |
| Observability | Applicable | Conflicts, projections, mutations, recurrence, rollout need diagnosis | logging/observability guidance |
| Reliability and delivery | Applicable | Atomic collision, idempotency, compatibility rollout, source cutover | release/deployment docs |
| Testing and QA | Applicable | Domain, PostgreSQL, API, component, browser, visual and a11y evidence | `triad-testing`, `triad-product-qa` |
| Documentation | Applicable | API/Studio/runtime/continuation contracts change | docs instructions |

## Performance And Scalability

- Expected data growth: availability rules remain smaller than appointments; appointments grow
  indefinitely per tenant. No numeric capacity is claimed.
- Critical paths: day/week range projection, free-slot validation, create/reschedule transaction,
  client next-appointment projection, and Dashboard today projection.
- Query bounds/pagination:
  - Board requests cover one unit and at most seven dates.
  - Availability calendar covers at most 42 local dates.
  - Historical lists/events use bounded cursor/page size with stable ordering.
  - Catalog/client option search uses Initiative 21/Client bounded endpoints rather than full loads.
- Concurrency risks: two receptionists booking the same professional/time, reschedule versus cancel,
  catalog/archive during draft, recurrence edit during booking, retry after timeout, and tenant switch
  during request. Database constraints, versions, idempotency, and query cancellation address them.
- External limits: none.
- Millions of records: tenant/unit/time compound indexes constrain range queries; appointment lists
  never scan all history; recurrence expands only inside requested dates; client list projections
  use set-based/lateral aggregation rather than per-row queries; retention/partitioning is deferred
  until measured data justifies it.

## Security, Privacy, And Abuse

- Auth/session impact: every request resolves current identity, active tenant, membership, role,
  subscription, entitlement, and capability server-side.
- Roles/access:
  - owner/admin: availability read/manage and scheduling read/manage;
  - member: scheduling read/manage and effective-availability read, but no availability-rule manage;
  - professional-specific restrictions are deferred until a product policy is accepted.
- PII/secrets: appointments reference private client/professional data. List/search responses expose
  only authorized tenant data; hidden occupancy contains no identity or service detail.
- Spam/abuse: all endpoints are authenticated; inputs/ranges/results are bounded; idempotency prevents
  duplicate retry writes. Monitor mutation/search rates before adding module-specific throttles.
- Audit: lifecycle events store identifiers and changed field names, never notes or contact values.

## Accessibility And UX

- Keyboard flow: date/scope/view/filter selection, slot creation, appointment opening, every command,
  recurrence scope, and rescheduling work without drag; focus returns to the initiating slot/card.
- Screen reader states: semantic time headers, date/professional context, unavailable occupancy,
  overlap/conflict, loading, filter results, mutations, and date changes receive concise announcements.
- Responsive behavior: at 320 CSS pixels, list is the dense alternative; boards own horizontal
  overflow without widening the page; drawer footer and fields wrap without clipping.
- Loading/error/empty states: use the explicit state matrix in REQ-032; retry never clears a form or
  changes tenant/date context.
- Duplicate submission prevention: stable button labels, `isLoading`, `aria-busy`, idempotency key,
  and disabled conflicting commands.
- Visual direction: established `Confirmed Context`/Operate mode; calm solid operational surfaces,
  scarce gold, no redesign, decorative motion, gradients, glass, fake dashboards, or novelty controls.

## Logging And Observability

- Useful structured events: availability series/exception command, appointment command, transition,
  collision, idempotency replay, projection result, denial, conflict, source cutover, and migration.
- Metrics: request/error/duration by route template; range length/result count; conflicts by safe
  class; recurrence projection failures; idempotency replays; stale-version count. No PII labels.
- Traces/spans: authorization, catalog/client resolution, availability projection, collision check,
  transaction, event append, and response projection correlated by request ID.
- Alerts: sustained 5xx/latency regression, unexpected database exclusion violations, recurrence
  errors, failed migration, or normal product route resolving a memory source.
- Sensitive data not logged: every value listed in REQ-040, including search and notes.

## Delivery And Rollback

- Compatibility strategy:
  1. Complete and validate required Initiative 21 catalog/client contracts.
  2. Add timezone/availability/scheduling schema and compatible API without enabling normal UI.
  3. Verify two-tenant behavior, migrations, concurrency, and bounded projections.
  4. Deploy HTTP adapters and enable setup availability, Agenda, and Dashboard together per target.
  5. Retain development fixtures only in explicit test/QA boundaries.
- Feature flag/rollout: a target-specific scheduling source may gate cutover, but `http` failures
  fail closed; `hml`/`prd` never select memory.
- Migration/backfill: schema is additive. Existing units remain scheduling-incomplete until timezone
  confirmation. Synthetic appointments/availability are not migrated.
- Rollback: disable normal scheduling routes or revert Studio to an explicit unavailable state, then
  roll back API if required; preserve additive data and never recover through fixtures.
- Operational readiness: migration health, catalog dependency matrix, two-tenant smoke, collision
  race, source scan, dashboards/alerts, browser screenshots, parity matrix, and continuation record.

## Success Measures

- Success signals:
  - An authorized user configures availability and completes a real appointment lifecycle across
    reloads without a conflicting booking.
  - Agenda, Dashboard, Client, and professional projections agree after every mutation.
  - A user can complete all critical flows at 320px, keyboard-only, and 200% zoom.
  - Review finds no unexplained divergence from the Client-baseline parity matrix.
- Baseline/measurement plan: establish range latency/error, conflict, idempotency replay, appointment
  volume, and UI journey failure baselines in staging; no capacity target is claimed without data.
- Regression guardrails: Initiative 21 catalogs/invitations, Client CRUD/preferences/notes, auth,
  tenant switching, shell, production-boundary, component inventory, themes, and coverage remain green.
- Evaluation window: implementation evidence plus staging/homologation monitoring and manual product
  QA before production promotion.

## Acceptance Criteria

- [x] AC-001: Two-tenant API tests prove no availability, appointment, occupancy, history, option,
  Dashboard, client, or professional projection can read/link/mutate a known foreign ID.
- [x] AC-002: Existing units require explicit valid timezone confirmation; invalid/ambiguous local
  times are rejected safely and no migration guesses a timezone.
- [x] AC-003: Owner/admin can create/edit/archive/restore series and one-off intervals, while member
  mutation is denied and effective availability remains readable for scheduling.
- [x] AC-004: Day/week/month projections correctly apply recurrence bounds, exclusions, overrides,
  occurrence-versus-series changes, unit hours, precedence, and the 42-date maximum.
- [x] AC-005: Appointment creation uses real client/unit/professional/service records, server-resolved
  snapshots, eligibility, hours, availability, blocks, and collision checks.
- [x] AC-006: A concurrent create/reschedule test commits at most one overlapping occupying booking;
  retries with the same idempotency key return the same outcome and stale versions never overwrite.
- [x] AC-007: Confirm, check-in, cancel, and no-show follow the accepted transition matrix; invalid
  transitions fail safely; canceled/no-show records remain historical and release occupancy as defined.
- [x] AC-008: Agenda day/week board and paginated list return the same logical appointments and private
  occupancy, with bounded server filters/sort and no N+1 catalog/client loads.
- [x] AC-009: Creating a client from the appointment flow reuses canonical validation, masks, and
  duplicate warnings, preserves the appointment draft, selects the new client, and creates no client
  on cancellation/failure.
- [x] AC-010: Client preferences are visible suggestions but never auto-select or bypass server
  validation; archived preferences remain historical and unavailable for new booking.
- [x] AC-011: Appointment mutation coherently updates Agenda, Dashboard, client next appointment/
  history, and professional schedule without duplicated source records; `lastVisitAt` stays unavailable.
- [x] AC-012: Normal routes use HTTP in local/dev/hml/prd, never fall back to fixtures, expose no
  scenario controls, and production artifacts exclude scheduling/availability scenario data.
- [x] AC-013: The completed UI parity matrix contains no unexplained difference from Clientes for
  shared page, filter, table, drawer, form, mask, feedback, empty, status, URL, and action contracts.
- [x] AC-014: Every field has a visible label and correct required/error relationships; placeholder
  review finds no label replacement, instruction-only placeholder, synthetic copy/default, or
  inconsistent example/search/select vocabulary.
- [x] AC-015: Computed layout and screenshots prove one inset/scroll owner, consistent control/action
  sizing, no clipped overlays, no idle scrollbar, and no page overflow at desktop/320px in light/dark.
- [x] AC-016: Pointer, touch, and keyboard create/reschedule/recurrence flows are equivalent; focus,
  announcements, target sizes, forced colors, reduced motion, 200% zoom, and axe WCAG 2.2 A/AA pass.
- [x] AC-017: Initial-empty, filtered-empty, missing setup, permission/plan denial, loading, source
  error/retry, validation, collision, stale version/link, saving, and success states use distinct,
  actionable Portuguese feedback and preserve recoverable work.
- [x] AC-018: Typed URLs retain only allowlisted non-PII state, strip defaults, restore date/view/
  filters/drawer intent, and never contain names, contacts, notes, search, or cancellation text.
- [x] AC-019: Logs/traces/metrics/audits/errors/idempotency pass sensitive-sentinel checks and expose
  safe correlation, command/result, range, conflict, and timing metadata.
- [x] AC-020: Empty and representative-existing database migrations, previous-version compatibility,
  additive rollback, and source-cutover rehearsals pass without migrating fixtures or deleting data.
- [x] AC-021: API/Studio unit, integration, component, browser, production-boundary, coverage, type,
  lint/format, and build gates pass, including regression suites for Initiative 21 and Clients.
- [x] AC-022: Every completed task has recorded evidence; an interruption/resume drill using only the
  approved documents and Continuation Checkpoint identifies the exact safe next action without
  rediscovering or contradicting a prior product decision.
- [x] AC-023: Durable API, Studio, Agenda, setup, Client, Dashboard, testing, deployment, and component
  documentation matches runtime behavior and records deferred queue/fulfillment transition ownership.

## Verification Plan

- Unit tests: timezone/date/time parsing, recurrence/exception projection, precedence, transitions,
  validation, snapshot resolution, cancellation, URL state, view derivation, form inventory, copy,
  preference suggestions, and error mapping.
- Integration/API tests: migrations/constraints, PostgreSQL exclusion/collision race, transactions,
  idempotency, two-tenant isolation, roles/entitlements, bounded ranges/pages, private occupancy,
  lifecycle history, cross-module projections, safe errors, and OpenAPI.
- UI tests: HTTP adapter parity, availability calendar, Agenda day/week/list, client quick-create,
  drawers/confirmations, transitions, conflict/stale recovery, query invalidation, states, URLs, and
  no fixture fallback.
- Manual/browser checks: owner/admin/member; desktop and 320px together; light/dark/system; keyboard,
  touch/pointer alternative, 200% zoom, forced colors, reduced motion, VoiceOver/NVDA when available;
  screenshot comparison against Clientes and catalog surfaces.
- Build/check commands:
  - `bun --filter api check`
  - `bun --filter api coverage:check`
  - `bun --filter api test:integration:postgres`
  - `bun --filter api build`
  - `bun --filter studio check`
  - `bun --filter studio test:e2e`
  - `bun --filter studio test:production-boundary`
  - `bun --filter studio build`

## Open Questions

### Blocking

- None. Implementation starts only after the Initiative 21 dependency gate in the plan passes.

### Non-Blocking

- [ ] Validate professional self-service/own-schedule permissions before exposing them — owner:
  product/access follow-up.
- [ ] Measure whether polling, server events, or WebSockets are justified after staging concurrency
  usage — owner: platform/operations review.
- [ ] Decide retention/partitioning only after real appointment growth and legal requirements are
  known — owner: product/security/data review.

## Assumptions

- The completed Initiative 21 contracts, not its initial PRD wording, are authoritative dependencies;
  TASK-001 records any compatible adaptation and escalates material conflict.
- Unit timezone is explicit per unit because multi-unit businesses may cross timezone boundaries;
  the browser timezone may be suggested but never silently persisted.
- Fifteen-minute start increments match the accepted Agenda interaction, while exact service duration
  determines the end and need not be rounded by the client.
- Member scheduling access supports the reception use case; narrower professional visibility awaits
  an accepted policy.
- Existing Agenda/availability presentation is retained where it passes the parity/quality contract;
  this is production hardening and integration, not a visual redesign.

## Definition of Ready

- [x] All mandatory gates in `planning-gates.md` pass.
- [x] Requirement-to-acceptance-to-task traceability is complete.
- [x] The planning state is `Ready` before requesting approval.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-04 | Awaiting approval |  | Initial production availability/scheduling proposal with explicit consistency and continuation gates |
| 2026-09-05 | Approved | User | Approved after clarifying the employee/professional-related scope of the initiative |


Completion evidence: [local QA report](../evidence/22-production-availability-and-scheduling/product-qa.md) and [acceptance matrix](../evidence/22-production-availability-and-scheduling/acceptance-matrix.md). No deployment or publication is implied.
