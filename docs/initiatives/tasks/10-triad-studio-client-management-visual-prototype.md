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

- [ ] Confirm the execution baseline:
  - [ ] Read the PRD, root and Studio instructions, applicable Triad skills, current module registry,
        route conventions, component inventory, source boundaries, and closest module tests.
  - [ ] Confirm the Linear issue is `Ready`, record the assigned agent, branch, owned files, and
        Definition of Done before implementation begins.
  - [ ] Capture current `git status` and preserve unrelated user-owned changes.
- [ ] Establish client contracts:
  - [ ] Define bounded client, contact, tag, service-preference, appointment-summary, note,
        duplicate-warning, query/page, sort, filter, mutation, and repository-port types under
        `src/modules/clients`.
  - [ ] Keep IDs and relationships presentation-owned and explicitly non-canonical.
  - [ ] Define allowlisted URL search state with `typical` as the invalid/missing scenario fallback.
  - [ ] Keep names, phones, emails, notes, and free-text search out of URL state.
  - [ ] Add React Hook Form/Zod schemas with Brazilian Portuguese messages and fresh default-value
        factories.
- [ ] Build the deterministic development source:
  - [ ] Add `typical`, `empty`, `dense`, `incomplete-contact`, `duplicate-candidates`, `slow`,
        `next-failure`, and `persistent-error` scenarios under `src/dev/clients`.
  - [ ] Use only clearly synthetic identities, contacts, notes, and appointments.
  - [ ] Implement bounded repository-side search, filters, sorting, pagination, profile/history
        reads, CRUD, archive/restore, note mutations, and exact normalized contact comparison.
  - [ ] Make one-shot failures atomic and preserve the pre-mutation snapshot on rollback.
  - [ ] Generation-guard delayed reads and mutations across scenario changes and reload.
  - [ ] Prove full reload reconstructs deterministic records and IDs for the selected scenario.
- [ ] Add the source boundary:
  - [ ] Add `virtual:studio-client-management-source`, its type declaration, memory entry, and
        disabled source.
  - [ ] Add `VITE_CLIENT_MANAGEMENT_SOURCE` to centralized Studio env parsing and `.env.example`.
  - [ ] Add `STUDIO__VITE_CLIENT_MANAGEMENT_SOURCE` to `env-schema.yaml`.
  - [ ] Enable memory in the local Studio dev command and forward the source through `dev`, `hml`,
        and `prd` pipelines.
  - [ ] Extend the shared target guard so only `local` and `dev` can resolve memory.
  - [ ] Explicitly disable the source in production-boundary and production-browser commands.
  - [ ] Extend production scans to reject client scenarios, fixtures, adapters, and mock markers.
- [ ] Integrate the authenticated route:
  - [ ] Add `/clients` under `_authenticated` with lazy route composition.
  - [ ] Register `Clientes` in primary navigation, breadcrumbs, command keywords, and route types.
  - [ ] Cover active state in expanded desktop, collapsed desktop, and mobile navigation.
  - [ ] Render safe loading, disabled-source, empty, filtered-empty, recoverable-error, and
        persistent-error states.
- [ ] Implement the directory:
  - [ ] Compose `ModuleLayout`, `PageHeader`, existing search/filter controls, `DataTable`, and
        `DataTablePagination`.
  - [ ] Keep search, bounded filters, sort, page, page size, and technical scenario state in the
        repository/query boundary and safe URL state.
  - [ ] Keep table header and pagination usable while dense rows scroll inside the module body.
  - [ ] Open a profile through the primary row interaction.
  - [ ] Expose row actions through the shared context menu without adding an `Ações` column.
- [ ] Implement the client drawer and forms:
  - [ ] Compose `Resumo`, `Agendamentos`, and `Notas` drawer tabs.
  - [ ] Show contact details, record state, tags, service preferences, factual visit summary, bounded
        history, and possible duplicate warnings.
  - [ ] Implement explicit view/edit modes with stable actions and focus behavior.
  - [ ] Implement create, edit, archive, and restore in session memory with confirmation, toast,
        invalidation, retry, and rollback behavior.
  - [ ] Implement add, edit, and confirmed removal for timestamped internal notes.
  - [ ] Reuse the shared phone mask and application-controlled validation.
  - [ ] Add guidance that internal notes must not contain credentials, payment-card, document,
        health, or other highly sensitive data.
  - [ ] Keep duplicate candidates inspectable but do not expose merge.
- [ ] Preserve accessibility and responsive behavior:
  - [ ] Verify keyboard navigation, `Shift+F10` context actions, drawer tabs, first-invalid focus,
        confirmation focus, focus return, live feedback, and visible focus.
  - [ ] Keep status and duplicate meaning independent of color.
  - [ ] Verify light, dark, system, forced colors, reduced motion, coarse pointer, 200% zoom
        equivalent, 320 CSS pixels, and no page-level horizontal overflow.
  - [ ] Use progressive bounded history loading instead of rendering unbounded activity.
- [ ] Add focused automated evidence:
  - [ ] Unit-test URL parsing, query allowlists, pagination bounds, normalized contacts, duplicate
        warnings, schemas, deterministic scenarios, reload reset, CRUD, notes, archive/restore,
        rollback, and delayed-operation isolation.
  - [ ] Component-test all directory states, profile tabs, view/edit modes, validation,
        confirmations, retry, focus, and non-color meaning.
  - [ ] Playwright-test authenticated desktop/collapsed/mobile navigation, representative
        scenarios, directory controls, create/edit, archive/restore, notes, duplicate review, reload
        reset, keyboard-only operation, axe, themes, reduced motion, and narrow reflow.
  - [ ] Verify `hml` and `prd` resolve disabled and production output contains no synthetic client
        source.
- [ ] Update durable documentation:
  - [ ] Add `docs/studio/client-management.md` with route, source, scenario, privacy, reset,
        production-boundary, and future-API contracts.
  - [ ] Update `apps/studio/README.md`, `docs/studio/component-system.md`,
        `docs/studio/testing.md`, and `docs/studio/deployment.md`.
  - [ ] Update the shared-component inventory only for components whose active contract changes.
  - [ ] Keep API, IDP, and site docs unchanged because this initiative changes no contract there.
  - [ ] Update this PRD/task pair if implementation evidence changes an accepted decision.
- [ ] Verify and hand off:
  - [ ] Run route generation, format, lint, typecheck, Vitest, focused/full Playwright,
        production-boundary, build, Studio check, env/workflow tests, root check, and
        `git diff --check`.
  - [ ] Inspect the browser at representative desktop and 320px widths in light and dark themes.
  - [ ] Record skipped physical assistive-technology checks and residual risk.
  - [ ] Run Triad preflight before commit, push, or PR.
  - [ ] Link the PR and verification evidence in Linear and follow evidence-based workflow states.

## Verification Evidence

Record evidence as tasks are completed:

- Command:
- Result:
- Notes:

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
