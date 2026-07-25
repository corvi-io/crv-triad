# 16 TRIAD Studio First MLP Completion Visual Prototype - Execution Plan

## Source

- PRD:
  `docs/initiatives/prds/16-triad-studio-first-mlp-completion-visual-prototype.md`
- Official UX source: connected Maestri note `triad-studio-o-triad-stud`,
  sections 1, 3, 7, 8, access profiles, and construction priority.
- Visual MLP tracker: connected Maestri note
  `triad-studio-acompanhament`.
- Existing setup initiative:
  `docs/initiatives/prds/07-triad-studio-barbershop-setup-visual-prototype.md`.
- Existing Agenda refinement:
  `docs/initiatives/prds/09-triad-studio-agenda-visual-refinement.md`.
- Management dependency:
  [ENG-54: Build the TRIAD Studio operational notifications visual prototype](https://linear.app/corvi-io/issue/ENG-54/build-the-triad-studio-operational-notifications-visual-prototype).
- Linear initiative:
  [TRIAD Studio First MLP Completion Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-first-mlp-completion-visual-prototype-5aa3efee6495).
- Delivery tasks:
  - [ENG-55: Complete the TRIAD Studio setup, services, and professionals visual prototype](https://linear.app/corvi-io/issue/ENG-55/complete-the-triad-studio-setup-services-and-professionals-visual).
  - [ENG-56: Build the TRIAD Studio weekly Agenda visual prototype](https://linear.app/corvi-io/issue/ENG-56/build-the-triad-studio-weekly-agenda-visual-prototype).

## Delivery Contract

Deliver two ordered frontend-only tasks:

1. setup, services, and professionals completion;
2. weekly Agenda completion.

Task 1 is blocked by ENG-54. Task 2 is blocked by Task 1. Both use
deterministic, resettable in-memory data in `local`/`dev`, remain disabled in
`hml`/`prd`, and introduce no backend, persistence, production authorization,
provider, polling, or realtime behavior.

## Shared Readiness Gate

- [ ] Confirm the direct blocking issue is `Done`.
- [ ] Confirm its implementation PR is merged into `staging`.
- [ ] Fetch the latest `origin/staging`.
- [ ] Create an isolated checkout or Maestri floor from that revision.
- [ ] Record the base SHA in the Linear handoff.
- [ ] Read root and Studio `AGENTS.md`.
- [ ] Read the PRD and this execution plan completely.
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
- [ ] Read current durable setup, Agenda, checkout, commission, Dashboard,
      reporting, notification, component-system, theme, and deployment docs.
- [ ] Inspect merged source contracts and record any divergence before editing.

## Shared Implementation Principles

- Extend existing `barbershop-setup` and `scheduling` modules; do not create a
  catch-all `mlp-completion` runtime module.
- Keep production modules independent of `src/dev`.
- Compose deterministic adapters through accepted virtual source boundaries.
- Consume cross-module facts through public contracts or a narrow coordinator;
  never import another module's presentation or fixtures.
- Keep `hml` and `prd` fail closed and artifact-clean.
- Keep frontend access settings explicitly separate from auth/session and
  server authorization.
- Keep paid-sale and commission snapshots immutable when setup rules change.
- Use integer cents and minutes in contracts; format only at presentation.
- Keep shareable non-PII state in URL parameters and form/PII payloads out.
- Reuse existing Studio and shadcn components before adding new ones.
- Inspect official shadcn and reviewed compatible registry candidates before
  accepting a calendar/layout dependency.
- Keep UI/validation copy in Brazilian Portuguese and technical artifacts in
  English.
- Use pure projections instead of effect-driven derived state.
- Keep exact query keys, bounded reads, focused invalidation, generation
  guards, rollback, and retry.
- Do not log PII, business payloads, schedules, financial values, permissions,
  credentials, tokens, cookies, or private headers.

## Task 1: Setup, Services, And Professionals Completion

### Task Metadata

- Title:
  `Complete the TRIAD Studio setup, services, and professionals visual prototype`
- Suggested branch: assigned by Linear from the final issue identifier.
- State: `Ready`.
- Priority: `High`.
- Assignee: Marcus Gabriel.
- Blocked by: ENG-54.
- Linear:
  [ENG-55](https://linear.app/corvi-io/issue/ENG-55/complete-the-triad-studio-setup-services-and-professionals-visual).
- Closes visual MLP tracker items 1, 7, and 8.

### Task 1 Scope

- Complete the six-step first-use setup journey.
- Add bounded barbershop identity/contact setup.
- Add accepted payment-method configuration.
- Add per-professional service price/duration exceptions.
- Complete professional details, demonstrative access settings, and operational
  view.
- Integrate accepted settings with scheduling, checkout, commission, and
  professional summaries through public contracts.

### Task 1 Exclusions

- API, database, durable storage, IDP roles, organizations, invitations, real
  RBAC, uploads, fiscal configuration, payment gateway behavior, payroll, or
  public professional profiles.
- Visible scenario/reset/debug chrome.
- Production enablement in `hml` or `prd`.

### 1.1 Dependency And Baseline Audit

- [ ] Confirm ENG-54 is `Done` with merged PR and branch-cleanup evidence.
- [ ] Inspect setup, Agenda, service desk, checkout, commission, reporting,
      notification, workspace registry, source composition, and dev engines.
- [ ] Run focused existing setup/scheduling/revenue tests before changes.
- [ ] Inventory current setup contracts, forms, repositories, URL state,
      scenarios, and shared components.
- [ ] Record every required shared-component or contract change before editing.
- [ ] Confirm no unrelated user-owned changes will be overwritten.

### 1.2 Experience Specification

- [ ] Define the six-step hierarchy before JSX:
  - [ ] Dados da barbearia;
  - [ ] Horários;
  - [ ] Profissionais;
  - [ ] Serviços;
  - [ ] Pagamentos e comissões;
  - [ ] Revisão.
- [ ] Define first-use, resume, incomplete, complete, and maintenance entry
      behavior.
- [ ] Keep the existing setup hub as the post-onboarding maintenance surface.
- [ ] Define wide, medium, 320px, and 200%-zoom compositions.
- [ ] Define light/dark/system, forced-color, reduced-motion, coarse-pointer,
      and long-content behavior.
- [ ] Review all pt-BR headings, descriptions, validation, confirmation,
      success, empty, and unavailable copy.

### 1.3 Setup Completion Contracts

- [ ] Add contracts equivalent to:
  - [ ] `BarbershopProfile`;
  - [ ] `SetupStep`;
  - [ ] `SetupReadiness`;
  - [ ] `PaymentMethodSetting`;
  - [ ] `ProfessionalAccessPolicy`;
  - [ ] `ProfessionalServiceOverride`;
  - [ ] `ProfessionalOperationalSummary`.
- [ ] Define pure required-fact rules for every step.
- [ ] Derive the next incomplete step without separate persisted completion.
- [ ] Keep stable identifiers and deterministic ordering.
- [ ] Define unavailable/partial reasons rather than fabricated zero values.
- [ ] Keep cents, minutes, canonical date-only values, and explicit local time.

### 1.4 Barbershop Data And Hours

- [ ] Add display name, phone, and email with Brazilian masks/validation where
      applicable.
- [ ] Reuse the primary unit address and existing operating-hours contracts.
- [ ] Do not add legal registration, tax, logo, upload, or white-label fields.
- [ ] Preserve unit availability, days off, breaks, recurrence, and exceptions.
- [ ] Focus the first invalid field and prevent duplicate submission.
- [ ] Add rollback/retry for delayed or failed mutations.

### 1.5 Professionals

- [ ] Complete professional detail fields for:
  - [ ] name;
  - [ ] photo presentation without upload;
  - [ ] contact;
  - [ ] specialties/services;
  - [ ] units;
  - [ ] working hours and days off;
  - [ ] commission;
  - [ ] status;
  - [ ] account-access presentation;
  - [ ] demonstrative access policy.
- [ ] Cover the official access choices:
  - [ ] own Agenda only;
  - [ ] create appointments;
  - [ ] change prices;
  - [ ] register payments;
  - [ ] view revenue;
  - [ ] view commissions;
  - [ ] access other professionals' data.
- [ ] Use safe defaults and prevent internally contradictory combinations.
- [ ] Keep access values detached from `AuthGate`, routes, sessions, IDP users,
      and server data.
- [ ] Add a professional drawer/profile with Summary, Operation, and Access
      concerns using existing drawer/tab composition.
- [ ] Show bounded current-day Agenda, availability, assigned services,
      resolved overrides, commission facts, and valid deep links.
- [ ] Do not create a role switcher or impersonation UI.

### 1.6 Services And Professional Variations

- [ ] Extend service configuration with optional professional overrides.
- [ ] Require the professional to be active and eligible for the service.
- [ ] Allow one override per service/professional pair.
- [ ] Allow price, duration, or both; reject an empty override.
- [ ] Make the default value visually clear before and after an override.
- [ ] Clearing an override restores the default for future prototype actions.
- [ ] Preserve historical paid-item and commission snapshots.
- [ ] Resolve appointment duration/price through the accepted public contract.
- [ ] Add conflict and dependency messages for archived or unlinked records.

### 1.7 Payments And Commissions

- [ ] Configure Pix, cash, debit card, credit card, and mixed payment.
- [ ] Require at least one active base payment method.
- [ ] Enable mixed payment only when at least two base methods are active.
- [ ] Keep ordering and labels deterministic.
- [ ] Consume the configured choices in future prototype checkout sessions.
- [ ] Preserve already-paid sale snapshots when settings change.
- [ ] Reuse accepted commission rules; do not duplicate the calculation engine.
- [ ] Explain that the system records payment and does not process it.

### 1.8 Guided Journey

- [ ] Add stable Back/Continue/Review/Enter workspace behavior.
- [ ] Make completed steps reviewable without losing progress.
- [ ] Resume at the first incomplete step after route return/reload in the
      selected deterministic session.
- [ ] Derive progress from readiness rules and announce it accessibly.
- [ ] Keep one recommended next action.
- [ ] Provide a final review that links to incomplete sections and prevents
      false completion.
- [ ] Route final entry to the accepted authenticated default destination.
- [ ] Keep all maintenance sections reachable after completion.

### 1.9 Repository And Source Composition

- [ ] Extend the narrow setup repository instead of exposing memory internals.
- [ ] Add bounded reads/mutations for profile, payment settings, overrides,
      access policy, and professional summary.
- [ ] Consume public scheduling/revenue/commission facts through a narrow
      coordinator when necessary.
- [ ] Start independent reads together.
- [ ] Use exact query keys and focused invalidation.
- [ ] Increment generation on scenario/reset and discard stale results.
- [ ] Reconstruct the selected deterministic scenario on reload.
- [ ] Keep the source disabled and fixtures excluded in `hml`/`prd`.

### 1.10 Task 1 Scenarios

- [ ] Add deterministic scenarios for:
  - [ ] first use/incomplete;
  - [ ] resume midway;
  - [ ] complete setup;
  - [ ] missing barbershop contact;
  - [ ] no professionals;
  - [ ] no services;
  - [ ] no payment method;
  - [ ] one versus multiple payment methods;
  - [ ] default and overridden service values;
  - [ ] archived/unlinked professional;
  - [ ] restricted access presentation;
  - [ ] typical and busy professional operation;
  - [ ] empty operational facts;
  - [ ] long labels/content;
  - [ ] slow read/mutation;
  - [ ] fail-next read/mutation;
  - [ ] persistent error.
- [ ] Verify reset and reload for all stateful scenarios.

### 1.11 Task 1 Verification

- [ ] Unit-test readiness, step ordering, field validation, payment rules,
      override resolution, access defaults, summaries, snapshots, and rollback.
- [ ] Component-test onboarding navigation, forms, progress announcements,
      professional tabs, access descriptions, loading/error/empty states, and
      keyboard behavior.
- [ ] Integration-test setup settings through scheduling, checkout, commission,
      and operational summaries.
- [ ] Route-test valid, invalid, unavailable, resume, complete, and reload
      states.
- [ ] Production-boundary-test source disablement, imports, and authorization
      separation.
- [ ] Playwright-test first use, resume, review, edit-after-completion,
      overrides, payment settings, professional view, error recovery, reset,
      and reload.
- [ ] Run automated axe checks.
- [ ] Manually test keyboard, assistive technology, forced colors, reduced
      motion, coarse pointer, 320px, and 200% zoom.
- [ ] Capture light/dark desktop and narrow evidence.
- [ ] Update setup and component-system documentation.
- [ ] Run all shared verification commands.
- [ ] Move the Linear task only with evidence.
- [ ] Update MLP tracker items 1, 7, and 8 only after merge evidence.

## Task 2: Weekly Agenda Completion

### Task Metadata

- Title: `Build the TRIAD Studio weekly Agenda visual prototype`
- Suggested branch: assigned by Linear from the final issue identifier.
- State: `Ready`.
- Priority: `High`.
- Assignee: Marcus Gabriel.
- Blocked by: Task 1.
- Linear:
  [ENG-56](https://linear.app/corvi-io/issue/ENG-56/build-the-triad-studio-weekly-agenda-visual-prototype).
- Closes visual MLP tracker item 3.

### Task 2 Scope

- Add a complete seven-day Agenda view.
- Preserve the accepted daily board and period list.
- Support general and professional-filtered weekly planning.
- Preserve creation, inspection, editing, cancellation, rescheduling,
  availability/conflict rules, and accessibility.

### Task 2 Exclusions

- API, persistence, realtime, recurrence, month/year views, resize-to-duration,
  automatic scheduling, room/resources, or visible prototype controls.
- A nested days-by-professionals-by-slots matrix.
- Changing appointment status as a side effect of drag.

### 2.1 Dependency And Baseline Audit

- [ ] Confirm Task 1 is `Done` with merged PR and branch-cleanup evidence.
- [ ] Inspect the merged setup/professional/service contracts.
- [ ] Inspect scheduling contracts, repository, controls, board, list, drawer,
      DnD sensors, collision rules, tests, and source composition.
- [ ] Run focused Agenda and setup tests before changes.
- [ ] Inspect existing date/range controls and official shadcn/reviewed registry
      candidates before adding a dependency.
- [ ] Record bundle, accessibility, responsive, and token implications.

### 2.2 Weekly Experience Specification

- [ ] Keep temporal scope and representation separate:
  - [ ] `Dia` and `Semana`;
  - [ ] `Quadro` and `Lista`.
- [ ] Define allowed combinations and safe URL normalization.
- [ ] Define seven day columns, bounded operating hours, current-day emphasis,
      professional labels, overlaps, blocked/walk-in periods, and free spaces.
- [ ] Keep daily board professional columns unchanged.
- [ ] Keep weekly cards understandable without relying on color.
- [ ] Define wide, medium, 320px, and 200%-zoom compositions.
- [ ] Make the list the complete narrow/dense alternative.
- [ ] Define light/dark/system, forced-color, reduced-motion, coarse-pointer,
      and long-content behavior.

### 2.3 Weekly Contracts

- [ ] Add contracts equivalent to:
  - [ ] `AgendaTemporalScope`;
  - [ ] `ScheduleRangeQuery`;
  - [ ] `ScheduleRange`;
  - [ ] `WeeklyAppointmentLayout`;
  - [ ] `WeeklyOverlapGroup`;
  - [ ] `WeeklyDropDestination`.
- [ ] Keep inclusive canonical date-only bounds.
- [ ] Require a bounded seven-day range for the weekly query.
- [ ] Preserve unit, professional, status, and search filters.
- [ ] Define deterministic ordering and stable overlap layout.
- [ ] Return unavailable/partial reasons instead of fabricated gaps.
- [ ] Preserve accepted status, appointment, service, and occupancy contracts.

### 2.4 URL And Navigation

- [ ] Store temporal scope, representation, selected date, unit, and stable
      filter IDs in URL search state.
- [ ] Normalize invalid, missing, or incompatible values safely.
- [ ] Keep PII, names, phones, notes, and form payloads out of URLs.
- [ ] Add previous week, next week, today, and direct-date navigation.
- [ ] Show and announce the exact visible interval.
- [ ] Preserve shareable filter/view context across reload.

### 2.5 Weekly Repository And Queries

- [ ] Replace misleading `getDay` assumptions with an honest bounded range
      contract while preserving daily behavior.
- [ ] Query only the selected seven-day interval and unit.
- [ ] Apply professional/status/search filters at the repository boundary.
- [ ] Keep exact range/filter query keys and focused invalidation.
- [ ] Avoid component-side scans that model production-scale behavior.
- [ ] Increment generation on scenario/reset and discard stale results.
- [ ] Reconstruct selected scenario and URL state on reload.
- [ ] Keep the source disabled and fixtures excluded in `hml`/`prd`.

### 2.6 Weekly Board

- [ ] Render seven day columns and bounded time rows.
- [ ] Render appointment cards with time, client, service, professional, and
      status context according to available space.
- [ ] Render blocked, break, and walk-in periods truthfully.
- [ ] Represent overlaps deterministically without obscuring primary actions.
- [ ] Expose open slots for appointment creation.
- [ ] Preserve sticky interval/time context without page-level overflow.
- [ ] Keep focused controls/cards visible inside internal scrolling.
- [ ] Avoid rendering separate professional columns inside every day.

### 2.7 Weekly Interactions

- [ ] Open create/view/edit/reschedule/cancel flows in the accepted drawer.
- [ ] Create from a weekly open slot with date/time prefilled.
- [ ] Allow eligible non-terminal appointments to move between date/time slots.
- [ ] Preserve professional on weekly drag.
- [ ] Keep professional change available in the drawer.
- [ ] Preserve cross-professional drag in the daily board.
- [ ] Reject no-op, conflict, unavailable, closed-hours, insufficient-space,
      stale, and terminal-state drops with Portuguese feedback.
- [ ] Preserve optimistic rollback and focused invalidation.
- [ ] Keep status transitions explicit and separate from temporal drag.
- [ ] Preserve drawer rescheduling as the non-drag equivalent path.

### 2.8 Weekly List And Filters

- [ ] Make the list cover the same selected week and filters.
- [ ] Group or label rows by date with deterministic order.
- [ ] Preserve appointment actions and status transitions.
- [ ] Apply unit, professional, status, and search consistently to both views.
- [ ] Keep active filter summaries and clear behavior accurate.
- [ ] Preserve empty versus filtered-empty distinction.
- [ ] Keep list behavior complete at 320px and 200% zoom.

### 2.9 Performance And Accessibility

- [ ] Bound rendered week slots and appointment cards.
- [ ] Avoid the days-by-professionals-by-slots multiplication.
- [ ] Measure rendered-node and interaction behavior for dense fixtures without
      claiming production capacity.
- [ ] Add accessible board/day/appointment names and live DnD announcements.
- [ ] Ensure day/time/professional/status context is available to screen
      readers.
- [ ] Preserve keyboard/touch/pointer parity and visible focus.
- [ ] Prevent page-level horizontal overflow.
- [ ] Respect reduced motion and forced colors.

### 2.10 Task 2 Scenarios

- [ ] Add deterministic scenarios for:
  - [ ] typical week;
  - [ ] current-day boundary;
  - [ ] month/year boundary;
  - [ ] empty week;
  - [ ] all statuses;
  - [ ] dense week;
  - [ ] many professionals;
  - [ ] professional-filtered week;
  - [ ] blocked periods;
  - [ ] overlapping appointments;
  - [ ] long names/services;
  - [ ] conflict and unavailable destination;
  - [ ] terminal appointment;
  - [ ] slow query/mutation;
  - [ ] fail-next query/mutation;
  - [ ] persistent error;
  - [ ] invalid URL state.
- [ ] Verify reset and reload for all stateful scenarios.

### 2.11 Task 2 Verification

- [ ] Unit-test date bounds, URL normalization, filters, ordering, overlaps,
      layout, drop destinations, conflict rules, and rollback.
- [ ] Component-test day/week and board/list combinations, navigation,
      accessible names, loading/error/empty states, and keyboard behavior.
- [ ] Integration-test weekly source facts through create/view/edit/cancel/
      reschedule journeys.
- [ ] Route-test valid, invalid, unavailable, boundary-week, and reload states.
- [ ] Production-boundary-test source disablement and import rules.
- [ ] Playwright-test typical, dense, filtered, empty, create, cancel,
      pointer/keyboard reschedule, conflict recovery, reset, and reload.
- [ ] Run automated axe checks.
- [ ] Manually test keyboard, assistive technology, forced colors, reduced
      motion, coarse pointer, 320px, and 200% zoom.
- [ ] Capture light/dark desktop and narrow evidence.
- [ ] Update Agenda and component-system documentation.
- [ ] Run all shared verification commands.
- [ ] Move the Linear task only with evidence.
- [ ] Update MLP tracker item 3 and the 14-of-14 total only after merge
      evidence.

## Shared Verification Commands

- [ ] `bun --filter studio routes:generate`
- [ ] `bun --filter studio format`
- [ ] `bun --filter studio lint`
- [ ] `bun --filter studio typecheck`
- [ ] `bun --filter studio test`
- [ ] `bun --filter studio test:production-boundary`
- [ ] `bun --filter studio test:e2e` when the browser is provisioned
- [ ] `bun --filter studio build`
- [ ] `bun --filter studio check`
- [ ] `bun run check`
- [ ] `git diff --check`

## Risks And Follow-Ups

- [ ] Real business authorization remains a separate API/tenancy/identity
      initiative; frontend settings are not enforcement.
- [ ] Future business APIs must define persistence, tenant isolation,
      pagination, indexes, concurrency, audit, and observability independently.
- [ ] Service override changes must never rewrite historical payment or
      commission snapshots.
- [ ] Weekly Agenda rendering must be measured with bounded dense fixtures and
      must not be presented as production capacity evidence.
- [ ] Physical assistive-technology and target-device checks remain residual
      unless completed during implementation review.
