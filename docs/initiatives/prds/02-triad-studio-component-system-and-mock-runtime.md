# 02 TRIAD Studio Component System And Mock Runtime

## Summary

Create a maintainable UI platform for TRIAD Studio before the first business
screen is implemented. The initiative organizes the frontend by responsibility,
documents reusable components in a durable English text catalog, strengthens the
existing three-layer design-token system, and introduces a deterministic,
development-only in-memory runtime for interactive prototypes.

The runtime must support realistic create, read, update, delete, search, filter,
sort, and pagination behavior without inventing backend endpoints. It must be
replaceable by future API adapters without rewriting screens or components.

## Context

- Current state:
  - Initiative 01 establishes `apps/studio` from the current authenticated React
    foundation.
  - The frontend already has React 19, Vite, TanStack Router, TanStack Query,
    Tailwind CSS v4, shadcn/Base UI primitives, Vitest, Playwright, Faker, MSW,
    and Orval.
  - Reusable primitives and composites exist, including drawers, tables,
    pagination, forms, page layouts, status badges, empty states, and feedback.
  - The current token file already distinguishes primitive, semantic, and
    component-level values.
  - Component files are concentrated in a broad shared folder and do not yet
    have a complete textual catalog or a uniform documentation contract.
- Problem:
  - Future screens can drift into duplicated components, inconsistent folder
    placement, undocumented variants, excessive boolean props, and state tied
    directly to temporary data sources.
  - A frontend-only product phase needs realistic interaction without making
    local fixtures look like a production backend or creating contracts that
    will be discarded.
- Why now:
  - The component and data boundaries are cheapest to define before Scheduling
    becomes the first complex Studio module.
  - Existing shared components provide real material to classify, document, and
    validate instead of designing an abstract system from scratch.
- Dependencies:
  - Initiative 01 / Linear `ENG-32` must establish the final `apps/studio`
    boundary first.
