# 15 TRIAD Studio Management Insights Visual Prototype

## Summary

Complete the management block of the first visual MLP with two ordered,
frontend-only deliveries:

1. basic operational and revenue reports;
2. an internal operational notification center.

The initiative lets owners and managers explore accepted scheduling, service,
customer, payment, commission, and closing facts, then act on time-sensitive
operational conditions from one coherent notification source. Both deliveries
use deterministic, resettable in-memory data and remain unavailable in
`hml`/`prd`.

## Context

- Current state:
  - The operational Dashboard already offers a current-day snapshot and a
    partial `Atenção necessária` surface.
  - ENG-48 establishes the paid-sale and commission source.
  - ENG-49 is planned to establish cash operations and immutable daily closing.
  - The official UX note lists seven basic reports and seven internal
    notification examples in the first MLP.
  - The initial navigation explicitly includes `Relatórios`, while
    notifications are expected to use the shell notification surface.
- Problem:
  - The Dashboard answers “what is happening now” but cannot support historical
    comparison and management analysis.
  - Operational alerts are currently contextual Dashboard content rather than
    one reusable, navigable source.
  - Without accepted report filters and notification semantics, later backend
    work risks exposing unbounded raw data or duplicating rules across screens.
- Why now:
  - Reports become truthful only after payment, commission, and closing facts
    exist.
  - Notifications can then cover the complete operational journey, including
    payment pending, without a second temporary implementation.
  - These deliveries complete items 13 and 14 of the visual MLP tracker.
