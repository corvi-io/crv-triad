# 12 TRIAD Studio Front Desk Queue And Check-In Visual Prototype

## Summary

Create the next frontend-first TRIAD Studio operational slice: an authenticated
`/service-desk` evaluation surface labeled `Atendimentos` where reception staff
can see checked-in customers, add walk-ins, call the next customer, and start an
appointment.

The initiative validates two connected journeys:

1. scheduled customer: Agenda status change to arrival, queue visibility, call,
   and start;
2. walk-in customer: add to queue, choose a specific professional or the first
   available professional, call, and start.

The delivery stops at `Em atendimento`. Service-item fulfillment, command tabs,
price changes, discounts, payment, commission, cash closing, business APIs,
persistence, and production authorization remain separate initiatives.

The route is a governed local/configured-`dev` product-evaluation module. It uses
deterministic synthetic session-memory data, composes the existing scheduling
repository for scheduled appointments, and fails closed in `hml` and `prd`.

## Context

### Current State

- The Maestri note `triad-studio-o-triad-stud` is the UX/product
  source for the first MLP. Its accepted operational cycle is:
  `configure -> schedule -> organize service -> fulfill -> pay -> calculate
  commission -> close the day`.
- The same source defines:
  - queue and walk-in behavior at lines 164-194;
  - service-start behavior at lines 305-329;
  - initial navigation and access expectations at lines 472-523;
  - the two primary journeys at lines 527-537;
  - construction priority at lines 566-600.
- The Maestri note `triad-studio-acompanhament` tracks the visual MLP
  with emoji statuses and identifies queue/check-in as the next planned
  delivery.
- ENG-34, ENG-40, and ENG-43 established the Agenda, appointment drawer,
  deterministic scheduling source, accepted status vocabulary, drag and
  non-drag rescheduling, and visual hierarchy.
- ENG-41 established deterministic units, professionals, services, and
  availability for the setup evaluation module.
- ENG-44 established the client-directory evaluation module, shared compact
  list controls, explicit form validation/focus behavior, and the no-implicit-
  bottom-spacing `ModuleLayout` contract.
- ENG-45 established the operational Dashboard, shared scheduling-repository
  identity across Agenda and Dashboard, time-bounded current-state claims,
  truthful drill-down filters, and broad browser accessibility evidence.
- The current scheduling contract already represents `arrived`, `waiting`, and
  `in-progress` appointments, but it does not represent a reception queue,
  `called` state, first-available preference, or unallocated walk-ins.

### Problem

- The prototype can schedule a customer and change an appointment status, but
  cannot demonstrate what reception does after the customer arrives.
- Walk-ins are only visual schedule markers. A receptionist cannot add a real
  synthetic queue entry, record professional preference, call the customer, or
  start service.
- Building queue, service fulfillment, command tabs, payment, commission, and
  daily closing together would create one oversized task with multiple
  unresolved models and visually unrelated workflows.
- Earlier Studio deliveries exposed recurring implementation mistakes:
  - validation bounds leaked default English/technical Zod messages;
  - current-state labels were inferred without checking whether the relevant
    appointment interval contained the source time;
  - a Dashboard drill-down opened a broader Agenda result than the tile count;
  - product-list controls and layout spacing were duplicated before being
    standardized;
  - visual quality depended on late review rather than explicit component,
    token, responsive, and browser evidence in the task.

### Why Now

- Queue/check-in is the missing link between the accepted Agenda and future
  service fulfillment.
- It completes a bounded, demonstrable reception journey without requiring
  financial semantics.
- The current component system, scheduling source, client/setup prototypes, and
  test conventions now provide enough evidence to specify the delivery
  precisely before another agent implements it.

### Related Sources

- Linear initiative:
  [TRIAD Studio Front Desk Queue and Check-In Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-front-desk-queue-and-check-in-visual-prototype-41dad3f57b38).
