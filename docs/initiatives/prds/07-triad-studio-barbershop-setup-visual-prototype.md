# 07 TRIAD Studio Barbershop Setup Module

## Summary

Integrate barbershop setup into the authenticated TRIAD Studio workspace at
`/barbershop-setup`. Owners, managers, and receptionists should enter the module through the normal
sidebar and use overview, units, professionals, services, and weekly availability as one coherent
product experience.

The accepted experience is realistic, but its data source is temporary: local development and the
deployed `dev` target may compose a deterministic session-memory adapter. `hml` and `prd` resolve
the source as disabled until business API, persistence, tenancy, and authorization contracts are
accepted. This initiative does not promise persistence or define a future backend schema.

Execution plan: [07 TRIAD Studio Barbershop Setup Module](../tasks/07-triad-studio-barbershop-setup-visual-prototype.md)

## Context

- ENG-41 originally delivered setup under `/workspace-preview/barbershop-setup` with visible
  scenario, reset, fixture-count, latency, and failure controls.
- Product review determined that a separate preview surface distorted the workflow being evaluated.
  Reviewers must now enter, test, and critique setup through the same authenticated shell,
  navigation, breadcrumbs, responsive sidebar, and route model as the normal product.
- The implemented repository port, TanStack Query hooks, forms, drawers, relationships,
  availability editor, deterministic scenarios, and rollback behavior remain useful and should be
  preserved.
- The integration decision changes where and how the experience is presented; it does not accept a
  business API, persistence model, tenant boundary, or authorization policy.

Related sources:

