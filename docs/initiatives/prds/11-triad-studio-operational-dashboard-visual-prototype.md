# 11 TRIAD Studio Operational Dashboard Visual Prototype

## Summary

Replace the authenticated `/overview` placeholder with a product-realistic operational Dashboard
for TRIAD Studio. The page should let barbershop owners, managers, and receptionists understand the
selected period quickly: appointment volume and flow, upcoming work, actionable attention items,
professional occupancy, available capacity, supported financial projections, service mix,
cancellations/no-shows, and client activity.

The Dashboard is a read-oriented presentation over the existing scheduling evaluation source. It
must reuse current appointments, professionals, services, units, statuses, prices, payment status,
routes, actions, components, tokens, shell, and local/dev production boundary. It must not create a
second dashboard fixture layer or infer unsupported payment, discount, settlement, or long-term
client-retention facts.

Execution plan:
[11 TRIAD Studio Operational Dashboard Visual Prototype](../tasks/11-triad-studio-operational-dashboard-visual-prototype.md)

## Context

- Current state:
  - `/overview` is already the default authenticated destination and the existing `Dashboard`
    navigation item already points to it.
  - The route currently renders only a title, subtitle, and placeholder card.
  - Agenda already owns deterministic local/dev scheduling data with appointments, client IDs and
    contact-shaped fields, professionals, services, units, durations, prices, payment status,
    operational status, blocked periods, filters, mutations, and a fail-closed `hml`/`prd`
    boundary.
  - Barbershop setup already owns the existing services management destination at
    `/barbershop-setup?section=services`.
  - ENG-44 is implementing the separate `/clients` evaluation module; the Dashboard must not edit
    or import its internals.
- Problem:
  - The first screen after authentication does not explain the operation or provide a useful path
    into the day.
  - Agenda is optimized for execution and rescheduling, not for a compact management summary.
  - A literal implementation of every number in the UX reference would fabricate payment methods,
    discounts, settlement, cancellation timestamps, and long-term client history that do not exist
    in current contracts.
- Why now:
  - Agenda, setup, and the client-management initiative provide enough product vocabulary to
    validate the main operational overview.
  - The UX handoff supplies a complete information hierarchy and visual reference that can be
    translated into current Studio architecture without redesigning other pages.
