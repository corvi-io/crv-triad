# 03 TRIAD Studio Schedule Visual Prototype

## Summary

Create the first business-facing TRIAD Studio experience as a frontend-only,
interactive visual prototype of the barbershop daily schedule. The initiative
validates navigation, layout, appointment creation and management, visual
states, dense scrolling, feedback, accessibility, and responsive behavior with
deterministic synthetic scenarios backed by the existing removable in-memory
engine.

The prototype uses the real IDP login/session boundary but introduces no
business API, database table, migration, durable browser persistence, or barber
application. Scheduling presentation consumes a module-owned asynchronous
repository port so the memory adapter can later be replaced by an HTTP adapter
without rewriting screens or components.

## Context

- Current state:
  - Initiative 01 established `apps/studio` as the authenticated desktop product
    for barbershop management.
  - Initiative 02 established the responsibility-based component system,
    textual inventory, TanStack Query boundary, and deterministic memory/scenario
    engine.
  - The existing engine supports isolated CRUD, deterministic IDs, reset,
    bounded latency, intentional failures, search, filter, sort, pagination,
    empty/dense/larger scenarios, and production-boundary checks.
  - The Studio deployment and real IDP authentication work in `dev`.
- Problem:
  - Product and UX need to validate the first operational workflow before an
    API contract or persistence model is accepted.
  - The UX source describes the complete MLP, but implementing onboarding,
    queueing, fulfillment, payment, commissions, daily closing, reports, and
    barber experiences together would prevent focused validation.
  - A schedule is interaction-dense and can easily create bespoke primitives,
    inconsistent status semantics, and mock shapes that accidentally become a
    speculative backend contract.
- Why now:
  - Studio foundations are complete and the daily schedule is the product
    surface that connects customers, professionals, services, availability,
    time, status, duration, and price.
  - Validating the schedule first will provide evidence for later setup,
    fulfillment, revenue, barber-app, and backend initiatives.