- [Linear issue ENG-41](https://linear.app/corvi-io/issue/ENG-41/integrate-the-triad-studio-barbershop-setup-module)
- [Pull request #22](https://github.com/corvi-io/crv-triad/pull/22)
- `docs/studio/barbershop-setup.md`
- `docs/studio/component-system.md`
- `docs/studio/deployment.md`

## Goals

- Make `/barbershop-setup` an authenticated child of `_authenticated`, `AuthGate`, and
  `WorkspaceShell`.
- Expose the module as `Barbearia` in secondary navigation while retaining
  `Configuração da barbearia` as its page and breadcrumb title.
- Preserve overview, units, professionals, services, availability, URL-backed section state,
  drawers, CRUD, relationship validation, archive/restore, failure recovery, and accessibility.
- Remove all ordinary preview/debug chrome and language from the integrated experience.
- Keep deterministic scenarios available only as dev/test infrastructure through a stable,
  non-PII technical query value when tests need a specific state.
- Give setup its own explicit `VITE_BARBERSHOP_SETUP_SOURCE` composition boundary so local and
  deployed `dev` may use memory independently of Agenda.
- Ensure `hml` and `prd` fail closed and exclude the memory adapter, fixtures, scenarios, and mock
  engine from built artifacts.
- Keep the module repository port replaceable by a future accepted HTTP adapter without changing
  presentation composition prematurely.
- Turn the overview into an ongoing guided setup journey with progress, dependencies, explanatory
  copy, and one recommended next action.
- Standardize units, professionals, and services on the compact Agenda filter trigger and a table
  that fills the remaining module height while keeping its header and pagination fixed.
- Replace seven independent availability cards with a weekly time-grid editor that supports
  pointer selection, an equivalent click/keyboard form path, block types, weekly recurrence, and
  explicit edit/delete scope.
- Make availability a dated calendar with day, week, and month views; previous/next/today
  navigation; direct date selection; and per-date recurrence exceptions for future holidays,
  vacations, and other operational changes.
- Replace free-text unit opening hours and separate start/end affordances with composed time-range
  controls that communicate one period.

## Non-Goals

- Business API routes, OpenAPI, database tables, migrations, durable storage, browser storage,
  realtime, polling, background jobs, or external providers.
- Better Auth organization, membership, invitation, role, user, or IDP changes.
- Production onboarding, tenant provisioning, authorization rules, or an accepted settings domain.
- Treating current view models, IDs, fixture relationships, validation rules, or scenario sizes as
  backend contracts or capacity evidence.
- Removing or changing unrelated `/workspace-preview` surfaces, including the sandbox and Agenda.
- Enabling the memory source in `hml` or `prd`.
- Treating appointments as manually editable availability blocks. Appointment occupancy remains an
  Agenda concern and may only be overlaid by a future accepted cross-module contract.
- Monthly or yearly recurrence cadence for ordinary working hours. Month is an accepted calendar
  view, while the operating rule remains weekly with explicit start/end dates and dated exceptions.
- Inventing general-company registration fields before legal identity, contact, branding, tenancy,
  and API ownership are accepted. The overview may expose the gap, but this iteration does not
  fabricate a business profile contract.

## Brainstorm

### Problem Framing

The workflow under review is not “operate a prototype”; it is “configure a barbershop inside
Studio.” A preview shell, scenario selector, reset command, and diagnostic counters make reviewers
evaluate the test harness instead of the product navigation and task flow. The smallest coherent
change is to integrate the existing module while retaining its replaceable in-memory boundary.

### Gaps And Assumptions

- There is still no accepted API, persistence, tenant, or authorization contract.
- A deployed `dev` build needs the same deterministic source as local serve for shared review.
- `hml` and `prd` must remain safe even if an environment variable mistakenly requests memory.
- The technical `scenario` query value is acceptable only because it is a stable identifier with no
  PII and has no ordinary visible control.
- The default source state must be useful without test parameters; `single-unit` is the accepted
  default.
- Account-access fields remain presentation data and do not mutate identity.

### Counterpoints And Alternatives

- Keeping the preview route would minimize code movement, but it conflicts with the explicit
  product decision and would continue to bypass normal navigation review.
- Removing deterministic scenarios entirely would simplify the port, but would discard valuable
  regression coverage for errors, density, conflicts, and stale operations. Keeping them behind a
  technical dev/test boundary is safer.
- Enabling memory in all environments would make the route look complete, but would ship fixtures
  where users may mistake them for persistent data. Fail-closed `hml`/`prd` is required.
- Building an HTTP adapter now would make the integrated route durable, but it would force business
  and security contracts that this initiative explicitly does not own.
- Hiding the module completely in `hml`/`prd` would avoid an unavailable state, but would make
  navigation and route topology target-dependent. A stable route with a disabled source state keeps
  the product boundary explicit while excluding fixtures.

### Recommendation

Use an authenticated route and stable module registry entry. Compose
`virtual:studio-barbershop-setup-source` to the memory adapter only when source is `memory` and
target is `local` or `dev`; otherwise resolve a disabled source. Keep repository operations and
queries unchanged, remove scenario/reset/runtime-diagnostic methods from the presentation port, and
retain scenario control only on the concrete development repository.

No new shared visual component is required. Reuse the existing `WorkspaceShell`, `ModuleLayout`,
`PageHeader`, tables, drawers, forms, dialogs, status feedback, and responsive sidebar.

### July 2026 Product Review Expansion

The current implementation exposes repository structure rather than the manager's workflow:
catalog search consumes the full toolbar, state filtering uses a select that differs from Agenda,
tables stop at a minimum height, unit opening hours are free text, and availability requires
editing each weekday through repeated start/end inputs. Product review accepted the following
counterproposal:

- Keep setup as an operational hub after onboarding instead of creating a disposable wizard.
- Present the existing four configured domains as a visual journey, explain why each step matters,
  and route the primary action to the next incomplete dependency.
- Reuse Agenda's compact icon/menu filter language for the single bounded status facet. Reserve an
  `ActionDrawer` for future dense filters; one facet does not justify it.
- Use a weekly time grid for availability. Pointer drag selects a range quickly; clicking/tapping a
  day or using the explicit add command opens the same start/end form without dragging.
- Model availability presentation as available, break/block, and absence blocks. Do not allow a
  manager to manufacture appointment occupancy in setup.
- Treat identical weekly blocks selected across weekdays as one recurrence for this evaluation
  source. Editing or deleting requires an explicit choice between the selected weekday and the
  whole recurrence. A future dated API must independently define series IDs, exceptions, effective
  dates, and `this and following` semantics.
- Keep recurrence bounded to weekly working patterns with selectable weekdays and optional end
  date. An optional end date expresses “for a month”, “for a year”, or a custom period without
  pretending that staff hours naturally recur monthly or annually.

The approach remains an evaluation contract, not a backend schema. Batch availability mutation is
atomic in the memory repository so a failed recurrence change cannot partially update weekdays.
Future API work must provide equivalent transactional behavior or a documented idempotent command.

### Dated Calendar Product Review Expansion

A timeless week cannot answer the actual operational question: “what will happen on the holiday
next Monday?” Product review therefore requires a real calendar rather than a reusable weekday
template. The accepted design is:

- Keep weekly recurrence as the rule language, but project occurrences only for the bounded day,
  week, or month currently visible.
- Add `Dia`, `Semana`, and `Mês` views with previous, next, today, and direct-date navigation.
- Put the selected view and date in stable non-PII URL state so a reviewer can refresh or share the
  exact temporal context.
- Give every one-off block an exact occurrence date. Give recurring blocks a start date, optional
  end date, selected weekdays, and a set of excluded dates.
- Editing one recurring occurrence creates a dated exception/override; deleting one recurring
  occurrence adds only that date to the series exclusions. Editing or deleting the series remains
  an explicit separate action.
- Let a month cell open the corresponding day while retaining directly operable event buttons.
  Day and week time grids retain pointer drag plus explicit click/keyboard alternatives.

The simpler alternative—adding only previous/next buttons to the timeless week—was rejected because
the same weekday record would still be indistinguishable across dates and could not represent a
holiday exception. Materializing every future occurrence was also rejected: it is unbounded and
would create unnecessary storage, migration, and concurrency problems. The long-term API should
persist recurrence rules plus exceptions and return occurrences for a required bounded date range.

The memory source implements this evaluation contract without defining the future database or REST
shape. It does not log schedule payloads, add analytics, change authentication, or introduce
background work. Capacity remains unknown; fixtures are bounded UX evidence only.

## Experience Contract

### Route And Navigation

- `/barbershop-setup` is private and renders under `AuthGate` and `WorkspaceShell`.
- Secondary navigation label: `Barbearia`.
- Page and breadcrumb title: `Configuração da barbearia`.
- Active state works in expanded desktop, collapsed desktop, and mobile sidebar variants.
- `/workspace-preview/barbershop-setup` does not exist and cannot render the module.

### Sections And URL State

- `overview`, `units`, `professionals`, `services`, and `availability` remain directly selectable
  through the stable `section` query value.
- `scenario` may remain as a technical non-PII dev/test query value; invalid or missing values
  resolve to `single-unit`.
- `availabilityView` (`day`, `week`, or `month`) and canonical date-only `availabilityDate` may
  enter URL state because they are shareable non-PII calendar context. Invalid values resolve to
  `week` and the current local date.
- Names, phones, addresses, notes, searches, and form payloads never enter URL state.

### Normal Product Chrome

The module must not visibly expose:

- prototype, preview, presentation, or development-tool language;
- scenario selection or scenario descriptions;
- reset/restore-scenario controls;
- fixture or record-count diagnostics;
- configured latency or failure-mode diagnostics.

Normal loading, error, retry, empty, confirmation, validation, and success feedback remains visible
using Brazilian Portuguese product language.

### Data And Mutation Behavior

- Local and deployed `dev` data is synthetic, deterministic, session-memory-only, and reset by a
  new browser runtime; no ordinary reset command is exposed.
- Create, inspect, edit, archive/restore, relationships, typed availability blocks, recurrence,
  conflict feedback, rollback, and retry continue through the module-owned repository port.
- Recurring block changes update the selected weekdays atomically while unrelated blocks remain
  attached to their original weekday.
- Calendar projection is bounded to the visible day/week/month. One-off blocks occur only on their
  exact date; recurring blocks honor start date, optional end date, and excluded occurrence dates.
- The default `single-unit` state opens a complete, useful setup rather than an empty harness.

## Architecture And Boundaries

- Studio owns the browser module, route, shell integration, UI contracts, repository port, queries,
  and source composition.
- `src/modules/barbershop-setup` does not import `src/dev`.
- `src/dev/barbershop-setup` owns the memory adapter and deterministic scenarios.
- `virtual:studio-barbershop-setup-source` is the composition seam. A future accepted HTTP adapter
  may implement the same port.
- API impact: none.
- IDP impact: none; real Studio authentication still gates the route.
- Site impact: none.
- Persistence impact: none.
- Deployment impact: one optional browser-safe source variable and fail-closed target composition.

## Performance And Scalability

- Current collections are bounded UX/test fixtures, not capacity evidence.
- Day/week/month projection scans only the selected relationship and visible date interval; month
  view is bounded to its displayed calendar grid rather than expanding an unbounded series.
- Existing table pagination and scoped TanStack Query keys remain in place.
- No polling, WebSocket, background refresh, upload, or external request is introduced.
- Stale delayed operations remain generation-guarded and may not overwrite a newer technical test
  state.
- Future API work must independently define server pagination, query bounds, indexes, N+1
  prevention, concurrency, idempotency, and measured capacity.

## Security, Privacy, And Observability

- The new Vite variable is public configuration and contains only `disabled` or `memory`.
- The memory source does not intercept Better Auth, call network APIs, use browser persistence, or
  log records.
- Fixture names, contact values, addresses, schedules, form payloads, auth/session values, and
  private headers are not logged or sent to analytics.
- No production telemetry or numeric reliability claim is introduced.
- Production-boundary checks reject memory adapter, scenario, fixture, and mock-engine markers.

## Accessibility And Responsive Behavior

- Entry through secondary navigation has visible active state and an accessible label when the
  desktop sidebar is collapsed.
- The mobile dialog exposes the full `Barbearia` label and preserves focus management.
- Section controls, tables, menus, drawers, forms, confirmations, and availability editing remain
  keyboard operable with visible focus.
- Form errors retain `aria-invalid`, descriptions, Brazilian Portuguese messages, and first-invalid
  focus.
- Drawer entry/exit animation retains content until close completion, returns focus to the opener,
  and reduces to the minimum duration for `prefers-reduced-motion`.
- Preserve 320 CSS-pixel reflow, 200% zoom-equivalent behavior, theme contrast, non-color status,
  and focused axe coverage.
- Every drag selection has an equivalent single-pointer and keyboard path through the explicit
  add/edit form. Calendar blocks are native buttons with names that include type, weekday, and time.
- The weekly grid uses bounded horizontal scrolling on narrow viewports without creating page-level
  horizontal overflow; focus remains visible above fixed table/footer chrome.
- Previous/next/today, direct-date selection, and day/week/month switching use native or existing
  shared controls with accessible names. View changes announce the visible interval without moving
  focus unexpectedly.

## Acceptance Criteria

- [x] `/barbershop-setup` is authenticated and rendered inside the normal workspace shell.
- [x] `Barbearia` is present and active in expanded, collapsed, and mobile secondary navigation.
- [x] The breadcrumb and page title use `Configuração da barbearia`.
- [x] `/workspace-preview/barbershop-setup` is absent and inaccessible.
- [x] No ordinary preview/scenario/reset/fixture/latency/failure chrome is visible.
- [x] All five sections and existing CRUD, relationship, availability, drawer, rollback, and retry
      journeys remain functional.
- [x] Local serve and configured deployed `dev` builds can compose memory from
      `VITE_BARBERSHOP_SETUP_SOURCE=memory`.
- [x] `hml` and `prd` resolve the source as disabled and exclude fixtures/scenarios from output.
- [x] Documentation states that memory is temporary and replaceable without promising API or
      persistence.
- [x] Route generation, format, lint, typecheck, full Vitest, full Playwright,
      production-boundary, build, Studio check, env/workflow tests, and root check have recorded
      evidence.
- [x] The overview presents explanatory guided steps, visible progress, and a deterministic next
      recommended action while remaining useful after completion.
- [x] Units, professionals, and services use the compact menu-based status filter and compact search
      pattern already established by Agenda.
- [x] Catalog tables fill the remaining available module body, keep header and pagination fixed,
      and confine vertical/horizontal scrolling to the table content.
- [x] Unit opening hours use one composed time-range control rather than free text or unrelated
      start/end fields.
- [x] Availability renders as a weekly time grid with available, break/block, and absence blocks.
- [x] Users can create a time range by dragging, clicking/tapping, or using an explicit keyboard
      operable add command, and all paths open the same block editor.
- [x] Weekly recurrence supports selected weekdays and an optional end date; editing and deletion
      require explicit selected-day versus entire-recurrence scope.
- [x] Batch availability changes are atomic in the memory repository and preserve rollback/retry
      behavior.
- [x] Focused unit/component and browser evidence covers table sizing, filter menus, range fields,
      calendar block operations, recurrence scope, drag alternative, axe, 320px reflow, dark mode,
      focus, and reduced motion.
- [x] Availability offers dated day, week, and month views with previous, next, today, and direct
      date navigation.
- [x] The selected calendar view and canonical date survive refresh through stable non-PII URL
      state.
- [x] Non-recurring blocks appear only on their exact date; recurring blocks honor start date,
      optional end date, selected weekdays, and excluded dates.
- [x] Editing or deleting one recurring occurrence affects only that date, while the explicit
      whole-series action updates or removes the recurrence atomically.
- [x] Month cells expose the correct bounded occurrences and can open the corresponding day view;
      day/week retain drag plus click/tap/keyboard creation.
- [x] Catalog table bodies show a vertical scrollbar only for real overflow, preserve horizontal
      scrolling, and keep the header/footer fixed while the body scrolls.
- [x] Focused repository, component, and browser evidence covers navigation boundaries, projection,
      holiday exclusion, occurrence override, series mutation, axe, keyboard, and 320px reflow.

## Verification Plan

- Unit/component: source target matrix, env mapping, module registry, breadcrumbs, authenticated
  route, architecture boundary, URL validation, forms, repository scenarios, relationships,
  failure recovery, and drawer behavior.
- Browser: direct authenticated route, desktop sidebar entry, collapsed sidebar active state, mobile
  navigation, absence of preview chrome, all CRUD/availability journeys, axe, 320px, theme, focus,
  drawer animation, and reduced motion.
- Boundary: build `prd` with both memory sources explicitly disabled, scan output for fixture and
  scenario markers, and verify the authenticated route renders the disabled source state.
- CI/env: parse every workflow, validate declared sources, and prove source forwarding for `dev`,
  `hml`, and `prd` while the Vite target guard remains fail closed.

## Accepted Decisions And Open Questions

- [x] Product surface: authenticated integrated module, not a preview route.
- [x] Navigation: secondary label `Barbearia`; page/breadcrumb title remains descriptive.
- [x] Temporary source: deterministic session memory for local and configured `dev` only.
- [x] Default state: `single-unit`.
- [x] Test infrastructure: technical non-PII scenario query may remain without visible controls.
- [x] Backend boundary: no API, persistence, tenancy, or authorization promise.
- [ ] A future initiative must decide accepted API, persistence, tenancy, authorization,
      observability, and migration contracts before `hml`/`prd` can use real data.
- [x] July 2026 product review: combine the ongoing hub with guided next actions.
- [x] Availability semantics: setup owns available, break/block, and absence; Agenda owns
      appointment occupancy.
- [x] Recurrence: weekly weekdays with start/end dates and excluded occurrence dates for the
      evaluation experience; future API work owns persistence and `this and following` behavior.
- [ ] A future initiative must define the general barbershop/company profile fields and ownership;
      this iteration does not invent legal identity or tenant data.
