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
- Final delivery task:
  [ENG-55: Complete all remaining TRIAD Studio first visual MLP features](https://linear.app/corvi-io/issue/ENG-55/complete-all-remaining-triad-studio-first-visual-mlp-features).
- Absorbed task:
  [ENG-56: Build the TRIAD Studio weekly Agenda visual prototype](https://linear.app/corvi-io/issue/ENG-56/build-the-triad-studio-weekly-agenda-visual-prototype)
  is duplicate/superseded by ENG-55.
- Current delivery status:
  - ENG-54 is `Done`; [PR #35](https://github.com/corvi-io/crv-triad/pull/35)
    merged into `staging` at
    `2c367b21fc4c517da09f954db34b67c646b3750c`.
  - ENG-55 is `Ready`, unblocked, and is the single final delivery.
  - ENG-56 is duplicate/superseded by ENG-55.

## Delivery Contract

Deliver one final frontend-only task with two internal workstreams:

1. setup, services, and professionals completion;
2. weekly Agenda completion.

ENG-54 is complete, so ENG-55 is unblocked. Both workstreams use deterministic,
resettable in-memory data in `local`/`dev`, remain disabled in `hml`/`prd`, and
introduce no backend, persistence, production authorization, provider, polling,
or realtime behavior.

Use one branch, one PR, and one final merge. Keep commits, focused checks, and
review evidence grouped by workstream. Partial completion of one workstream is
not sufficient for `Done`.

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

## Final Task: Complete All Remaining Visual MLP Features

### Task Metadata

- Title:
  `Complete all remaining TRIAD Studio first visual MLP features`
- Suggested branch: assigned by Linear from the final issue identifier.
- State: `Ready`.
- Priority: `High`.
- Assignee: Marcus Gabriel.
- Completed dependency: ENG-54 / PR #35.
- Active blockers: none.
- Linear:
  [ENG-55](https://linear.app/corvi-io/issue/ENG-55/complete-all-remaining-triad-studio-first-visual-mlp-features).
- Closes visual MLP tracker items 1, 3, 7, and 8.

### Final Task Scope

- Complete the six-step first-use setup journey.
- Add bounded barbershop identity/contact setup.
- Add accepted payment-method configuration.
- Add per-professional service price/duration exceptions.
- Complete professional details, demonstrative access settings, and operational
  view.
- Add the complete seven-day Agenda board/list experience and weekly journeys.
- Integrate accepted settings with scheduling, checkout, commission, and
  professional summaries through public contracts.

### Final Task Exclusions

- API, database, durable storage, IDP roles, organizations, invitations, real
  RBAC, uploads, fiscal configuration, payment gateway behavior, payroll, or
  public professional profiles.
- Visible scenario/reset/debug chrome.
- Production enablement in `hml` or `prd`.

### 1.1 Dependency And Baseline Audit

- [x] Confirm ENG-54 is `Done` with merged PR and branch-cleanup evidence.
- [x] Inspect setup, Agenda, service desk, checkout, commission, reporting,
      notification, workspace registry, source composition, and dev engines.
- [x] Run focused existing setup/scheduling/revenue tests before changes.
- [x] Inventory current setup contracts, forms, repositories, URL state,
      scenarios, and shared components.
- [x] Record every required shared-component or contract change before editing.
- [x] Confirm no unrelated user-owned changes will be overwritten.

### 1.2 Experience Specification

- [x] Define the six-step hierarchy before JSX:
  - [x] Dados da barbearia;
  - [x] Horários;
  - [x] Profissionais;
  - [x] Serviços;
  - [x] Pagamentos e comissões;
  - [x] Revisão.
- [x] Define first-use, resume, incomplete, complete, and maintenance entry
      behavior.
- [x] Keep the existing setup hub as the post-onboarding maintenance surface.
- [x] Define wide, medium, 320px, and 200%-zoom compositions.
- [x] Define light/dark/system, forced-color, reduced-motion, coarse-pointer,
      and long-content behavior.
- [x] Review all pt-BR headings, descriptions, validation, confirmation,
      success, empty, and unavailable copy.

### 1.3 Setup Completion Contracts

- [x] Add contracts equivalent to:
  - [x] `BarbershopProfile`;
  - [x] `SetupStep`;
  - [x] `SetupReadiness`;
  - [x] `PaymentMethodSetting`;
  - [x] `ProfessionalAccessPolicy`;
  - [x] `ProfessionalServiceOverride`;
  - [x] `ProfessionalOperationalSummary`.
- [x] Define pure required-fact rules for every step.
- [x] Derive the next incomplete step without separate persisted completion.
- [x] Keep stable identifiers and deterministic ordering.
- [x] Define unavailable/partial reasons rather than fabricated zero values.
- [x] Keep cents, minutes, canonical date-only values, and explicit local time.

### 1.4 Barbershop Data And Hours

- [x] Add display name, phone, and email with Brazilian masks/validation where
      applicable.
- [x] Reuse the primary unit address and existing operating-hours contracts.
- [x] Do not add legal registration, tax, logo, upload, or white-label fields.
- [x] Preserve unit availability, days off, breaks, recurrence, and exceptions.
- [x] Focus the first invalid field and prevent duplicate submission.
- [x] Add rollback/retry for delayed or failed mutations.

### 1.5 Professionals

- [x] Complete professional detail fields for:
  - [x] name;
  - [x] photo presentation without upload;
  - [x] contact;
  - [x] specialties/services;
  - [x] units;
  - [x] working hours and days off;
  - [x] commission;
  - [x] status;
  - [x] account-access presentation;
  - [x] demonstrative access policy.
- [x] Cover the official access choices:
  - [x] own Agenda only;
  - [x] create appointments;
  - [x] change prices;
  - [x] register payments;
  - [x] view revenue;
  - [x] view commissions;
  - [x] access other professionals' data.
- [x] Use safe defaults and prevent internally contradictory combinations.
- [x] Keep access values detached from `AuthGate`, routes, sessions, IDP users,
      and server data.
- [x] Add a professional drawer/profile with Summary, Operation, and Access
      concerns using existing drawer/tab composition.
- [x] Show bounded current-day Agenda, availability, assigned services,
      resolved overrides, commission facts, and valid deep links.
- [x] Do not create a role switcher or impersonation UI.

### 1.6 Services And Professional Variations

- [x] Extend service configuration with optional professional overrides.
- [x] Require the professional to be active and eligible for the service.
- [x] Allow one override per service/professional pair.
- [x] Allow price, duration, or both; reject an empty override.
- [x] Make the default value visually clear before and after an override.
- [x] Clearing an override restores the default for future prototype actions.
- [x] Preserve historical paid-item and commission snapshots.
- [x] Resolve appointment duration/price through the accepted public contract.
- [x] Add conflict and dependency messages for archived or unlinked records.

### 1.7 Payments And Commissions

- [x] Configure Pix, cash, debit card, credit card, and mixed payment.
- [x] Require at least one active base payment method.
- [x] Enable mixed payment only when at least two base methods are active.
- [x] Keep ordering and labels deterministic.
- [x] Consume the configured choices in future prototype checkout sessions.
- [x] Preserve already-paid sale snapshots when settings change.
- [x] Reuse accepted commission rules; do not duplicate the calculation engine.
- [x] Explain that the system records payment and does not process it.

### 1.8 Guided Journey

- [x] Add stable Back/Continue/Review/Enter workspace behavior.
- [x] Make completed steps reviewable without losing progress.
- [x] Resume at the first incomplete step after route return/reload in the
      selected deterministic session.
- [x] Derive progress from readiness rules and announce it accessibly.
- [x] Keep one recommended next action.
- [x] Provide a final review that links to incomplete sections and prevents
      false completion.
- [x] Route final entry to the accepted authenticated default destination.
- [x] Keep all maintenance sections reachable after completion.

### 1.9 Repository And Source Composition

- [x] Extend the narrow setup repository instead of exposing memory internals.
- [x] Add bounded reads/mutations for profile, payment settings, overrides,
      access policy, and professional summary.
- [x] Consume public scheduling/revenue/commission facts through a narrow
      coordinator when necessary.
- [x] Start independent reads together.
- [x] Use exact query keys and focused invalidation.
- [x] Increment generation on scenario/reset and discard stale results.
- [x] Reconstruct the selected deterministic scenario on reload.
- [x] Keep the source disabled and fixtures excluded in `hml`/`prd`.

### 1.10 Workstream 1 Scenarios

- [x] Add deterministic scenarios for:
  - [x] first use/incomplete;
  - [x] resume midway;
  - [x] complete setup;
  - [x] missing barbershop contact;
  - [x] no professionals;
  - [x] no services;
  - [x] no payment method;
  - [x] one versus multiple payment methods;
  - [x] default and overridden service values;
  - [x] archived/unlinked professional;
  - [x] restricted access presentation;
  - [x] typical and busy professional operation;
  - [x] empty operational facts;
  - [x] long labels/content;
  - [x] slow read/mutation;
  - [x] fail-next read/mutation;
  - [x] persistent error.
- [x] Verify reset and reload for all stateful scenarios.

### 1.11 Workstream 1 Verification

- [x] Unit-test readiness, step ordering, field validation, payment rules,
      override resolution, access defaults, summaries, snapshots, and rollback.
- [x] Component-test onboarding navigation, forms, progress announcements,
      professional tabs, access descriptions, loading/error/empty states, and
      keyboard behavior.
- [x] Integration-test setup settings through scheduling, checkout, commission,
      and operational summaries.
- [x] Route-test valid, invalid, unavailable, resume, complete, and reload
      states.
- [x] Production-boundary-test source disablement, imports, and authorization
      separation.
- [ ] Playwright-test first use, resume, review, edit-after-completion,
      overrides, payment settings, professional view, error recovery, reset,
      and reload.
- [x] Run automated axe checks.
- [ ] Manually test keyboard, assistive technology, forced colors, reduced
      motion, coarse pointer, 320px, and 200% zoom.
- [x] Capture light/dark desktop and narrow evidence.
- [x] Update setup and component-system documentation.
- [x] Run all applicable shared verification commands.
- [ ] Move the Linear task only with evidence.
- [ ] Update MLP tracker items 1, 7, and 8 only after merge evidence.

## Workstream 2: Weekly Agenda Completion

### Workstream Metadata

- Owner issue:
  [ENG-55](https://linear.app/corvi-io/issue/ENG-55/complete-all-remaining-triad-studio-first-visual-mlp-features).
- Absorbed issue:
  [ENG-56](https://linear.app/corvi-io/issue/ENG-56/build-the-triad-studio-weekly-agenda-visual-prototype)
  is duplicate/superseded.
- Runs in the same branch and PR as Workstream 1.
- Closes visual MLP tracker item 3 only when the combined PR is merged.

### Workstream 2 Scope

- Add a complete seven-day Agenda view.
- Preserve the accepted daily board and period list.
- Support general and professional-filtered weekly planning.
- Preserve creation, inspection, editing, cancellation, rescheduling,
  availability/conflict rules, and accessibility.

### Workstream 2 Exclusions

- API, persistence, realtime, recurrence, month/year views, resize-to-duration,
  automatic scheduling, room/resources, or visible prototype controls.
- A nested days-by-professionals-by-slots matrix.
- Changing appointment status as a side effect of drag.

### 2.1 Dependency And Baseline Audit

- [x] Confirm Workstream 1 contracts are implemented and locally verified
      before integrating the weekly Agenda against them.
- [x] Inspect the setup/professional/service contracts from the same branch.
- [x] Inspect scheduling contracts, repository, controls, board, list, drawer,
      DnD sensors, collision rules, tests, and source composition.
- [x] Run focused Agenda and setup tests before changes.
- [x] Inspect existing date/range controls and official shadcn/reviewed registry
      candidates before adding a dependency.
- [x] Record bundle, accessibility, responsive, and token implications.

### 2.2 Weekly Experience Specification

- [x] Keep temporal scope and representation separate:
  - [x] `Dia` and `Semana`;
  - [x] `Quadro` and `Lista`.
- [x] Define allowed combinations and safe URL normalization.
- [x] Define seven day columns, bounded operating hours, current-day emphasis,
      professional labels, overlaps, blocked/walk-in periods, and free spaces.
- [x] Keep daily board professional columns unchanged.
- [x] Keep weekly cards understandable without relying on color.
- [x] Define wide, medium, 320px, and 200%-zoom compositions.
- [x] Make the list the complete narrow/dense alternative.
- [x] Define light/dark/system, forced-color, reduced-motion, coarse-pointer,
      and long-content behavior.

### 2.3 Weekly Contracts

- [x] Add contracts equivalent to:
  - [x] `AgendaTemporalScope`;
  - [x] `ScheduleRangeQuery`;
  - [x] `ScheduleRange`;
  - [x] `WeeklyAppointmentLayout`;
  - [x] `WeeklyOverlapGroup`;
  - [x] `WeeklyDropDestination`.
- [x] Keep inclusive canonical date-only bounds.
- [x] Require a bounded seven-day range for the weekly query.
- [x] Preserve unit, professional, status, and search filters.
- [x] Define deterministic ordering and stable overlap layout.
- [x] Return unavailable/partial reasons instead of fabricated gaps.
- [x] Preserve accepted status, appointment, service, and occupancy contracts.

### 2.4 URL And Navigation

- [x] Store temporal scope, representation, selected date, unit, and stable
      filter IDs in URL search state.
- [x] Normalize invalid, missing, or incompatible values safely.
- [x] Keep PII, names, phones, notes, and form payloads out of URLs.
- [x] Add previous week, next week, today, and direct-date navigation.
- [x] Show and announce the exact visible interval.
- [x] Preserve shareable filter/view context across reload.

### 2.5 Weekly Repository And Queries

- [x] Replace misleading `getDay` assumptions with an honest bounded range
      contract while preserving daily behavior.
- [x] Query only the selected seven-day interval and unit.
- [x] Apply professional/status/search filters at the repository boundary.
- [x] Keep exact range/filter query keys and focused invalidation.
- [x] Avoid component-side scans that model production-scale behavior.
- [x] Increment generation on scenario/reset and discard stale results.
- [x] Reconstruct selected scenario and URL state on reload.
- [x] Keep the source disabled and fixtures excluded in `hml`/`prd`.

### 2.6 Weekly Board

- [x] Render seven day columns and bounded time rows.
- [x] Render appointment cards with time, client, service, professional, and
      status context according to available space.
- [x] Render blocked, break, and walk-in periods truthfully.
- [x] Represent overlaps deterministically without obscuring primary actions.
- [x] Expose open slots for appointment creation.
- [x] Preserve sticky interval/time context without page-level overflow.
- [x] Keep focused controls/cards visible inside internal scrolling.
- [x] Avoid rendering separate professional columns inside every day.

### 2.7 Weekly Interactions

- [x] Open create/view/edit/reschedule/cancel flows in the accepted drawer.
- [x] Create from a weekly open slot with date/time prefilled.
- [x] Allow eligible non-terminal appointments to move between date/time slots.
- [x] Preserve professional on weekly drag.
- [x] Keep professional change available in the drawer.
- [x] Preserve cross-professional drag in the daily board.
- [x] Reject no-op, conflict, unavailable, closed-hours, insufficient-space,
      stale, and terminal-state drops with Portuguese feedback.
- [x] Preserve optimistic rollback and focused invalidation.
- [x] Keep status transitions explicit and separate from temporal drag.
- [x] Preserve drawer rescheduling as the non-drag equivalent path.

### 2.8 Weekly List And Filters

- [x] Make the list cover the same selected week and filters.
- [x] Group or label rows by date with deterministic order.
- [x] Preserve appointment actions and status transitions.
- [x] Apply unit, professional, status, and search consistently to both views.
- [x] Keep active filter summaries and clear behavior accurate.
- [x] Preserve empty versus filtered-empty distinction.
- [x] Keep list behavior complete at 320px and 200% zoom.

### 2.9 Performance And Accessibility

- [x] Bound rendered week slots and appointment cards.
- [x] Avoid the days-by-professionals-by-slots multiplication.
- [x] Measure rendered-node and interaction behavior for dense fixtures without
      claiming production capacity.
- [x] Add accessible board/day/appointment names and live DnD announcements.
- [x] Ensure day/time/professional/status context is available to screen
      readers.
- [x] Preserve keyboard/touch/pointer parity and visible focus.
- [x] Prevent page-level horizontal overflow.
- [x] Respect reduced motion and forced colors.

### 2.10 Workstream 2 Scenarios

- [x] Add deterministic scenarios for:
  - [x] typical week;
  - [x] current-day boundary;
  - [x] month/year boundary;
  - [x] empty week;
  - [x] all statuses;
  - [x] dense week;
  - [x] many professionals;
  - [x] professional-filtered week;
  - [x] blocked periods;
  - [x] overlapping appointments;
  - [x] long names/services;
  - [x] conflict and unavailable destination;
  - [x] terminal appointment;
  - [x] slow query/mutation;
  - [x] fail-next query/mutation;
  - [x] persistent error;
  - [x] invalid URL state.
- [x] Verify reset and reload for all stateful scenarios.

### 2.11 Workstream 2 Verification

- [x] Unit-test date bounds, URL normalization, filters, ordering, overlaps,
      layout, drop destinations, conflict rules, and rollback.
- [x] Component-test day/week and board/list combinations, navigation,
      accessible names, loading/error/empty states, and keyboard behavior.
- [x] Integration-test weekly source facts through create/view/edit/cancel/
      reschedule journeys.
- [x] Route-test valid, invalid, unavailable, boundary-week, and reload states.
- [x] Production-boundary-test source disablement and import rules.
- [ ] Playwright-test typical, dense, filtered, empty, create, cancel,
      pointer/keyboard reschedule, conflict recovery, reset, and reload.
- [x] Run automated axe checks.
- [ ] Manually test keyboard, assistive technology, forced colors, reduced
      motion, coarse pointer, 320px, and 200% zoom.
- [x] Capture light/dark desktop and narrow evidence.
- [x] Update Agenda and component-system documentation.
- [x] Run all applicable shared verification commands.
- [ ] Move the Linear task only with evidence.
- [ ] Update MLP tracker item 3 and the 14-of-14 total only after merge
      evidence.

## Shared Verification Commands

- [x] `bun --filter studio routes:generate`
- [x] `bun --filter studio format`
- [x] `bun --filter studio lint`
- [x] `bun --filter studio typecheck`
- [x] `bun --filter studio test`
- [x] `bun --filter studio test:production-boundary`
- [x] Focused `bun --filter studio test:e2e` with axe and 320px coverage
- [x] `bun --filter studio build`
- [x] `bun --filter studio check`
- [x] `bun run check`
- [x] `git diff --check`

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

## ENG-55 Implementation Evidence

The isolated implementation branch completed both workstreams against the
confirmed ENG-54 baseline `2c367b21fc4c517da09f954db34b67c646b3750c`.

- Workstream 1 implements the six-step resumable setup, barbershop facts,
  payment policy, professional contact/access/commission presentation,
  service overrides, operational summaries, future-checkout consumption, and
  immutable paid snapshots.
- Workstream 2 implements the exact seven-day range contract, separate
  scope/representation controls, weekly board/list, dated periods, open-slot
  creation, professional-preserving drag, drawer alternative, and bounded
  destination rejection.
- `bun --filter studio check`: passed; 50 files and 375 tests passed, production
  build passed, and the disabled-source boundary verified 64 files.
- Focused Playwright: 3 tests passed with axe WCAG 2.2 A/AA, empty-week
  creation, specialties editing, and 320 CSS-pixel overflow coverage.
- `bun run check`: passed for API, IDP, site, and Studio after restoring
  lockfile dependencies with `bun install --frozen-lockfile`.
- `git diff --check`: passed.
- Visual evidence lives in `docs/studio/evidence/eng-55`.

Merge-only tracker updates and task completion remain intentionally unchecked
until the combined PR is reviewed and merged into `staging`.
