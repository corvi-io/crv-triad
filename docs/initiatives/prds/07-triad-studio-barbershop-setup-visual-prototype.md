# 07 TRIAD Studio Barbershop Setup Module

## Summary

Integrate barbershop setup into the authenticated TRIAD Studio workspace at
`/barbershop-setup`. Owners, managers, and receptionists should enter the module through the normal
sidebar and use overview, units, professionals, services, and weekly availability as one coherent
product experience.

The accepted experience is realistic, but its data source is temporary: local development and the
deployed `dev` target may compose a deterministic session-memory adapter. `hml` and `prd` resolve
the source as disabled until business API, persistence, tenancy, and authorization contracts are
accepted. This initiative does not promise persistence or define a future backend schema.

Execution plan: [07 TRIAD Studio Barbershop Setup Module](../tasks/07-triad-studio-barbershop-setup-visual-prototype.md)

## Context

- ENG-41 originally delivered setup under `/workspace-preview/barbershop-setup` with visible
  scenario, reset, fixture-count, latency, and failure controls.
- Product review determined that a separate preview surface distorted the workflow being evaluated.
  Reviewers must now enter, test, and critique setup through the same authenticated shell,
  navigation, breadcrumbs, responsive sidebar, and route model as the normal product.
- The implemented repository port, TanStack Query hooks, forms, drawers, relationships,
  availability editor, deterministic scenarios, and rollback behavior remain useful and should be
  preserved.
- The integration decision changes where and how the experience is presented; it does not accept a
  business API, persistence model, tenant boundary, or authorization policy.

Related sources:

