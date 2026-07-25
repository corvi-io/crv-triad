# 15 TRIAD Studio Management Insights Visual Prototype - Execution Plan

## Source

- PRD:
  `docs/initiatives/prds/15-triad-studio-management-insights-visual-prototype.md`
- Official UX source: connected Maestri note `triad-studio-o-triad-stud`,
  sections 13 and 14.
- Visual MLP tracker: connected Maestri note
  `triad-studio-acompanhament`.
- Revenue dependency:
  [ENG-48: Build the TRIAD Studio checkout, payment, and commissions visual prototype](https://linear.app/corvi-io/issue/ENG-48/build-the-triad-studio-checkout-payment-and-commissions-visual).
- Cash dependency:
  [ENG-49: Build the TRIAD Studio cash operations and daily closing visual prototype](https://linear.app/corvi-io/issue/ENG-49/build-the-triad-studio-cash-operations-and-daily-closing-visual).
- Linear initiative:
  [TRIAD Studio Management Insights Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-management-insights-visual-prototype-11343f19afcb).
- Delivery tasks:
  - [ENG-53: Build the TRIAD Studio basic reports visual prototype](https://linear.app/corvi-io/issue/ENG-53/build-the-triad-studio-basic-reports-visual-prototype).
  - [ENG-54: Build the TRIAD Studio operational notifications visual prototype](https://linear.app/corvi-io/issue/ENG-54/build-the-triad-studio-operational-notifications-visual-prototype).
- Current delivery status:
  - ENG-53 is `Done`; [PR #33](https://github.com/corvi-io/crv-triad/pull/33)
    merged into `staging` at
    `ab99201aafcf6960878032e8f6f4aa3b13a37fe0`.
  - ENG-54 is `Ready`, unblocked, and is the next delivery.

## Delivery Contract

Deliver two ordered frontend-only tasks:

1. basic reports;
2. operational notifications.

Task 1 completed after ENG-49. Task 2 is now unblocked and must start from the
merged Task 1 management route/source-composition baseline so it does not
collide with shared shell/Dashboard work.

Both deliveries:

- use deterministic, resettable in-memory data;
- query module-owned repository ports through TanStack Query;
- are unavailable in `hml` and `prd`;
- add no backend, provider, persistence, polling, realtime, or production
  authorization behavior.

## Shared Readiness Gate

- [ ] Confirm the direct blocking issue is `Done`.
- [ ] Confirm its implementation PR is merged into `staging`.
- [ ] Fetch latest `origin/staging`.
- [ ] Create an isolated checkout or Maestri floor from that revision.
- [ ] Record base SHA.
- [ ] Read root and Studio AGENTS.
- [ ] Read the PRD and this plan completely.
- [ ] Read required skills:
  - [ ] `triad-initiative-workflow`;
  - [ ] `triad-linear-workflow`;
  - [ ] `triad-architecture`;
  - [ ] `triad-studio-development`;
  - [ ] `accessibility`;
  - [ ] `shadcn`;
  - [ ] `tailwind-design-system`;
  - [ ] `vercel-composition-patterns`;
  - [ ] `vercel-react-best-practices`;
  - [ ] `react-useeffect`;
  - [ ] `ux-copy`.
- [ ] Read current durable docs for Dashboard, scheduling, service desk,
      clients, revenue operations, and cash operations.
- [ ] Inspect the merged source contracts and record divergences before
      editing.

## Shared Implementation Principles

- Keep `reporting` and `operational-notifications` as separate domain modules.
- Do not introduce a generic `management-insights` runtime module or package.
- Consume accepted module data through public repository/coordinator ports.
- Never import another module's presentation or `src/dev` fixtures.
- Compose each deterministic source through a virtual module.
- Prefer source enablement derived from accepted prototype sources and add no
  public env variable.
- Fail closed in `hml` and `prd`.
- Keep filters/query work behind repositories; do not scan production-like raw
  collections in components.
- Derive display values and status through pure projections; avoid effect
  chains.
- Use exact query keys and focused invalidation.
- Reuse existing Studio/shadcn components and semantic tokens.
- Keep UI/validation copy Brazilian Portuguese and technical artifacts English.
- Do not log PII, notification bodies, raw business payloads, credentials,
  tokens, or private headers.

## Task 1: Basic Reports

### Task Metadata

- Title: `Build the TRIAD Studio basic reports visual prototype`
- Suggested branch: `feature/eng-53-basic-reports`
- State: `Done`
- Priority: `High`
- Completed dependency: ENG-49.
- Merge evidence:
  [PR #33](https://github.com/corvi-io/crv-triad/pull/33) at
  `ab99201aafcf6960878032e8f6f4aa3b13a37fe0`.
- Related:
  - ENG-48 checkout/payment/commissions;
  - ENG-45 operational Dashboard;
  - accepted scheduling and client prototypes.

### Task 1 Scope

- Add authenticated top-level `/reports`.
- Add `Relatórios` to the module registry after `Caixa`.
- Add bounded URL-backed filters for period, professional, service, and payment
  method.
- Deliver seven official basic report sections with accessible visual/table
  representations.
- Provide deterministic scenarios, reset/reload, and failure states.

### Task 1 Exclusions

- Export, print, CSV, PDF, spreadsheet, saved views, scheduled reports, custom
  report builder, forecasting, benchmarking, or arbitrary drill-down.
- API, persistence, raw production-scale browser scans, polling, or realtime.
- Production roles or financial authorization.
- Fabricated canonical customer identity.

### 1.1 Dependency And Baseline Audit

- [ ] Confirm ENG-49 is `Done` with merged PR evidence.
- [ ] Verify ENG-48/ENG-49 source contracts in the implementation base.
- [ ] Inspect Dashboard, scheduling, service desk, clients, revenue, cash,
      navigation, routes, and source composition.
- [ ] Run focused existing tests before changes.
- [ ] Inspect the current shared component inventory.
- [ ] Use Bun-driven shadcn project inspection and registry discovery before
      adding chart or filter primitives.
- [ ] Record chart-library bundle and accessibility implications.
- [ ] Record why every new shared component is necessary.

### 1.2 Reporting Visual Specification

- [ ] Define hierarchy before JSX:
  - [ ] PageHeader and filter action;
  - [ ] active filter summary;
  - [ ] management summary row;
  - [ ] revenue;
  - [ ] professional volume;
  - [ ] top services;
  - [ ] average ticket;
  - [ ] commissions;
  - [ ] cancellations/no-shows;
  - [ ] new/returning customers.
- [ ] Define wide, medium, 320px, and 200%-zoom compositions.
- [ ] Keep Reports visually distinct from the current-day Dashboard.
- [ ] Define textual takeaways and table/list equivalents for every chart.
- [ ] Define light/dark/system, forced-color, reduced-motion, and coarse-pointer
      behavior.
- [ ] Validate final pt-BR headings, filter labels, empty states, and
      unavailable-data explanations.

### 1.3 Report Contracts

- [ ] Add contracts equivalent to:
  - [ ] `ReportFilters`;
  - [ ] `ReportPeriod`;
  - [ ] `ReportFacets`;
  - [ ] `RevenueSeries`;
  - [ ] `ProfessionalServiceSummary`;
  - [ ] `TopServiceSummary`;
  - [ ] `AverageTicketSummary`;
  - [ ] `ProfessionalCommissionSummary`;
  - [ ] `CancellationAttendanceSummary`;
  - [ ] `CustomerRecurrenceSummary`;
  - [ ] repository results/errors.
- [ ] Use canonical inclusive local dates.
- [ ] Use integer cents and basis points where relevant.
- [ ] Define deterministic sorting and stable tie breaking.
- [ ] Define bounded result limits.
- [ ] Define unavailable/partial-data reasons instead of fabricated zeros.

### 1.4 Filter Contract

- [ ] Default to current calendar month from the injected clock.
- [ ] Support `Hoje`, `Últimos 7 dias`, `Este mês`, and `Personalizado`.
- [ ] Use shared DatePicker for custom dates.
- [ ] Enforce ordered dates and a 366-day inclusive maximum.
- [ ] Support optional professional, service, and payment-method facets.
- [ ] Apply filters at the repository boundary to every report.
- [ ] Store useful filters in TanStack Router search parameters.
- [ ] Normalize invalid/missing URL values safely.
- [ ] Keep PII and private payloads out of URLs.
- [ ] Add `Limpar filtros` only when filters differ from the default.

### 1.5 Pure Aggregate Rules

- [ ] Derive exact paid net revenue by bucket.
- [ ] Derive completed paid visit/item volume per professional with explicit
      unit semantics.
- [ ] Derive top services by paid quantity and exact net revenue.
- [ ] Derive average ticket with zero-safe division.
- [ ] Derive professional commission from immutable item snapshots.
- [ ] Derive cancellation/no-show counts and rates with explicit denominator.
- [ ] Classify identifiable customers:
  - [ ] new;
  - [ ] returning;
  - [ ] unknown/excluded.
- [ ] Reconcile revenue/commission totals with accepted source snapshots.
- [ ] Add pure invariant tests for every aggregate and filter combination.

### 1.6 Reporting Repository And Memory Source

- [ ] Add a narrow `ReportingRepository`.
- [ ] Add methods equivalent to:
  - [ ] `getFacets`;
  - [ ] `getManagementSummary`;
  - [ ] `getRevenueReport`;
  - [ ] `getProfessionalAttendanceReport`;
  - [ ] `getTopServicesReport`;
  - [ ] `getAverageTicketReport`;
  - [ ] `getProfessionalCommissionReport`;
  - [ ] `getCancellationReport`;
  - [ ] `getCustomerRecurrenceReport`.
- [ ] Consume scheduling, client, revenue, and cash facts through public ports.
- [ ] Do not import another module's memory fixtures.
- [ ] Bound source data and returned ranking/table sizes.
- [ ] Start independent report reads together.
- [ ] Increment generation on scenario/reset and discard stale results.
- [ ] Reconstruct selected scenario on reload.
- [ ] Keep source unavailable in `hml`/`prd`.

### 1.7 Query Composition

- [ ] Add stable exact query keys including normalized filters.
- [ ] Run independent report queries in parallel or use one accepted bounded
      aggregate response without a waterfall.
- [ ] Avoid broad invalidation.
- [ ] Keep filter state locally/URL-backed but calculations repository-owned.
- [ ] Avoid effect-driven derived state.
- [ ] Add production-boundary tests for no `src/dev` imports.

### 1.8 Route And Navigation

- [ ] Add the authenticated folder route for `/reports`.
- [ ] Add `Relatórios` after `Caixa` in module metadata.
- [ ] Update expanded, collapsed, mobile, shortcut, and breadcrumb behavior.
- [ ] Keep active state correct.
- [ ] Use `ModuleLayout` and accepted page composition.
- [ ] Fail closed with a bounded unavailable state.
- [ ] Keep scenario controls out of product chrome.

### 1.9 Report UI

- [ ] Compose summary metrics with accepted cards.
- [ ] Use the accepted shadcn Chart composition when inspection approves it.
- [ ] Add accessible table/list equivalents.
- [ ] Use non-color series differentiation and programmatic chart descriptions.
- [ ] Ensure interactive chart details are keyboard/screen-reader reachable or
      keep charts non-interactive with equivalent values.
- [ ] Use bounded tables and responsive card/list alternatives.
- [ ] Render loading, empty, partial, error, and ready states with shared
      Skeleton, Empty, Alert/PageStatus anatomy.
- [ ] Avoid fake comparison percentages when the comparison range is
      unavailable.
- [ ] Do not add export or unsupported drill-down actions.

### 1.10 Task 1 Scenarios

- [ ] Add deterministic scenarios for:
  - [ ] typical current month;
  - [ ] today;
  - [ ] last seven days;
  - [ ] custom period;
  - [ ] each single filter;
  - [ ] combined filters;
  - [ ] no matching data;
  - [ ] zero paid sales;
  - [ ] unknown customers;
  - [ ] ties;
  - [ ] long labels;
  - [ ] slow query;
  - [ ] fail-next query;
  - [ ] persistent error;
  - [ ] maximum period;
  - [ ] invalid URL filters.
- [ ] Verify reset/reload for all stateful cases.

### 1.11 Task 1 Verification

- [ ] Unit-test filters, dates, aggregates, classifications, reconciliation,
      sorting, and zero cases.
- [ ] Component-test URL filters, chart alternatives, loading/error/empty
      states, and keyboard behavior.
- [ ] Integration-test public source snapshots to every report.
- [ ] Route-test valid, invalid, unavailable, and reload states.
- [ ] Production-boundary-test source disablement and import rules.
- [ ] Playwright-test typical, combined-filter, empty, error-recovery, reset,
      and reload journeys.
- [ ] Run automated axe checks.
- [ ] Manually test keyboard, VoiceOver/NVDA, forced colors, reduced motion,
      coarse pointer, 320px, and 200% zoom.
- [ ] Run from `apps/studio`:
  - [ ] `bun run test`;
  - [ ] `bun run check`;
  - [ ] `bun run build`.
- [ ] Capture light/dark desktop and narrow evidence.
- [ ] Update durable reporting and component documentation.
- [ ] Move the Linear task only with evidence.

## Task 2: Operational Notifications

### Task Metadata

- Title:
  `Build the TRIAD Studio operational notifications visual prototype`
- Suggested branch:
  `feature/eng-54-operational-notifications`
- State: `Ready`
- Priority: `High`
- Completed dependency: ENG-53 / PR #33.
- Active blockers: none.
- Related:
  - ENG-45 operational Dashboard;
  - ENG-47 service fulfillment;
  - ENG-48 checkout/payment;
  - accepted scheduling and front-desk prototypes.

### Task 2 Scope

- Activate the workspace-header notification trigger.
- Add bounded notification preview and exact count.
- Add authenticated `/notifications`.
- Cover all seven official operational categories.
- Implement stable dedupe, severity/order, read state, source-driven
  resolution, safe typed destinations, and bounded history.
- Replace Dashboard attention fixtures with the same notification source.

### Task 2 Exclusions

- Sidebar entry for notifications.
- WhatsApp, email, SMS, mobile/browser push, marketing, or provider integration.
- Polling, WebSockets, server-sent events, background refresh, or persistence.
- Manual resolve, dismiss, snooze, thresholds/preferences, escalation, or quiet
  hours.
- Production per-user read state, retention, audit, or authorization.

### 2.1 Dependency And Baseline Audit

- [ ] Confirm Task 1 is `Done` with merged PR evidence.
- [ ] Start from its merged `staging` revision and record base SHA.
- [ ] Inspect header notification reservation, Dashboard attention surface,
      routes, source composition, scheduling, service-desk, and revenue
      contracts.
- [ ] Run focused existing tests.
- [ ] Inspect shared Popover, Badge, ScrollArea, Empty, Alert/PageStatus, and
      list/table components.
- [ ] Use Bun-driven shadcn discovery before adding any primitive.
- [ ] Record divergences and component decisions.

### 2.2 Notification Visual Specification

- [ ] Define:
  - [ ] header trigger and count;
  - [ ] bounded preview;
  - [ ] `Ver todas as notificações`;
  - [ ] center header/filter/status structure;
  - [ ] active list;
  - [ ] resolved history;
  - [ ] Dashboard preview;
  - [ ] missing-destination recovery.
- [ ] Define wide, medium, 320px, and 200%-zoom behavior.
- [ ] Ensure popover/dialog focus opens and restores correctly.
- [ ] Ensure sticky regions do not obscure focus.
- [ ] Define severity/read/active/resolved semantics without color alone.
- [ ] Validate concise pt-BR category, detail, time, and action copy.

### 2.3 Notification Contracts

- [ ] Add contracts equivalent to:
  - [ ] `OperationalNotification`;
  - [ ] `NotificationCategory`;
  - [ ] `NotificationSeverity`;
  - [ ] `NotificationLifecycle`;
  - [ ] `NotificationDestination`;
  - [ ] `NotificationPreview`;
  - [ ] `NotificationPage`;
  - [ ] repository inputs/results/errors.
- [ ] Include stable notification ID and dedupe key.
- [ ] Include unit, source fact/version, occurrence/resolution time, read state,
      safe summary/detail, and typed destination.
- [ ] Keep PII and arbitrary URLs out of the contract.
- [ ] Define exact active/unread count semantics.
- [ ] Define deterministic ordering and bounded pagination.

### 2.4 Operational Rules

- [ ] Add pure rules for:
  - [ ] queue wait at least 15 minutes;
  - [ ] appointment in the next 10 minutes;
  - [ ] accepted scheduling conflict;
  - [ ] open service past estimated duration plus 15 minutes;
  - [ ] ready-for-payment unpaid session;
  - [ ] relevant blocked slot;
  - [ ] explicit appointment changed/canceled event.
- [ ] Do not infer historical change events from current rows.
- [ ] Deduplicate by category/source subject/version as appropriate.
- [ ] Keep read state independent from operational resolution.
- [ ] Resolve derived notifications only when the source fact no longer
      applies.
- [ ] Define severity and stable tie breaking.
- [ ] Add threshold assumptions to durable docs.

### 2.5 Typed Destinations

- [ ] Create an allowlisted destination union for Agenda, service desk,
      service session, checkout, and fallback contexts.
- [ ] Build destinations from opaque stable IDs only.
- [ ] Keep customer/service/note/payment content out of URLs.
- [ ] Validate targets before navigation.
- [ ] Provide bounded recovery for missing or resolved targets.
- [ ] Mark read on click only through an explicit repository mutation.
- [ ] Never mutate the underlying operation merely by navigating.

### 2.6 Repository And Memory Source

- [ ] Add a narrow `OperationalNotificationsRepository`.
- [ ] Add methods equivalent to:
  - [ ] `getPreview`;
  - [ ] `listNotifications`;
  - [ ] `getNotification`;
  - [ ] `markRead`;
  - [ ] `markAllActiveRead`.
- [ ] Consume current facts/events through accepted public source ports.
- [ ] Replace Dashboard attention fixtures rather than duplicating them.
- [ ] Keep header, Dashboard, and center counts consistent.
- [ ] Make read mutations atomic, idempotent, pending-safe, and generation-safe.
- [ ] Bound active preview and history pages.
- [ ] Increment generation on scenario/reset and discard stale work.
- [ ] Reconstruct selected scenario on reload.
- [ ] Keep source disabled in `hml`/`prd`.

### 2.7 Query Composition

- [ ] Add stable preview/list/detail query keys.
- [ ] Add focused list/read mutations.
- [ ] Invalidate only notification preview/count/list/detail and Dashboard
      attention keys affected by the action/source transition.
- [ ] Avoid polling and background refresh.
- [ ] Let accepted source mutations invalidate/reproject notifications through
      the coordinator boundary.
- [ ] Avoid effect chains for count, ordering, filtering, and read state.
- [ ] Add production-boundary tests.

### 2.8 Header Trigger And Preview

- [ ] Activate the existing reserved header control.
- [ ] Give it an accessible name with the exact unread count.
- [ ] Visually cap counts over 99 as `99+`.
- [ ] Meet target-size and focus requirements.
- [ ] Render a bounded urgent/recent preview.
- [ ] Provide loading, no-active, error, and ready states.
- [ ] Add `Ver todas as notificações`.
- [ ] Trap/restore focus only if the selected primitive requires modal
      semantics; otherwise preserve correct popover focus behavior.
- [ ] Keep the trigger free of fake counts when the source is unavailable.

### 2.9 Notification Center

- [ ] Add authenticated `/notifications` without a primary sidebar entry.
- [ ] Use breadcrumbs and a clear page title.
- [ ] Present active notifications and bounded resolved history.
- [ ] Add only useful filters such as active/read/category when they improve
      validation; do not invent complex preferences.
- [ ] Render category, severity, time, source context, read state, and action.
- [ ] Use accepted pagination for dense history.
- [ ] Provide empty, loading, persistent-error, and partial states.
- [ ] Keep deep-link action names specific and concise.
- [ ] Support mark-one and mark-all-active read with stable labels.
- [ ] Announce mutation outcomes without PII.

### 2.10 Dashboard Integration

- [ ] Replace `Atenção necessária` fixtures with notification preview data.
- [ ] Preserve Dashboard's concise current-day priority.
- [ ] Keep exact header/Dashboard/center counts and item identities consistent.
- [ ] Route Dashboard item actions through typed destinations.
- [ ] Render an unavailable/empty state instead of fallback fake alerts.
- [ ] Avoid broad Dashboard query invalidation.

### 2.11 Task 2 Scenarios

- [ ] Add deterministic scenarios for:
  - [ ] no active notifications;
  - [ ] every official category;
  - [ ] all severities;
  - [ ] duplicate source facts;
  - [ ] more than 99 unread;
  - [ ] read/unread;
  - [ ] operational resolution;
  - [ ] resolved history;
  - [ ] missing destination;
  - [ ] slow load/read;
  - [ ] fail-next read;
  - [ ] persistent error;
  - [ ] header/Dashboard/center consistency;
  - [ ] long bounded content.
- [ ] Verify reset/reload and stale-generation protection.

### 2.12 Task 2 Verification

- [ ] Unit-test thresholds, event requirements, dedupe, severity, ordering,
      read/resolution separation, and typed destinations.
- [ ] Component-test trigger, preview, center, pending/error states, keyboard,
      focus, and accessible count.
- [ ] Integration-test source facts/events to notifications and Dashboard
      preview.
- [ ] Route-test every destination and missing-target recovery.
- [ ] Production-boundary-test source disablement/import rules.
- [ ] Playwright-test preview, all categories, deep links, read state,
      resolution, error recovery, reset, and reload.
- [ ] Run automated axe checks.
- [ ] Manually test keyboard, VoiceOver/NVDA, forced colors, reduced motion,
      coarse pointer, 320px, and 200% zoom.
- [ ] Run from `apps/studio`:
  - [ ] `bun run test`;
  - [ ] `bun run check`;
  - [ ] `bun run build`.
- [ ] Capture light/dark desktop and narrow evidence.
- [ ] Update durable notification, Dashboard, shell, and component docs.
- [ ] Move the Linear task only with evidence.

## Review Gate

- [ ] Confirm no API, persistence, provider, external delivery, polling, or
      realtime scope entered either task.
- [ ] Confirm reports reconcile with accepted source snapshots.
- [ ] Confirm customer recurrence is honest about unknown identity.
- [ ] Confirm chart alternatives and non-color semantics.
- [ ] Confirm notification read state does not resolve operations.
- [ ] Confirm Dashboard/header/center share one notification source.
- [ ] Confirm typed destinations contain no PII/free text.
- [ ] Confirm bounded filters, rankings, previews, and history.
- [ ] Confirm semantic tokens, component anatomy, and pt-BR copy.
- [ ] Confirm no effect-driven derived state.
- [ ] Confirm presentation cannot import `src/dev`.
- [ ] Confirm fail-closed `hml`/`prd` boundary.
- [ ] Confirm accessibility, responsive, test, build, and documentation
      evidence.

## Handoff

### Task 1

- [ ] Record implementation SHA and PR.
- [ ] Attach test/check/build and accessibility evidence.
- [ ] Attach representative filter/chart/table screenshots.
- [ ] Link durable docs.
- [ ] Mark MLP item 13 complete only after evidence.
- [ ] Unblock Task 2 after merge.

### Task 2

- [ ] Record implementation SHA and PR.
- [ ] Attach test/check/build and accessibility evidence.
- [ ] Attach header/Dashboard/center consistency evidence.
- [ ] Link durable docs.
- [ ] Mark MLP item 14 complete only after evidence.
- [ ] Record remaining partial MLP items separately instead of declaring the
      whole tracker complete automatically.

## Suggested Commit Sequence

### Task 1

1. `feat(studio): add reporting contracts`
2. `feat(studio): add deterministic reporting source`
3. `feat(studio): add basic reports experience`
4. `test(studio): cover reporting journeys`
5. `docs(studio): document reporting prototype`

### Task 2

1. `feat(studio): add notification contracts`
2. `feat(studio): add deterministic notification source`
3. `feat(studio): add operational notification experience`
4. `test(studio): cover notification journeys`
5. `docs(studio): document notification prototype`
