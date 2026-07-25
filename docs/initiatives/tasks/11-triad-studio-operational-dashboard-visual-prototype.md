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

## Tasks

- [x] Preserve planning sources:
  - [x] Read the complete 848-line UX handoff and inspect the supplied 1600 × 900 screenshot.
  - [x] Store the handoff verbatim under `docs/initiatives/sources`.
  - [x] Verify the repository copy matches the supplied SHA-256.
  - [x] Record accepted interpretations and counterproposals separately from the source.
- [ ] Confirm the implementation baseline:
  - [ ] Read the PRD, source, root/Studio instructions, applicable skills, current Agenda/setup/client
        state, component inventory, theme contract, and production boundary.
  - [ ] Inspect ENG-44/active PR state before relying on `/clients`; keep the Dashboard independent.
  - [ ] Capture `git status` and preserve unrelated user-owned changes.
  - [ ] Capture controlled before evidence for the `/overview` placeholder and current Agenda
        regression surfaces.
- [ ] Define the Dashboard contract:
  - [ ] Add safe period/date/unit/professional/scenario search validation with a 31-day custom bound.
  - [ ] Define a typed read-only view model for filters, freshness, KPIs, upcoming appointments,
        attention, flow, professional occupancy, capacity, supported finance, services,
        cancellations/no-show, and clients.
  - [ ] Document every calculation beside focused tests, including denominators and excluded
        statuses.
  - [ ] Represent discounts, payment methods, settlement, new clients, and long-term retention as
        unavailable optional fields.
  - [ ] Keep PII and free text out of URL state.
- [ ] Reuse the existing scheduling source:
  - [ ] Add pure scheduling-owned Dashboard projection functions over current `ScheduleDay` records.
  - [ ] Use one bounded period read and one coherent map/reduction pipeline rather than one scan per
        card.
  - [ ] Reuse current professionals, services, units, appointment status presentation, price,
        payment status, and blocked-period data.
  - [ ] Share one local/dev scheduling repository instance across Dashboard and Agenda.
  - [ ] Prove the source-composition change does not alter Agenda behavior or tests.
  - [ ] Reuse current scenario reset, delay, failure, and `hml`/`prd` disabled behavior.
  - [ ] Do not add Dashboard scenarios, fixtures, source configuration, or env/workflow changes.
- [ ] Replace the overview placeholder:
  - [ ] Keep `/overview`, current navigation, breadcrumbs, auth gate, and shell.
  - [ ] Compose `ModuleLayout`, `PageHeader`, global filters, freshness, and responsive Dashboard
        sections through existing shared components.
  - [ ] Keep large-desktop hierarchy aligned to the supplied reference without literal pixel or
        hard-coded data copying.
  - [ ] Use neutral card surfaces, restrained gold selection/CTA, existing feedback/status tokens,
        Geist, and no decorative gradients, neon icons, full-card status fills, or chart library.
- [ ] Implement filters and KPIs:
  - [ ] Add `Hoje`, `Ontem`, `Esta semana`, `Este mês`, and bounded `Personalizado`.
  - [ ] Add unit and professional filters from the loaded scheduling source.
  - [ ] Persist safe filter state in URL search and update every block coherently.
  - [ ] Render appointment count, completed count/ratio, paid-state appointment value, paid-state
        average, and minute-based occupancy.
  - [ ] Show comparison helpers only when one stable source read actually supplies a comparison.
  - [ ] Show query completion time without polling or a realtime claim.
- [ ] Implement operational blocks:
  - [ ] Render the next five or six non-terminal appointments with existing avatars, status
        presentation, route/action semantics, and contextual actions without an `Ações` column.
  - [ ] Render only derivable actionable attention items and cap the list.
  - [ ] Render the existing appointment flow vocabulary as keyboard-operable drill-down links.
  - [ ] Render professional occupancy and current state without ranking.
  - [ ] Render morning/afternoon/evening capacity plus available/reserved/free minutes.
  - [ ] Render supported finance values and explicit unavailable payment-method/discount state.
  - [ ] Render up to five services with truthful associated-value labels.
  - [ ] Render cancellations/no-show counts, rate, and potential appointment value.
  - [ ] Render unique completed clients and, if useful, clients with more than one appointment in
        the period; do not label this as long-term retention.
