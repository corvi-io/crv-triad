# 03 TRIAD Studio Schedule Visual Prototype - Execution Plan

## Source

- PRD: `docs/initiatives/prds/03-triad-studio-schedule-visual-prototype.md`
- Depends on: [ENG-33](https://linear.app/corvi-io/issue/ENG-33/build-the-triad-studio-component-system-and-mock-runtime)
- Linear initiative: [TRIAD Studio Schedule Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-schedule-visual-prototype-b4722b97cc20)
- Related issue: [ENG-34](https://linear.app/corvi-io/issue/ENG-34/build-the-triad-studio-schedule-visual-prototype)
- Related PR: [#10](https://github.com/corvi-io/crv-triad/pull/10)

## Implementation Principles

- Keep this initiative frontend-only and bounded to the manager/reception daily
  schedule and appointment management prototype.
- Use the real IDP for authentication and never intercept or mock Better Auth.
- Keep mock records synthetic, deterministic, resettable, session-memory-only,
  and explicitly unavailable in `hml` and `prd`.
- Define scheduling presentation through a module-owned repository port; memory
  and future HTTP adapters meet the port at one composition boundary.
- Keep scheduling vocabulary and rules out of the generic memory engine.
- Treat mock types as UI-facing contracts, not future API or database schemas.
- Reuse components in this order: existing Studio component, official shadcn/ui
  component, reviewed shadcn-compatible registry item, then justified custom
  code.
- Inspect registry items before installation and own accepted source through
  Triad tokens, accessibility, tests, and textual inventory.
- Use Brazilian Portuguese UI copy and English technical artifacts.
- Do not expose inactive future navigation or misleading controls.

## Tasks

- [ ] Confirm accepted scope and UX decisions:
  - [ ] Review the connected UX product note and Initiative 03 PRD with product
        and UX.
  - [x] Confirm daily view only, initial 15-minute increments, visible operating
        hours, and the one-unit assumption.
  - [x] Confirm the Portuguese labels and visual hierarchy for scheduled,
        confirmed, arrived, waiting, in-progress, completed, canceled, and
        no-show.
  - [x] Confirm walk-ins are markers only; keep queue actions for Initiative 05.
  - [x] Choose the narrow-viewport representation after comparing bounded grid
        and professional-grouped list concepts.
- [x] Complete component discovery before implementation:
  - [x] Inventory existing Studio primitives and composites that satisfy the
        schedule toolbar, filters, scrolling, status, drawer, form, confirmation,
        loading, empty, error, and toast needs.
  - [x] Search official shadcn/ui components and inspect candidate additions with
        CLI dry-run/view/diff behavior.
  - [x] Search the shadcn Registry Directory only for needs not met by existing or
        official components.
  - [x] Review each third-party candidate for source, dependencies, license,
        maintenance, Base UI/Vite compatibility, bundle impact, keyboard/focus,
        responsive behavior, and token integration.
  - [x] Record why any custom schedule primitive is necessary before creating it.
- [x] Establish the scheduling module contract:
  - [x] Create `src/modules/scheduling` with UI-facing appointment, professional,
        service, availability, filter, and day-result types.
  - [x] Define the smallest asynchronous repository port required by the accepted
        visual journey.
  - [x] Add stable scheduling query keys and TanStack Query hooks that consume
        only the repository port.
  - [x] Add repository context/composition without a global product store.
  - [x] Keep mock shapes explicitly independent from future OpenAPI and database
        design.
- [x] Build deterministic scheduling scenarios:
  - [x] Add `src/dev/scheduling` factories, synthetic catalogs, scenario
        definitions, and the memory repository adapter.
  - [x] Reuse the neutral `MemoryScenarioEngine` without introducing scheduling
        vocabulary into it.
  - [x] Include normal, empty, all-statuses, dense, many-professionals,
        long-content, blocked, walk-in-marker, conflict, slow, next-failure, and
        persistent-error scenarios.
  - [x] Ensure isolated deterministic IDs, mutations, reset, and scenario changes.
  - [x] Keep all names, phones, services, and notes synthetic.
- [x] Add controlled prototype composition:
  - [x] Define a public `VITE_*` data-source or prototype input with a safe
        disabled default.
  - [x] Declare the uppercase `STUDIO__*` deployment source in `env-schema.yaml`.
  - [x] Enable memory scheduling only for local/test/`dev` and fail closed for
        `hml`/`prd`.
  - [x] Select the adapter at a narrow build/composition boundary that can later
        select HTTP.
  - [x] Extend production-boundary checks so `hml`/`prd` artifacts contain no
        synthetic scheduling scenarios or memory adapter.
- [x] Add route and navigation:
  - [x] Add authenticated `/agenda` with route-level loading and failure behavior.
  - [x] Register Agenda as the only new active business navigation item and add
        breadcrumbs/search metadata through the workspace registry.
  - [x] Compose the route with the existing Studio shell, `ModuleLayout`, and
        `PageHeader` contracts.
  - [x] Keep unavailable MLP modules and actions out of active navigation.
- [x] Build schedule controls:
  - [x] Add selected-date presentation, `Hoje`, previous/next navigation, and
        daily view labeling.
  - [x] Add professional and status filters.
  - [x] Persist useful date/filter state in URL search parameters.
  - [x] Keep week, drag/drop, recurrence, and inactive controls absent.
- [x] Build the daily schedule composition:
  - [x] Render professionals as columns and time as rows.
  - [x] Render appointment blocks, available slots, breaks, blocked periods, and
        walk-in markers.
  - [x] Add bounded vertical/horizontal scroll and stable headers where useful.
  - [x] Support long content, all statuses, empty days, dense days, and many
        professionals.
  - [x] Add an accepted narrow-viewport alternative and verify 200% zoom.
  - [x] Keep status meaning independent from color alone.
- [x] Build appointment drawers and interactions:
  - [x] Reuse `ActionDrawer`, form foundations, date picker, combobox, masks,
        confirmation, and Sonner where their contracts fit.
  - [x] Add create, view, edit, reschedule, and cancel modes without route changes.
  - [x] Add customer, phone, professional, service, date, time, duration, price,
        notes, and origin fields.
  - [x] Add simplified synthetic customer creation with name and phone.
  - [x] Populate duration, default price, and eligible professionals from service
        selection.
  - [x] Validate required fields and conflict, unavailable-professional,
        closed-hours, and insufficient-space conditions.
  - [x] Prevent duplicate submissions, keep button labels stable, show concise
        Brazilian Portuguese toasts, and return focus to the trigger.
- [x] Add focused verification:
  - [x] Unit-test view models, status presentation, helpers, form schema/defaults,
        query keys, repository contract, scenarios, and conflict fixtures.
  - [x] Test memory adapter CRUD, day/filter behavior, delayed-result isolation,
        reset, and failures.
  - [x] Component-test controls, grid/list semantics, appointment blocks,
        drawers, validation, feedback, long content, and themes.
  - [x] Add Playwright coverage for the main appointment journey, URL filters,
        conflict recovery, scenarios, dense scrolling, keyboard focus return,
        and axe.
  - [x] Prove Better Auth is not intercepted and production boundaries remain
        fail-closed.
- [ ] Complete documentation and handoff:
  - [x] Update the Studio component inventory for every accepted shared change or
        document why scheduling compositions remain module-owned.
  - [x] Record shadcn/registry discovery decisions and custom-component rationale.
  - [x] Update Studio runtime, testing, environment, and deployment docs affected
        by the controlled `dev` prototype.
  - [x] Record manual keyboard, focus, VoiceOver, zoom, narrow viewport,
        reduced-motion, target-size, and contrast results with residual risk.
  - [ ] Run preflight before opening a PR against `staging` and update Linear only
        with evidence-based state transitions.

## Verification Evidence

Record evidence as tasks are completed:

- Command: `bun --filter studio check`
- Result: pass; 20 Vitest files, 83 tests, production build, and 30-file boundary scan.
- Command: `bun --filter studio test:e2e`
- Result: pass; 8 Chromium tests including 3 schedule journeys and focused axe.
- Command: `bun --filter studio test:e2e:production`
- Result: pass; 3 production redirect/exclusion tests.
- Command: `bun test ./.github/scripts`
- Result: pass; 15 tests including the checked-in Studio env-source inventory for the two accepted
  `STUDIO__` inputs.
- Notes: manual 1440 × 900 light and 320 × 720 dark screenshot inspection completed; narrow date
  overflow was corrected. VoiceOver, Windows High Contrast, and deployed real-IDP login were
  unavailable and remain residual checks.

## Risks And Follow-Ups

- [ ] The UX MLP source is broader than this initiative; reject onboarding,
      queue, fulfillment, revenue, dashboard, report, and barber-app scope creep.
- [ ] A schedule grid can become an inaccessible custom widget; validate native
      semantics and keyboard expectations before using complex ARIA patterns.
- [ ] Third-party shadcn registry items can introduce unsuitable dependencies or
      inaccessible interactions; inspect and adapt every accepted source.
- [ ] A dev-only product prototype can leak into later targets without explicit
      configuration defaults and artifact checks.
- [ ] UI-facing mock types can be mistaken for backend contracts; keep future API
      design as a separate initiative informed by validated UX.
- [ ] Dense local scenarios validate rendering and interaction only, not backend
      capacity or production concurrency.
- [ ] Initiative 04 should validate setup/onboarding; Initiative 05 should
      validate queue and service fulfillment; Initiative 06 should validate
      payment, commissions, and daily closing.