- Tracking:
  - [ENG-33](https://linear.app/corvi-io/issue/ENG-33/build-the-triad-studio-component-system-and-mock-runtime)
    in the `CRV Triad` Linear project.
- Related references:
  - [React state sharing](https://react.dev/learn/sharing-state-between-components)
  - [React Effect guidance](https://react.dev/learn/you-might-not-need-an-effect)
  - [TanStack Query query functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)
  - [MSW](https://mswjs.io/)
  - [Orval MSW generation](https://orval.dev/docs/guides/msw/)

## Goals

- Define a simple, enforceable folder and dependency model for Studio routes,
  modules, shared components, design-system assets, and development tooling.
- Inventory and classify every active reusable component inherited by Studio.
- Establish durable English Markdown as the component catalog, backed by an
  exhaustive inventory gate and focused component/interaction tests.
- Ensure every active shared component is documented or explicitly marked
  internal-only with a reason.
- Define a component documentation contract that is useful to humans and future
  AI agents assembling screens, drawers, forms, tables, and states.
- Preserve and document the primitive-to-semantic-to-component token hierarchy.
- Introduce a removable development-only mock runtime with deterministic seeded
  data and scenario control.
- Support interactive local create, read, update, delete, search, filter, sort,
  pagination, loading, error, empty, dense, and large-data UX scenarios.
- Keep UI components and TanStack Query hooks independent of whether their data
  comes from memory now or HTTP later.
- Provide a development-only Studio sandbox for navigation and composed-screen
  testing in the real application shell.
- Establish verification and contribution rules that prevent the catalog and
  architectural documentation from becoming stale.

## Non-Goals

- The Scheduling UI, appointment workflows, or any other barbershop business
  module.
- New API routes, OpenAPI contracts, database tables, server persistence, or
  business behavior in `apps/api`.
- New authentication behavior or mock interception of IDP requests.
- Handwritten fake REST endpoints intended to predict the future API.
- A schema-driven universal CRUD screen or universal form renderer.
- A global state library added without an accepted need.
- A shared `packages/ui` package before a second application demonstrates stable
  cross-app reuse.
- Adding or publishing a separate visual component-catalog runtime or adopting a
  paid visual-regression provider.
- Treating local large-data scenarios as backend capacity evidence.
- Browser persistence for mock business records; refresh/reset may restore the
  deterministic initial scenario.

## Brainstorm

### Problem Framing

- The initiative improves the developer workflow of discovering, understanding,
  composing, testing, and evolving Studio UI without copying implementations.
- The direct users are frontend contributors, designers, reviewers, future AI
  agents, and product stakeholders validating interactions before backend work.
- The product workflow improved is prototype validation: open Studio, select a
  known scenario, navigate, create/edit/search records, inspect tables and
  drawers, reset the scenario, and reproduce the same state later.
- The long-term goal is not maximum abstraction. It is clear ownership, stable
  public component APIs, and a replaceable data boundary.

### Gaps And Unknowns

- Product gaps:
  - No Scheduling contract exists yet, so the mock runtime needs neutral reference
    collections and must not define appointment semantics.
  - The exact product statuses and tags will belong to later module initiatives.
- Technical gaps:
  - The final active component inventory can only be confirmed after `ENG-32`
    removes old identity-administration UI and completes the Studio migration.
  - Component documentation is not currently exhaustive or mechanically checked.
  - MSW is configured for tests, but there is no browser mock worker or runtime
    scenario registry.
  - Orval is configured for future generated mocks but has no accepted OpenAPI
    input for business modules.
- Data/model gaps:
  - A transport-independent page, query, result, and repository convention must
    be small enough to avoid becoming a speculative frontend domain framework.
  - Neutral sandbox data must be clearly separated from future business models.
- Operational gaps:
  - Textual inventory, component tests, and browser flows need CI ownership and
    reasonable execution time.
  - The production build needs evidence that development-only runtime entrypoints
    cannot be enabled accidentally.

### Counterpoints

- Building Scheduling immediately would produce faster visible product progress,
  but it would force foundational decisions inside the first complex module.
- Creating a generic CRUD framework could make demos quick, but it would hide
  behavior behind configuration and make domain-specific UX harder to express.
- Putting all reusable code into `packages/ui` would look scalable, but it would
  create cross-app contracts before a second consumer exists.
- Writing a README for every component would fragment the contract and become
  stale. One exhaustive durable inventory, TypeScript, and focused tests should
  be the primary sources.
- Using MSW as a full fake backend now would mimic network behavior, but it would
  require invented endpoints. An in-memory adapter behind a small repository
  port is more honest until OpenAPI exists.
- A single global store would simplify access to mock state, but it would couple
  unrelated future modules. Each module should own its repository contract and
  query keys while the development engine supplies only low-level memory and
  scenario capabilities.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Build Scheduling first and extract reusable pieces afterward | Fastest path to a visible feature | Foundational choices become mixed with product scope | Choose only if schedule validation is more urgent than maintainability |
| B | Create a component system and removable local runtime, validated by existing components and a neutral sandbox | Clear boundaries, living documentation, reusable test scenarios, no invented API | Adds a foundation initiative before Scheduling | Recommended for the stated maintainability priority |
| C | Build a generic CRUD/configuration engine and shared UI package | High initial reuse on paper | Premature abstraction, hidden behavior, difficult removal | Do not choose without multiple proven domains and applications |

### Recommendation

Choose Option B. Use the real inherited Studio components as the first textual catalog
and testing surface. Build a small development engine rather than a generic
product framework. Future domain modules define their own repository ports and
use the memory adapter during frontend validation; later an Orval-backed HTTP
adapter replaces it at the composition boundary.

## Architecture And Boundaries

- Site impact: none.
- API impact: none. No route, OpenAPI document, schema, persistence, or API client
  is introduced by this initiative.
- IDP impact: none. Authentication continues to use the real IDP and must never
  be intercepted by the mock runtime.
- Studio impact:
  - `src/routes/**` owns routing and page composition, not reusable component
    implementations or data rules.
  - `src/modules/{module}/**` owns business-specific screens, components,
    contracts, query keys, repositories, factories, and adapters.
  - `src/modules/shared/components/ui/**` owns shadcn/Base UI primitives.
  - Shared composites are grouped by responsibility, such as `data-display`,
    `feedback`, `forms`, `layout`, and `overlays`.
  - `src/modules/shared/design-system/**` owns token guidance and component-system
    metadata, while Tailwind CSS consumes the established tokens.
  - `src/dev/mock-engine/**` owns development-only memory and scenario mechanics.
  - `src/dev/sandbox/**` owns the neutral interactive validation surface.
  - Component inventory and contribution guidance live in durable English docs;
    focused examples remain in tests and the development sandbox.
- Dependency direction:
  - Routes may import modules and shared code.
  - Modules may import shared code.
  - Shared code must not import a business module.
  - Modules must not import another module's internals.
  - Development adapters may implement module-owned ports but production UI must
    not import the development engine directly.
- Public APIs:
  - Multi-file component folders expose a local `index.ts` entrypoint.
  - Avoid a workspace-wide barrel that hides ownership or creates cycles.
  - Prefer direct folder-root imports and explicit component variants.
- Packages impact: none. Extraction requires real, stable reuse by another app.
- External provider impact: none.

## Component System Contract

- Every active shared component must have:
  - a single documented purpose and owner category;
  - typed props with the smallest useful public API;
  - explicit variants instead of accumulating product-mode booleans;
  - a textual contract for relevant visual and behavioral states;
  - accessible names, keyboard behavior, focus behavior, and responsive notes;
  - a stable folder entrypoint when implemented across multiple files;
  - focused tests for interactive behavior.
- Documentation and test coverage should include relevant combinations of:
  - default, disabled, loading, error, empty, and success;
  - long and missing content;
  - light and dark themes;
  - compact and small viewport behavior;
  - keyboard interaction and focus;
  - dense, scrollable, and paginated data where applicable.
- Complex composites document anatomy, composition slots, controlled and
  uncontrolled state, tokens, accessibility, correct usage, incorrect usage,
  and relationships to other components.
- The exhaustive Markdown inventory and TypeScript are the living component
  contract. Durable cross-component guidance stays in `docs/studio`; prop tables
  are not duplicated mechanically.
- `docs/studio/component-system.md`, `apps/studio/AGENTS.md`, and the Studio skill
  define contribution and reuse rules for both humans and AI agents.

## Mock Runtime Contract

- The runtime is enabled only through an explicit development/test composition
  path and must be excluded or unreachable in production.
- The low-level engine may provide typed collections, deterministic IDs, reset,
  seeded factories, latency control, failure control, and scenario registration.
- Domain rules, validation, query vocabulary, and result mapping remain owned by
  the future domain module rather than the shared engine.
- Module UI consumes TanStack Query hooks backed by a module-owned repository
  interface returning Promises.
- The in-memory repository implements that interface now; a future HTTP/Orval
  repository implements the same UI-facing contract later.
- Mutations update the active adapter and invalidate only related query keys.
- The neutral sandbox demonstrates create, view, edit, delete, search, filter,
  sort, pagination, scroll, empty, loading, error, dense, and larger seeded
  scenarios without representing a real business entity.
- Faker uses fixed seeds so examples, screenshots, tests, and bug reports are
  reproducible.
- Reset restores the selected scenario. Refresh may also reset all memory state.
- No synthetic record contains real customer or employee PII.
- MSW remains available for actual network boundaries in tests.
  When a real OpenAPI contract exists, Orval-generated factories and MSW handlers
  should replace handwritten network mocks.

## Performance And Scalability

- Expected data growth: local scenario size is bounded and intended for UX
  stress only. The runtime is not evidence of production capacity.
- Critical paths: component rendering and tests, scenario reset,
  search/filter/sort/pagination, and TanStack Query cache invalidation.
- Query bounds/pagination:
  - list contracts include explicit page and page-size inputs;
  - page size has a bounded set of supported values;
  - filtering and sorting occur behind the repository boundary, not only inside
    the visible table component;
  - production-facing table components never require loading an unbounded
    collection merely to render filters.
- Concurrency risks:
  - rapid search and scenario changes must not allow stale results to replace
    newer state;
  - mutations must use stable IDs and deterministic invalidation;
  - tests must isolate and reset the memory runtime.
- Bundle impact:
  - obsolete catalog sources, seeded datasets, Faker, scenario controls, and development adapters
    must not inflate the production Studio bundle;
  - shared-component refactors must avoid duplicate primitive implementations.
- What happens with millions of records/items:
  - the memory runtime is not designed to hold production-scale collections;
  - later HTTP repositories must preserve bounded queries and server-side
    pagination/filtering/sorting;
  - virtualized rendering is deferred until a measured UI case requires it.

## Security, Privacy, And Abuse

- Auth/session impact: none. Real login/session/sign-out remain outside the mock
  runtime.
- Roles/access: the development sandbox is not an authorization mechanism and
  must not introduce role assumptions.
- Production boundary: development routes and mock enablement must redirect,
  fail closed, or be removed from production builds.
- PII/secrets: use synthetic records only. Do not copy real names, phones,
  emails, tokens, cookies, headers, or payloads into fixtures or examples.
- Browser environment variables remain public and must not contain a secret
  switch for mock mode.
- Spam/abuse: no public write endpoint exists.
- Logging: scenario diagnostics must not establish a pattern of logging complete
  records or future business payloads.

## Accessibility And UX

- Focused component and Playwright tests cover stable shared behavior; axe scans
  the representative sandbox for automatically detectable WCAG 2.0, 2.1, and 2.2
  Level A/AA violations.
- Automated checks complement, but do not replace, keyboard, focus, zoom,
  screen-reader, contrast, target-size, and reduced-motion review.
- The sandbox and shared components provide visible and announced loading,
  error, empty, busy, and success states.
- Tables provide names, semantic headers, keyboard-operable controls, bounded
  scroll regions, and usable pagination at small viewport widths.
- Drawers and dialogs manage focus, expose programmatic titles/descriptions, and
  return focus correctly.
- Status and tag examples never depend on color alone.
- Component tests and the sandbox use Brazilian Portuguese UI examples while
  code, filenames, and durable docs remain in English.

## Logging And Observability

- Useful development events: scenario selected, scenario reset, intentional
  simulated failure, and unhandled mock operation.
- Metrics: no production metric is introduced. CI records component-test,
  accessibility-test, production-boundary, and Studio check results.
- Traces/spans: none.
- Alerts: CI failure is sufficient for catalog, component, or production-boundary
  regressions.
- Sensitive data that must not be logged: auth credentials, tokens, cookies,
  private headers, full user objects, and any future business payload.

## Acceptance Criteria

- [x] `ENG-32` is completed and the initiative is implemented against the final
      `apps/studio` boundary.
- [x] A documented folder/dependency model governs routes, modules, shared UI,
      design-system code, textual documentation, and development-only tooling.
- [x] Existing active Studio shared components are inventoried and classified;
      each has a documented public contract or is explicitly marked internal-only
      with a rationale in the exhaustive English Markdown inventory.
- [x] A unit test proves every active shared component source has exactly one
      decision in the durable textual inventory.
- [x] Focused Vitest component tests and Playwright flows verify stable interactive
      behavior and accessibility-sensitive paths without a separate catalog runtime.
- [x] Component contribution rules cover purpose, placement, public API,
      composition, variants, states, tokens, accessibility, responsive behavior,
      textual documentation, tests, and promotion to shared code.
- [x] Shared component files are organized by responsibility without creating a
      new cross-app package or breaking existing Studio behavior.
- [x] The three-layer design-token structure is documented and shared components
      avoid new raw visual values when a suitable token exists.
- [x] A development-only, deterministic, resettable in-memory runtime supports
      typed collections, seeded scenarios, bounded latency, and intentional
      failure simulation.
- [x] A neutral Studio sandbox demonstrates local CRUD, search, filters, sorting,
      pagination, scroll, all component states, and larger seeded datasets.
- [x] The mock runtime does not intercept authentication, invent an API contract,
      persist real data, or ship as an enabled production capability.
- [x] The data boundary demonstrates how a module-owned in-memory repository can
      later be replaced by an HTTP/Orval adapter without changing presentation
      components.
- [x] React state follows one owner per value, uses composition instead of
      product-mode boolean proliferation, and avoids Effects for derived data and
      user events.
- [x] `docs/studio/component-system.md`, `apps/studio/AGENTS.md`, and the Studio
      development skill guide future humans and AI agents to discover and use the
      system correctly.
- [x] Focused unit, type, component interaction, accessibility, sandbox,
      production-boundary, and end-to-end checks pass.

## Verification Plan

- Unit tests:
  - deterministic factories, IDs, collection reset, CRUD behavior, query bounds,
    search/filter/sort/pagination, latency, failures, and scenario isolation;
  - component utilities, public variants, query keys, and adapter contracts;
  - type tests for repository and page/query contracts.
- Integration/API tests:
  - no backend or API test is required;
  - MSW remains strict for real network calls and must not mock IDP login/session.
- UI tests:
  - focused Vitest component tests and Playwright flows;
  - interaction tests for tables, drawers, forms, pagination, keyboard actions,
    scenario switching, reset, and local mutations;
  - automated accessibility checks for stable component flows.
- Manual/browser checks:
  - textual component discovery, themes, small viewports, relevant component states,
    and documentation clarity;
  - Studio sandbox navigation, dense scroll, local CRUD, filters, pagination,
    reset, intentional failure, and small viewport behavior;
  - keyboard-only, focus return, 200% zoom, reduced motion, and basic screen-reader
    checks.
- Build/check commands:
  - Studio format, lint, typecheck, unit/component tests, build, and aggregate
    check;
  - exhaustive inventory and architecture tests;
  - focused Playwright sandbox and production-boundary tests;
  - repository-wide quality checks affected by new commands or CI wiring.

## Accepted Decisions And Open Questions

- [x] Keep component documentation as English Markdown in durable Studio docs and
      agent instructions; do not add a separate visual catalog runtime or artifact.
- [x] Confirm the final active shared-component inventory after `ENG-32` before
      estimating the documentation migration.
- [x] Define the smallest neutral sandbox record shape during execution without
      reusing future Scheduling vocabulary.
