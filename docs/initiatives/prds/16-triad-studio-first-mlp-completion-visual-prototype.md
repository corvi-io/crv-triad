# 16 TRIAD Studio First MLP Completion Visual Prototype

## Summary

Complete the four items that remain partially covered in the first TRIAD Studio
visual MLP through two ordered, frontend-only deliveries:

1. complete barbershop setup, service variations, and professional management;
2. add the complete weekly Agenda experience.

The initiative closes the remaining visual and behavioral gaps in MLP features
1, 3, 7, and 8. It extends the accepted Studio modules and deterministic,
resettable in-memory sources without introducing a business API, persistence,
production authorization, or identity-provider behavior.

## Context

- Current state:
  - The visual MLP tracker has eight completed features, five partial features,
    and one next delivery.
  - ENG-53 is implementing reports and ENG-54 will complete operational
    notifications. After both, only setup, weekly Agenda, services, and
    professionals remain partial.
  - `/barbershop-setup` already covers units, professionals, services,
    availability, guided progress, CRUD, relationships, archive/restore, and
    deterministic scenarios.
  - `/schedule` already covers the daily board and list, filters, appointment
    states, creation, inspection, editing, cancellation, rescheduling, and
    pointer/touch/keyboard allocation behavior.
  - Payment, commission, checkout, and daily closing contracts already exist in
    accepted frontend prototype sources.
- Problem:
  - A barbershop cannot yet demonstrate the full first-use setup journey from
    identity through review and entry into the workspace.
  - Payment-method setup, per-professional service exceptions, and the
    professional's operational/access view remain disconnected from the
    existing prototype journey.
  - The Agenda cannot yet validate a complete week while preserving the
    accepted daily interaction model.
  - Leaving these gaps as unrelated follow-ups would make the tracker look
    complete without one reviewable final MLP outcome.
- Why now:
  - The operational, revenue, and management journeys are already implemented
    or queued.
  - The accepted sources now provide the facts needed to complete setup and
    professional views without inventing a backend.
  - One final initiative gives the next agent a bounded path to move the visual
    MLP from partial coverage to 14 of 14 completed items.
- Related sources:
  - Official Maestri UX note: `triad-studio-o-triad-stud`, especially sections
    1, 3, 7, 8, access profiles, and construction priority.
  - Visual MLP tracker: `triad-studio-acompanhament`.
  - `docs/initiatives/prds/07-triad-studio-barbershop-setup-visual-prototype.md`.
  - `docs/initiatives/prds/09-triad-studio-agenda-visual-refinement.md`.
  - `docs/initiatives/prds/14-triad-studio-revenue-operations-visual-prototype.md`.
  - `docs/initiatives/prds/15-triad-studio-management-insights-visual-prototype.md`.
- Linear initiative:
  [TRIAD Studio First MLP Completion Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-first-mlp-completion-visual-prototype-5aa3efee6495).