- Related docs/issues:
  - `docs/initiatives/prds/01-triad-studio-frontend-foundation.md`
  - `docs/initiatives/prds/02-triad-studio-component-system-and-mock-runtime.md`
  - `docs/studio/component-system.md`
  - `apps/studio/AGENTS.md`
  - Linear initiative: [TRIAD Studio Schedule Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-schedule-visual-prototype-b4722b97cc20).
  - Linear issue: [ENG-34](https://linear.app/corvi-io/issue/ENG-34/build-the-triad-studio-schedule-visual-prototype).
  - Product source: connected Maestri note `triad-studio-o-triad-stud`.

## Goals

- Make `/agenda` the first real Studio business route and the primary visual
  workspace for this prototype.
- Validate a daily schedule with professionals in columns, time in rows,
  appointment blocks, available slots, breaks, blocks, and walk-in markers.
- Validate appointment creation, viewing, editing, cancellation, and
  rescheduling without leaving the schedule.
- Validate a quick customer entry path using synthetic name and phone data.
- Validate automatic presentation of service duration, default price, and
  eligible professionals inside the appointment drawer.
- Represent scheduled, confirmed, arrived, waiting, in-progress, completed,
  canceled, and no-show states clearly without depending on color alone.
- Exercise loading, success, empty, slow, error, conflict, dense, long-content,
  vertical-scroll, and horizontal-scroll states.
- Reuse the existing Studio component system and prefer shadcn/ui or reviewed
  shadcn-compatible registry components before creating new primitives.
- Keep scheduling contracts UI-facing and keep the memory implementation
  removable at the repository composition boundary.
- Provide an explicit `dev`-only remote prototype mode while keeping memory
  adapters and synthetic product data unavailable in `hml` and `prd` builds.

## Non-Goals

- Business API routes, OpenAPI contracts, HTTP adapters, database tables,
  migrations, or server-side authorization.
- Durable local storage, IndexedDB persistence, cross-tab synchronization,
  multi-user synchronization, offline support, or capacity claims.
- Barbershop onboarding, full professional/service/customer management, or
  permissions administration.
- Queue management, service fulfillment, command tabs, payment, commissions,
  cash flow, daily closing, dashboard metrics, reports, or notifications.
- The barber-facing or customer-facing applications.
- Week view, drag-and-drop, resize-to-change-duration, recurrence, public
  booking, or real messaging integrations.
- A generic calendar framework, universal CRUD renderer, new global store, or
  cross-app UI package.
- Treating mock types or scenarios as the future API or persistence contract.

## Brainstorm

### Problem Framing

- We are validating whether a receptionist or manager can understand and
  operate the barbershop schedule visually before the product commits to a
  backend shape.
- The affected users are owners, managers, and reception staff using a desktop
  workspace during a busy operating day.
- The improved workflow is: inspect the day, find a slot, create an appointment,
  understand conflicts, inspect or change the appointment, and recover from
  slow or failed operations without losing context.
- The artifact is an interactive product prototype, not a static mockup and not
  an operational scheduling system.

### Gaps And Unknowns

- Product gaps:
  - Final time-grid granularity and visible operating-hour defaults need visual
    validation; the implementation may begin with 15-minute increments.
  - The eight proposed appointment states need final Portuguese labels and a
    reviewed action/transition vocabulary before backend work.
  - Whether walk-ins appear only as schedule markers or need an initial action
    in this initiative must remain bounded; queue behavior belongs later.
- Technical gaps:
  - The existing engine owns one generic collection at a time. Scheduling must
    compose module-owned view models and reference catalogs without moving
    product vocabulary into the engine.
  - The existing sandbox is development-server-only. Remote UX validation needs
    an explicit build-time `dev` composition that still fails closed elsewhere.
  - The schedule grid may need a domain composition not available as one
    official shadcn primitive; discovery must occur before custom construction.
- Data/model gaps:
  - Mock records describe presentation needs only and must not predict database
    normalization, API endpoints, IDs, authorization, or concurrency semantics.
  - One appointment may eventually contain multiple services and professionals,
    but that fulfillment behavior is outside this schedule-focused initiative.
- Operational gaps:
  - `dev` needs a public, non-secret data-source control declared in
    `env-schema.yaml`; `hml` and `prd` must not silently enable memory data.
  - Reviewers need reproducible scenario URLs or controls without exposing the
    generic sandbox as a production capability.

### Counterpoints

- Building onboarding first follows the full MLP chronology, but a preconfigured
  deterministic scenario lets UX validate the highest-density surface sooner.
- Building the entire operational cycle would appear more complete, but it
  would mix schedule, queue, fulfillment, payment, and commission decisions and
  make feedback difficult to attribute.
- A static Figma-only review is faster for appearance, but it cannot validate
  keyboard behavior, focus, scrolling, loading, errors, conflicts, drawers,
  toasts, or realistic density.
- Shipping a local-only prototype preserves the strongest production boundary,
  but blocks convenient review by remote UX and product stakeholders.
- Installing a community registry item can accelerate implementation, but source
  availability is not sufficient evidence of compatibility, maintenance,
  licensing, performance, accessibility, or security.
- Creating a custom schedule grid immediately provides control, but should happen
  only after existing Studio components, official shadcn components, and
  reviewed registry candidates have been evaluated.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Validate static schedule screens only | Lowest implementation effort | Cannot validate the actual journey, density, feedback, focus, or failures | Only for early visual direction before interactive work |
| B | Build an interactive Studio schedule against a removable module-owned memory repository | Validates the real frontend experience and preserves the future adapter boundary | Requires scenario design and a controlled dev-only deployment mode | Recommended for the accepted frontend-first phase |
| C | Build the scheduling backend and UI together | Produces durable records immediately | Freezes contracts before UX validation and expands scope materially | Choose only after the visual journey is accepted |

### Recommendation

Choose Option B. Build the daily schedule as a real Studio module with a small
UI-facing repository port, deterministic scenarios, and a memory adapter
composed only for local development, tests, and the explicit `dev` prototype.
Use the schedule to validate interaction and component decisions; use the
validated UI-facing needs as input, not as a direct schema, for a later backend
initiative.

## Component Source Policy

Use this order for every required component or primitive:

1. Reuse an existing Studio component when its documented contract fits.
2. Inspect and add an official shadcn/ui component through the CLI.
3. Evaluate a shadcn-compatible community registry item when the official
   catalog does not meet the need.
4. Create a custom component only when no suitable candidate exists and record
   the discovery evidence and rationale in the PR.

Before installing a registry item, inspect it with the shadcn CLI (`--dry-run`,
`--view`, or `--diff` as appropriate) and review source, dependencies, license,
maintenance signals, Base UI/Vite compatibility, bundle impact, keyboard and
focus behavior, responsive behavior, and token integration. Installation is
copying source into the repository, not delegating ownership: accepted code must
follow Triad conventions, tests, accessibility requirements, and the textual
component inventory.

Do not create or publish a separate Triad registry in this initiative. Do not
duplicate a suitable shadcn/Base UI primitive behind a differently named local
implementation.

Primary references:

- [shadcn CLI](https://ui.shadcn.com/docs/cli)
- [shadcn Registry Directory](https://ui.shadcn.com/docs/directory)
- [shadcn Registry documentation](https://ui.shadcn.com/docs/registry)

## Functional Prototype Scope

### Route And Shell

- Add the authenticated `/agenda` route and register it as the primary active
  business navigation item.
- Keep unavailable MLP modules out of active navigation.
- Compose the page with the existing Studio shell, `ModuleLayout`, `PageHeader`,
  and shared feedback foundations where their contracts fit.

### Schedule Controls

- Show the selected date, `Hoje`, previous/next navigation, and daily view.
- Filter the visible schedule by professional and appointment status.
- Keep shareable date/filter state in URL search parameters when useful for UX
  review and reproducible scenarios.
- Do not expose inactive week-view or drag-and-drop controls.

### Daily Grid

- Show professionals as columns and time as rows.
- Show appointment blocks, available slots, breaks, blocked periods, and visual
  walk-in markers.
- Support bounded vertical and horizontal scrolling with stable headers where
  useful.
- Handle long professional, customer, and service names without obscuring time
  or status.
- Preserve a usable narrow-viewport alternative instead of shrinking the desktop
  grid until it becomes unreadable.

### Appointment Drawer

- Open from `Novo agendamento` or an available slot without navigating away.
- Include customer, phone, professional, service, date, time, duration, price,
  notes, and origin fields.
- Allow simplified synthetic customer entry with name and phone.
- Populate duration, default price, and eligible professionals from the selected
  synthetic service catalog.
- Validate required fields and present conflict, unavailable-professional,
  closed-hours, and insufficient-space feedback.
- Support explicit create, view, edit, reschedule, and cancel modes with focus
  management and stable action labels.

### Feedback And Scenarios

- Use Sonner toasts for user-triggered success and failure feedback.
- Prevent duplicate submissions and use stable button labels with loading state.
- Provide deterministic normal, empty, all-statuses, dense, many-professionals,
  long-content, blocked, walk-in-marker, conflict, slow, next-failure, and
  persistent-error scenarios.
- Reset restores the selected scenario; refresh may restore initial scenario
  data.

## Architecture And Boundaries

- Site impact: none.
- API impact: none. No API source, route, schema, client, or persistence work.
- IDP impact: none. Studio continues to use the real IDP for login/session and
  the prototype never intercepts Better Auth.
- Studio impact:
  - `src/modules/scheduling/**` owns UI-facing appointment vocabulary, page and
    drawer composition, repository port, query keys, hooks, and validation.
  - `src/dev/scheduling/**` may own synthetic catalogs, deterministic scenarios,
    and the memory adapter implementing the scheduling port.
  - `src/dev/mock-engine/**` remains domain-free and should change only when a
    generic capability is proven necessary.
  - Presentation imports the scheduling port/hooks, never the memory engine or
    memory adapter.
  - Adapter selection happens at a narrow composition boundary that can later
    select an HTTP implementation.
- Data/persistence impact: session-memory synthetic records only. No real PII and
  no guarantee across refreshes, tabs, users, or devices.
- External provider impact: Cloudflare `dev` prototype deployment and GitHub
  Environment metadata may gain an explicit browser-visible data-source input.
  It contains no secret. `hml` and `prd` must fail closed with memory disabled.

## Performance And Scalability

- Expected data growth: bounded synthetic day scenarios designed for visual
  stress, not production capacity evidence.
- Critical paths: schedule layout, date/filter changes, drawer open/close,
  scenario reset, mutations, query invalidation, and scroll stability.
- Query bounds/pagination: the prototype queries one unit and one bounded day;
  the future API must preserve explicit time ranges and professional/status
  filters rather than returning unbounded history.
- Concurrency risks: stale delayed results after rapid date/filter/scenario
  changes and duplicate create/update commands. Tests must prove newer state wins
  and repeated submissions are blocked.
- External limits: no business provider or API is called.
- What happens with millions of records/items: the memory prototype does not
  support or claim this scale. A future API needs indexed bounded time-range
  queries; browser virtualization is deferred until measured schedule density
  demonstrates a need.
- Bundle impact: community registry items and custom scheduling compositions
  must be reviewed for dependency weight. Memory scenarios must remain absent
  from `hml`/`prd` production artifacts.

## Security, Privacy, And Abuse

- Auth/session impact: real authenticated Studio routes remain guarded by the
  existing IDP session flow.
- Roles/access: the prototype represents a manager/reception experience only and
  is not an authorization implementation.
- PII/secrets: use synthetic names, phones, services, and notes. Do not use real
  customers, professionals, credentials, cookies, tokens, or private headers.
- Production boundary: the memory adapter and product scenarios are enabled only
  by an explicit local/test/`dev` composition and fail closed in `hml`/`prd`.
- Spam/abuse vectors: no public or server-side write endpoint exists.
- Rate limiting or throttling: not applicable; simulated latency and failures are
  UX tools, not load controls.
- Registry supply chain: review third-party source and dependencies before
  accepting it; do not run arbitrary post-install scripts or trust registry
  popularity as a security decision.

## Accessibility And UX

- Keyboard flow: date controls, filters, slots, appointment blocks, menus,
  drawer fields, and actions are reachable in a logical order; closing a drawer
  returns focus to the originating slot or appointment.
- Screen reader states: expose date context, professional context, appointment
  time/status, loading, empty, conflict, failure, successful mutation, and drawer
  mode with appropriate landmarks, names, descriptions, and live feedback.
- Schedule semantics: choose semantic table/grid/list behavior based on tested
  interaction needs; do not add ARIA grid complexity without implementing its
  keyboard contract.
- Status communication: text and shape/border cues carry meaning independently
  of color.
- Responsive behavior: desktop is primary, but the route remains usable at 200%
  zoom and narrow viewports through a deliberate list/stacked alternative or
  bounded scroll, not a compressed unreadable grid.
- Loading/error/empty states: include stable skeletons or status surfaces,
  retry where meaningful, and scenario-specific recovery.
- Duplicate submission prevention: mutation actions remain disabled/busy until
  completion and do not change to gerund labels.
- Manual WCAG 2.2 AA review covers keyboard-only use, focus visibility/return,
  VoiceOver basics, 200% zoom, 320 CSS-pixel reflow, target size, reduced motion,
  and light/dark contrast.

## Logging And Observability

- Useful development events: selected scenario, reset, simulated operation,
  intentional failure, and unhandled mock operation. Keep events metadata-only.
- Metrics: CI test/build/production-boundary outcomes and deployment smoke checks
  are sufficient; no product analytics is added.
- Traces/spans: none.
- Alerts: CI and deployment failure signals only.
- Sensitive data that must not be logged: synthetic or future customer names,
  phones, notes, appointment payloads, credentials, tokens, cookies, sessions,
  and private request headers.

## Acceptance Criteria

- [ ] `/agenda` is an authenticated Studio route and the only newly active
      business module in primary navigation.
- [ ] The daily schedule renders professionals, time rows, appointments,
      availability, breaks, blocks, and walk-in markers with bounded horizontal
      and vertical scrolling.
- [ ] Date, professional, and status controls update the view predictably and
      expose shareable URL state where useful.
- [ ] Users can create, view, edit, cancel, and reschedule a synthetic
      appointment through accessible drawers without leaving the schedule.
- [ ] Service selection populates duration, price, and eligible professionals;
      quick synthetic customer entry accepts name and phone.
- [ ] Conflict, unavailable-professional, closed-hours, and insufficient-space
      feedback is visible, understandable, and recoverable.
- [ ] Scheduled, confirmed, arrived, waiting, in-progress, completed, canceled,
      and no-show states are distinguishable without color-only meaning.
- [ ] Normal, empty, all-statuses, dense, many-professionals, long-content,
      blocked, walk-in-marker, conflict, slow, next-failure, and persistent-error
      scenarios are deterministic and resettable.
- [ ] Scheduling presentation consumes a module-owned asynchronous repository
      port through TanStack Query and never imports the memory engine/adapter.
- [ ] The memory adapter can be replaced at one composition boundary without
      changing schedule page, grid, drawer, or form components.
- [ ] The existing memory engine remains domain-free and Better Auth is never
      intercepted.
- [ ] Every component need follows the accepted source order: existing Studio,
      official shadcn, reviewed community registry, then justified custom code.
- [ ] Accepted registry source is inspected and adapted to Triad tokens,
      accessibility, structure, tests, and textual inventory requirements.
- [ ] A controlled browser-visible configuration enables the prototype only for
      local/test/`dev`; `hml` and `prd` builds exclude or fail closed on memory
      scheduling data.
- [ ] No API route/client, persistence, real PII, barber UI, onboarding, queue
      workflow, payment, commission, dashboard, report, week view, recurrence,
      or drag-and-drop behavior is introduced.
- [ ] Focused unit/component, scenario/repository, route, accessibility, remote
      preview, and production-boundary tests pass.
- [ ] Manual keyboard, focus, VoiceOver, zoom, narrow viewport, reduced-motion,
      target-size, and light/dark checks are recorded with residual risks.

## Verification Plan

- Unit tests:
  - scheduling view models, status presentation, form schema/defaults, date/time
    helpers, query keys, repository contract, conflict fixtures, and scenario
    determinism;
  - memory adapter CRUD/filter/date behavior, delayed-result isolation, reset,
    and intentional failures;
  - component-source/inventory decisions when shared components change.
- Integration/API tests:
  - no API or database test is required;
  - prove Better Auth remains outside mock composition and repository consumers
    depend only on the scheduling port.
- UI tests:
  - focused Vitest component tests for controls, grid/list presentation, blocks,
    state communication, drawers, validation, and feedback;
  - Playwright for create/view/edit/cancel/reschedule, filters, conflict recovery,
    slow/failure/reset scenarios, keyboard focus return, dense scroll, and axe.
- Manual/browser checks:
  - real IDP login into the `dev` prototype;
  - daily operation at desktop size, 200% zoom, 320 CSS pixels, long content,
    many professionals, light/dark, reduced motion, keyboard-only, and basic
    VoiceOver;
  - verify no memory schedule surface is enabled in `hml` or `prd` builds.
- Build/check commands:
  - `bun --filter studio routes:generate`
  - `bun --filter studio format`
  - `bun --filter studio lint`
  - `bun --filter studio typecheck`
  - `bun --filter studio test`
  - `bun --filter studio test:e2e`
  - `bun --filter studio test:production-boundary`
  - `bun --filter studio build`
  - `bun --filter studio check`
  - relevant CI configuration and environment-schema tests.

## Open Questions

- [ ] Validate 15-minute grid increments against the first UX composition; keep
      the implementation configurable until accepted.
- [ ] Choose the narrow-viewport representation after comparing a bounded
      horizontal grid with a professional-grouped list.
- [ ] Confirm whether walk-ins are visual markers only in Initiative 03; queue
      creation and lifecycle remain planned for Initiative 05.
- [ ] Confirm the final Portuguese labels and visual hierarchy for all eight
      appointment states before treating them as future backend vocabulary.