- [ ] Reuse existing interactions:
  - [ ] Open the existing appointment creation drawer from `Novo agendamento`.
  - [ ] Reuse existing view/edit/status/reschedule behavior only where current components support it.
  - [ ] Navigate KPI/status/professional links to Agenda with allowlisted filters.
  - [ ] Navigate services to `/barbershop-setup?section=services`.
  - [ ] Add client links only when `/clients` is available, without importing client internals.
  - [ ] Do not create finance, alert-detail, service-detail, or client-detail routes.
- [ ] Implement states and responsive behavior:
  - [ ] Add coherent skeleton, empty, filtered-empty, error/retry, delayed, unsupported-data, and
        disabled-source states in Brazilian Portuguese.
  - [ ] Keep five KPI columns at the reference width, wrap on medium desktop, and stack/reflow for
        tablet/narrow widths.
  - [ ] Keep table overflow inside its card and prevent page-level horizontal overflow.
  - [ ] Preserve logical reading/focus order independently of CSS grid rearrangement.
- [ ] Complete accessibility:
  - [ ] Use semantic headings, native links/buttons, labeled filters, semantic tables, accessible
        progress values, and color-independent status/metric meaning.
  - [ ] Announce user-triggered filter completion politely without continuous freshness updates.
  - [ ] Verify visible/unobscured focus, 24px targets, keyboard flow, 200% zoom, 320px reflow,
        forced colors, reduced motion, and coarse pointer behavior.
  - [ ] Measure browser-computed normal/muted text, status, focus, progress, and meaningful border
        contrast against WCAG 2.2 AA.
  - [ ] Run axe and record VoiceOver/NVDA/real-device checks or residual risk.
- [ ] Add automated evidence:
  - [ ] Unit-test URL bounds/allowlists and every accepted metric formula.
  - [ ] Unit-test ordering/caps, attention classification, unavailable fields, one-pass projection,
        shared repository identity, stale-result protection, and production exclusion.
  - [ ] Component-test all sections and loading/empty/error/unsupported/disabled states.
  - [ ] Playwright-test the 1600 × 900 hierarchy, filter coherence, drill-down navigation, existing
        drawer reuse, Dashboard-to-Agenda shared state, reset, and representative scenarios.
  - [ ] Playwright-test medium/tablet/320px layouts, no page overflow, keyboard, focus, axe,
        light/dark/system, forced colors, reduced motion, target size, and contrast.
  - [ ] Keep the complete existing Agenda and production-boundary suites green.
- [ ] Update durable documentation:
  - [ ] Add `docs/studio/dashboard.md` with formulas, source, filters, unsupported fields, privacy,
        accessibility, reset, and future API boundaries.
  - [ ] Update `docs/studio/component-system.md` for the active overview/MetricCard contract and any
        other changed shared component.
  - [ ] Update `docs/studio/testing.md` and `docs/studio/schedule-prototype.md` for shared-state and
        Dashboard evidence.
  - [ ] Update `apps/studio/README.md` only if runtime, route, or verification guidance changes;
        otherwise record why it remains accurate.
  - [ ] Keep API, IDP, site, env, deployment, and release docs unchanged unless implementation
        proves a real contract change.
- [ ] Verify and hand off:
  - [ ] Run route generation, format, lint, typecheck, Vitest, focused/full Playwright,
        production-boundary, build, Studio check, root check, and `git diff --check`.
  - [ ] Inspect controlled desktop, medium, tablet, and narrow browser states in light and dark.
  - [ ] Run Triad preflight before commit, push, or PR.
  - [ ] Link the PR and concise evidence in Linear and follow evidence-based workflow states.

## Verification Evidence

Record implementation evidence only after it exists. Use synthetic fixtures and avoid credentials,
tokens, sessions, private headers, real identities, and production screenshots.

- Source preservation/hash:
  - Supplied and repository files are both 848 lines / 13,554 bytes.
  - SHA-256:
    `6c0d3d26685d60434c90ad19dbfb759a116136cadfa32b9dc2d6efc7f55d5c14`.
- Before/reference/after visual evidence:
- Formula and URL contract tests:
- Source sharing and Agenda regression:
- Dashboard unit/component tests:
- Playwright/accessibility/responsive/contrast:
- Production boundary:
- Studio/root verification:
- Documentation review:

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
