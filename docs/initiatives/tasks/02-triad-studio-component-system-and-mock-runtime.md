# 02 TRIAD Studio Component System And Mock Runtime - Execution Plan

## Source

- PRD: `docs/initiatives/prds/02-triad-studio-component-system-and-mock-runtime.md`
- Depends on: [ENG-32](https://linear.app/corvi-io/issue/ENG-32/establish-the-triad-studio-frontend-foundation)
- Related issue: [ENG-33](https://linear.app/corvi-io/issue/ENG-33/build-the-triad-studio-component-system-and-mock-runtime)
- Related PR: [#9](https://github.com/corvi-io/crv-triad/pull/9)

## Implementation Principles

- Implement only after `ENG-32` establishes the final `apps/studio` boundary.
- Keep the initiative frontend-only and separate from Scheduling or other
  business modules.
- Build one exhaustive durable inventory from real component code and enforce it
  with tests; avoid per-component documentation fragments that will drift.
- Prefer explicit composition and local ownership over universal renderers,
  broad context, or boolean product modes.
- Keep mock mechanics development-only, deterministic, removable, and unable to
  intercept authentication.
- Define module data access through small ports so memory and future HTTP adapters
  can be replaced at the composition boundary.
- Do not create a cross-app package until a second app demonstrates real, stable
  reuse.

## Tasks

- [x] Confirm readiness and accepted decisions:
  - [x] Verify `ENG-32` is complete and refresh all `apps/studio` paths,
        commands, docs, skills, and active-component assumptions.
  - [x] Confirm English Markdown is the component catalog and no separate visual
        catalog runtime or CI artifact is added.
  - [x] Approve the neutral sandbox record shape and confirm it carries no
        Scheduling semantics.
- [x] Establish the architecture contract:
  - [x] Create `docs/studio/component-system.md` with folder placement,
        dependency direction, public API, reuse, testing, and documentation
        rules.
  - [x] Update `apps/studio/AGENTS.md` with a concise component contribution and
        AI discovery checklist.
  - [x] Update the Studio development skill with component-system, textual
        documentation, mock-runtime, and adapter rules.
  - [x] Document the primitive, semantic, and component token layers and how
        Tailwind CSS v4 consumes them.
- [x] Inventory and classify existing UI:
  - [x] List every active export under Studio shared components.
  - [x] Classify primitives, data display, feedback, forms, layout, overlays,
        domain-owned components, and internal-only helpers.
  - [x] Identify duplicates, overly broad APIs, raw visual values, boolean-mode
        proliferation, unnecessary Effects, and misplaced domain behavior.
  - [x] Record the migration map before moving files.
- [x] Organize component folders safely:
  - [x] Keep shadcn/Base UI primitives under `shared/components/ui`.
  - [x] Move shared composites into responsibility-based folders.
  - [x] Add local folder entrypoints for multi-file components.
  - [x] Update imports incrementally and avoid a global mega-barrel.
  - [x] Preserve behavior with focused tests during each migration batch.
- [x] Add the durable component catalog:
  - [x] Keep one English Markdown source of truth for placement, contracts, tokens,
        accessibility, and the active inventory.
  - [x] Add a unit gate that fails when an active shared component is missing from
        the inventory or documented more than once.
  - [x] Keep Brazilian Portuguese usage examples in focused tests and the neutral
        development sandbox.
  - [x] Verify obsolete catalog sources and development documentation code are not
        production imports.
- [x] Document active shared components:
  - [x] Add a public-contract entry for every active shared component, or mark it
        internal-only with a documented rationale.
  - [x] Cover relevant normal, disabled, loading, error, empty, success, long
        content, missing content, theme, viewport, keyboard, scroll, and
        pagination states.
  - [x] Keep complex cross-component guidance for drawers, tables, forms, and page
        composition in durable Studio Markdown.
  - [x] Document anatomy, slots, controlled/uncontrolled state, tokens,
        accessibility, good usage, bad usage, and related components for complex
        composites.
- [x] Create the development-only mock engine:
  - [x] Implement typed in-memory collections with deterministic IDs and reset.
  - [x] Add fixed-seed Faker factories without real PII.
  - [x] Add a scenario registry with deterministic initial state.
  - [x] Add bounded latency and intentional failure controls.
  - [x] Keep domain rules and validation outside the low-level engine.
  - [x] Ensure tests receive isolated stores and scenarios.
- [x] Demonstrate the replaceable data boundary:
  - [x] Define a minimal neutral repository/query/page contract returning
        Promises.
  - [x] Implement the contract with the in-memory adapter.
  - [x] Consume it through TanStack Query query functions and mutations.
  - [x] Use stable query keys and targeted invalidation.
  - [x] Document how a future module-owned Orval/HTTP adapter replaces memory
        without changing presentation components.
- [x] Build the Studio development sandbox:
  - [x] Add a development-only route inside the real Studio shell.
  - [x] Provide scenario selection and reset controls.
  - [x] Demonstrate create, view, edit, delete, search, filter, sort, pagination,
        vertical/horizontal scroll, and feedback states.
  - [x] Include default, empty, all-states, dense, larger-data, slow, and error
        scenarios.
  - [x] Verify the sandbox and mock runtime redirect, fail closed, or remain
        unreachable in production.
- [x] Add verification and CI gates:
  - [x] Add unit and type tests for factories, memory operations, scenarios,
        query behavior, and adapter contracts.
  - [x] Run focused shared-component behavior tests with Vitest.
  - [x] Make accepted automated accessibility violations fail the focused
        component and Playwright flows.
  - [x] Add focused Playwright coverage for sandbox interactions and production
        boundaries.
  - [x] Add the textual inventory gate and component tests to Studio quality checks.
  - [x] Measure the production Studio bundle before/after and verify development
        datasets, Faker, obsolete catalog sources, and mock controls are absent from production.
- [x] Complete handoff documentation:
  - [x] Update `apps/studio/README.md` with sandbox and test commands.
  - [x] Update `docs/studio/testing.md` and other durable Studio docs affected by
        the new workflow.
  - [x] Record the component inventory, internal-only decisions, verification
        evidence, and any deferred migrations.
  - [x] Keep the future Scheduling initiative separate and dependent on this
        accepted foundation.

## Verification Evidence

Recorded evidence:

- `bun --filter studio routes:generate`, `format`, `lint`, and `typecheck`: passed.
- `bun --filter studio test`: 18 files and 77 tests passed, including memory-engine,
  repository, component-contract, architecture, auth-boundary, and exhaustive inventory coverage.
- `bun --filter studio build` and `test:production-boundary`: passed; 25 production files totaling
  889,921 bytes contained no development engine, Faker, seeds, controls, or obsolete catalog source
  markers. The verified `staging` baseline was 865,269 bytes; the 24,652-byte increase is attributable
  to the accepted TanStack Query runtime and is not a capacity claim.
- `bun --filter studio test:e2e:sandbox`: 3 Chromium tests passed for WCAG A/AA axe checks,
  keyboard-only contextual actions with drawer focus return, and the deterministic
  CRUD/search/filter/sort/pagination/failure/reset flow.
- `bun --filter studio test:e2e:production`: 2 Chromium tests passed for preview/sandbox redirects
  and control absence.
- `bun --filter studio check`, `bun run test:ci`, and `bun run check --filter=studio`: passed.
- `bash .github/scripts/run-quality-gate.sh studio`: passed with Studio check plus both focused
  Playwright suites; the develop workflow installs Chromium headless shell and Linux dependencies.
- `bun pm ls --all`: no Storybook, Chromatic, Histoire, or Ladle dependency was present; the
  architecture gate also checks every workflow and root CI script plus Studio manifests, scripts,
  configuration, source names/content, and common artifact paths.
- Studio skill validation through the skill-creator validator: passed.
- Manual-only checks not performed in this implementation cycle: keyboard-only operation, focus
  return, VoiceOver, 200% zoom, 320 CSS-pixel reflow, reduced-motion visual review, target-size
  measurement, and manual light/dark contrast review.
  Residual risk remains for WCAG issues that axe and keyboard-focused automated tests cannot detect.

## Risks And Follow-Ups

- [ ] Textual component documentation can drift; the exhaustive inventory test and
      contribution rules must keep it part of the component lifecycle.
- [ ] A neutral memory engine can become a generic business framework; reject
      domain rules and universal schema-driven UI from shared mock code.
- [ ] Development-only code can inflate or leak into production unless the build
      boundary is tested explicitly.
- [ ] Local filtering and pagination validate UX only; future APIs must provide
      bounded server-side contracts.
- [ ] Revisit `packages/ui` only after the barber or customer app proves stable
      cross-app reuse.