- [Linear issue ENG-41](https://linear.app/corvi-io/issue/ENG-41/integrate-the-triad-studio-barbershop-setup-module)
- [Pull request #22](https://github.com/corvi-io/crv-triad/pull/22)
- `docs/studio/barbershop-setup.md`
- `docs/studio/component-system.md`
- `docs/studio/deployment.md`

## Goals

- Make `/barbershop-setup` an authenticated child of `_authenticated`, `AuthGate`, and
  `WorkspaceShell`.
- Expose the module as `Barbearia` in secondary navigation while retaining
  `Configuração da barbearia` as its page and breadcrumb title.
- Preserve overview, units, professionals, services, availability, URL-backed section state,
  drawers, CRUD, relationship validation, archive/restore, failure recovery, and accessibility.
- Remove all ordinary preview/debug chrome and language from the integrated experience.
- Keep deterministic scenarios available only as dev/test infrastructure through a stable,
  non-PII technical query value when tests need a specific state.
- Give setup its own explicit `VITE_BARBERSHOP_SETUP_SOURCE` composition boundary so local and
  deployed `dev` may use memory independently of Agenda.
- Ensure `hml` and `prd` fail closed and exclude the memory adapter, fixtures, scenarios, and mock
  engine from built artifacts.
- Keep the module repository port replaceable by a future accepted HTTP adapter without changing
  presentation composition prematurely.

## Non-Goals

- Business API routes, OpenAPI, database tables, migrations, durable storage, browser storage,
  realtime, polling, background jobs, or external providers.
- Better Auth organization, membership, invitation, role, user, or IDP changes.
- Production onboarding, tenant provisioning, authorization rules, or an accepted settings domain.
- Treating current view models, IDs, fixture relationships, validation rules, or scenario sizes as
  backend contracts or capacity evidence.
- Removing or changing unrelated `/workspace-preview` surfaces, including the sandbox and Agenda.
- Enabling the memory source in `hml` or `prd`.

## Brainstorm

### Problem Framing

The workflow under review is not “operate a prototype”; it is “configure a barbershop inside
Studio.” A preview shell, scenario selector, reset command, and diagnostic counters make reviewers
evaluate the test harness instead of the product navigation and task flow. The smallest coherent
change is to integrate the existing module while retaining its replaceable in-memory boundary.

### Gaps And Assumptions

- There is still no accepted API, persistence, tenant, or authorization contract.
- A deployed `dev` build needs the same deterministic source as local serve for shared review.
- `hml` and `prd` must remain safe even if an environment variable mistakenly requests memory.
- The technical `scenario` query value is acceptable only because it is a stable identifier with no
  PII and has no ordinary visible control.
- The default source state must be useful without test parameters; `single-unit` is the accepted
  default.
- Account-access fields remain presentation data and do not mutate identity.

### Counterpoints And Alternatives

- Keeping the preview route would minimize code movement, but it conflicts with the explicit
  product decision and would continue to bypass normal navigation review.
- Removing deterministic scenarios entirely would simplify the port, but would discard valuable
  regression coverage for errors, density, conflicts, and stale operations. Keeping them behind a
  technical dev/test boundary is safer.
- Enabling memory in all environments would make the route look complete, but would ship fixtures
  where users may mistake them for persistent data. Fail-closed `hml`/`prd` is required.
- Building an HTTP adapter now would make the integrated route durable, but it would force business
  and security contracts that this initiative explicitly does not own.
- Hiding the module completely in `hml`/`prd` would avoid an unavailable state, but would make
  navigation and route topology target-dependent. A stable route with a disabled source state keeps
  the product boundary explicit while excluding fixtures.

### Recommendation

Use an authenticated route and stable module registry entry. Compose
`virtual:studio-barbershop-setup-source` to the memory adapter only when source is `memory` and
target is `local` or `dev`; otherwise resolve a disabled source. Keep repository operations and
queries unchanged, remove scenario/reset/runtime-diagnostic methods from the presentation port, and
retain scenario control only on the concrete development repository.

No new shared visual component is required. Reuse the existing `WorkspaceShell`, `ModuleLayout`,
`PageHeader`, tables, drawers, forms, dialogs, status feedback, and responsive sidebar.

## Experience Contract

### Route And Navigation

- `/barbershop-setup` is private and renders under `AuthGate` and `WorkspaceShell`.
- Secondary navigation label: `Barbearia`.
- Page and breadcrumb title: `Configuração da barbearia`.
- Active state works in expanded desktop, collapsed desktop, and mobile sidebar variants.
- `/workspace-preview/barbershop-setup` does not exist and cannot render the module.

### Sections And URL State

- `overview`, `units`, `professionals`, `services`, and `availability` remain directly selectable
  through the stable `section` query value.
- `scenario` may remain as a technical non-PII dev/test query value; invalid or missing values
  resolve to `single-unit`.
- Names, phones, addresses, notes, searches, and form payloads never enter URL state.

### Normal Product Chrome

The module must not visibly expose:

- prototype, preview, presentation, or development-tool language;
- scenario selection or scenario descriptions;
- reset/restore-scenario controls;
- fixture or record-count diagnostics;
- configured latency or failure-mode diagnostics.

Normal loading, error, retry, empty, confirmation, validation, and success feedback remains visible
using Brazilian Portuguese product language.

### Data And Mutation Behavior

- Local and deployed `dev` data is synthetic, deterministic, session-memory-only, and reset by a
  new browser runtime; no ordinary reset command is exposed.
- Create, inspect, edit, archive/restore, relationships, availability editing, copy-to-weekdays,
  conflict feedback, rollback, and retry continue through the module-owned repository port.
- Day-specific time off remains attached to its destination day when recurring weekday hours are
  copied.
- The default `single-unit` state opens a complete, useful setup rather than an empty harness.

## Architecture And Boundaries

- Studio owns the browser module, route, shell integration, UI contracts, repository port, queries,
  and source composition.
- `src/modules/barbershop-setup` does not import `src/dev`.
- `src/dev/barbershop-setup` owns the memory adapter and deterministic scenarios.
- `virtual:studio-barbershop-setup-source` is the composition seam. A future accepted HTTP adapter
  may implement the same port.
- API impact: none.
- IDP impact: none; real Studio authentication still gates the route.
- Site impact: none.
- Persistence impact: none.
- Deployment impact: one optional browser-safe source variable and fail-closed target composition.

## Performance And Scalability

- Current collections are bounded UX/test fixtures, not capacity evidence.
- Existing table pagination and scoped TanStack Query keys remain in place.
- No polling, WebSocket, background refresh, upload, or external request is introduced.
- Stale delayed operations remain generation-guarded and may not overwrite a newer technical test
  state.
- Future API work must independently define server pagination, query bounds, indexes, N+1
  prevention, concurrency, idempotency, and measured capacity.

## Security, Privacy, And Observability

- The new Vite variable is public configuration and contains only `disabled` or `memory`.
- The memory source does not intercept Better Auth, call network APIs, use browser persistence, or
  log records.
- Fixture names, contact values, addresses, schedules, form payloads, auth/session values, and
  private headers are not logged or sent to analytics.
- No production telemetry or numeric reliability claim is introduced.
- Production-boundary checks reject memory adapter, scenario, fixture, and mock-engine markers.

## Accessibility And Responsive Behavior

- Entry through secondary navigation has visible active state and an accessible label when the
  desktop sidebar is collapsed.
- The mobile dialog exposes the full `Barbearia` label and preserves focus management.
- Section controls, tables, menus, drawers, forms, confirmations, and availability editing remain
  keyboard operable with visible focus.
- Form errors retain `aria-invalid`, descriptions, Brazilian Portuguese messages, and first-invalid
  focus.
- Drawer entry/exit animation retains content until close completion, returns focus to the opener,
  and reduces to the minimum duration for `prefers-reduced-motion`.
- Preserve 320 CSS-pixel reflow, 200% zoom-equivalent behavior, theme contrast, non-color status,
  and focused axe coverage.

## Acceptance Criteria

- [x] `/barbershop-setup` is authenticated and rendered inside the normal workspace shell.
- [x] `Barbearia` is present and active in expanded, collapsed, and mobile secondary navigation.
- [x] The breadcrumb and page title use `Configuração da barbearia`.
- [x] `/workspace-preview/barbershop-setup` is absent and inaccessible.
- [x] No ordinary preview/scenario/reset/fixture/latency/failure chrome is visible.
- [x] All five sections and existing CRUD, relationship, availability, drawer, rollback, and retry
      journeys remain functional.
- [x] Local serve and configured deployed `dev` builds can compose memory from
      `VITE_BARBERSHOP_SETUP_SOURCE=memory`.
- [x] `hml` and `prd` resolve the source as disabled and exclude fixtures/scenarios from output.
- [x] Documentation states that memory is temporary and replaceable without promising API or
      persistence.
- [x] Route generation, format, lint, typecheck, full Vitest, full Playwright,
      production-boundary, build, Studio check, env/workflow tests, and root check have recorded
      evidence.

## Verification Plan

- Unit/component: source target matrix, env mapping, module registry, breadcrumbs, authenticated
  route, architecture boundary, URL validation, forms, repository scenarios, relationships,
  failure recovery, and drawer behavior.
- Browser: direct authenticated route, desktop sidebar entry, collapsed sidebar active state, mobile
  navigation, absence of preview chrome, all CRUD/availability journeys, axe, 320px, theme, focus,
  drawer animation, and reduced motion.
- Boundary: build `prd` with both memory sources explicitly disabled, scan output for fixture and
  scenario markers, and verify the authenticated route renders the disabled source state.
- CI/env: parse every workflow, validate declared sources, and prove source forwarding for `dev`,
  `hml`, and `prd` while the Vite target guard remains fail closed.

## Accepted Decisions And Open Questions

- [x] Product surface: authenticated integrated module, not a preview route.
- [x] Navigation: secondary label `Barbearia`; page/breadcrumb title remains descriptive.
- [x] Temporary source: deterministic session memory for local and configured `dev` only.
- [x] Default state: `single-unit`.
- [x] Test infrastructure: technical non-PII scenario query may remain without visible controls.
- [x] Backend boundary: no API, persistence, tenancy, or authorization promise.
- [ ] A future initiative must decide accepted API, persistence, tenancy, authorization,
      observability, and migration contracts before `hml`/`prd` can use real data.
- [ ] Product review must still decide whether the long-term experience remains a hub, becomes
      guided onboarding, or combines both.
