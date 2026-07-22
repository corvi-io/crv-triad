# 07 TRIAD Studio Barbershop Setup Module - Execution Plan

## Source

- PRD: `docs/initiatives/prds/07-triad-studio-barbershop-setup-visual-prototype.md`
- Linear issue: [ENG-41](https://linear.app/corvi-io/issue/ENG-41/integrate-the-triad-studio-barbershop-setup-module)
- Pull request: [#22](https://github.com/corvi-io/crv-triad/pull/22)

## Implementation Principles

- Treat `/barbershop-setup` as a normal authenticated Studio module.
- Preserve the accepted setup journeys and presentation repository port while removing visible
  preview/debug controls and terminology.
- Keep deterministic scenarios under `src/dev` as test infrastructure only.
- Keep the technical `scenario` query value non-PII, invisible in ordinary UI, and defaulted to
  `single-unit`.
- Compose memory through `virtual:studio-barbershop-setup-source` only when source is `memory` and
  target is `local` or `dev`.
- Resolve `hml` and `prd` to the disabled source even when memory is requested.
- Do not add API, IDP, site, persistence, dependencies, external providers, analytics, realtime, or
  real data.

## Tasks

- [x] Apply the July 2026 product-review iteration:
  - [x] Record the accepted guided overview, compact catalog toolbar, fill-height table, composed
        range, calendar, block-type, recurrence, and accessibility decisions in the PRD.
  - [x] Refactor overview into an ongoing guided setup hub with one recommended next action.
  - [x] Reuse Agenda's compact search and menu-based status filter across units, professionals, and
        services.
  - [x] Make catalog tables consume the remaining module height with fixed header/footer and an
        internally scrolling body.
  - [x] Replace unit opening-hours free text with a composed time-range field.
  - [x] Replace weekday availability cards with a weekly time grid and typed blocks.
  - [x] Provide drag selection plus click/tap and keyboard alternatives that open the same editor.
  - [x] Add weekly recurrence with selectable weekdays, optional end date, and explicit
        selected-day versus whole-series edit/delete scope.
  - [x] Keep batch recurrence mutations atomic and covered in the memory repository.
  - [x] Update unit/component, Playwright, durable setup, component-system, and testing docs.
  - [x] Run focused and full Studio verification, inspect the browser experience, and record final
        evidence without touching the user-owned ENG-08 files.

- [x] Reconfirm direction and boundaries:
  - [x] Read updated ENG-41, PR #22, review threads, PRD/task, applicable instructions, skills, and
        existing implementation.
  - [x] Record the product decision that authenticated integration replaces the old preview
        decision.
  - [x] Preserve the two user-owned untracked ENG-08 documentation files untouched and unstaged.
- [x] Integrate the route:
  - [x] Add `src/routes/_authenticated/barbershop-setup/index.tsx`.
  - [x] Render through the existing `_authenticated` `AuthGate` and `WorkspaceShell`.
  - [x] Keep stable `section` URL state and the invisible technical `scenario` value.
  - [x] Default invalid or missing scenarios to `single-unit`.
  - [x] Remove `src/routes/workspace-preview/barbershop-setup/index.tsx` and its preview-shell
        dependency.
  - [x] Remove the setup link from the workspace preview landing page.
- [x] Register normal navigation:
  - [x] Add `/barbershop-setup` to the module registry.
  - [x] Add `Barbearia` to secondary navigation.
  - [x] Add `Configuração da barbearia` breadcrumb metadata.
  - [x] Cover desktop expanded/collapsed and mobile navigation active states.
- [x] Remove ordinary test-harness chrome:
  - [x] Remove scenario selection, scenario descriptions, reset controls, fixture counts, latency,
        and failure mode.
  - [x] Replace prototype/presentation/synthetic UI language with normal Brazilian Portuguese
        product copy.
  - [x] Map development-only failures to safe product-facing retry messages.
  - [x] Remove scenario/reset/runtime diagnostics from the module repository port while keeping
        concrete development helpers available to repository tests.
- [x] Establish the setup source boundary:
  - [x] Rename the virtual module to `virtual:studio-barbershop-setup-source`.
  - [x] Rename the disabled shim and type declaration to source-oriented names.
  - [x] Add `VITE_BARBERSHOP_SETUP_SOURCE` to centralized Studio env parsing and `.env.example`.
  - [x] Add `STUDIO__VITE_BARBERSHOP_SETUP_SOURCE` to `env-schema.yaml`.
  - [x] Explicitly enable memory in the local Studio dev script.
  - [x] Pass the GitHub Environment variable through develop, homolog, and production build/deploy
        steps.
  - [x] Share a tested target guard with Agenda so only `local` and `dev` can compose memory.
  - [x] Explicitly disable the source in production-boundary and production-preview scripts.
- [x] Preserve module behavior:
  - [x] Keep overview, units, professionals, services, and availability.
  - [x] Keep create, inspect, edit, archive/restore, relationship validation, retry, and rollback.
  - [x] Keep weekly hours, breaks, absences, recurrence, and filtered conflicts.
  - [x] Keep clean-draft refresh, active-draft preservation, dependency blocking, and stale-operation
        invalidation.
  - [x] Keep drawer entry/exit animation, focus return, and reduced-motion suppression.
- [x] Update automated coverage:
  - [x] Update route generation expectations and source-oriented architecture tests.
  - [x] Update registry, breadcrumb, shell, env, workflow, and source-target tests.
  - [x] Convert ENG-41 Playwright journeys to the authenticated route with a local session fixture in
        the browser harness only.
  - [x] Cover direct route, normal sidebar entry, collapsed navigation, mobile navigation, and
        absence of preview chrome.
  - [x] Prove the removed preview route cannot render the module.
  - [x] Keep CRUD, relationships, availability, axe, responsive, theme, focus, drawer animation,
        and reduced-motion coverage.
  - [x] Update production preview to verify the normal route with a disabled source and no fixtures.
  - [x] Keep the production artifact scan focused on source, fixture, scenario, and mock markers
        while allowing the real module title and route metadata.
- [x] Update durable documentation:
  - [x] Replace the old preview decision in this PRD/task pair.
  - [x] Update `apps/studio/README.md`.
  - [x] Rename the durable setup document to `docs/studio/barbershop-setup.md`.
  - [x] Update `docs/studio/component-system.md`, `docs/studio/testing.md`, and
        `docs/studio/deployment.md`.
  - [x] Keep API, IDP, and site documentation unchanged because their contracts do not change.
- [x] Verify and deliver:
  - [x] Run route generation, format, lint, typecheck, full Vitest, full Playwright,
        production-boundary, build, and Studio check.
  - [x] Run env/workflow tests and root `bun run check` with at most two equivalent attempts.
  - [x] Perform browser inspection through normal sidebar entry, direct route, collapsed sidebar,
        mobile navigation, and absence of preview chrome.
  - [x] Run senior preflight and `git diff --check`.
  - [x] Update PR #22 title/body with current evidence.
  - [x] Commit once with a Conventional Commit message and push fast-forward.

## Verification Evidence

- `bun run --filter studio check`: passed generation, Biome, typecheck, all 28 Vitest files and 162
  tests, production build, and the production-boundary scan across 39 files and 991,853 bytes.
- Focused barbershop-setup Vitest: all 24 repository and page tests passed after adding first-block
  creation for a newly linked professional/unit pair.
- `bun run --filter studio test:e2e -- tests/e2e/barbershop-setup.spec.ts`: all 13 Chromium tests
  passed, including the authenticated integration, guided overview, table sizing, composed hours,
  recurrence rollback/retry, drag/keyboard creation, axe, 320px reflow, drawer animation, dark mode,
  focus, and reduced motion.
- `bun run --filter studio test:e2e`: all 39 Chromium tests passed, including the shared Agenda
  filter behavior after `FilterTrigger` extraction.
- `bun run --filter studio test:e2e:production`: production built successfully and all 5 Chromium
  production-boundary journeys passed.
- `bun run test:ci`: all 19 env/workflow/release tests passed.
- `bun run check`: all four workspace checks passed; Studio again completed all 162 tests and its
  production-boundary scan while API, IDP, and site passed from Turbo cache.
- `git diff --check`: passed after documentation updates.
- Browser inspection used the authenticated integration with a browser-local session response at
  1440×900 and 320×800. It reviewed the guided overview, weekly calendar, internal horizontal
  scrolling, full drawer editor, and intermediate drawer-entry frame without preview chrome or
  page-level horizontal overflow.
- Browser transition evidence captured a closed mount at `translate: 100%` across the 640-pixel
  drawer, `opacity: 1`, and `transition-duration: 0.2s`, followed by `transitionrun`,
  `transitionstart`, and `transitionend` for `translate`. Exit emitted `transitionrun` while
  `data-ending-style` was present, then removed the drawer and returned focus. Reduced motion used
  `0.00001s`, emitted no `transitionrun`, removed the drawer, and returned focus.
- The same closed mount and `transitionrun` were observed from a built `dev` preview with the memory
  source, proving that neither HMR nor deployed-dev composition mounts the drawer already open.
- GitHub Environment values were set and read back as `memory` for `dev` and `disabled` for `hml`
  and `prd` under `STUDIO__VITE_BARBERSHOP_SETUP_SOURCE`.

## Capacity And Risk Notes

- The memory fixtures are bounded UX/test inputs and provide no numeric capacity evidence.
- No network, persistence, polling, realtime, or background load is introduced.
- The integrated shell may make temporary data feel durable; documentation and the disabled
  `hml`/`prd` source boundary prevent an operational persistence claim without adding preview chrome
  back to the UI.
- A future HTTP adapter requires a separate accepted initiative for API, tenancy, authorization,
  persistence, observability, migration, and capacity.
- Physical assistive-technology and hardware checks remain residual unless completed during the
  final browser inspection; automated axe, keyboard, responsive, forced-colors, and reduced-motion
  coverage do not replace them.