- Related sources:
  - [Linear initiative: TRIAD Studio Operational Dashboard Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-operational-dashboard-visual-prototype-034bbb009e3b)
  - [ENG-45: Build the TRIAD Studio operational dashboard visual prototype](https://linear.app/corvi-io/issue/ENG-45/build-the-triad-studio-operational-dashboard-visual-prototype)
  - [Linear document: complete verbatim UX handoff](https://linear.app/corvi-io/document/triad-studio-operational-dashboard-verbatim-ux-handoff-b028cd53b0ac)
  - [Complete verbatim UX handoff](../sources/11-triad-studio-operational-dashboard-ux-handoff.md)
  - `docs/initiatives/prds/03-triad-studio-schedule-visual-prototype.md`
  - `docs/initiatives/prds/06-triad-studio-agenda-kanban-visual-prototype.md`
  - `docs/initiatives/prds/07-triad-studio-barbershop-setup-visual-prototype.md`
  - `docs/initiatives/prds/10-triad-studio-client-management-visual-prototype.md`
  - `docs/studio/schedule-prototype.md`
  - `docs/studio/theme-system.md`
  - `docs/studio/component-system.md`
  - [ENG-44: Build the TRIAD Studio client management visual prototype](https://linear.app/corvi-io/issue/ENG-44/build-the-triad-studio-client-management-visual-prototype)

## Source Preservation

- The complete 848-line UX file is preserved verbatim at
  `docs/initiatives/sources/11-triad-studio-operational-dashboard-ux-handoff.md`.
- The repository copy has SHA-256
  `6c0d3d26685d60434c90ad19dbfb759a116136cadfa32b9dc2d6efc7f55d5c14`, matching the supplied
  file at planning time.
- The same complete Markdown source will be stored as a Linear document owned by this initiative.
- The complete Linear copy is available in
  [TRIAD Studio Operational Dashboard — Verbatim UX Handoff](https://linear.app/corvi-io/document/triad-studio-operational-dashboard-verbatim-ux-handoff-b028cd53b0ac).
- The supplied 1600 × 900 screenshot was inspected as the hierarchy reference. The durable
  acceptance contract is this PRD plus the preserved verbatim Markdown, so literal screenshot
  pixels do not override existing tokens, accessibility rules, or truthful data labels.
- The additional user-supplied reference received on 2026-07-23 was inspected directly before
  final browser verification. It confirmed fold order, information density, alignment, and
  relative visual weight only; its hard-coded numbers, unsupported finance/client facts, pixels,
  raw colors, and parallel identity were not copied.

## Goals

- Turn `/overview` into the primary operational reading and decision surface while keeping Agenda
  as the execution surface.
- Reproduce the handoff hierarchy: header and global filters; five KPIs; upcoming appointments and
  attention; appointment flow and professional occupancy; capacity, supported finance, and
  services; cancellations/no-show and clients.
- Reuse existing scheduling data and pure derived projections rather than creating dashboard
  records or duplicated fixtures.
- Keep one scheduling memory repository instance across Dashboard and Agenda in a browser runtime
  so navigation reflects the same local/dev mutations.
- Reuse the existing appointment drawer and mutation flow for `Novo agendamento` and supported
  appointment actions; do not create parallel drawers or commands.
- Make period, unit, professional, and technical scenario state shareable through safe URL values.
- Define every derived metric and unsupported value explicitly so labels never overstate what the
  current source proves.
- Preserve current Studio navy/gold tokens, neutral surfaces, restrained status signals, Geist,
  light/dark/system behavior, and existing shell geometry.
- Provide deterministic loading, empty, filtered-empty, error, delayed, and local/dev reset
  evidence through current scheduling scenarios.
- Keep the existing scheduling source disabled in `hml` and `prd`; add no dashboard source or
  environment variable.

## Non-Goals

- A new route alongside `/overview`, a second navigation entry, or any additional page.
- Agenda layout, filters, status rules, drag-and-drop, drawer semantics, business validation,
  current URLs, or visual redesign.
- A new dashboard repository, `src/dev/dashboard`, duplicated scheduling fixtures, fake HTTP
  endpoints, browser persistence, polling, WebSockets, or background refresh.
- Business API, OpenAPI, database, migrations, production analytics store, aggregate persistence,
  tenant/authorization policy, or server-side reporting.
- Real payment processing, settlement, payment method, discounts, refunds, commissions, taxes,
  receipts, cash closing, tips, or accounting.
- Claiming that visual `paymentStatus` is provider-confirmed payment or that appointment price is
  recognized revenue.
- Inventing a cancellation timestamp, client acquisition date, first-visit fact, retention window,
  or lifetime recurrence from the current appointment contract.
- A competitive professional ranking.
- Editing the client-management module or blocking this page on client profile navigation.
- Creating a complete new mobile product layout. The page must still reflow and remain operable at
  narrow widths under Studio accessibility rules.
- Adding charts when a metric, compact list, progress bar, or semantic table communicates the
  relationship more clearly.

## Brainstorm

### Problem Framing

The Dashboard must answer “what needs my attention and how is the selected operation progressing?”
without asking a manager to inspect every Agenda card. Its job is to summarize, compare only when
the source supports comparison, and provide clear paths back to existing execution surfaces.

The visual handoff is dense but intentionally avoids decorative charts. The implementation challenge
is therefore a truthful, bounded projection over existing scheduling state—not a new reporting
domain or a collection of hard-coded KPI examples.

### Gaps And Unknowns

- Product gaps:
  - The handoff asks `Novo agendamento` to open the existing creation flow, but the current flow is
    composed inside Agenda rather than exposed as a route command. Dashboard must reuse the existing
    `AppointmentDrawer` and scheduling mutations instead of reimplementing them.
  - The handoff suggests a `Serviços` route; the current destination is the services section inside
    barbershop setup.
  - Client profile navigation depends on ENG-44 and must remain conditional until that route exists.
- Technical gaps:
  - Agenda and Dashboard need the same session-memory repository instance for mutations to stay
    coherent across navigation.
  - The current scheduling repository returns a bounded selected range, not precomputed dashboard
    aggregates. A pure projection is acceptable for local/dev fixtures but is not a production API
    architecture.
  - Multiple simultaneous current/comparison queries would conflict with a query-relative mutable
    scenario projection. The accepted refinement projects the canonical multi-day fixture once
    against a repository-local date anchor and uses one bounded read containing the current and
    immediately preceding equal-length periods.
  - The current overview component lives under shared shell ownership. It may consume a typed
    read-model input, but shared code must not import scheduling or development internals.
- Data/model gaps:
  - Available: appointment date/start/duration/status, client ID/name, professional, service,
    unit, price, `pending`/`paid` visual payment status, and schedule periods.
  - Not available: payment method, discount, provider settlement, refund, commission, tax,
    cancellation timestamp, acquisition date, historical first visit, and a canonical client
    recurrence definition.
  - Appointment prices support scheduled-value projections. They do not prove accounting revenue.
  - Capacity must be calculated from available minutes minus non-bookable periods, not a misleading
    count of equal “slots” across services with different durations.
- Operational gaps:
  - No polling or realtime source exists. “Atualizado” means the most recent successful query in
    the current browser, not continuously synchronized production state.
  - Production authorization and aggregate telemetry remain undefined.

### Counterpoints

- Copying the screenshot values would create a convincing page quickly, but would violate the
  explicit requirement to reuse current data and would make payment/retention claims with no source.
- Creating `src/dev/dashboard` would isolate implementation, but it would duplicate clients,
  appointments, services, and professionals and inevitably drift from Agenda.
- Importing development scenarios directly into the shared overview component would reuse records,
  but would violate production boundaries and module direction.
- Building a production aggregate API first would make the metrics durable, but would prematurely
  define finance, tenancy, authorization, retention, query, and persistence contracts before UX
  validation.
- A single long table would be simpler, but would not provide the management hierarchy requested by
  UX and would force users back into Agenda for every decision.
- Rendering unsupported payment methods and discounts as zero would imply measured zero. A neutral
  unavailable state is more truthful.
- Treating a client with two appointments inside the selected period as “recurring” is not the same
  as long-term retention. If shown, it must be labeled `Mais de um atendimento no período`.
- Prioritizing only 1440px matches the screenshot, but conflicts with WCAG reflow and current Studio
  requirements. Desktop remains the acceptance surface while narrow widths must remain usable.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Implement the screenshot literally with hard-coded Dashboard data | Fastest visual match | Duplicates data and fabricates financial/client facts | Do not choose |
| B | Derive a typed Dashboard projection from the existing scheduling source and show unsupported fields honestly | Reuses current state, keeps Agenda coherent, validates UX without new backend | Some screenshot submetrics are unavailable; local projection is not production scale | Recommended |
| C | Build a dedicated Dashboard memory source | Clean route isolation | Creates the second data layer explicitly prohibited by UX | Do not choose |
| D | Build production aggregate APIs and Studio together | Durable, scalable reporting | Premature contracts and much larger security/finance scope | Future initiative |

### Recommendation

Choose Option B.

Keep `/overview` and its existing registry metadata. Keep the visual overview composition under the
current shared ownership, but pass it a typed, read-only view model produced by scheduling-owned pure
derivation and query composition. Shared code must not import scheduling or `src/dev`.

Reuse the same local/dev scheduling repository instance across Agenda and Dashboard. This may
require a narrow source-composition refactor, but it must not change Agenda presentation, rules,
filters, route semantics, mutations, tests, or business behavior.

Render the UX hierarchy with existing `PageHeader`, `ModuleLayout`, `MetricCard`, `StatusBadge`,
tables, progress anatomy, filters, skeletons, buttons, avatars, and feedback components when their
contracts fit. Inspect official shadcn/ui only when a missing primitive is proven. Do not create a
parallel component system.

## Accepted Data Interpretation

| UX value | Current source | Accepted interpretation |
| --- | --- | --- |
| Agendamentos | Appointments in selected bounds | Count all matching appointments, with status breakdown |
| Concluídos | `status === completed` | Count and percentage of matching appointments |
| Faturamento realizado | Completed appointments marked `paid` | Sum of appointment prices labeled as visual paid state, not provider settlement |
| Ticket médio | Completed appointments marked `paid` | Paid-state value divided by paid completed count; unavailable when count is zero |
| Ocupação | Appointment durations and available schedule minutes | Non-canceled/non-no-show booked minutes divided by bounded available minutes |
| KPI comparison | Current and immediately preceding equal-length scheduling bounds | Direction, absolute delta, relative percentage when defined, and named prior period; otherwise a neutral unavailable baseline |
| Próximos atendimentos | Appointment date/start/status | Next five non-terminal records relative to selected/source time |
| Atenção necessária | Supported appointment/status conflicts | Waiting, completed-pending, overlapping occupancy, long-running in-progress, and upcoming scheduled records only when derivable |
| Fluxo | Existing eight statuses | Seven tiles: `scheduled` plus `confirmed` as a truthful pre-arrival total, with the other six statuses separate |
| Ocupação por profissional | Duration, availability, periods | Booked minutes divided by available minutes per professional; no ranking |
| Capacidade | Business hours, professionals, blocked/break periods | Available, reserved, and free minutes; grouped into morning/afternoon/evening |
| Previsto | Non-canceled/non-no-show appointment prices | Scheduled value, not forecast accounting revenue |
| Pendente | Completed appointments marked `pending` | Appointment value awaiting the prototype payment decision |
| Descontos | Not available | Render unavailable; never infer zero |
| Formas de pagamento | Not available | Render unavailable; never invent distribution |
| Serviços | Service IDs and appointment prices | Top five by count with associated scheduled/paid-state value labeled truthfully |
| Receita perdida | Canceled/no-show appointment prices | Potential appointment value, not recognized lost revenue |
| Clientes atendidos | Completed appointment client IDs | Unique completed clients in the selected bounds |
| Novos | No acquisition/first-visit history | Unavailable |
| Recorrentes | Repeated client IDs in selected bounds only | If shown, label as more than one appointment in the period; do not call retention |
| Atualizado | Query completion state | Most recent successful browser query time; no polling/realtime claim |

## Experience Contract

### Route And Header

- Keep the existing authenticated `/overview` route and `Dashboard` navigation entry.
- Replace the placeholder; do not create a second Dashboard route.
- Title: `Dashboard`.
- Subtitle: `Acompanhe a operação, os atendimentos e o desempenho da unidade.`
- `Novo agendamento` reuses the existing scheduling drawer, validation, mutation, feedback, and
  rollback. No second creation flow is allowed.

### Global Filters

- Period: `Hoje`, `Ontem`, `Esta semana`, `Este mês`, and `Personalizado`.
- Unit: current scheduling units.
- Professional: `Todos os barbeiros` plus current professionals.
- Default: current local date, `Hoje`, `Centro`, all professionals, current approved scenario.
- Custom date ranges are canonical date-only values and bounded to at most 31 days for this
  evaluation surface.
- Period, date bounds, unit, professional IDs, and technical scenario ID may enter URL state.
- Names, notes, phone numbers, client search, appointment payloads, and other PII never enter URL
  state.
- Filter changes update all visible blocks as one coherent projection and announce completion
  without moving focus.

### Visual Hierarchy

- First fold: header, filters, five KPIs, upcoming appointments, and attention.
- Second fold: appointment flow and professional occupancy.
- Third fold: day capacity, supported operational finance, and services.
- Fourth fold: cancellations/no-show and clients.
- Large desktop targets the supplied 1600 × 900 reference and five KPI columns.
- Medium desktop wraps KPIs and uses two-column blocks.
- Tablet and narrow widths use one logical column or bounded internal scrolling without losing
  heading order.

### Navigation And Actions

- KPI and flow links navigate to Agenda with existing safe date/unit/professional/status filters.
- Professional rows navigate to Agenda filtered by professional.
- Upcoming appointments may open the existing appointment details flow or navigate to Agenda.
- Row actions reuse existing scheduling actions and must not add a dedicated `Ações` table column;
  use the row primary action and existing contextual menu conventions.
- `Ver agenda` navigates to Agenda with the current safe filters.
- `Ver todos os serviços` navigates to `/barbershop-setup?section=services`.
- Client navigation is added only when `/clients` exists; Dashboard must not import or modify the
  client module.
- Payment attention opens the existing appointment/payment-decision context or filtered Agenda.
  No nonexistent finance route is created.

### Unsupported Data

- Unsupported submetrics render an accessible neutral unavailable state, not zero and not sample
  numbers.
- The normal page does not display prototype, fixture, scenario, reset, latency, or failure chrome.
- Full reload reconstructs the selected existing scheduling scenario and resets local/dev state.
- UX examples remain layout references, not default values.

## Architecture And Boundaries

- Site impact: none.
- API impact: none.
- IDP impact: none; existing session gating remains unchanged.
- Studio impact:
  - Replace the existing shared `WorkspaceOverview` placeholder with the accepted visual
    composition.
  - Keep scheduling-specific query and pure projection ownership under `src/modules/scheduling`.
  - Pass a typed Dashboard read model into shared overview presentation; shared code does not import
    scheduling or development internals.
  - Reuse the current scheduling provider, query keys, appointment drawer, status presentation, and
    URL vocabulary where they fit.
  - Narrowly share one local/dev scheduling repository instance between Agenda and Dashboard
    without changing Agenda behavior.
- Development data impact:
  - Reuse `src/dev/scheduling`; do not add `src/dev/dashboard` or duplicate records.
  - Reuse current scenario selection, latency, failure, reset, and production exclusion.
- Environment/deployment impact: none; reuse `VITE_SCHEDULING_SOURCE` and its existing target guard.
- Persistence impact: none.
- External provider impact: none.
- Client initiative impact: optional navigation only after its route exists; no dependency on
  client internals.

## Performance And Scalability

- Current scheduling scenarios are bounded UX/test fixtures and provide no production-capacity
  evidence.
- One selected period drives one coherent Dashboard projection. Avoid one repository scan per card.
- Use memoized pure maps/reductions over the loaded bounded range and stable lookup maps for
  professionals and services.
- Upcoming appointments are capped at five; attention is capped at four; top services are capped at
  five; histories and professional lists stay bounded to the current source.
- Do not add polling, WebSockets, timers that rerender the full page, background refresh, or
  additional network requests.
- Avoid chart libraries for progress, distributions, or KPIs that existing CSS and semantic markup
  can express.
- A future production Dashboard must use bounded aggregate/read-model endpoints, explicit date and
  tenant filters, indexes, cached or incremental aggregates where justified, N+1 prevention,
  permission-aware fields, and measured query capacity.
- With millions of appointments, Studio must never download raw records to calculate all metrics.
  Server-side aggregates and bounded drill-down pages become mandatory.

## Security, Privacy, And Abuse

- The route remains inside the authenticated shell, but route/nav visibility is not authorization.
- Use only current synthetic scheduling identities in local screenshots, fixtures, and Linear
  evidence.
- Do not log or put into telemetry/URLs: client names, phones, notes, appointment payloads,
  professional private data, auth/session values, tokens, private headers, or payment-shaped
  details.
- The Dashboard does not add analytics, export, sharing, messaging, payment, or background behavior.
- The scheduling memory source does not intercept Better Auth or persist in browser storage.
- A future production initiative must define tenant isolation, field-level permissions, financial
  visibility, audit expectations, aggregate privacy thresholds, retention, and export controls.
- Attention links must use allowlisted route filters and may not reflect arbitrary PII from query
  parameters.

## Accessibility And UX

- Use semantic headings and landmark order that matches the visual fold hierarchy.
- KPI collections, flow states, service rows, capacity, and client metrics expose text values and
  definitions; color, icon, bar length, or position is never the only meaning.
- Progress bars expose accessible names, current values, and scale. Tiny visual bars are
  supplementary to printed percentages or durations.
- Filters use programmatic labels, keyboard-operable popovers/menus, visible focus, and safe
  announcements after updates.
- Upcoming and professional tables retain semantic headers. Any internal horizontal scroll keeps
  focused content visible and does not widen the page.
- Clickable KPI/flow cards use native links or buttons with descriptive names and at least WCAG 2.2
  AA target size.
- Loading skeletons include one page-level status. Empty, filtered-empty, unavailable-data, error,
  and retry states are distinguishable to assistive technology.
- `Atualizado` does not continuously announce or poll. User-triggered refresh/filter completion may
  use a polite live region.
- Preserve light, dark, system, forced colors, reduced motion, 200% zoom, 320 CSS-pixel reflow,
  logical focus order, visible/unobscured focus, and 24 × 24 CSS-pixel minimum targets.
- Measure browser-computed normal text, muted text, status, focus, meaningful border, and progress
  contrast against WCAG 2.2 AA.
- Physical VoiceOver/NVDA and real-device touch checks remain required evidence or recorded residual
  risk; axe alone is insufficient.

## Logging And Observability

- This frontend-only evaluation adds no production telemetry.
- Development failures are mapped to safe product-facing messages without logging record payloads.
- A future implementation may record aggregate query duration, selected period kind, result count,
  source freshness, and calculation outcome class.
- Future spans must not contain customer, professional, appointment, payment, note, token, or
  private-header data.
- Metric freshness must identify source time and target scope; it must not claim realtime without a
  realtime contract.
- Alerts and SLOs require measured backend behavior and are not defined by this visual prototype.


- [x] The complete UX handoff is preserved verbatim in the repository and as a Linear document
      owned by the initiative, with matching SHA-256.
- [x] The supplied 1600 × 900 hierarchy is represented through existing Studio tokens and
      components without copying literal example data or creating a new identity.
- [x] The existing authenticated `/overview` route becomes the Dashboard; no duplicate route or
      navigation entry is added.
- [x] Agenda presentation, rules, filters, DnD, statuses, mutations, and existing journeys remain
      unchanged.
- [x] Dashboard and Agenda reuse the same local/dev scheduling repository state without adding
      `src/dev/dashboard`, duplicate fixtures, a new source env variable, HTTP, or persistence.
- [x] Period, unit, and professional filters update every block coherently and preserve safe
      shareable URL state.
- [x] The five KPI surfaces render truthful appointment, completion, paid-state value, paid-state
      average, and minute-based occupancy calculations, with bounded prior-period comparison or an
      explicit unavailable baseline.
- [x] Upcoming appointments, actionable supported attention items, appointment flow, professional
      occupancy, capacity, operational finance, services, cancellations/no-show, and clients render
      from current scheduling records.
- [x] Discounts, payment methods, provider settlement, new-client count, and long-term retention are
      never fabricated; unsupported values render an explicit neutral unavailable state.
- [x] `Novo agendamento` and supported appointment actions reuse the existing scheduling drawer,
      mutations, validation, feedback, and rollback.
- [x] KPI, status, professional, services, and optional client links reuse existing routes and
      allowlisted filters; no new detail route is created.
- [x] Loading, delayed, empty, filtered-empty, error, retry, unsupported-data, and disabled-source
      states use Brazilian Portuguese copy and accessible semantics.
- [ ] Large desktop, medium desktop, tablet, 320px reflow, 200% zoom, light/dark/system, forced
      colors, reduced motion, keyboard, focus, target-size, internal-overflow, and axe checks pass.
      Automated evidence covers every item except actual browser 200% zoom, which remains manual.
- [x] Browser-computed text, muted text, focus, status, progress, and meaningful non-text contrast
      meet WCAG 2.2 AA.
- [x] Focused unit tests define every formula and prove filter coherence, bounds, sort order, caps,
      unsupported fields and no duplicated source.
- [x] Playwright covers the reference hierarchy, filters, drill-down navigation, existing drawer
      reuse, shared state with Agenda, reload reset, representative scenarios, responsive behavior,
      accessibility, and visual themes.
- [x] Production-boundary tests continue to exclude scheduling memory/scenarios from `hml`/`prd`;
      no Dashboard source is introduced.
- [x] Studio Dashboard, component-system, testing, and any changed scheduling/theme documentation is
      updated.
- [x] Route generation, format, lint, typecheck, Vitest, focused/full Playwright,
      production-boundary, build, Studio check, root check, and `git diff --check` have recorded
      evidence.


- Unit tests:
  - Dashboard search/period validation, 31-day bound, unit/professional allowlists, safe URLs.
  - Appointment/completion/paid-state/ticket/occupancy/capacity formulas.
  - Upcoming order/cap, attention classification, service aggregation, cancellation potential
    value, unique/repeated client calculations, and unavailable values.
  - Shared scheduling repository identity, query keys, scenario reset, delayed/error states, and
    production source resolution.
- Component tests:
  - Every section, skeleton, empty, filtered-empty, error, retry, disabled, and unavailable state.
  - Native card/link semantics, progress names/values, filters, focus, and appointment drawer reuse.
- Browser tests:
  - 1600 × 900 visual hierarchy; desktop-medium wrap; tablet/narrow stacking; no page overflow.
  - Filter coherence and URL refresh; Agenda/status/professional/service navigation.
  - New appointment through the existing drawer and state visible after Agenda navigation.
  - Current normal, empty, dense, conflict, delayed/failure, and reset scenarios.
  - Light/dark/system, forced colors, reduced motion, 200% zoom, 320px, keyboard-only, focus,
    target size, axe, and computed contrast.
- Boundary tests:
  - Production build with scheduling memory requested still resolves disabled.
  - Artifact scan remains free of scheduling fixtures/scenarios/mock engine and adds no Dashboard
    fixture markers.
- Commands:

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
bun --filter studio test:e2e:production
bun run check
git diff --check
```

## Accepted Decisions And Open Questions

- [x] Route: replace the existing `/overview` placeholder; do not add a second Dashboard route.
- [x] Source: reuse the current scheduling source and records; do not create Dashboard fixtures.
- [x] State: share one local/dev scheduling repository instance across Dashboard and Agenda.
- [x] Scope: read-oriented Dashboard plus reuse of existing scheduling drawers/actions only.
- [x] Metrics: minute-based capacity/occupancy and explicitly documented derived values.
- [x] Finance: show only appointment-price and visual payment-status projections; no settlement,
      payment-method, discount, refund, commission, tax, or accounting claim.
- [x] Clients: unique/repeated activity in the selected period only; no invented acquisition or
      retention facts.
- [x] Responsive: desktop-first visual acceptance plus required narrow reflow/accessibility.
- [x] Production: reuse the existing fail-closed scheduling source; no new environment variable.
- [ ] A future initiative must define production aggregate APIs, tenant/authorization boundaries,
      field-level financial visibility, persistence, caching/freshness, observability, and measured
      capacity.
- [ ] A future finance/sales initiative must define settlements, payment methods, discounts,
      refunds, tips, taxes, commissions, receipts, cash closing, and accounting vocabulary.
- [ ] A future analytics initiative must define first-time/returning client and retention windows
      from durable client history.
