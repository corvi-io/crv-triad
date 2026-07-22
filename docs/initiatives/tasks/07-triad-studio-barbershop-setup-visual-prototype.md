# 07 TRIAD Studio Barbershop Setup Visual Prototype - Execution Plan

## Source

- PRD: `docs/initiatives/prds/07-triad-studio-barbershop-setup-visual-prototype.md`
- Linear initiative: [TRIAD Studio Barbershop Setup Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-barbershop-setup-visual-prototype-d02965c61df9)
- Related issue: [ENG-41](https://linear.app/corvi-io/issue/ENG-41/build-the-triad-studio-barbershop-setup-visual-prototype)

## Implementation Principles

- Follow the accepted frontend-only recommendation from the PRD.
- Treat the deliverable as a presentation-quality prototype, not a production
  settings system or a backend contract.
- Keep all business-shaped records deterministic, synthetic,
  session-memory-only, selectable by scenario, and fully resettable.
- Reuse `MemoryScenarioEngine` for generic development mechanics while keeping
  module vocabulary, repository contracts, query keys, and UI in the owning
  `barbershop-setup` module.
- Keep `src/modules/barbershop-setup` independent of `src/dev`; compose the
  development adapter only through the preview loader boundary.
- Use `/workspace-preview/barbershop-setup` and `WorkspacePreviewShell`; keep
  fixtures, scenario controls, and reset behavior unavailable in `hml`/`prd`.
- Reuse existing Studio components and inspect official shadcn candidates
  before accepting new primitives or custom shared compositions.
- Keep UI copy and validation in Brazilian Portuguese; keep code, types, routes,
  filenames, and durable docs in English.
- Do not add API, IDP, OpenAPI, database, migration, browser persistence,
  external provider, analytics, polling, realtime, or deployment behavior.

## Tasks

- [x] Confirm scope and traceability:
  - [x] Link the final Linear initiative and implementation issue.
  - [x] Re-read the active Studio component inventory, Agenda prototype
        contract, and development runtime before implementation.
  - [x] Record any product decision that would expand the task beyond units,
        professionals, services, availability, and overview as a follow-up.
- [x] Confirm the visual information architecture:
  - [x] Define `overview`, `units`, `professionals`, `services`, and
        `availability` as the accepted sections.
  - [x] Define the overview completion/checklist presentation and direct next
        actions without claiming production readiness.
  - [x] Define stable URL state for section, scenario, and safe identifier-only
        filters; prohibit names, phones, addresses, and notes in URLs.
  - [x] Inspect existing Studio components, official shadcn, and reviewed
        compatible registries for any missing table/form/schedule primitive;
        record selection or custom-composition rationale.
- [x] Establish the module and preview boundaries:
  - [x] Add presentation-facing contracts under
        `src/modules/barbershop-setup` for unit, professional, service,
        availability, section summaries, filters, commands, and result states.
  - [x] Add a narrow repository port, query keys, TanStack Query hooks, and
        mutation invalidation rules owned by the module.
  - [x] Add a build-time preview loader that composes the development adapter
        only for local/dev and resolves to null elsewhere.
  - [x] Add `/workspace-preview/barbershop-setup` using
        `WorkspacePreviewShell`, with no direct route/module import from
        `src/dev`.
  - [x] Update route generation and module-boundary tests.
- [x] Build deterministic related scenarios:
  - [x] Define `new-business`, `incomplete-setup`, `single-unit`, `multi-unit`,
        `dense-catalogs`, `availability-conflicts`, `slow`, `next-failure`, and
        `persistent-error` scenarios.
  - [x] Use only synthetic businesses, units, people, addresses, contact values,
        images, services, schedules, and notes.
  - [x] Keep normal fixtures presentation-sized and dense fixtures explicitly
        bounded UX stress data rather than capacity evidence.
  - [x] Ensure cross-collection IDs and relationships are deterministic and
        restored as one scenario snapshot.
  - [x] Add one-shot and persistent failure behavior plus bounded deterministic
        latency without network requests.
- [x] Implement the in-memory repository adapter:
  - [x] Reuse `MemoryScenarioEngine` rather than introducing a second scenario
        engine.
  - [x] Implement bounded list/search/filter/sort/pagination and section summary
        operations needed by the UI.
  - [x] Implement create, inspect, update, archive, restore, relationship, and
        availability commands in memory.
  - [x] Validate visible dependencies and return stable prototype error
        categories without defining future API error codes.
  - [x] Make related optimistic mutations and rollback atomic across visible
        collections.
  - [x] Prevent slow/stale results from overwriting a later scenario, reset, or
        navigation state.
  - [x] Implement a full reset that restores seed records, ID sequence, latency,
        failure mode, selection, query state, and pending mutation state.
- [x] Build the setup overview:
  - [x] Show synthetic completion state for business/unit basics,
        professionals, services, and availability.
  - [x] Show incomplete reasons and direct section actions with stable focus and
        no misleading production-success claim.
  - [x] Cover new-business, incomplete, complete, loading, slow, error, retry,
        and long-content states.
- [x] Build the units section:
  - [x] Add bounded list/search/filter/sort/pagination, empty/filtered-empty,
        status, and long-content states.
  - [x] Add detail/create/edit drawers for presentation fields, operating hours,
        and address display using module-owned RHF/Zod schemas.
  - [x] Add archive/restore confirmation and dependency outcomes without
        silently orphaning professionals/services.
  - [x] Reuse shared masks, form sections, drawer anatomy, status badges, table
        actions, and feedback components where their contracts fit.
- [x] Build the professionals section:
  - [x] Add list/detail/create/edit/archive/restore interactions.
  - [x] Present assigned units, eligible services, availability summary,
        active/inactive status, and visual-only account access state.
  - [x] Keep access state synthetic and read-only; do not call or model an IDP
        organization/invitation mutation.
  - [x] Cover missing assignment, inactive dependency, long content, and dense
        catalog states.
- [x] Build the services section:
  - [x] Add list/detail/create/edit/archive/restore interactions for category,
        name, description, duration, price, unit availability, eligible
        professionals, and active/inactive presentation.
  - [x] Validate visible duration/price/relationship errors with Portuguese
        copy and first-invalid-field focus.
  - [x] Demonstrate safe dependency handling when a service remains referenced
        by a professional or setup summary.
- [ ] Build the availability section:
  - [x] Add unit/professional selection and an accessible weekly schedule editor.
  - [ ] Support working periods, breaks, closed days, time off, copy-to-days,
        explicit overlap/conflict feedback, and discard confirmation.
  - [x] Keep drag optional and never the only way to edit time ranges.
  - [x] Cover narrow reflow, long days, multiple periods, conflicts, empty,
        slow, failure, retry, and rollback states.
- [x] Build presentation controls and reset:
  - [x] Expose clearly labeled development-only scenario selection and scenario
        descriptions.
  - [x] Add `Restaurar cenário` with explicit confirmation where accidental
        loss of current prototype changes would be surprising.
  - [x] On scenario switch/reset, close or safely discard open drafts, clear
        stale selection, reset query/mutation state, and focus the resulting
        page heading or status message.
  - [x] Show only safe local scenario ID, record counts, latency, and failure
        mode in any diagnostic summary.
- [ ] Complete accessibility, responsive, and theme validation:
  - [x] Verify keyboard-only section navigation, tables, contextual actions,
        drawers, forms, confirmations, availability editing, scenario switch,
        and reset.
  - [x] Add appropriate headings, labels, descriptions, table semantics,
        `aria-invalid`, status/alert announcements, and focus restoration.
  - [ ] Verify 320 CSS pixels, 200% zoom-equivalent width, bounded overflow,
        coarse pointers, autofill/paste, duplicate submission, light/dark/system,
        forced colors, and reduced motion.
  - [x] Run focused axe scans and record VoiceOver/NVDA/manual skips.
- [x] Enforce privacy and production boundaries:
  - [x] Prove no fixture or mutation performs fetch, IDP interception, storage,
        cookie, service-worker, analytics, or external image behavior.
  - [x] Prove synthetic contact/address/note values do not enter URLs, logs, or
        persistent browser storage.
  - [x] Extend production-boundary tests to reject module fixture, scenario,
        reset-control, mock-engine, and presentation-only markers from `hml` and
        `prd` artifacts.
- [x] Add focused verification:
  - [x] Unit-test deterministic scenario isolation, IDs, related reset, latency,
        one-shot/persistent failure, stale-result protection, dependency rules,
        optimistic rollback, and query invalidation.
  - [x] Unit/component-test every section's normal/loading/empty/error/dense,
        form, confirmation, relationship, and reset behavior.
  - [x] Add Playwright journeys for overview-to-section navigation, catalog
        mutations, availability editing, scenario switching, reset, failure,
        rollback, narrow layout, keyboard/focus, and axe.
  - [x] Run route generation, format, lint, typecheck, unit tests, focused/full
        Playwright, production-boundary, Studio build/check, and workspace check.
- [x] Update durable documentation:
  - [x] Update `apps/studio/README.md`, `docs/studio/component-system.md`, and a
        dedicated Studio setup-prototype contract.
  - [x] Document preview route, scenarios, reset behavior, synthetic-data
        policy, module/adapter boundary, and production exclusion.
  - [x] Update `apps/studio/AGENTS.md` or a Triad skill only if implementation
        establishes a reusable convention not already documented.
  - [x] Explain in the PR why API, IDP, site, persistence, environment, and
        deployment documentation do not change.

## Verification Evidence

Record evidence only as tasks are completed. Do not paste fixture payloads,
auth/session values, private headers, or screenshots that could be mistaken for
real business data.

- Command: `bun --filter studio routes:generate`, `format`, `lint`, `typecheck`, and `test`
- Result: passed; 27 Vitest files and 141 tests passed in the final full run.
- Notes: focused ENG-41 repository and component coverage contributes 10 tests; two browser-level
  mutation/reset journeys remain in Playwright to avoid redundant high-cost component rendering.
- Command: `bun --filter studio test:e2e`
- Result: passed; 31 Chromium tests passed, including five ENG-41 journeys and focused axe WCAG
  2.0/2.1/2.2 A/AA coverage.
- Notes: the complete browser suite also verified light, dark, system, computed contrast, visible
  focus, reduced motion, forced colors, 320 CSS pixels, and 200%-zoom-equivalent behavior.
- Command: `bun --filter studio test:production-boundary` and `bun --filter studio build`
- Result: passed; the production scan verified 38 files and rejected all configured setup adapter,
  fixture, scenario-control, and dense-record markers.
- Notes: the built route resolves to the null loader and redirects to `/login`.
- Command: `bun --filter studio check` and `bun run check`
- Result: passed; the Studio quality gate and all four workspace package checks completed.
- Notes: API, IDP, and site results were unchanged/cached where applicable. Existing Base UI
  reset-password test warnings remain outside ENG-41; the new preview link warning was fixed.
- Command: local Chromium screenshots at 1440×900, 1280×900, and 320×760.
- Result: visually reviewed light overview, dark dense services, dark availability conflicts, and
  narrow new-business units. Direct URL counts, translated select values, and Portuguese conflict
  copy were corrected before the final focused rerun.
- Notes: VoiceOver/NVDA, a physical coarse-pointer device, OS-native forced-colors visual review,
  and authenticated deployed `dev` review were not available and remain explicit residual checks.
  Headless forced-colors, keyboard, focus, axe, reduced-motion, and narrow/zoom-equivalent evidence
  passed. No temporary server remained running after review.

## Risks And Follow-Ups

- [ ] Presentation-facing fields may be mistaken for backend requirements;
      future API work must start from a separate accepted domain initiative.
- [ ] A setup hub may not be the final onboarding experience; product review
      must decide hub versus guided flow after using the prototype.
- [ ] Cross-collection reset/rollback can become inconsistent if each section
      owns an isolated engine; keep one coordinated scenario snapshot or an
      explicitly atomic orchestration boundary.
- [ ] Availability can become an inaccessible custom grid; preserve explicit
      list/form editing and semantic conflict descriptions.
- [ ] Dense synthetic fixtures validate browser UX only, not API/database
      pagination, indexes, concurrency, or capacity.
- [ ] Account-access badges can imply real authorization; label them as
      synthetic presentation state and perform no IDP mutation.
- [ ] Production artifacts can accidentally retain fixture/reset markers;
      production-boundary scans and null-loader behavior are required.
- [ ] After visual acceptance, create a separate initiative for tenancy,
      organization/membership, API contracts, persistence, authorization,
      migrations, operations, and production Studio adapters.