- Linear issue:
  [ENG-46: Build the TRIAD Studio front-desk queue and check-in visual prototype](https://linear.app/corvi-io/issue/ENG-46/build-the-triad-studio-front-desk-queue-and-check-in-visual-prototype).
- Maestri UX note: `triad-studio-o-triad-stud`.
- Maestri progress note: `triad-studio-acompanhament`.
- ENG-46 implementation note: neither named Maestri note was connected to the
  isolated implementation floor. The accepted decisions transcribed in this
  PRD and the Linear issue were used as the source of truth; the notes
  themselves could not be re-read during delivery.
- `docs/initiatives/prds/03-triad-studio-schedule-visual-prototype.md`
- `docs/initiatives/prds/06-triad-studio-agenda-kanban-visual-prototype.md`
- `docs/initiatives/prds/10-triad-studio-client-management-visual-prototype.md`
- `docs/initiatives/prds/11-triad-studio-operational-dashboard-visual-prototype.md`
- `docs/studio/schedule-prototype.md`
- `docs/studio/client-management.md`
- `docs/studio/component-system.md`
- `docs/studio/testing.md`
- `docs/studio/theme-system.md`
- GitHub PR #25: ENG-44 client-management prototype.
- GitHub PR #26: ENG-45 operational Dashboard.

## Goals

- Add `Atendimentos` to primary Studio navigation between `Agenda` and
  `Clientes`.
- Add the authenticated `/service-desk` route under the existing
  `_authenticated`, `AuthGate`, and `WorkspaceShell` boundary.
- Present a clear operational board with `Aguardando`, `Chamados`, and
  `Em atendimento` stages.
- Project scheduled arrivals from the existing scheduling source without
  duplicating appointment, professional, service, unit, status, or price
  fixtures.
- Let reception add a synthetic walk-in with client snapshot, service,
  professional preference, arrival, priority, and notes.
- Support both `professional-specific` and `first-available` preference paths.
- Support explicit, validated `Chamar cliente` and `Iniciar atendimento`
  actions without requiring drag.
- Keep scheduled transitions coherent with Agenda and Dashboard during the
  browser session.
- Provide deterministic, resettable scenarios for normal, empty, dense,
  long-wait, specific-professional, first-available, unavailable-professional,
  slow, next-failure, and persistent-error behavior.
- Make visual hierarchy, component usage, copy, loading, error, empty, focus,
  responsive, forced-colors, and reduced-motion expectations executable through
  tests and recorded browser evidence.

## Non-Goals

- Service fulfillment after `Em atendimento`, including adding service items,
  changing item performers, editing price, applying discounts, or declaring
  service completion.
- Command tabs, payment methods, payment registration or processing, receipts,
  tips, refunds, settlement, commissions, cash flow, or daily closing.
- Backend routes, OpenAPI contracts, database tables, migrations, durable
  persistence, browser storage, fake HTTP, polling, WebSockets, or realtime.
- Production tenancy, unit authorization, role enforcement, audit history, or
  identity-administration behavior.
- Creating or synchronizing a durable Client record when a walk-in is added.
- Treating a walk-in contact snapshot as a canonical client profile.
- A full professional-assignment optimizer or estimated-wait algorithm.
- Automatic customer messaging, WhatsApp, SMS, email, push notifications, or
  marketing.
- Drag-and-drop queue transitions. Explicit actions are the accepted first
  interaction.
- Modifying Agenda layout, drag behavior, appointment drawer fields, status
  styling, conflict rules, or URL semantics.
- Rebuilding the Dashboard or expanding its financial projections.
- A new design system, new global palette, raw feature colors, or a parallel
  component library.

## Brainstorm

### Problem Framing

- The user is a receptionist or manager coordinating arrivals during a busy
  day.
- The question being answered is not “how do we finish a sale?” It is “who has
  arrived, who is waiting, who was called, and who has started service?”
- The improved workflow is:
  1. recognize a scheduled arrival or add a walk-in;
  2. preserve the customer's service and professional preference;
  3. understand queue stage and wait context;
  4. call the customer;
  5. start the service;
  6. hand the in-progress record to the next initiative.
- This is an interactive evaluation prototype, not a production queue or
  workforce-allocation engine.

### Gaps And Unknowns

#### Product Gaps

- The UX source allows the queue beside Agenda or on a separate surface. The
  accepted counterproposal is a separate `Atendimentos` route because Agenda is
  already dense and its accepted time-by-professional hierarchy must remain
  stable.
- The final policy for queue ordering is not defined. The prototype uses
  arrival order with an explicit `Encaixe` priority signal; it does not claim a
  production fairness rule.
- “First available” does not yet have a production assignment algorithm. The
  prototype records the preference and requires an explicit human action before
  service starts.
- The source does not define whether `Chamado` expires or returns to waiting.
  No automatic timeout is added. A reversible explicit return action may be
  included only if the accepted visual journey needs it.
- The queue task ends at service start. The next initiative must define
  service items and the `Pronto para pagamento` boundary.

#### Technical Gaps

- Scheduling and Clients use separate synthetic sources and do not share a
  canonical client aggregate. The queue must not pretend that a walk-in contact
  snapshot creates or updates a Client record.
- Existing appointment statuses do not include `called`. The service-desk
  evaluation state may own `called` without adding a ninth Agenda status.
- Scheduled queue actions must update the same module-scoped scheduling
  repository consumed by Agenda and Dashboard.
- The current checkout may not contain the latest merged ENG-44/ENG-45 work.
  Implementation must start from the latest `origin/staging` in an isolated
  checkout or floor.

#### Data And Model Gaps

- A service-desk queue entry needs:
  - source: scheduled appointment or walk-in;
  - contact snapshot;
  - service;
  - optional scheduled appointment ID;
  - specific-professional or first-available preference;
  - arrival/source time;
  - normal or fit-in priority;
  - queue stage;
  - optional notes;
  - safe deterministic IDs.
- Walk-in entries do not become scheduling appointments or Client records in
  this initiative.
- Scheduled entries are projections over appointments plus a small queue-state
  overlay for the `called` stage. They do not duplicate the appointment.
- Wait duration and current-stage claims must be derived from one injected
  source clock. `Date.now()` scattered through presentation is not accepted.

#### Operational Gaps

- The ordinary product route must not expose scenario, fixture, reset, latency,
  or failure terminology.
- Development evaluation still needs deterministic scenario selection and
  reset through the established QA path or technical URL contract.
- The source must fail closed in `hml` and `prd`; no new production capability
  is implied.

### Counterpoints

- Adding the queue directly to Agenda would reduce navigation, but would
  overload the accepted schedule grid, complicate narrow layouts, and risk
  regressions in an interaction-heavy surface.
- Building queue and service fulfillment together would demonstrate more of the
  MLP, but would combine arrival ordering, itemized service work, price changes,
  permissions, discounts, and payment handoff in one review.
- Reusing appointment status `waiting` for every queue state would avoid a new
  type, but cannot represent `Chamado` truthfully and would make Agenda
  vocabulary carry reception-only meaning.
- Creating a second full copy of clients, professionals, services, and
  appointments would be fast, but would repeat the Dashboard mistake explicitly
  rejected by ENG-45. The adapter must project existing scheduling data.
- Dragging cards between queue columns would be visually direct, but explicit
  buttons are clearer, easier to test, and satisfy keyboard/touch behavior
  without creating a drag-only path. Drag can be reconsidered only after the
  basic workflow is validated.
- A production API would resolve identity and concurrency questions, but would
  freeze contracts before the visual journey is accepted.

### Options

| Option | Description | Pros | Cons | Decision |
| --- | --- | --- | --- | --- |
| A | Add queue controls inside Agenda | Minimal navigation | Overloads the accepted grid and increases regression risk | Reject |
| B | Build queue, fulfillment, payment, and commission together | Shows a longer journey | Too large, unresolved finance and permission semantics | Reject |
| C | Build a separate queue/check-in surface that stops at service start | Independently reviewable, advances the MLP, reuses scheduling state | Requires a narrow queue overlay and future fulfillment task | Accept |
| D | Build production API and UI together | Durable data and concurrency model | Premature, much larger scope | Future initiative |

### Recommendation

Choose Option C. Add a separate authenticated `Atendimentos` route with an
explicit three-stage operational board and a focused walk-in drawer. Compose
scheduled records from the existing scheduling repository, keep walk-in state
inside a service-desk memory adapter, and update scheduled appointment status
through the existing repository so Agenda and Dashboard remain coherent.

End the delivery at `Em atendimento`. Create service fulfillment as the next
initiative, starting from an in-progress queue record and ending at
`Pronto para pagamento`.

## Product And Interaction Contract

### Route And Navigation

- Add `/service-desk` as an authenticated leaf route.
- Add `Atendimentos` to primary navigation after `Agenda` and before
  `Clientes`.
- Add its route metadata, breadcrumbs, command/search keywords, expanded,
  collapsed, and mobile navigation behavior through the single module registry.
- Do not create an alternative preview-only product page. Local QA may use the
  established governed evaluation mechanism.

### Page Hierarchy

1. `PageHeader`:
   - title: `Atendimentos`;
   - concise operational description;
   - primary action: `Adicionar à fila`.
2. Compact control row:
   - shared `ListSearchField`;
   - unit filter when more than one accepted unit exists;
   - professional-preference filter;
   - queue-stage filter;
   - priority filter.
3. Operational summary:
   - bounded textual counts for waiting, called, and in-service entries;
   - oldest wait only when supported by the source clock.
4. Three-stage board:
   - `Aguardando`;
   - `Chamados`;
   - `Em atendimento`.

The page follows existing Studio density and hierarchy. It does not copy a new
palette, hard-coded pixel system, or arbitrary dashboard treatment.

### Queue Card Contract

Each entry shows only supported information:

- synthetic customer name and avatar/fallback;
- source label: `Agendado` or `Sem agendamento`;
- service;
- arrival time;
- factual wait duration where applicable;
- professional preference;
- `Encaixe` or normal priority;
- current stage as text plus icon/symbol and a bounded semantic badge;
- one clear next action.

Cards remain neutral. Status color is supplementary and never fills the entire
card or carries meaning alone.

### Scheduled Journey

1. An appointment transitioned to `arrived` or `waiting` through Agenda appears
   in `Aguardando`.
2. `Chamar cliente` records the reception-only `called` state.
3. `Iniciar atendimento` updates the queue stage and transitions the existing
   appointment to `in-progress`.
4. Returning to Agenda and Dashboard reads the same scheduling repository and
   reflects the transition.
5. No duplicate appointment or queue fixture is created.

### Walk-In Journey

`Adicionar à fila` opens the shared `ActionDrawer` and collects:

- customer name: required;
- phone: optional, using the shared Brazilian phone mask;
- service: required, from the existing scheduling catalog;
- preference kind: required, `Profissional específico` or
  `Primeiro disponível`;
- professional: required only for specific preference and limited to eligible
  professionals for the selected service;
- arrival time: defaults from the injected source clock;
- priority: `Normal` or `Encaixe`;
- notes: optional, bounded, with explicit guidance not to enter credentials,
  payment-card data, documents, health data, or other sensitive information.

The drawer creates a temporary queue contact snapshot only. It does not create
or update a Client record and does not reserve an Agenda slot.

### Transition Rules

- Only `Aguardando` can become `Chamado`.
- Only `Chamado` can become `Em atendimento`.
- Repeated submissions are ignored while the mutation is pending.
- Invalid, stale, unavailable-professional, and intentional-failure transitions
  leave the prior state intact and offer a recovery path.
- “First available” remains unassigned until a human selects an eligible
  professional when starting the service.
- A specific professional must remain active, eligible for the service, and
  not marked unavailable by the source at the transition boundary.
- No automated assignment, timeout, or reorder occurs.

### Search, Filters, And URL State

- Use the shared `ListSearchField` for product-list search.
- Use `SingleSelectListFilter` or `MultiSelectListFilter` for queue list
  filters; raw `Select` remains a form data-entry control.
- Safe URL state may include unit, stage, priority, stable professional ID, and
  technical scenario ID.
- Customer names, phones, notes, and free-text search never enter the URL.
- Invalid URL values resolve to bounded defaults and are canonicalized.
- Any navigation or drill-down filter must render exactly the subset described
  by the visible count or action.

### Loading, Empty, Error, And Reset

- Loading uses shared `Skeleton` anatomy without layout collapse.
- Empty uses the shared `Empty` composition with distinct copy for an empty
  queue and a filter-empty queue.
- Recoverable failure uses `Alert` plus `Tentar novamente`.
- Persistent failure remains stable and does not show false empty data.
- Mutations use the shared `Button` `isLoading` contract with stable labels.
- Full reload reconstructs deterministic source data and removes session
  mutations.
- Scenario/reset tooling stays outside ordinary product chrome.

## Component, Visual, And Copy Standards

The implementing agent must apply these rules before writing new UI:

1. Read `apps/studio/AGENTS.md`, `triad-studio-development`,
   `accessibility`, `shadcn`, `tailwind-design-system`,
   `vercel-composition-patterns`, `vercel-react-best-practices`,
   `react-useeffect`, and `ux-copy`.
2. Inventory existing Studio components first. Then inspect official shadcn
   candidates through the Bun-driven CLI. Do not create a custom primitive
   before recording why existing/official/registry options fail.
3. The current project is Vite, Tailwind v4, Base UI, `base-nova`, Geist, and
   Lucide. Use Base UI `render`, not Radix `asChild`, and follow current Base UI
   `Select`/`ToggleGroup` APIs.
4. Reuse:
   - `ModuleLayout` without implicit viewport padding or bottom gap;
   - `PageHeader.actions`;
   - `ListSearchField`;
   - `SingleSelectListFilter`/`MultiSelectListFilter`;
   - `ActionDrawer`;
   - `FieldGroup`, `Field`, `FieldSet`, and `FieldLegend`;
   - `Empty`, `Alert`, `Skeleton`, `Badge`, `Avatar` with fallback, `Card`
     anatomy, and Sonner;
   - the shared `Button` `isLoading` behavior and stable label contract.
5. Use React Hook Form and Zod in the service-desk module. Every validation
   branch and every min/max bound must have explicit Brazilian Portuguese copy.
6. Add `noValidate`, `data-invalid`, `aria-invalid`, linked error text, required
   labels, and first-invalid focus.
7. Use `gap-*`, `size-*`, `truncate`, `cn()`, semantic tokens, existing
   variants, and direct owner imports. Do not use `space-*`, raw colors,
   feature-level `dark:` color overrides, manual overlay z-index, custom badges,
   custom skeletons, or mega-barrels.
8. Use icons with `Icon`-suffixed imports. Icons inside supported components
   use `data-icon` when required and do not carry manual sizing classes.
9. Keep state and actions behind a typed repository/provider interface. Prefer
   explicit variants and children composition over boolean-prop proliferation.
10. Derive visible counts, filters, wait labels, and enabled actions during
    render or pure projections. Do not chain `useEffect` to synchronize derived
    state or react to user events.
11. Keep cards and columns semantic and neutral. New component tokens, if
    proven necessary, must reference the existing semantic layer in
    `src/index.css` and include computed contrast evidence in light and dark.
12. UI copy uses stable vocabulary:
    - `Adicionar à fila`;
    - `Chamar cliente`;
    - `Iniciar atendimento`;
    - `Aguardando`;
    - `Chamado`;
    - `Em atendimento`;
    - `Profissional específico`;
    - `Primeiro disponível`;
    - `Normal`;
    - `Encaixe`;
    - `Tentar novamente`.

## Architecture And Boundaries

### Site Impact

None.

### API Impact

None. No route, schema, OpenAPI contract, generated client, or persistence work.

### IDP Impact

None. The route uses the existing authenticated Studio shell. Business queue
rules and prototype roles do not enter IDP.

### Studio Impact

- `src/routes/_authenticated/service-desk/index.tsx` owns the route leaf.
- `src/modules/service-desk/**` owns:
  - presentation contracts;
  - queue stages and safe search state;
  - repository port and TanStack Query keys/hooks;
  - pure projections;
  - forms and Zod schemas;
  - page, board, card, and drawer composition.
- `src/dev/service-desk/**` owns:
  - deterministic walk-in fixtures;
  - queue-stage overlay for scheduled records;
  - injected clock;
  - slow/failure behavior;
  - the session-memory adapter/coordinator.
- The service-desk memory adapter may consume the public scheduling repository
  contract and the same module-scoped scheduling instance. Product presentation
  does not import `src/dev` or scheduling presentation internals.
- `virtual:studio-service-desk-source` is the narrow composition seam.
- The service-desk memory source is available only when the accepted scheduling
  memory source is enabled for local/configured `dev`; no new public env switch
  is added.
- `hml` and `prd` always resolve the disabled source and production artifacts
  exclude service-desk memory code and fixtures.
- Existing Agenda, Dashboard, Clients, and barbershop-setup presentation remain
  unchanged except for the minimal accepted navigation and scheduled-state
  integration.

### Data And Persistence Impact

- Session memory only.
- Scheduled entries reference, rather than copy, the existing appointment.
- Walk-ins own temporary synthetic contact snapshots.
- No localStorage, IndexedDB, cookie, durable cache, fake HTTP, or database.
- A full reload reconstructs the deterministic scenario.

### External Provider Impact

None.

## Performance And Scalability

- Query one bounded local date and unit; never load unbounded appointment
  history.
- Keep scenario collections bounded for visual testing. Dense scenarios are UX
  stress evidence, not capacity claims.
- Cap visible board content through intentional internal scrolling or bounded
  progressive presentation; do not widen the page.
- Build ID/professional/service lookup maps once per projection when repeated
  lookups are needed.
- Start independent repository reads together and avoid client-side waterfalls.
- Invalidate only service-desk and directly affected scheduling query keys after
  mutations.
- Use primitive dependencies, derived selectors, and component boundaries to
  avoid rerendering every card for unrelated filter/input changes.
- Do not add virtualization until measured DOM/render evidence shows it is
  necessary.
- Delayed operations must not write into a reset or newly selected scenario.
- Duplicate call/start commands must be idempotent inside the memory adapter and
  disabled in the UI while pending.
- A future production API must define indexed bounded queries, tenant/unit
  authorization, queue ordering, concurrency control, idempotency, audit
  attribution, clock/timezone semantics, and realtime reconciliation before
  scale claims are made.

## Security, Privacy, And Abuse

- Use only clearly synthetic identities, phones, notes, professionals,
  services, and appointments.
- Keep names, phones, notes, form values, and free-text search out of URL state,
  logs, analytics, breadcrumbs, screenshots committed as fixtures, and error
  telemetry.
- Do not log credentials, tokens, cookies, session values, private headers, or
  queue payloads.
- The notes field explicitly discourages secrets, payment-card data, documents,
  health data, and other sensitive information.
- The prototype represents manager/reception behavior but does not implement
  role authorization.
- No public endpoint, provider call, or spam surface is added.
- No rate limit is required for an in-memory local/dev-only adapter. Simulated
  latency is UX evidence, not throttling.
- Production builds fail closed and exclude the memory source.

## Accessibility And UX

- Use semantic headings and named regions for the page and queue stages.
- Board visual order and DOM/focus order must match.
- Every action uses a native button or accepted Base UI primitive and is
  reachable by keyboard.
- Do not make the entire card an ambiguous clickable container around nested
  actions.
- Stage, source, priority, wait state, and professional preference retain text;
  color is supplementary.
- Dynamic call/start/reset outcomes are announced through an accepted polite
  live-region/toast path without moving focus unexpectedly.
- Opening the drawer moves focus appropriately; validation focuses the first
  invalid field; closing returns focus to `Adicionar à fila`.
- Drawers have accessible title/description through the shared `ActionDrawer`.
- Interactive targets meet the WCAG 2.2 24x24 CSS-pixel minimum.
- Focus remains visible and unobscured by sticky headers, scroll areas, or
  drawer footers.
- At 200% zoom and 320 CSS pixels:
  - the page does not create horizontal document overflow;
  - controls wrap or stack intentionally;
  - queue columns become a readable stacked sequence;
  - card content and actions remain available;
  - internal scroll does not hide focus.
- Respect reduced motion. Validate forced colors and light/dark/system themes.
- Automated axe WCAG 2.2 A/AA checks complement, but do not replace, keyboard,
  VoiceOver/NVDA, zoom, and coarse-pointer review.

## Logging And Observability

- No product analytics, polling telemetry, traces, or remote logs are added.
- Development-only metadata may include:
  - scenario ID;
  - operation kind;
  - queue stage;
  - scheduled versus walk-in source;
  - success/failure class;
  - aggregate result count;
  - duration.
- Never record customer names, phones, notes, appointment payloads, tokens,
  sessions, or private headers.
- CI, production-boundary, build, unit, and browser failures are the accepted
  alerts for this prototype.

## Acceptance Criteria

- [x] `/service-desk` is an authenticated Studio route labeled `Atendimentos`
      and appears after Agenda and before Clients in expanded, collapsed, and
      mobile primary navigation.
- [x] The page uses the accepted header, compact shared controls, textual
      operational summary, and `Aguardando`, `Chamados`, and `Em atendimento`
      stages without duplicating the Studio design system.
- [x] Scheduled `arrived`/`waiting` appointments are projected from the shared
      scheduling repository and are not copied into a second appointment
      fixture.
- [x] A scheduled customer can move through waiting, called, and in-service;
      starting service transitions the original appointment to `in-progress`
      and remains coherent in Agenda and Dashboard during the session.
- [x] Reception can add a walk-in with client snapshot, service, professional
      preference, arrival, priority, and notes through the shared
      `ActionDrawer`.
- [x] Specific-professional and first-available paths enforce explicit,
      recoverable eligibility rules without automatic assignment claims.
- [x] The delivery stops at `Em atendimento`; no fulfillment items, price
      editing, discount, payment, commission, cash, or close action is exposed.
- [x] Search and filters use the shared list controls. Safe URL state is
      allowlisted and customer-shaped text never enters the URL.
- [x] Every visible count, current stage, wait duration, and drill-down subset
      is derived from the same typed source/time bounds and matches the records
      shown.
- [x] Every Zod validation path and min/max constraint renders explicit
      Brazilian Portuguese copy, links errors correctly, and focuses the first
      invalid field.
- [x] Normal, empty, filtered-empty, dense, long-wait,
      specific-professional, first-available, unavailable-professional, slow,
      next-failure, and persistent-error scenarios are deterministic and
      resettable outside ordinary product chrome.
- [x] Delayed and failed mutations are atomic, do not write across scenario
      generations, prevent duplicate submission, preserve stable action labels,
      and offer recovery where supported.
- [x] Existing components, Base UI composition, semantic tokens, neutral cards,
      status text/icon/badge signals, Lucide icon rules, direct imports, and
      `ModuleLayout` spacing contracts are followed.
- [x] Light, dark, system, forced-colors, reduced-motion, 200% zoom,
      320-CSS-pixel reflow, target size, focus visibility/return, keyboard flow,
      coarse pointer, and axe checks have recorded evidence.
- [x] `hml` and `prd` resolve the disabled source. Production artifacts contain
      no service-desk adapter, fixtures, scenarios, synthetic identities, or
      mutation implementation.
- [x] Agenda, Dashboard, Clients, setup, authentication, API, IDP, and site
      behavior remain unchanged outside the accepted route/navigation and
      scheduled-status coherence.
- [x] Durable Studio, component-inventory, testing, and source-boundary docs are
      updated where their contracts change.

## Verification Plan

### Unit And Component Tests

- Queue-stage and transition allowlists.
- Scheduled-entry projection without appointment duplication.
- Walk-in schema, conditional professional requirement, all Portuguese bounds,
  phone normalization, and sensitive-note guidance.
- Wait/current-stage calculations at before/start/inside/end/future boundaries
  using an injected clock.
- Safe URL parsing/canonicalization and PII exclusion.
- Exact visible count/filter/drill-down equivalence.
- Repository normal/empty/dense/long-wait and preference scenarios.
- Atomic call/start, duplicate prevention, unavailable professional, one-shot
  failure rollback/retry, persistent failure, reset, and delayed-operation
  invalidation.
- Shared scheduling repository identity and scheduled transition coherence.
- Loading, empty, filtered-empty, error, disabled, and populated presentation.
- Component architecture and textual inventory gates.

### Browser Tests

- Authenticated direct entry and expanded/collapsed/mobile navigation.
- Scheduled Agenda-arrival -> service-desk waiting -> called -> in-service ->
  Agenda/Dashboard coherence journey.
- Walk-in add -> called -> in-service journey.
- Drawer keyboard operation, conditional fields, validation, first-invalid
  focus, close focus return, and duplicate-submit prevention.
- Search/filter behavior, invalid URL normalization, and exact count/subset
  navigation.
- Normal, empty, dense, long-content, slow, recoverable failure, and persistent
  failure surfaces.
- Full-reload deterministic reset.
- 1600x900 and 1440x900 visual hierarchy screenshots/evidence.
- Medium/tablet/320-CSS-pixel layout, 200%-zoom-equivalent reflow, no document
  overflow, internal scroll/focus, and coarse-pointer actions.
- Light/dark/system, forced colors, reduced motion, computed text/boundary/focus
  contrast, 24px targets, and focused axe WCAG 2.2 A/AA.

### Regression And Boundary Tests

- Existing Agenda and Dashboard focused suites.
- Module-registry navigation order and active-state tests.
- Production preview route unavailable/disabled behavior.
- Production artifact scan for adapter/fixtures/scenario markers.
- No new service-desk public environment variable.

### Required Commands

```bash
bun --filter studio routes:generate
bun --filter studio format
bun --filter studio lint
bun --filter studio typecheck
bun --filter studio test
bun --filter studio test:production-boundary
bun --filter studio build
bun --filter studio check
bun --filter studio test:e2e
bun run check
git diff --check
```

Record any baseline failure separately and prove whether the branch changes it.

## Accepted Decisions And Follow-Ups

- [x] The UX source is the Maestri note
      `triad-studio-o-triad-stud`.
- [x] The progress tracker is the Maestri note
      `triad-studio-acompanhament`.
- [x] This initiative stops at `Em atendimento`.
- [x] Queue/check-in is a separate `/service-desk` surface labeled
      `Atendimentos`.
- [x] Queue stages use explicit actions; no drag-and-drop is required.
- [x] Scheduled state composes the existing scheduling repository.
- [x] Walk-ins remain temporary queue contact snapshots and do not create
      Client records or Agenda appointments.
- [x] No new public environment variable is added; availability follows the
      accepted scheduling source boundary.
- [ ] The next initiative must define service fulfillment from
      `Em atendimento` to `Pronto para pagamento`, including itemized services
      and performer attribution but excluding actual payment.
- [ ] A later initiative must define command tabs, prices, discounts, payments,
      commissions, cash, and daily closing.
- [ ] Production queue/API work must define canonical client/visit identity,
      tenancy, authorization, ordering, concurrency, idempotency, audit, clock,
      persistence, realtime, and observability.
