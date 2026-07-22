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
  - [x] Keep weekly hours, breaks, closed days, time off, copy-to-weekdays, and filtered conflicts.
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

- `bun --filter studio routes:generate`: passed.
- `bun --filter studio format`: passed; 190 files formatted and the final run fixed one changed
  file.
- `bun --filter studio lint`: passed; 195 files checked.
- `bun --filter studio typecheck`: passed after adding the NodeNext `.js` extension to the local
  Vite source-boundary import.
- Focused Vitest: the initial 7 files and 30 tests passed; the final source-boundary review set of
  5 files and 38 tests also passed.
- `bun --filter studio test`: 27 files and 154 of 155 tests passed on the second bounded run. The
  sole failure was the unchanged Agenda test `opens details from a board card and preserves the
  edit journey`, which exceeded its 5-second jsdom timeout. The first bounded run had the same
  timeout plus one other timeout in that Agenda file; no Agenda source or test changed.
- Focused drawer Playwright: 1 Chromium test passed.
- `bun --filter studio test:e2e`: all 38 Chromium tests passed.
- `bun --filter studio test:e2e:production`: all 5 production Chromium tests passed.
- `bun --filter studio test:production-boundary`: the final run passed; 39 output files and 987,479
  bytes scanned, with fixture markers and every named development scenario rejected.
- `bun --filter studio build`: passed. An explicit deployed-dev build with target `dev` and both
  sources set to `memory` also passed; the expected existing chunk-size warning remained.
- `bun --filter studio check`: generation, Biome, and typecheck passed; its second bounded run then
  reproduced only the unchanged Agenda timeout above at 154 of 155 tests.
- `bun run test:ci`: all 19 env/workflow/release tests passed.
- `bun run check`: API, IDP, and site passed from Turbo cache; Studio reproduced only the same
  unchanged Agenda timeout at 154 of 155 tests, so the root command exited 1 with 3 of 4 tasks
  successful.
- `git diff --check`: passed before preflight.
- Browser inspection used the authenticated integration with a browser-local session response. It
  entered from `/overview` through the `Barbearia` sidebar link, inspected the direct route,
  expanded/collapsed desktop navigation, the mobile navigation dialog and active state, and found
  no preview/reset/scenario chrome.
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