- Related sources:
  - Official Maestri UX note: `triad-studio-o-triad-stud`, sections 13 and 14.
  - Visual MLP tracker: `triad-studio-acompanhament`.
  - [ENG-48: Build the TRIAD Studio checkout, payment, and commissions visual prototype](https://linear.app/corvi-io/issue/ENG-48/build-the-triad-studio-checkout-payment-and-commissions-visual).
  - [ENG-49: Build the TRIAD Studio cash operations and daily closing visual prototype](https://linear.app/corvi-io/issue/ENG-49/build-the-triad-studio-cash-operations-and-daily-closing-visual).
  - `docs/initiatives/prds/14-triad-studio-revenue-operations-visual-prototype.md`.
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

## Delivery Units

### Delivery 1: Basic Reports

Add the authenticated top-level `Relatórios` module. Present bounded historical
analysis for revenue, service volume, professional performance, average ticket,
commissions, cancellations/no-shows, and identifiable new/returning customers.
Apply a coherent filter set to all supported projections.

### Delivery 2: Operational Notifications

Activate the shell notification surface and add a focused notification center.
Derive or consume stable operational events for excessive wait, upcoming
appointment, scheduling conflict, overdue open service, pending payment,
blocked time, and changed/canceled appointment. Every actionable notification
has a truthful destination in the accepted product journey.

Delivery 1 depends on ENG-49. Delivery 2 begins from the merged Delivery 1
baseline to avoid concurrent shell/source-composition changes and to reuse the
accepted management-query boundaries, while retaining a separate notification
domain contract.

## Goals

- Answer the seven management questions defined by the official UX source.
- Add global report filters for period, professional, service, and payment
  method.
- Keep aggregates exact, bounded, deterministic, and traceable to accepted
  source snapshots.
- Distinguish Dashboard current-day operations from Reports historical
  analysis.
- Provide a header notification trigger with an exact active/unread count and a
  dedicated center outside primary sidebar navigation.
- Make every operational notification understandable, deduplicated, and
  actionable through a valid deep link.
- Replace the Dashboard's duplicated attention fixtures with a preview derived
  from the same notification source.
- Cover normal, edge, loading, failure, empty, dense, reset, and reload
  scenarios.
- Preserve explicit future API, authorization, pagination, and event-feed
  seams without implementing them.

## Non-Goals

- Real backend, database, OpenAPI, provider, persistence, polling, WebSockets,
  server-sent events, or background refresh.
- CSV, spreadsheet, PDF, print, scheduled reports, custom report builder, saved
  views, forecasting, benchmarking, or arbitrary drill-down.
- WhatsApp, email, SMS, mobile push, browser push, marketing, campaigns, or
  promotional notifications.
- User-configurable notification thresholds, channels, quiet hours, snooze, or
  escalation policy.
- Production business-role authorization or a UI role switcher.
- Production audit history, retention policy, notification delivery receipt,
  or cross-device read state.
- Fabricating canonical customer identity when accepted sources do not provide
  a stable reference.
- Moving report or notification business rules into `apps/idp`.
- A generic cross-domain `insights` package or catch-all shared module.
- Replacing Dashboard, Caixa, Agenda, Atendimentos, Clientes, Profissionais, or
  Serviços with report-owned data.

## Brainstorm

### Problem Framing

- Owners and managers need to move from operating the current day to
  understanding a selected period.
- Reception and professionals need timely signals that point to the exact
  operational surface where work can continue.
- Reports answer historical questions. Notifications answer “what requires
  attention now.” Combining their UI into one route would weaken both jobs.
- The initiative groups them because both complete the management block and
  depend on the accepted operational/revenue sources, not because they are one
  domain aggregate.

### Gaps And Unknowns

#### Product Gaps

- The UX source defines report names and filters, but not chart types,
  comparison periods, date limits, ordering, or drill-down behavior.
- It does not define notification read, resolve, dismiss, snooze, or retention
  semantics.
- `Cliente aguardando há muito tempo` lacks a threshold.
- `Atendimento aberto sem finalização` lacks an overdue rule.
- Access profiles are documented, but production business roles do not yet
  exist in the accepted Studio/API contract.
- Customer sources do not yet guarantee one canonical client identity across
  all prototype modules.

#### Accepted Prototype Assumptions

- Reports default to the current calendar month from an injected source clock.
- The selectable period is inclusive and limited to 366 calendar days in one
  query. This is a prototype query-bound assumption, not a final commercial
  policy.
- Report filters are stored in URL search parameters because they are useful
  for review and handoff.
- Waiting becomes excessive after 15 minutes in the prototype.
- An open service becomes overdue after its estimated duration plus a
  15-minute grace period.
- An upcoming appointment notification covers the next 10 minutes, matching
  the official example.
- A ready-for-payment session produces a pending-payment notification
  immediately.
- Active notifications can be marked read in the deterministic session but
  cannot be dismissed or snoozed.
- Resolution comes from the underlying operational fact, not from clicking
  `Marcar como lida`.
- Changed/canceled appointment notifications require an accepted event
  snapshot; they are never inferred only from the current appointment row.

#### Technical Gaps

- The implementing agent must begin from a `staging` revision that includes
  ENG-49 and inspect the actual revenue/closing contracts before editing.
- Current Dashboard attention items may still be fixture-specific. Delivery 2
  must replace, not wrap, that source.
- Charts may require the official shadcn Chart/Recharts composition. The
  implementation must inspect installed components and bundle impact first.
- The future API needs aggregate query contracts, not raw in-browser scans of
  potentially millions of appointments or sales.
- Notification events and derived conditions need stable IDs so read state,
  deduplication, sorting, and deep links survive retry/reset deterministically.

#### Data Gaps

- Reports need:
  - unit and inclusive period;
  - optional professional, service, and payment method filters;
  - exact aggregate values;
  - comparison semantics where shown;
  - bounded ranked series;
  - stable source clock and timezone.
- Customer new/returning analysis needs a stable customer analysis key and a
  first completed paid-visit date.
- Unknown/walk-in customers without a stable key must be reported separately
  and excluded from new-versus-returning percentages.
- Notifications need:
  - stable notification ID and dedupe key;
  - category, severity, occurrence time, and unit;
  - active/resolved operational state;
  - unread/read presentation state;
  - safe summary and supporting detail;
  - typed destination and destination parameters;
  - source fact/version.

### Counterpoints

- One combined implementation task would reduce planning overhead, but the
  seven reports plus filters, charts, tables, notification shell, rule engine,
  and Dashboard integration are too large for one reliable visual review.
- A top-level `Notificações` sidebar entry would be easy to discover, but it is
  absent from the accepted navigation and would compete with primary daily
  modules. Use the header bell and a dedicated route instead.
- Keeping Dashboard attention fixtures and adding a separate notification list
  would be faster, but counts and wording would drift. Delivery 2 must make the
  notification source reusable.
- Scanning every synthetic appointment and sale in React would work at demo
  size, but it would teach the wrong production boundary. Aggregation belongs
  behind repository queries even in memory.
- Exporting reports is a common expectation, but it adds file generation,
  privacy, formatting, and authorization decisions not requested by the first
  MLP.
- A “mark resolved” button would appear useful, but operational resolution must
  come from fixing the underlying scheduling, service, or payment state.
- Adding real role controls would make report visibility look complete, but
  frontend-only visibility is not authorization. Deterministic scope scenarios
  can validate presentation without claiming access enforcement.

### Options

| Option | Description | Pros | Cons | Decision |
| --- | --- | --- | --- | --- |
| A | One route combining reports and notifications | Fewer routes | Mixes historical analysis with urgent work | Reject |
| B | One initiative, two tasks and two domain modules | Coherent MLP outcome with reviewable deliveries | Requires explicit cross-source ports | Accept |
| C | Add reports only and leave Dashboard alerts as-is | Smaller next task | Leaves MLP notifications partial and duplicated | Reject |
| D | Build API read models and realtime event delivery now | Durable production foundation | Premature before visual/behavior validation | Future |

### Recommendation

Choose Option B.

Create a `reporting` Studio module for bounded aggregate queries and an
`operational-notifications` Studio module for active/event notification
contracts. Keep both frontend-only through replaceable repository ports and
deterministic sources. Delivery 1 establishes the management route/filter
patterns after ENG-49. Delivery 2 activates the shell bell and replaces the
Dashboard attention fixtures with the notification source.

## Architecture And Boundaries

### App Ownership

- Site impact: none.
- API impact: none in this initiative; future aggregate and notification
  contracts belong to `apps/api`.
- IDP impact: none; IDP remains limited to identity/session concerns.
- Studio impact:
  - `apps/studio/src/modules/reporting/**`;
  - `apps/studio/src/modules/operational-notifications/**`;
  - private routes for `/reports` and `/notifications`;
  - module registry/sidebar change only for `Relatórios`;
  - workspace header bell integration;
  - Dashboard attention preview integration.
- Data/persistence impact: deterministic in-memory sources only.
- External provider impact: none.

### Source Composition

- Compose reporting through a virtual source equivalent to
  `virtual:studio-reporting-source`.
- Compose notifications through a virtual source equivalent to
  `virtual:studio-operational-notifications-source`.
- Prefer deriving their enablement from the accepted operational/revenue
  prototype composition instead of adding public env variables.
- Both resolve disabled in `hml` and `prd`.
- Presentation consumes module-owned repository ports through TanStack Query.
- Production code never imports `src/dev`.
- No fake HTTP, local storage persistence, auth interception, polling, or
  realtime transport.

### Reporting Source Of Truth

- Scheduling owns appointments, cancellations, no-shows, services, and
  professional attribution.
- Service desk owns accepted service-session facts.
- Revenue operations owns paid sales, exact net revenue, payment methods, and
  commission snapshots.
- Cash operations owns immutable closing facts but does not replace paid-sale
  detail.
- Clients owns accepted customer profiles; analytics uses only a stable
  reference explicitly available through public source snapshots.
- Reporting owns projections, filter contracts, ranking, and presentation
  metadata. It does not mutate source records.

### Notification Source Of Truth

- Derived conditions use current public source snapshots:
  - excessive queue wait;
  - appointment in the next 10 minutes;
  - scheduling conflict;
  - overdue open service;
  - pending payment;
  - active blocked slot.
- Event notifications use explicit source events:
  - appointment changed;
  - appointment canceled.
- The notification repository owns stable IDs, deduplication, read state, active
  ordering, resolved history, and typed destinations.
- Clicking or reading never resolves an operational condition.
- Dashboard consumes a bounded active preview from this repository.

## Delivery 1 Product Contract

### Route And Navigation

- Add authenticated `/reports`.
- Add `Relatórios` to the primary module registry after `Caixa`.
- Keep sidebar, collapsed sidebar, mobile navigation, overview shortcuts, and
  breadcrumbs coherent.
- Use `Relatórios` as the active module.
- Keep filters in canonical URL search parameters:
  - `from`;
  - `to`;
  - optional `professional`;
  - optional `service`;
  - optional `paymentMethod`.
- Never include customer names, notes, or private financial payloads in URLs.

### Report Filters

- Default period: current calendar month from the source clock.
- Support quick periods equivalent to:
  - `Hoje`;
  - `Últimos 7 dias`;
  - `Este mês`;
  - `Personalizado`.
- Custom dates use the shared DatePicker and canonical local `YYYY-MM-DD`
  values.
- The period is inclusive, ordered, and no longer than 366 days.
- Professional, service, and payment filters use accepted catalogs/facets.
- One filter set applies consistently to every supported report.
- Filter changes query the repository and never filter only a loaded page.
- Provide an explicit `Limpar filtros` action when non-default filters exist.

### Initial Reports

1. `Faturamento por período`
   - exact paid net revenue;
   - time series appropriate to the selected period;
   - optional previous-equivalent-period comparison only when both ranges are
     valid and explicitly labeled.
2. `Atendimentos por profissional`
   - completed paid visits or performed service items, with the chosen unit
     stated explicitly;
   - deterministic descending ranking.
3. `Serviços mais vendidos`
   - paid service-item quantity and exact net revenue;
   - bounded ranking plus accessible table.
4. `Ticket médio`
   - paid-sale net revenue divided by paid-sale count;
   - zero-state behavior without division errors.
5. `Comissões por profissional`
   - immutable item commission snapshots;
   - exact commission and associated net service revenue.
6. `Cancelamentos e ausências`
   - cancellation and no-show counts/rates from scheduling;
   - denominator stated in the UI.
7. `Clientes novos e recorrentes`
   - identifiable customers only;
   - new when their first completed paid visit is inside the selected period;
   - returning when a prior completed paid visit exists;
   - unknown customer count shown separately and excluded from the ratio.

### Presentation

- Start with a concise summary row and then one clearly titled section per
  report.
- Prefer the official shadcn Chart composition if it is compatible with the
  accepted Studio stack and bundle budget.
- Every chart has:
  - a concise textual takeaway;
  - programmatic title/description;
  - accessible values through a table or equivalent list;
  - non-color series differentiation;
  - keyboard-accessible tooltip/legend behavior where interactive.
- Dense detail uses bounded tables with accepted responsive patterns.
- Do not add export, print, arbitrary chart switching, or fake drill-down.

## Delivery 2 Product Contract

### Entry Points

- Activate the existing workspace-header notification trigger.
- Show the exact unread active count, capped visually as `99+` while preserving
  the accessible exact count.
- Trigger opens a bounded preview with the most urgent/recent active items.
- Provide `Ver todas as notificações` to authenticated `/notifications`.
- Do not add `Notificações` to the primary sidebar.
- Dashboard `Atenção necessária` becomes a bounded preview of the same active
  notification source.

### Notification Categories

- `Cliente aguardando há muito tempo`
  - active when queue wait is at least 15 minutes;
  - links to the relevant service-desk entry.
- `Próximo atendimento em 10 minutos`
  - active for an upcoming scheduled appointment inside the next 10 minutes;
  - links to the appointment/Agenda context.
- `Conflito de agenda`
  - active for accepted scheduling conflict facts;
  - links to the conflicting Agenda context.
- `Atendimento aberto sem finalização`
  - active after estimated performed duration plus 15-minute grace;
  - links to the service session.
- `Pagamento pendente`
  - active while a session is ready for payment and unpaid;
  - links to checkout.
- `Horário bloqueado`
  - active for relevant upcoming/day blocked slots;
  - links to Agenda context.
- `Agendamento alterado ou cancelado`
  - created from an explicit event snapshot;
  - links to current appointment context when available, otherwise Agenda.

### Lifecycle And Ordering

- Stable severity levels: informational, attention, and critical.
- Severity is communicated by text/icon in addition to color.
- Active items sort by severity, occurrence time, then stable ID.
- Duplicate rules collapse through a stable dedupe key.
- Read/unread is a presentation state and survives deterministic in-session
  navigation.
- Resolution follows the underlying operational fact.
- Resolved items can appear in a bounded history section.
- No dismiss, snooze, manual resolve, channel preference, or external delivery.
- Mark-read actions are atomic, idempotent, and generation-safe.

### Safe Deep Links

- Destinations are a typed allowlist, not arbitrary URLs.
- Route parameters use opaque stable IDs only.
- Customer names, phone numbers, notes, financial values, and free text never
  enter the URL.
- Missing/resolved destinations show a bounded recovery message and return
  path.
- Clicking a notification may mark it read but must not mutate the underlying
  operational fact.

## Deterministic Scenario Matrix

### Reporting

- typical current month;
- today and last seven days;
- custom date range;
- professional filter;
- service filter;
- payment method filter;
- combined filters;
- no matching data;
- zero paid sales;
- unknown customers;
- single and multiple professionals;
- ties in ranked services;
- cancellations without no-shows and vice versa;
- long labels;
- slow query;
- fail-next query;
- persistent error;
- maximum accepted period;
- invalid URL filters normalized safely.

### Notifications

- no active notifications;
- one notification for every official category;
- multiple severities;
- duplicate source facts;
- more than 99 unread items;
- read/unread transitions;
- underlying fact resolution;
- resolved history;
- missing deep-link target;
- slow load/mutation;
- fail-next mark-read;
- persistent error;
- Dashboard/header/center consistency;
- stale delayed work after reset.

### Reset Contract

- Scenario and reset reconstruct deterministic state.
- Reload restores the selected scenario.
- Reset increments generation for reporting and notification sources.
- Delayed reads or mark-read mutations from a stale generation are discarded.
- Reset cannot preserve filters, notification read state, or source mutations
  from a different scenario unless the scenario contract explicitly does so.
- Scenario/reset controls remain outside ordinary product chrome.

## Performance And Scalability

- Repository methods accept bounded filters and return aggregates, facets, and
  paginated/bounded rows.
- The browser must not fetch every raw appointment, sale, customer, or
  notification to calculate production-like reports.
- Ranked report series have explicit limits and deterministic tie breaking.
- Dense tables use accepted pagination contracts.
- Notification preview is bounded independently from notification history.
- Future API queries require tenant/unit/date scoping and indexes appropriate to
  source date, professional, service, payment method, status, and stable ID.
- Future reporting may use read models/materialized aggregates after measured
  need; do not introduce them in the frontend prototype.
- Future notification delivery needs event idempotency, deduplication,
  retention, and per-user read-state persistence.
- Start independent report queries together and avoid request waterfalls.
- Consider route-level loading for chart code if bundle inspection shows a
  meaningful cost.
- Memoize only measured expensive pure projections.
- Do not claim production capacity from bounded memory fixtures.

## Security, Privacy, And Abuse

- Authentication remains the existing Studio session gate.
- Deterministic scope scenarios do not represent production authorization.
- Future API must enforce unit, role, report, financial, and professional
  self-scope access server-side.
- Do not log:
  - customer names, contact data, notes, or stable customer analysis keys;
  - raw appointment/service/sale/commission/closing payloads;
  - notification body/detail text;
  - tokens, credentials, headers, or private identifiers.
- Do not place sensitive values in URLs, toasts, telemetry, chart labels, or
  accessible names.
- Bound filters and list sizes to limit accidental resource abuse.
- Notification dedupe prevents one source condition from flooding the center.
- No external channel exists, so spam, opt-out, provider cost, and template
  concerns remain explicitly deferred.

## Accessibility And UX

- Meet WCAG 2.2 AA expectations for both journeys.
- Support keyboard-only filtering, chart/table traversal, notification preview,
  mark-read actions, and deep-link navigation.
- Preserve visible and unobscured focus with sticky headers/footers.
- Use native semantics and at least 24 by 24 CSS pixel targets.
- Give charts textual summaries and accessible table/list equivalents.
- Do not rely on color alone for series, trends, severity, read state, or
  report status.
- Announce filter-result counts and mark-read outcomes concisely without moving
  focus unnecessarily.
- Preserve stable button labels and shared loading behavior.
- Provide explicit loading, empty, partial/unavailable, invalid-filter,
  persistent-error, and recovery states.
- Support light, dark, system, forced colors, reduced motion, coarse pointer,
  320 CSS pixels, and 200% zoom.
- Avoid document-level horizontal overflow; use semantic card/list
  alternatives for dense tables at narrow widths.
- Validate automated axe checks and manual VoiceOver or NVDA journeys.

## Component And Frontend Standards

- Inspect current Studio components before official shadcn registry discovery.
- Inspect chart, table, popover, tabs, badge, empty, skeleton, alert, and tooltip
  contracts before adding or composing them.
- Use Bun-driven shadcn commands and review Base UI/Vite compatibility, source,
  license, bundle cost, tokens, keyboard, focus, and responsive behavior.
- Use full shared component anatomy and semantic Tailwind tokens.
- Do not paste a new palette, add raw colors, or duplicate manual dark styles.
- Use `ModuleLayout`, `PageHeader`, accepted filter/drawer components, and
  module registry conventions.
- Store useful report filters in TanStack Router search state.
- Derive aggregate display values, active counts, severity ordering, and
  enabled actions through pure projections, not `useEffect` chains.
- Use stable exact query keys and narrow invalidation.
- Prefer explicit variants/slots or compound composition over boolean-prop
  proliferation.
- Keep UI and validation copy Brazilian Portuguese; keep code, filenames,
  routes, docs, tests, branches, commits, and PRs English.

## Logging And Observability

- Safe development events:
  - report query started/completed/failed;
  - notification list loaded/failed;
  - notification marked read;
  - notification deep link resolved/failed;
  - source/scenario generation.
- Safe fields:
  - technical route/report/category identifiers;
  - bounded result counts;
  - latency;
  - stable error codes;
  - scenario name in development only.
- Metrics for a future backend:
  - report query latency/error rate by report type;
  - bounded result size;
  - active notification count by category/severity;
  - notification generation/deduplication/resolution rate;
  - broken typed-destination count.
- Future traces should cover aggregate repository queries and notification event
  projection without recording raw business payload.
- Alert on repeated report query failure, notification projection failure, or
  broken destination rates only after a production backend exists.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Reports disagree with Dashboard/Caixa | Read accepted public source snapshots and test reconciliation invariants |
| Charts hide values from assistive technology | Textual takeaway plus accessible table/list equivalent |
| Customer recurrence is fabricated | Require stable analysis key; show unknown separately |
| Browser scans imply production scalability | Aggregate repository contract and bounded memory fixtures |
| Notification count differs across shell/Dashboard/center | One operational notification repository |
| Marking read appears to resolve work | Separate read state from source-driven operational resolution |
| Notification noise overwhelms users | Stable dedupe, bounded preview/history, severity ordering |
| External messaging slips into scope | Explicitly exclude WhatsApp/email/SMS/push and provider configuration |
| Frontend role scenario is mistaken for authorization | Label evaluation scope and defer server-enforced roles |
| New chart dependency bloats initial bundle | Inspect bundle and use route-level loading when justified |

## Acceptance Criteria

### Delivery 1

- [ ] `/reports` exists as an authenticated primary module after `Caixa`.
- [ ] Period, professional, service, and payment method filters use one
      consistent bounded repository query contract.
- [ ] The seven official reports are represented truthfully.
- [ ] Revenue, ticket, and commission values reconcile exactly with accepted
      paid-sale/commission facts.
- [ ] Cancellation/no-show denominators and customer identity limitations are
      explicit.
- [ ] Unknown customers are excluded from new/returning ratios and shown
      separately.
- [ ] Every chart has a textual takeaway and accessible table/list equivalent.
- [ ] Filters survive deep-link/reload and invalid URL values recover safely.
- [ ] No export, raw-data scan, backend, or production authorization claim is
      introduced.

### Delivery 2

- [ ] The header bell exposes an exact accessible active/unread count and a
      bounded preview.
- [ ] `/notifications` presents all seven official operational categories.
- [ ] Dashboard attention, header preview, and notification center use one
      source.
- [ ] Stable deduplication prevents duplicate active notifications.
- [ ] Read state is distinct from source-driven operational resolution.
- [ ] Every actionable notification uses a typed safe destination.
- [ ] Missing destinations recover without exposing sensitive values.
- [ ] No sidebar entry, external channel, polling, realtime, manual resolve,
      dismiss, or snooze is introduced.

### Shared Quality

- [ ] Both deliveries use deterministic, resettable, generation-safe memory
      sources.
- [ ] Presentation does not import `src/dev`.
- [ ] Both sources resolve disabled in `hml` and `prd`.
- [ ] Loading, empty, error, dense, slow, fail-next, reset, and reload states
      are covered.
- [ ] Keyboard, focus, screen-reader, forced-colors, reduced-motion, coarse
      pointer, 320px, 200%-zoom, and light/dark/system requirements pass.
- [ ] Focused unit, component, integration, route, production-boundary, and
      Playwright tests pass.
- [ ] `bun run test`, `bun run check`, and `bun run build` pass from
      `apps/studio`.
- [ ] Durable Studio documentation explains accepted contracts and future API
      boundaries.

## Verification Plan

- Unit tests:
  - date/filter normalization and bounds;
  - exact aggregate reconciliation;
  - rankings and tie breaking;
  - ticket/rate zero cases;
  - customer new/returning/unknown classification;
  - notification rule thresholds, dedupe, ordering, read state, and typed
    destinations.
- Component tests:
  - filters and URL state;
  - chart/table accessible alternatives;
  - preview/center consistency;
  - mark-read pending/failure;
  - keyboard/focus behavior.
- Integration tests:
  - accepted source snapshots to reports;
  - source mutations to notification resolution;
  - Dashboard/header/center shared projections;
  - reset generation safety.
- UI tests:
  - representative report filters;
  - empty/error/reload;
  - every notification category and deep link;
  - read versus resolved behavior.
- Manual/browser checks:
  - light/dark/system;
  - 320 CSS pixels and 200% zoom;
  - keyboard-only;
  - VoiceOver or NVDA;
  - forced colors, reduced motion, and coarse pointer.
- Commands from `apps/studio`:
  - `bun run test`;
  - `bun run check`;
  - `bun run build`;
  - relevant Playwright coverage.

## Open Questions And Deferred Decisions

- [ ] Confirm final production report-period limits during API design.
- [ ] Define server-enforced business-role scopes for financial reports and
      professional self-view.
- [ ] Define canonical cross-module customer identity before production
      recurrence analytics.
- [ ] Define notification retention, per-user read state, thresholds,
      preferences, escalation, and delivery channels in a later API/provider
      initiative.
- [ ] Decide whether export, saved filters, scheduled delivery, and report
      comparison become post-MLP initiatives.

## Definition Of Done

- Delivery 1 is merged before Delivery 2 implementation begins.
- Both Linear tasks meet their independent acceptance criteria.
- Reports and notifications are visually validated with deterministic data,
  reset/reload, and failure recovery.
- MLP tracker items 13 and 14 move to complete only after implementation
  evidence exists.
- The initiative remains frontend-only and contains no production data,
  authorization, external messaging, or scalability claim.
- Documentation, screenshots, accessibility evidence, tests, and Linear/GitHub
  links are attached at handoff.
