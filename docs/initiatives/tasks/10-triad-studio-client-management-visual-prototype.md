# 10 TRIAD Studio Client Management Visual Prototype - Execution Plan

## Source

- PRD:
  `docs/initiatives/prds/10-triad-studio-client-management-visual-prototype.md`
- Linear initiative:
  [TRIAD Studio Client Management Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-client-management-visual-prototype-47f9c3e46aec)
- Linear issue:
  [ENG-44](https://linear.app/corvi-io/issue/ENG-44/build-the-triad-studio-client-management-visual-prototype)

## Implementation Principles

- Treat `/clients` as a normal authenticated Studio module for product evaluation.
- Keep client presentation contracts and query vocabulary under `src/modules/clients`.
- Keep deterministic records, scenarios, and the memory adapter under `src/dev/clients`.
- Compose the source through `virtual:studio-client-management-source`.
- Enable memory only for `local` and configured deployed `dev`; resolve `hml` and `prd` to disabled
  even when memory is requested.
- Keep technical scenario selection in stable non-PII URL state and restore the selected scenario on
  full reload without visible test-harness chrome.
- Reuse existing Studio components before evaluating official shadcn/ui or reviewed community
  registry source.
- Do not add API, IDP, site, persistence, browser storage, cross-module imports, external providers,
  analytics, realtime, background work, or real client data.
- Do not implement client merge, communications, marketing, loyalty, payments, documents, health
  data, consent, or authorization policy.

## Parallel-Agent Ownership Boundary

- Primary implementation ownership:
  - `apps/studio/src/modules/clients/**`
  - `apps/studio/src/dev/clients/**`
  - `apps/studio/src/routes/_authenticated/clients/**`
  - focused client-management unit and Playwright tests
  - `docs/studio/client-management.md`
- Minimal shared integration ownership:
  - `apps/studio/src/modules/shared/workspace/module-registry.ts`
  - centralized Studio source env parsing and disabled-source shim
  - Vite source composition and source type declaration
  - deployment env manifest/workflow forwarding
  - production-boundary and architecture/inventory expectations
  - directly affected Studio README, component-system, testing, and deployment docs
- The implementing agent must not modify Agenda, barbershop-setup, authentication, IDP, API, or site
  behavior. If an accepted shared component must change, record all existing consumers and add
  focused regressions before editing its single owner.
- Use a dedicated branch based on current `staging`, named from the Linear issue after it exists.
  Do not share one working directory with another active implementation stream.

## Tasks

- [x] Confirm the execution baseline:
  - [x] Read the PRD, root and Studio instructions, applicable Triad skills, current module registry,
        route conventions, component inventory, source boundaries, and closest module tests.
  - [x] Confirm the Linear issue is `Ready`, record the assigned agent, branch, owned files, and
        Definition of Done before implementation begins.
  - [x] Capture current `git status` and preserve unrelated user-owned changes.
- [x] Establish client contracts:
  - [x] Define bounded client, contact, tag, service-preference, appointment-summary, note,
        duplicate-warning, query/page, sort, filter, mutation, and repository-port types under
        `src/modules/clients`.
  - [x] Keep IDs and relationships presentation-owned and explicitly non-canonical.
  - [x] Define allowlisted URL search state with `typical` as the invalid/missing scenario fallback.
  - [x] Keep names, phones, emails, notes, and free-text search out of URL state.
  - [x] Add React Hook Form/Zod schemas with Brazilian Portuguese messages and fresh default-value
        factories.
- [x] Build the deterministic development source:
  - [x] Add `typical`, `empty`, `dense`, `incomplete-contact`, `duplicate-candidates`, `slow`,
        `next-failure`, and `persistent-error` scenarios under `src/dev/clients`.
  - [x] Use only clearly synthetic identities, contacts, notes, and appointments.
  - [x] Implement bounded repository-side search, filters, sorting, pagination, profile/history
        reads, CRUD, archive/restore, note mutations, and exact normalized contact comparison.
  - [x] Make one-shot failures atomic and preserve the pre-mutation snapshot on rollback.
  - [x] Generation-guard delayed reads and mutations across scenario changes and reload.
  - [x] Prove full reload reconstructs deterministic records and IDs for the selected scenario.
- [x] Add the source boundary:
  - [x] Add `virtual:studio-client-management-source`, its type declaration, memory entry, and
        disabled source.
  - [x] Add `VITE_CLIENT_MANAGEMENT_SOURCE` to centralized Studio env parsing and `.env.example`.
  - [x] Add `STUDIO__VITE_CLIENT_MANAGEMENT_SOURCE` to `env-schema.yaml`.
  - [x] Enable memory in the local Studio dev command and forward the source through `dev`, `hml`,
        and `prd` pipelines.
  - [x] Extend the shared target guard so only `local` and `dev` can resolve memory.
  - [x] Explicitly disable the source in production-boundary and production-browser commands.
  - [x] Extend production scans to reject client scenarios, fixtures, adapters, and mock markers.
- [x] Integrate the authenticated route:
  - [x] Add `/clients` under `_authenticated` with lazy route composition.
  - [x] Register `Clientes` in primary navigation, breadcrumbs, command keywords, and route types.
  - [x] Cover active state in expanded desktop, collapsed desktop, and mobile navigation.
  - [x] Render safe loading, disabled-source, empty, filtered-empty, recoverable-error, and
        persistent-error states.
- [x] Implement the directory:
  - [x] Compose `ModuleLayout`, `PageHeader`, existing search/filter controls, `DataTable`, and
        `DataTablePagination`.
  - [x] Keep search, bounded filters, sort, page, page size, and technical scenario state in the
        repository/query boundary and safe URL state.
  - [x] Keep table header and pagination usable while dense rows scroll inside the module body.
  - [x] Open a profile through the primary row interaction.
  - [x] Expose row actions through the shared context menu without adding an `Ações` column.
- [x] Implement the client drawer and forms:
  - [x] Compose `Resumo`, `Agendamentos`, and `Notas` drawer tabs.
  - [x] Show contact details, record state, tags, service preferences, factual visit summary, bounded
        history, and possible duplicate warnings.
  - [x] Implement explicit view/edit modes with stable actions and focus behavior.
  - [x] Implement create, edit, archive, and restore in session memory with confirmation, toast,
        invalidation, retry, and rollback behavior.
  - [x] Implement add, edit, and confirmed removal for timestamped internal notes.
  - [x] Reuse the shared phone mask and application-controlled validation.
  - [x] Add guidance that internal notes must not contain credentials, payment-card, document,
        health, or other highly sensitive data.
  - [x] Keep duplicate candidates inspectable but do not expose merge.
- [ ] Preserve accessibility and responsive behavior:
  - [x] Verify keyboard navigation, `Shift+F10` context actions, drawer tabs, first-invalid focus,
        confirmation focus, focus return, live feedback, and visible focus.
  - [x] Keep status and duplicate meaning independent of color.
  - [ ] Verify light, dark, system, forced colors, reduced motion, coarse pointer, 200% zoom
        equivalent, 320 CSS pixels, and no page-level horizontal overflow.
        Automated light/dark, forced-color, reduced-motion, coarse-pointer emulation, 200%-zoom
        equivalent, 320 CSS pixel, and overflow checks passed. Physical 200% zoom and real-device
        touch remain unverified.
  - [x] Use progressive bounded history loading instead of rendering unbounded activity.
- [x] Add focused automated evidence:
  - [x] Unit-test URL parsing, query allowlists, pagination bounds, normalized contacts, duplicate
        warnings, schemas, deterministic scenarios, reload reset, CRUD, notes, archive/restore,
        rollback, and delayed-operation isolation.
  - [x] Component-test all directory states, profile tabs, view/edit modes, validation,
        confirmations, retry, focus, and non-color meaning.
  - [x] Playwright-test authenticated desktop/collapsed/mobile navigation, representative
        scenarios, directory controls, create/edit, archive/restore, notes, duplicate review, reload
        reset, keyboard-only operation, axe, themes, reduced motion, and narrow reflow.
  - [x] Verify `hml` and `prd` resolve disabled and production output contains no synthetic client
        source.
- [x] Update durable documentation:
  - [x] Add `docs/studio/client-management.md` with route, source, scenario, privacy, reset,
        production-boundary, and future-API contracts.
  - [x] Update `apps/studio/README.md`, `docs/studio/component-system.md`,
        `docs/studio/testing.md`, and `docs/studio/deployment.md`.
  - [x] Update the shared-component inventory only for components whose active contract changes.
  - [x] Keep API, IDP, and site docs unchanged because this initiative changes no contract there.
  - [x] Update this PRD/task pair if implementation evidence changes an accepted decision.
- [ ] Verify and hand off:
  - [x] Run route generation, format, lint, typecheck, Vitest, focused/full Playwright,
        production-boundary, build, Studio check, env/workflow tests, root check, and
        `git diff --check`.
  - [x] Inspect the browser at representative desktop and 320px widths in light and dark themes.
  - [x] Record skipped physical assistive-technology checks and residual risk.
  - [x] Run Triad preflight before commit, push, or PR.
  - [ ] Link the PR and verification evidence in Linear and follow evidence-based workflow states.

## Verification Evidence

Record evidence as tasks are completed:

- Command: `bun --filter studio format`
- Result: passed; 219 files checked with no formatting fixes on the final pass.
- Command: `bun --filter studio lint`
- Result: passed; 224 files checked with no lint fixes.
- Command: `bun --filter studio typecheck`
- Result: passed, including TanStack route generation.
- Command: `bun --filter studio test -- tests/unit/client-management.test.ts`
- Result: passed; 15 focused client-management contract and repository tests.
- Command: `bun --filter studio test -- tests/unit/client-management-page.test.tsx`
- Result: passed; nine focused React Testing Library component tests rendering the directory,
  profile drawer, lightweight disabled-source presentation, and URL/page-reset list-filter
  callbacks. The production Playwright suite retains authenticated `/clients` route-level
  disabled-source integration evidence.
- Command: focused shared/migrated-consumer Vitest for `shared-component-contracts`,
  `scheduling-page`, `barbershop-setup-page`, and `component-inventory`.
- Result: passed; 8 shared contracts, 11 Agenda tests, 14 setup tests, and one exhaustive inventory
  test. Evidence includes accessible compact search, single/multi filter selection and clear,
  migrated consumer behavior, and a ModuleLayout viewport with no implicit bottom inset.
- Command: `bun --filter studio test:e2e -- tests/e2e/client-management.spec.ts`
- Result: passed; four focused Chromium tests.
- Command: `bun --filter studio check`
- Result: Biome and typecheck passed. Both the initial run and one bounded retry reached 30/32
  Vitest files and 209/214 tests before the same five parallel Agenda/setup timeouts stopped the
  command; those two files passed separately at 11/11 and 14/14. Build and production-boundary
  phases that the stopped command did not reach were run separately and passed.
- CI evidence: Develop Pipeline
  [30015806062](https://github.com/corvi-io/crv-triad/actions/runs/30015806062) on `15485c2`
  passed 214/215 Studio tests, then timed out at five seconds while the disabled-source unit test
  constructed the full generated route tree and authenticated provider stack. The deterministic
  repair extracts the unchanged presentation into `ClientManagementUnavailableState`, tests it
  directly without router/auth/theme/query setup or a higher timeout, and preserves production
  Playwright route integration coverage.
- Deterministic repair verification: the direct disabled-source test passed 1/1 in 103ms, the full
  client page suite passed 9/9, and production Playwright passed 6/6 including authenticated
  `/clients` with its source disabled. One full Studio check and its single bounded retry passed the
  repaired test but stopped at 212/215 and 208/215 tests respectively due to the known unrelated
  parallel timeout class in Agenda/setup; those affected files passed separately at 11/11 and
  14/14. The normal pre-push hook automatically attempted the root check once more: API, IDP, and
  Site passed, while Studio stopped at 206/215 under the same parallel saturation; the repaired
  disabled-source test passed there in 176ms.
- Command: `bun --filter studio build` and `bun --filter studio test:production-boundary`
- Result: passed; production boundary verified across 44 files (1,016,404 bytes).
- Command:
  `VITE_DEPLOY_TARGET=prd VITE_SCHEDULING_SOURCE=disabled VITE_BARBERSHOP_SETUP_SOURCE=disabled VITE_CLIENT_MANAGEMENT_SOURCE=memory bun --filter studio build`
  followed by `bun apps/studio/scripts/assert-production-boundary.ts`
- Result: passed; `prd` failed closed and 43 built files (1,013,571 bytes) passed artifact scan.
- Command:
  `VITE_DEPLOY_TARGET=hml VITE_SCHEDULING_SOURCE=disabled VITE_BARBERSHOP_SETUP_SOURCE=disabled VITE_CLIENT_MANAGEMENT_SOURCE=memory bun --filter studio build`
  followed by `bun apps/studio/scripts/assert-production-boundary.ts`
- Result: passed; `hml` failed closed and 43 built files (1,013,571 bytes) passed artifact scan.
- Command: `bun run test:ci`
- Result: passed; 19 environment, workflow, release, and affected-app tests.
- Command: `bun run check`
- Result: passed; all four workspace packages completed their checks.
- Command: `bun --filter studio test:e2e`
- Result: passed; 52 Chromium tests. The previously observed unrelated Agenda announcement
  failure did not recur.
- Command: `bun --filter studio test:e2e:production`
- Result: passed; six Chromium production-boundary tests, including the disabled client source.
- Notes: Automated keyboard, focus, axe, light/dark, forced-color, reduced-motion, coarse-pointer,
  200%-zoom-equivalent, 320 CSS pixel, and overflow evidence passed. Manual VoiceOver/NVDA,
  physical 200% browser zoom, and real-device touch were not performed and remain residual risks.

## Risks And Follow-Ups

- [ ] Define the canonical API, tenant/unit scope, persistence, normalized-contact rules,
      authorization, auditing, privacy lifecycle, migration, and measured capacity before enabling
      real data.
- [ ] Define the future Agenda/client relationship and atomic create-or-select behavior without
      importing module internals.
- [ ] Define irreversible merge semantics, conflict handling, audit history, and recovery in a
      separate backend initiative.
- [ ] Define consent, communications, marketing, loyalty, payments, files, and data-subject
      workflows only through separate accepted initiatives.
- [ ] Treat dense scenarios as UX evidence only; do not claim production capacity from local
      fixtures.
- [ ] Record VoiceOver/NVDA and real-device touch checks as residual risk when physical testing is
      unavailable.
