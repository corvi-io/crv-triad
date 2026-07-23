# 11 TRIAD Studio Operational Dashboard Visual Prototype - Execution Plan

## Source

- PRD:
  `docs/initiatives/prds/11-triad-studio-operational-dashboard-visual-prototype.md`
- Verbatim UX handoff:
  `docs/initiatives/sources/11-triad-studio-operational-dashboard-ux-handoff.md`
- Source SHA-256:
  `6c0d3d26685d60434c90ad19dbfb759a116136cadfa32b9dc2d6efc7f55d5c14`
- Linear initiative:
  [TRIAD Studio Operational Dashboard Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-operational-dashboard-visual-prototype-034bbb009e3b)
- Linear source document:
  [TRIAD Studio Operational Dashboard — Verbatim UX Handoff](https://linear.app/corvi-io/document/triad-studio-operational-dashboard-verbatim-ux-handoff-b028cd53b0ac)
- Linear issue:
  [ENG-45](https://linear.app/corvi-io/issue/ENG-45/build-the-triad-studio-operational-dashboard-visual-prototype)

## Implementation Principles

- Replace the current `/overview` placeholder; do not create a second Dashboard route.
- Preserve the UX hierarchy while treating example numbers as layout references, not fixtures.
- Reuse the current scheduling source, contracts, records, mutations, actions, routes, statuses, and
  fail-closed production boundary.
- Do not add `src/dev/dashboard`, duplicated data, a new source env variable, fake HTTP, browser
  persistence, polling, realtime, or production API behavior.
- Keep shared overview presentation independent from scheduling and `src/dev`; inject a typed
  read-only view model derived under scheduling ownership.
- Reuse existing Studio components and tokens before inspecting official shadcn/ui. Do not create a
  parallel component system or literal screenshot stylesheet.
- Render unsupported financial/client values as unavailable. Never infer zero, payment settlement,
  discount, payment method, first visit, or long-term retention.
- Keep Agenda UI, rules, filters, DnD, statuses, routes, and product behavior unchanged.
- Use only synthetic data and privacy-safe screenshots/evidence.

## Parallel-Agent Ownership Boundary

- Primary implementation ownership:
  - `apps/studio/src/modules/shared/components/workspace-overview/**`
  - new scheduling-owned Dashboard projection/query files under
    `apps/studio/src/modules/scheduling/**`
  - `apps/studio/src/routes/_authenticated/overview/index.tsx`
  - focused Dashboard unit and Playwright tests
  - `docs/studio/dashboard.md`
- Narrow shared-state ownership when required:
  - `apps/studio/src/dev/scheduling/entry.ts`
  - scheduling virtual-module declaration/disabled shim only if their existing public surface must
    expose the same repository instance
  - directly affected architecture, component inventory, testing, and schedule documentation
- Forbidden overlap:
  - Agenda page, board/list, controls, drawer behavior, status rules, DnD, or styling
  - `apps/studio/src/modules/clients/**` and `apps/studio/src/dev/clients/**`
  - barbershop-setup behavior
  - auth, IDP, API, or site behavior
- ENG-44 is currently a separate implementation stream. If both tasks are active concurrently, use
  separate checkouts/floors. Do not share one working directory. Client links are conditional and
  do not justify editing ENG-44 files.
- Before `In Development`, record the agent, branch, checkout, owned files, and Definition of Done
  in Linear.


- [x] Preserve planning sources:
  - [x] Read the complete 848-line UX handoff and inspect the supplied 1600 × 900 screenshot.
  - [x] Store the handoff verbatim under `docs/initiatives/sources`.
  - [x] Verify the repository copy matches the supplied SHA-256.
  - [x] Record accepted interpretations and counterproposals separately from the source.
- [x] Confirm the implementation baseline:
  - [x] Read the PRD, source, root/Studio instructions, applicable skills, current Agenda/setup/client
        state, component inventory, theme contract, and production boundary.
  - [x] Inspect ENG-44/active PR state before relying on `/clients`; keep the Dashboard independent.
  - [x] Capture `git status` and preserve unrelated user-owned changes.
  - [x] Capture controlled before evidence for the `/overview` placeholder and current Agenda
        regression surfaces.
- [x] Define the Dashboard contract:
  - [x] Add safe period/date/unit/professional/scenario search validation with a 31-day custom bound.
  - [x] Define a typed read-only view model for filters, freshness, KPIs, upcoming appointments,
        attention, flow, professional occupancy, capacity, supported finance, services,
        cancellations/no-show, and clients.
  - [x] Document every calculation beside focused tests, including denominators and excluded
        statuses.
  - [x] Represent discounts, payment methods, settlement, new clients, and long-term retention as
        unavailable optional fields.
  - [x] Keep PII and free text out of URL state.
- [x] Reuse the existing scheduling source:
  - [x] Add pure scheduling-owned Dashboard projection functions over current `ScheduleDay` records.
  - [x] Use one bounded period read and one coherent map/reduction pipeline rather than one scan per
        card.
  - [x] Reuse current professionals, services, units, appointment status presentation, price,
        payment status, and blocked-period data.
  - [x] Share one local/dev scheduling repository instance across Dashboard and Agenda.
  - [x] Prove the source-composition change does not alter Agenda behavior or tests.
  - [x] Reuse current scenario reset, delay, failure, and `hml`/`prd` disabled behavior.
  - [x] Do not add Dashboard scenarios, fixtures, source configuration, or env/workflow changes.
- [x] Replace the overview placeholder:
  - [x] Keep `/overview`, current navigation, breadcrumbs, auth gate, and shell.
  - [x] Compose `ModuleLayout`, `PageHeader`, global filters, freshness, and responsive Dashboard
        sections through existing shared components.
  - [x] Keep large-desktop hierarchy aligned to the supplied reference without literal pixel or
        hard-coded data copying.
  - [x] Use neutral card surfaces, restrained gold selection/CTA, existing feedback/status tokens,
        Geist, and no decorative gradients, neon icons, full-card status fills, or chart library.
- [x] Implement filters and KPIs:
  - [x] Add `Hoje`, `Ontem`, `Esta semana`, `Este mês`, and bounded `Personalizado`.
  - [x] Add unit and professional filters from the loaded scheduling source.
  - [x] Persist safe filter state in URL search and update every block coherently.
  - [x] Render appointment count, completed count/ratio, paid-state appointment value, paid-state
        average, and minute-based occupancy.
  - [x] Show comparison helpers only when one stable source read actually supplies a comparison.
  - [x] Show query completion time without polling or a realtime claim.
- [x] Implement operational blocks:
  - [x] Render the next five or six non-terminal appointments with existing avatars, status
        presentation, route/action semantics, and contextual actions without an `Ações` column.
  - [x] Render only derivable actionable attention items and cap the list.
  - [x] Render the existing appointment flow vocabulary as keyboard-operable drill-down links.
  - [x] Render professional occupancy and current state without ranking.
  - [x] Render morning/afternoon/evening capacity plus available/reserved/free minutes.
  - [x] Render supported finance values and explicit unavailable payment-method/discount state.
  - [x] Render up to five services with truthful associated-value labels.
  - [x] Render cancellations/no-show counts, rate, and potential appointment value.
  - [x] Render unique completed clients and, if useful, clients with more than one appointment in
        the period; do not label this as long-term retention.
- [x] Reuse existing interactions:
  - [x] Open the existing appointment creation drawer from `Novo agendamento`.
  - [x] Reuse existing view/edit/status/reschedule behavior only where current components support it.
  - [x] Navigate KPI/status/professional links to Agenda with allowlisted filters.
  - [x] Navigate services to `/barbershop-setup?section=services`.
  - [x] Add client links only when `/clients` is available, without importing client internals.
  - [x] Do not create finance, alert-detail, service-detail, or client-detail routes.
- [x] Implement states and responsive behavior:
  - [x] Add coherent skeleton, empty, filtered-empty, error/retry, delayed, unsupported-data, and
        disabled-source states in Brazilian Portuguese.
  - [x] Keep five KPI columns at the reference width, wrap on medium desktop, and stack/reflow for
        tablet/narrow widths.
  - [x] Keep table overflow inside its card and prevent page-level horizontal overflow.
  - [x] Preserve logical reading/focus order independently of CSS grid rearrangement.
- [x] Complete accessibility:
  - [x] Use semantic headings, native links/buttons, labeled filters, semantic tables, accessible
        progress values, and color-independent status/metric meaning.
  - [x] Announce user-triggered filter completion politely without continuous freshness updates.
  - [x] Verify visible/unobscured focus, 24px targets, keyboard flow, 200% zoom, 320px reflow,
        forced colors, reduced motion, and coarse pointer behavior.
  - [x] Measure browser-computed normal/muted text, status, focus, progress, and meaningful border
        contrast against WCAG 2.2 AA.
  - [x] Run axe and record VoiceOver/NVDA/real-device checks or residual risk.
- [x] Add automated evidence:
  - [x] Unit-test URL bounds/allowlists and every accepted metric formula.
  - [x] Unit-test ordering/caps, attention classification, unavailable fields, one-pass projection,
        shared repository identity, stale-result protection, and production exclusion.
  - [x] Component-test all sections and loading/empty/error/unsupported/disabled states.
  - [x] Playwright-test the 1600 × 900 hierarchy, filter coherence, drill-down navigation, existing
        drawer reuse, Dashboard-to-Agenda shared state, reset, and representative scenarios.
  - [x] Playwright-test medium/tablet/320px layouts, no page overflow, keyboard, focus, axe,
        light/dark/system, forced colors, reduced motion, target size, and contrast.
  - [ ] Keep the complete existing Agenda and production-boundary suites green.
- [x] Update durable documentation:
  - [x] Add `docs/studio/dashboard.md` with formulas, source, filters, unsupported fields, privacy,
        accessibility, reset, and future API boundaries.
  - [x] Update `docs/studio/component-system.md` for the active overview/MetricCard contract and any
        other changed shared component.
  - [x] Update `docs/studio/testing.md` and `docs/studio/schedule-prototype.md` for shared-state and
        Dashboard evidence.
  - [x] Update `apps/studio/README.md` only if runtime, route, or verification guidance changes;
        otherwise record why it remains accurate.
  - [x] Keep API, IDP, site, env, deployment, and release docs unchanged unless implementation
        proves a real contract change.
- [x] Verify and hand off:
  - [x] Run route generation, format, lint, typecheck, Vitest, focused/full Playwright,
        production-boundary, build, Studio check, root check, and `git diff --check`.
  - [x] Inspect controlled desktop, medium, tablet, and narrow browser states in light and dark.
  - [x] Run Triad preflight before commit, push, or PR.
  - [ ] Link the PR and concise evidence in Linear and follow evidence-based workflow states.


Record implementation evidence only after it exists. Use synthetic fixtures and avoid credentials,
tokens, sessions, private headers, real identities, and production screenshots.

- Source preservation/hash:
  - Supplied and repository files are both 848 lines / 13,554 bytes.
  - SHA-256:
    `6c0d3d26685d60434c90ad19dbfb759a116136cadfa32b9dc2d6efc7f55d5c14`.
- Before/reference/after visual evidence:
  - Inspected the additional 2026-07-23 user reference directly, then captured controlled
    1600 × 900 top, middle, and lower Dashboard states from Playwright.
  - The reference confirmed fold order, density, alignment, a wider upcoming/attention split, a
    balanced flow/professional split, equal three-card operational and two-card final rows, and
    restrained relative weight. No reference numbers, unsupported facts, pixels, colors, or
    identity were copied.
- Formula and URL contract tests:
  - `tests/unit/dashboard-projection.test.ts`: 7 passing tests for allowlists, 31-day inclusive
    bounds, relative periods, supported formulas, truthful unsupported values, collection
    ordering/caps, professional availability, and invalid professional fallback.
- Source sharing and Agenda regression:
  - The Dashboard and Agenda compose the same module-scoped local/dev scheduling repository;
    Playwright proves a Dashboard-created appointment appears in Agenda and reload resets it.
  - The standard Studio check includes the complete Agenda unit suite: 11/11 passing.
  - Full Playwright passed 55/57. The two failing Agenda expectations are present unchanged on
    `origin/staging`: one still expects an unfiltered `Barbeiro` count that the accepted unit
    contract explicitly omits, and one drag helper lands at 14:15 while expecting 14:00. ENG-45
    does not alter Agenda tests or product behavior.
- Dashboard unit/component tests:
  - Focused Vitest: 2 files / 10 tests passing.
  - Complete Vitest: 34 files / 225 tests passing; the first saturated run produced timeout-only
    failures, then the serial/headroom run and the standard Studio/root gates passed.
- Playwright/accessibility/responsive/contrast:
  - Focused Dashboard: 6/6 passing; axe, semantic order, shared drawer/state, URL filters,
    unsupported states, 1600 × 900, medium/tablet, 320px/200%-equivalent reflow,
    light/dark/system, reduced motion, forced colors, computed progress contrast, visible focus,
    and 24px targets.
  - Existing theme and Agenda browser coverage supplies light/dark/system and computed contrast
    evidence. VoiceOver/NVDA, physical-device touch, and browser-UI zoom remain manual.
- Production boundary:
  - Production artifact scan passed across 47 files; production Playwright passed 7/7, including
    authenticated `/overview` fail-closed behavior with no scheduling memory values.
- Studio/root verification:
  - Route generation, format, lint, typecheck, build, Studio check, frozen Bun install, root check,
    and `git diff --check` passed. The root check passed all four packages after the floor install
    was refreshed from the committed lockfile.
- Documentation review:
  - Added `docs/studio/dashboard.md`; updated the Studio README and component, schedule, testing,
    and theme contracts. API, IDP, site, environment, deployment, and release docs remain unchanged
    because ENG-45 introduces no contract there.

## Risks And Follow-Ups

- [ ] The current mutable scheduling scenario projection may need a small source-composition
      correction before concurrent current/comparison reads are safe; omit comparison rather than
      introducing stale data.
- [ ] Shared repository lifetime can leak state between tests unless every test owns explicit reset
      or a fresh test factory; production route composition and test factories must remain separate.
- [ ] Dense 1600 × 900 matching can tempt sub-AA text and tiny targets; accessibility requirements
      override literal density.
- [ ] A query-time “Atualizado” label can be mistaken for realtime; keep copy and documentation
      explicit and add no polling.
- [ ] Appointment `paid` and price fields are visual prototype state, not provider settlement or
      accounting revenue.
- [ ] ENG-44 may change shared registry/env/tests in another branch. Use an isolated checkout and
      integrate shared changes after its PR lands; do not edit client module files.
- [ ] Future production scale requires aggregate APIs rather than browser calculation over raw
      appointments.
- [ ] Payment methods, discounts, client acquisition/retention, and financial close require
      separate accepted initiatives and must not be smuggled into this visual task.