- Delivery tasks:
  - [ENG-55: Complete the TRIAD Studio setup, services, and professionals visual prototype](https://linear.app/corvi-io/issue/ENG-55/complete-the-triad-studio-setup-services-and-professionals-visual).
  - [ENG-56: Build the TRIAD Studio weekly Agenda visual prototype](https://linear.app/corvi-io/issue/ENG-56/build-the-triad-studio-weekly-agenda-visual-prototype).

## Delivery Units

### Delivery 1: Setup, Services, And Professionals Completion

Extend the existing barbershop setup module with a resumable first-use journey,
barbershop identity and contact data, payment-method configuration,
per-professional service price/duration exceptions, demonstrative access
settings, and a complete professional operational view.

The delivery must reuse the existing unit, availability, service, professional,
commission, scheduling, and revenue facts through accepted public ports. It must
not duplicate fixtures or present frontend settings as production
authorization.

### Delivery 2: Weekly Agenda Completion

Add a complete weekly time view to the accepted Agenda while preserving the
daily board, list, appointment drawer, filters, status vocabulary, collision
rules, and accessible rescheduling paths.

The weekly experience must support both the general barbershop context and a
professional-focused context without rendering an unbounded
days-by-professionals-by-slots matrix.

Delivery 1 begins after ENG-54. Delivery 2 begins from the merged Delivery 1
baseline so the weekly Agenda consumes the accepted final professional,
service-variation, payment-method, and availability presentation contracts.

## Goals

- Complete a short, resumable first-use setup journey with the six steps from
  the UX source and one clear next action.
- Capture the barbershop's display identity, contact data, operating schedule,
  team, services, accepted payment methods, commissions, and final review.
- Keep the setup hub useful after onboarding instead of creating a disposable
  wizard.
- Configure Pix, cash, debit card, credit card, and mixed payment availability
  without pretending to process payments.
- Support optional price and duration exceptions for an eligible professional
  while retaining the service defaults as the normal path.
- Add the official professional access choices as demonstrative business
  settings and clearly separate them from real authentication/authorization.
- Provide a professional operational view that connects assignments,
  availability, today's schedule, service variations, and commission facts.
- Add a complete weekly Agenda with deterministic navigation, filters,
  creation, inspection, rescheduling, cancellation, blocked periods, free
  spaces, and all accepted appointment states.
- Preserve resettable scenarios for normal, empty, incomplete, dense, error,
  long-content, and restricted-presentation cases.
- Finish MLP tracker items 1, 3, 7, and 8 with verifiable evidence.

## Non-Goals

- Business API routes, OpenAPI contracts, database tables, migrations,
  persistence, browser storage, external providers, polling, realtime, or
  background jobs.
- Production tenant provisioning, onboarding completion state, RBAC,
  field-level authorization, route enforcement, identity roles, memberships,
  or Better Auth organization changes.
- Public self-registration, professional accounts, identity invitations, or
  Studio identity administration.
- Legal company registration, tax documents, fiscal configuration, logo/file
  upload, white labeling, multiple-unit expansion, franchises, or public
  professional profiles.
- Payment processing, acquiring/gateway configuration, card credentials,
  refunds, chargebacks, installments, settlement, reconciliation, or fiscal
  issuance.
- Arbitrary service pricing rules, promotions, seasonal prices, bundles,
  recurrence, customer-specific pricing, or overlapping professional
  exceptions.
- Payroll, commission payout, professional wallet, public portfolio,
  certificates, courses, reviews, or marketplace features.
- Month/year Agenda views, recurring appointments, appointment duration resize,
  resource/room allocation, wait-list optimization, or automatic scheduling.
- Exposing ordinary scenario selectors, reset controls, fixture diagnostics, or
  prototype language in product chrome.
- Treating fixture volume or browser rendering as production capacity evidence.
- Moving business rules into `apps/idp` or introducing a generic cross-app
  package.

## Brainstorm

### Problem Framing

- The remaining work is not four unrelated screens. It closes two workflows:
  preparing the barbershop to operate and viewing/adjusting a complete week.
- The owner needs to finish setup with enough information for the accepted
  scheduling and payment prototypes to behave consistently.
- The manager needs to inspect one professional's actual operating context
  without navigating across disconnected CRUD tables.
- Reception needs a weekly planning horizon while retaining the precise daily
  board for active operations.
- Completion means visual and behavioral validation in `local`/`dev`, not
  production backend readiness.

### Gaps And Unknowns

#### Product Gaps

- “Identity” in the UX source does not define legal registration, upload, or
  branding fields.
- The official six-step list mentions commissions but lists payment methods
  separately among configured data.
- The UX source lists permission choices but does not define role inheritance,
  conflicts, defaults, or enforcement.
- It calls for professional indicators without defining exact periods or
  metrics.
- It requests a week view but does not prescribe layout, overlap treatment,
  narrow-screen behavior, or drag semantics across days.

#### Accepted Prototype Assumptions

- Barbershop identity is limited to display name, phone, email, and the primary
  unit address already represented by setup. No legal identity or file upload
  is invented.
- The six-step journey is:
  1. barbershop data;
  2. operating hours;
  3. professionals;
  4. services;
  5. payments and commissions;
  6. review and workspace entry.
- Completion is derived from required setup facts. It is not a separately
  persisted boolean.
- Leaving and returning resumes at the first incomplete step inside the current
  deterministic session.
- The existing `/barbershop-setup` hub remains the long-term maintenance
  surface after the first-use journey.
- Initial payment methods are Pix, cash, debit card, credit card, and mixed
  payment. Mixed payment is available only when at least two base methods are
  active.
- A service uses its default duration and price unless one active eligible
  professional has one explicit override.
- Removing an override restores the service default without rewriting past
  paid-item snapshots.
- Access settings are prototype business-policy values only. They never grant
  or revoke an authenticated Studio capability.
- Professional indicators use deterministic current-day operational facts and
  bounded commission summaries already accepted by prior modules.
- Weekly Agenda uses seven day columns and time positioning. Professional
  identity stays on each card; the existing professional filter can narrow the
  week to one or more professionals.
- The weekly board changes date and time through drag. Professional changes
  remain available through the appointment drawer; the daily board retains its
  accepted cross-professional drag behavior.
- The existing list remains the accessible dense alternative for the selected
  day or week.

#### Technical Gaps

- The implementing agent must inspect the merged ENG-53 and ENG-54 source
  contracts before changing shared shell or source composition.
- Setup, scheduling, checkout, commissions, and notifications may currently
  expose different development adapters; cross-module facts must be consumed
  through accepted public ports or a narrow coordinator.
- Existing `SetupProfessional` and `SetupService` contracts do not contain
  access policy, contact/specialty detail, commission configuration, or
  professional overrides.
- Existing Agenda view state models representation as `board` or `list`.
  Temporal scope must be a separate `day` or `week` concept rather than
  overloading that field.
- Existing repository naming such as `getDay` may need a bounded range contract
  before a weekly source can be honest.
- A seven-day board can multiply DOM size and drag targets. The implementation
  must bound visible slots and avoid multiplying seven days by every
  professional column.

#### Data Gaps

- Setup completion needs stable, pure readiness rules per step.
- Payment-method configuration needs stable method IDs, active state, ordering,
  and validation for mixed payment.
- Service overrides need service ID, professional ID, optional price/duration,
  active/default semantics, and uniqueness.
- Access settings need explicit capability IDs and safe defaults while
  remaining detached from auth/session claims.
- Professional operations need bounded date/unit context and unavailable-data
  reasons rather than fabricated zeros.
- Weekly Agenda queries need inclusive date bounds, unit, professional/status
  filters, stable timezone/date-only behavior, and deterministic ordering.

### Counterpoints

- Four separate tasks would map one-to-one to the tracker, but setup, services,
  and professionals share forms, relationships, and source composition. One
  coherent delivery is easier to review and less likely to duplicate state.
- One giant implementation task for all four items would minimize Linear
  overhead, but it would combine a broad setup-domain expansion with a complex
  Agenda layout and drag surface. Two tasks create meaningful review and merge
  boundaries.
- A disposable onboarding wizard would mirror the first-access sequence
  quickly, but it would duplicate setup forms and leave no maintenance path.
  The existing hub should own both first-use progress and later edits.
- Building real RBAC now would make permission toggles truthful, but it requires
  tenancy, memberships, API enforcement, audit, and identity contracts that the
  visual MLP has intentionally deferred.
- Applying frontend permission toggles directly to production navigation would
  look complete but would be insecure. Restricted presentation may be tested
  only as deterministic `local`/`dev` behavior.
- Rendering seven days for every professional as nested columns most literally
  follows the source, but it creates an unusable matrix as team size grows.
  Preserve professionals as columns in the daily board; use days as columns
  with professional-labeled cards and filters in the weekly board.
- A calendar library might accelerate week layout, but it can conflict with the
  accepted DnD, tokens, accessibility, and bundle constraints. Inspect existing
  components and official shadcn/reviewed registry options before accepting a
  dependency.
- A real API would solve cross-module consistency more durably, but visual
  behavior and contracts still need validation. Repository boundaries should
  make that later replacement explicit.

### Options

| Option | Description | Pros | Cons | Decision |
| --- | --- | --- | --- | --- |
| A | Four initiatives/tasks matching tracker rows | Simple tracker mapping | Repeats setup context and source changes | Reject |
| B | One initiative with two ordered tasks | Coherent final MLP outcome and reviewable merges | Requires a deliberate dependency chain | Accept |
| C | One task for all remaining work | Lowest coordination overhead | Too broad for reliable visual and behavioral review | Reject |
| D | Build API, RBAC, and persistence first | Production-truthful foundation | Premature and blocks visual validation | Future |

### Recommendation

Choose Option B.

Keep `barbershop-setup` as the owner of first-use setup, service variations,
professional profiles, and demonstrative business access settings. Reuse
accepted scheduling/revenue facts through narrow public ports rather than
copying fixtures. Keep identity and authorization outside this initiative.

Extend `scheduling` with an explicit bounded temporal scope and weekly
projection after Delivery 1 merges. Preserve the daily board for fine-grained
professional allocation and use the weekly board for seven-day planning. Keep
the list as the narrow/dense alternative.

## Architecture And Boundaries

### App Ownership

- Site impact: none.
- API impact: none in this initiative. Future setup, pricing, permissions, and
  weekly Agenda contracts belong to business modules in `apps/api`.
- IDP impact: none. Authentication, sessions, users, invitations, and identity
  contracts remain IDP-owned; business access policy does not move there.
- Studio impact:
  - extend `apps/studio/src/modules/barbershop-setup/**`;
  - extend `apps/studio/src/modules/scheduling/**`;
  - consume accepted revenue/commission facts through public ports;
  - update authenticated route search contracts without adding new top-level
    navigation;
  - extend deterministic sources under `apps/studio/src/dev/**`.
- Data/persistence impact: deterministic session-memory data only.
- External provider impact: none.

### Source And Composition Rules

- Production modules must not import `src/dev`.
- Development adapters must remain behind virtual source composition.
- `hml` and `prd` must fail closed and exclude memory fixtures/scenarios.
- Cross-module composition must depend on public contracts, never another
  module's presentation or fixture implementation.
- Past paid sale and commission snapshots are immutable when setup defaults or
  service overrides change.
- Payment-method configuration controls only future prototype checkout choices.
- Access settings never become a substitute for server-side authorization.

## Performance And Scalability

- Current data remains bounded synthetic evidence, not a capacity claim.
- Setup entity lists retain repository pagination, filtering, and stable sort.
- Professional operational summaries request bounded periods and ranked
  results rather than scanning unbounded histories in components.
- Weekly Agenda queries require a seven-day inclusive range and return only the
  selected unit and accepted filters.
- The weekly board must avoid a
  `days × professionals × slots × appointments` rendering model. Days and
  bounded time slots form the grid; professional details live on cards and
  filters.
- Independent setup/operational reads should start together and avoid
  waterfalls.
- Derived completeness, override resolution, and weekly layout should be pure
  and memoized only when measurement shows meaningful work.
- Stale delayed operations must remain generation-guarded after scenario/reset.
- No polling, WebSocket, background refresh, upload, or external request is
  introduced.
- A future API must define bounded queries, pagination, indexes, recurrence
  expansion limits, N+1 prevention, optimistic concurrency, idempotency, and
  measured capacity independently.

## Security, Privacy, And Abuse

- Real authentication/session behavior is unchanged.
- Business access toggles are not authorization and must never gate protected
  server data.
- No role switcher or identity impersonation UI is added.
- Names, phones, emails, addresses, schedules, access settings, service prices,
  commissions, notes, appointment payloads, auth values, cookies, tokens, and
  private headers must not be logged or sent to analytics.
- No secrets or provider credentials enter frontend environment variables.
- URLs may contain non-PII view, date, section, and stable technical filter IDs;
  they must not contain names, contacts, notes, or form payloads.
- Test scenarios use synthetic records only.
- Future production endpoints require tenant isolation, permission enforcement,
  audit for sensitive changes, rate limits where appropriate, and safe
  concurrency.

## Accessibility And UX

- The onboarding journey supports Back/Continue, direct review of completed
  steps, first-invalid focus, and resumption without keyboard traps.
- A visible text label and programmatic state communicate step number,
  completion, errors, and the next action; progress is not color-only.
- All forms use Brazilian Portuguese labels/messages, `noValidate`,
  `aria-invalid`, `aria-describedby`, and stable loading labels.
- Service overrides and access choices have explicit descriptions, safe
  defaults, confirmation where removal has consequences, and no ambiguous
  icon-only meaning.
- Professional operational summaries provide textual values and do not rely
  only on charts or color.
- Weekly Agenda exposes visible interval, day, time, professional, status, and
  overlap context to assistive technology.
- Pointer/touch/keyboard drag has equivalent drawer-based rescheduling as
  required by WCAG 2.5.7.
- Previous/next/today/date controls and day/week/list/board choices are keyboard
  operable with visible focus and stable accessible names.
- The weekly board uses bounded internal horizontal scrolling at narrow widths;
  the page itself must not overflow. The list is a usable 320px and
  200%-zoom alternative.
- Status, overrides, access, availability, and completion are not communicated
  by color alone.
- Loading, empty, partial, validation, operation-error, source-unavailable, and
  recovery states are defined for both deliveries.
- Reduced-motion, forced-colors, dark/light/system, coarse pointer, long labels,
  and dense data are covered.

## Logging And Observability

- No production telemetry is required for the frontend-only prototype.
- Development tests may inspect non-PII operation names, durations, scenario
  generation, and failure categories without record payloads.
- Useful future structured events:
  - setup step completed;
  - setup completed/reopened;
  - service override created/updated/removed;
  - professional access policy changed;
  - Agenda temporal scope changed;
  - appointment reschedule attempted/completed/rejected.
- Future metrics should cover completion funnel, validation failures, weekly
  query latency, mutation failure rate, and conflict rate.
- Future traces should connect Studio commands to API use cases without
  recording form bodies or business payloads.
- Future alerts should cover sustained setup/Agenda read or mutation failures,
  not individual user validation errors.

## Acceptance Criteria

### Initiative

- [ ] Both delivery tasks begin from their confirmed merged dependencies.
- [ ] MLP tracker items 1, 7, and 8 move from partial to completed only after
      Delivery 1 has merged evidence.
- [ ] MLP tracker item 3 moves from partial to completed only after Delivery 2
      has merged evidence.
- [ ] After ENG-53, ENG-54, and both deliveries, the visual MLP tracker records
      14 of 14 features completed.
- [ ] All behavior remains frontend-only, deterministic, resettable, and
      unavailable in `hml`/`prd`.

### Delivery 1

- [ ] The first-use journey covers barbershop data, hours, professionals,
      services, payments/commissions, and review/workspace entry.
- [ ] The journey derives completion from required facts, resumes at the first
      incomplete step, and reuses the ongoing setup hub/forms.
- [ ] Barbershop display name, phone, email, and primary-unit address can be
      reviewed and edited without inventing legal identity or uploads.
- [ ] Pix, cash, debit card, credit card, and mixed-payment availability can be
      configured with valid mixed-payment behavior.
- [ ] An eligible professional may have one optional price and/or duration
      override per service; clearing it restores defaults.
- [ ] Appointment creation and future checkout choices consume resolved service
      and payment settings through accepted public contracts.
- [ ] Professional management covers contact, specialties/services, work
      schedule/days off, commission, status, account-access presentation, and
      the official demonstrative access choices.
- [ ] A professional operational view connects today's Agenda, availability,
      services/overrides, commission facts, and valid deep links.
- [ ] Access settings remain demonstrative and never claim or implement
      production authorization.
- [ ] Normal, incomplete, complete, empty, dense, restricted, long-content,
      slow, fail-next, persistent-error, reset, and reload scenarios exist.

### Delivery 2

- [ ] Agenda exposes separate temporal scope (`Dia`/`Semana`) and
      representation (`Quadro`/`Lista`) without invalid combinations.
- [ ] Week navigation supports previous, next, today, and direct date selection
      with canonical URL-backed non-PII state.
- [ ] The weekly board renders seven days, bounded operating hours,
      appointments, blocked/walk-in periods, free spaces, professional labels,
      and all accepted states.
- [ ] Professional/status/unit/search filters apply consistently to board and
      list for the selected week.
- [ ] Users can create, inspect, edit, cancel, and reschedule appointments from
      the weekly context.
- [ ] Weekly drag may change date/time; professional changes remain available
      in the drawer, while the daily board retains cross-professional drag.
- [ ] Conflict, unavailable-professional, closed-hours, insufficient-space,
      no-op, stale-operation, and terminal-state rules remain truthful.
- [ ] The list is a complete keyboard/assistive-technology and narrow-screen
      alternative for the same week.
- [ ] Typical, empty, all-statuses, dense, many-professionals, long-content,
      overlapping, blocked, slow, error, reset, reload, and boundary-week
      scenarios exist.

## Verification Plan

- Unit tests:
  - setup readiness and step ordering;
  - payment-method and mixed-payment rules;
  - professional override resolution and clearing;
  - professional access-policy defaults;
  - bounded professional summaries;
  - week date bounds, layout, sorting, overlap, filters, and collision rules.
- Integration/component tests:
  - onboarding resume/review;
  - setup mutation rollback/retry;
  - service override consumption by scheduling;
  - payment settings consumption by checkout;
  - professional tabs/deep links;
  - day/week and board/list state combinations;
  - loading/error/empty/unavailable states;
  - keyboard and accessible-name behavior.
- Production-boundary tests:
  - no production imports from `src/dev`;
  - memory/scenario exclusion from `hml`/`prd`;
  - no IDP/API/provider/persistence additions;
  - no frontend permission claim as authorization.
- Playwright:
  - incomplete onboarding through workspace entry;
  - resume and edit-after-completion;
  - create/clear service override;
  - configure payment methods;
  - professional operational view;
  - weekly create/view/edit/cancel/reschedule;
  - filter, empty, error recovery, reset, reload, and week-boundary journeys.
- Accessibility/manual:
  - automated axe;
  - keyboard-only and focus return;
  - VoiceOver/NVDA spot checks;
  - 320px, 200% zoom, coarse pointer, forced colors, reduced motion;
  - light, dark, and system themes.
- Commands:
  - `bun --filter studio routes:generate`;
  - `bun --filter studio format`;
  - `bun --filter studio lint`;
  - `bun --filter studio typecheck`;
  - `bun --filter studio test`;
  - `bun --filter studio test:production-boundary`;
  - `bun --filter studio test:e2e` when the browser is provisioned;
  - `bun --filter studio build`;
  - `bun --filter studio check`;
  - `bun run check`;
  - `git diff --check`.

## Open Questions

- [x] Delivery grouping: one initiative with two ordered tasks.
- [x] Setup grouping: onboarding, services, and professionals remain one
      coherent delivery.
- [x] Permission boundary: demonstrative business settings only; production
      authorization is deferred.
- [x] Week layout: days are columns; professional identity is carried by cards
      and filters instead of multiplying professional columns.
- [x] Production behavior: memory sources remain disabled in `hml` and `prd`.
