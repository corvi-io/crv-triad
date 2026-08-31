# 12 TRIAD Studio Front Desk Queue And Check-In Visual Prototype - Execution Plan

## Source

- PRD:
  `docs/initiatives/prds/12-triad-studio-front-desk-queue-and-check-in-visual-prototype.md`
- UX/product source: connected Maestri note `triad-studio-o-triad-stud`,
  especially queue lines 164-194, service-start lines 305-329, journeys lines
  527-537, and roadmap lines 566-600.
- MLP tracker: connected Maestri note `triad-studio-acompanhament`.
- Related delivered issues:
  - ENG-34 schedule visual prototype;
  - ENG-40 Agenda board visual prototype;
  - ENG-41 barbershop setup module;
  - ENG-43 Agenda visual refinement;
  - ENG-44 client-management visual prototype;
  - ENG-45 operational Dashboard visual prototype.
- Related PR evidence:
  - PR #25: Portuguese validation bounds, shared compact list controls, and
    `ModuleLayout` spacing rules;
  - PR #26: source-time-bounded current-state claims and exact drill-down
    subset behavior.
- Linear initiative:
  [TRIAD Studio Front Desk Queue and Check-In Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-front-desk-queue-and-check-in-visual-prototype-41dad3f57b38).
- Linear issue:
  [ENG-46: Build the TRIAD Studio front-desk queue and check-in visual prototype](https://linear.app/corvi-io/issue/ENG-46/build-the-triad-studio-front-desk-queue-and-check-in-visual-prototype).

## Outcome And Delivery Boundary

Deliver one independently reviewable reception workflow:

1. a scheduled customer arrives through Agenda and appears in the queue;
2. reception calls the customer;
3. reception starts the service;
4. Agenda and Dashboard read the updated scheduled state;
5. reception can run the equivalent path for a walk-in.

Stop at `Em atendimento`.

Do not add service items, performer changes, price edits, discounts, command
tabs, payment, commission, cash, daily closing, API, persistence, or production
authorization.

## Implementation Principles

- Start from the latest `origin/staging`, which includes merged ENG-44 and
  ENG-45. Do not implement from the stale shared checkout.
- Use an isolated checkout or Maestri floor for the implementing agent.
- Suggested branch: `feature/eng-46-front-desk-queue-check-in`.
- Primary ownership:
  - `apps/studio/src/modules/service-desk/**`;
  - `apps/studio/src/dev/service-desk/**`;
  - `apps/studio/src/routes/_authenticated/service-desk/**`;
  - focused service-desk tests;
  - service-desk durable documentation.
- Minimal shared integration:
  - Studio module registry and route metadata;
  - Vite virtual-source composition;
  - production-boundary expectations;
  - directly affected component inventory/testing documentation.
- Minimal scheduling integration:
  - reuse the existing module-scoped repository instance;
  - call its public transition contract for scheduled starts;
  - add only the smallest composition export/query invalidation required;
  - do not change Agenda presentation, DnD, card styling, filters, drawer, or
    business rules.
- Do not edit Clients, barbershop-setup, authentication, API, IDP, or site.
- Before changing any shared component, list all current consumers, inspect
  focused regressions, and prove why module composition cannot satisfy the
  requirement.
- Keep technical docs/code/routes/filenames in English and UI copy/errors in
  Brazilian Portuguese.

## Mandatory Skill And Standards Gate

Before implementation, the agent must read:

- root `AGENTS.md`;
- `apps/studio/AGENTS.md`;
- `triad-initiative-workflow`;
- `triad-architecture`;
- `triad-studio-development`;
- `accessibility`;
- `shadcn`;
- `tailwind-design-system`;
- `vercel-composition-patterns`;
- `vercel-react-best-practices`;
- `react-useeffect`;
- `ux-copy`;
- `docs/studio/component-system.md`;
- `docs/studio/theme-system.md`;
- `docs/studio/testing.md`;
- `docs/studio/schedule-prototype.md`;
- `docs/studio/client-management.md`;
- the PRD and this plan.

Record this review in the PR summary. The following rules are acceptance
criteria, not optional style suggestions:

- use Base UI `render`, not Radix `asChild`;
- use the current Base UI `Select` and `ToggleGroup` contracts;
- use existing Studio components before official shadcn/registry/custom work;
- use `ListSearchField` and shared list filters for list controls;
- reserve raw `Select` for form data entry;
- keep `ModuleLayout` viewport free of implicit spacing and bottom padding;
- use `ActionDrawer`, `FieldGroup`, `Field`, `FieldSet`, and `FieldLegend`;
- keep every Zod bound and validation message explicit in pt-BR;
- use `noValidate`, linked errors, `data-invalid`, `aria-invalid`, required
  labels, and first-invalid focus;
- use semantic tokens and component variants, never raw status colors or
  feature-level dark overrides;
- use neutral cards with text/icon/badge status signals;
- use `gap-*`, `size-*`, `truncate`, and `cn()`, not `space-*` or duplicated
  utility expansions;
- use Lucide `Icon`-suffixed imports and current icon composition rules;
- use the project-owned shared `Button` `isLoading` behavior with stable labels;
- use full Card anatomy, Avatar fallback, `Empty`, `Alert`, `Skeleton`, Badge,
  Separator, and Sonner instead of hand-rolled equivalents;
- use explicit component variants/children/provider interfaces instead of
  boolean-prop proliferation and render-prop shells;
- derive values during render/pure projection; do not synchronize derived state
  or user events through effect chains;
- direct-import component owners; do not add a mega-barrel.

## Tasks

### 1. Preflight And Source Confirmation

- [ ] Fetch and inspect the latest `origin/staging`; record the base commit.
- [ ] Confirm ENG-44 and ENG-45 are merged before creating the feature branch.
- [ ] Create an isolated checkout/floor and branch for the Linear issue.
- [ ] Capture `git status` and preserve unrelated user-owned changes.
- [ ] Re-read the connected Maestri UX note and confirm:
  - [ ] queue fields and two preference paths;
  - [ ] waiting/called/in-service journey;
  - [ ] initial `Atendimentos` navigation position;
  - [ ] this task stops at service start.
- [ ] Inventory current Agenda/Dashboard scheduling composition, service and
      professional catalogs, source clock, scenario behavior, and query keys.
- [ ] Inventory existing shared UI components and current consumers before
      proposing any shared edit.

### 2. Component Discovery And Visual Contract

- [ ] Run `bunx --bun shadcn@latest info --json` in `apps/studio` and record:
  Vite, Tailwind v4, Base UI, `base-nova`, Geist, Lucide, aliases, and installed
  components.
- [ ] Inspect official shadcn docs/registry through the Bun-driven CLI for any
      primitive not already installed; use dry-run/view/diff before accepting
      source.
- [ ] Reuse the current Studio components for page layout, controls, cards,
      badges, avatars, drawers, forms, feedback, and loading/empty states.
- [ ] Document the accepted visual hierarchy before JSX:
  - [ ] header and primary CTA;
  - [ ] compact filter/search row;
  - [ ] textual operational summary;
  - [ ] three neutral queue stages;
  - [ ] one clear next action per entry.
- [ ] Define responsive behavior before implementation:
  - [ ] three columns at wide desktop when content remains readable;
  - [ ] intentional stacked/scroll-bounded behavior at medium and narrow widths;
  - [ ] no document-level horizontal overflow;
  - [ ] focus is never hidden inside internal scrolling.
- [ ] Define status/source/priority signals with text and icon/badge semantics.
- [ ] If a new shared component or token is still required, record:
  - [ ] why the existing Studio component does not fit;
  - [ ] official/registry candidates reviewed;
  - [ ] current and proposed consumers;
  - [ ] Base UI/Vite compatibility;
  - [ ] accessibility, responsive, bundle, token, test, and inventory impact.

### 3. Service-Desk Contract And Pure Rules

- [ ] Add `src/modules/service-desk` presentation contracts for:
  - [ ] queue entry source: scheduled or walk-in;
  - [ ] stages: waiting, called, in-service;
  - [ ] professional preference: specific or first-available;
  - [ ] priority: normal or fit-in;
  - [ ] supported client snapshot, service, professional, arrival, notes, and
        appointment reference;
  - [ ] repository query/result/action types.
- [ ] Keep technical types English and user-facing labels centralized in
      Brazilian Portuguese.
- [ ] Define explicit stage transition allowlists.
- [ ] Define a pure injected-clock contract and time-format/wait calculation.
- [ ] Prove before/start/inside/end/future boundaries for current-state claims.
- [ ] Define safe URL parsing and canonicalization for unit, stage, priority,
      stable professional ID, and technical scenario ID.
- [ ] Keep names, phones, notes, and free-text search out of URL state.
- [ ] Define exact projection/count/filter functions so every displayed count
      equals the rendered subset.
- [ ] Build repeated ID/service/professional lookups with bounded maps rather
      than repeated scans where appropriate.

### 4. Walk-In Form And Copy

- [ ] Build an explicit React Hook Form + Zod schema in the service-desk module.
- [ ] Export a fresh default-value factory based on the injected source clock.
- [ ] Include:
  - [ ] required customer name;
  - [ ] optional shared masked Brazilian phone;
  - [ ] required service;
  - [ ] required preference kind;
  - [ ] conditional professional for the specific path;
  - [ ] bounded arrival time;
  - [ ] normal/fit-in priority;
  - [ ] bounded optional notes with sensitive-data guidance.
- [ ] Populate eligible professionals from the selected service catalog.
- [ ] Clear a previously selected professional when service/preference changes
      make it invalid.
- [ ] Use `FieldGroup`/`Field` and `FieldSet`/`FieldLegend`; use shared
      data-entry controls, not list-filter controls, inside the form.
- [ ] Use `noValidate` and application-controlled validation.
- [ ] Add explicit pt-BR messages to every required, conditional, pattern,
      minimum, and maximum validation branch.
- [ ] Link each error to its control and focus the first invalid control.
- [ ] Keep the primary action label stable as `Adicionar à fila`; use shared
      `Button` `isLoading` and block duplicate submission.

### 5. Deterministic Source And Repository Composition

- [ ] Add `src/dev/service-desk` with deterministic, clearly synthetic data.
- [ ] Compose scheduled queue entries from the existing scheduling repository;
      do not copy appointment fixtures.
- [ ] Reuse the current scheduling service/professional/unit catalogs.
- [ ] Store only walk-in entries and the smallest scheduled `called` overlay.
- [ ] Inject the same bounded clock into scenario creation, wait projection,
      and transition evidence.
- [ ] Implement normal, empty, dense, long-wait, specific-professional,
      first-available, unavailable-professional, slow, next-failure, and
      persistent-error scenarios.
- [ ] Make scenario/reset generations discard stale delayed operations.
- [ ] Make call/start commands atomic and idempotent inside the memory adapter.
- [ ] Ensure failures occur before committing writes or roll back the complete
      affected snapshot.
- [ ] Make full reload reconstruct scenario fixtures and remove session
      mutations.
- [ ] Add `virtual:studio-service-desk-source`.
- [ ] Resolve memory only when the accepted scheduling memory source is enabled
      for local/configured `dev`.
- [ ] Add no new public environment variable.
- [ ] Resolve the disabled source in `hml` and `prd`.
- [ ] Ensure product presentation never imports `src/dev`.

### 6. TanStack Query And Cross-Surface Coherence

- [ ] Add service-desk repository context, query keys, queries, and mutations.
- [ ] Keep filters/search/query bounds in the repository call rather than
      filtering an arbitrary loaded page.
- [ ] Start independent reads together and avoid client-side waterfalls.
- [ ] Invalidate only service-desk and directly affected scheduling keys.
- [ ] For a scheduled entry:
  - [ ] project `arrived`/`waiting` from the existing appointment;
  - [ ] store `called` only in the reception overlay;
  - [ ] transition the original appointment to `in-progress` on service start;
  - [ ] retain the same repository instance across Agenda, Dashboard, and
        service desk.
- [ ] For a walk-in:
  - [ ] create a temporary queue snapshot;
  - [ ] do not create a Client record;
  - [ ] do not create or reserve an Agenda appointment;
  - [ ] carry the entry to `in-service` for the future fulfillment initiative.
- [ ] Reject stale or ineligible transition commands without corrupting either
      queue or scheduling state.

### 7. Authenticated Route And Navigation

- [ ] Add `src/routes/_authenticated/service-desk/index.tsx`.
- [ ] Guard it through the existing `_authenticated` route, `AuthGate`, and
      `WorkspaceShell`; do not add a second auth boundary.
- [ ] Add `/service-desk` and `Atendimentos` to the single module registry.
- [ ] Place it after Agenda and before Clients in primary navigation.
- [ ] Add breadcrumb, description, command keywords, expanded/collapsed/mobile
      active behavior, and unavailable-source presentation.
- [ ] Keep prototype/scenario/reset/failure language out of ordinary chrome.

### 8. Operational Page

- [ ] Compose the page with `ModuleLayout` and `PageHeader`.
- [ ] Put `Adicionar à fila` in `PageHeader.actions`.
- [ ] Use the shared compact `ListSearchField`.
- [ ] Use `SingleSelectListFilter`/`MultiSelectListFilter` for accepted list
      filters; do not use raw `Select` for list filtering.
- [ ] Persist only allowlisted, non-PII shareable state in the URL.
- [ ] Render a truthful textual summary from the same projection as the board.
- [ ] Render `Aguardando`, `Chamados`, and `Em atendimento` as named regions.
- [ ] Use full Card anatomy and neutral surfaces.
- [ ] Give every entry:
  - [ ] Avatar fallback;
  - [ ] customer name;
  - [ ] source text;
  - [ ] service;
  - [ ] arrival/wait context;
  - [ ] professional preference;
  - [ ] priority;
  - [ ] text/icon/badge stage;
  - [ ] one explicit next action.
- [ ] Do not make a nested-action card itself an ambiguous clickable control.
- [ ] Implement `Chamar cliente` and `Iniciar atendimento` with stable labels,
      busy state, success/error feedback, and polite dynamic announcements.
- [ ] Use existing `Empty`, `Alert`, `Skeleton`, and Sonner compositions for
      empty/filter-empty/loading/recoverable/persistent states.
- [ ] Keep `ModuleLayout` viewport free of implicit bottom padding/gap.
- [ ] Do not add drag-and-drop.

### 9. Accessibility And Responsive Verification

- [ ] Verify semantic page/region/heading structure and DOM order.
- [ ] Verify every control and action by keyboard.
- [ ] Verify visible and unobscured focus in page, internal scroll, menus, and
      drawer.
- [ ] Verify drawer entry, first-invalid focus, Escape/close behavior, and focus
      return to `Adicionar à fila`.
- [ ] Verify status, priority, source, wait, and preference never depend on
      color alone.
- [ ] Verify dynamic call/start results are announced without disruptive focus
      movement.
- [ ] Verify 24x24 CSS-pixel minimum targets.
- [ ] Verify light, dark, system, forced colors, and computed contrast.
- [ ] Verify reduced motion.
- [ ] Verify wide desktop at 1600x900 and 1440x900.
- [ ] Verify medium/tablet layout, 200%-zoom-equivalent behavior, 320 CSS-pixel
      reflow, coarse pointer, long Portuguese copy, and no page overflow.
- [ ] Run focused axe WCAG 2.2 A/AA checks.
- [ ] Record actual VoiceOver/NVDA, physical 200% browser zoom, and real-device
      touch checks, or record each skipped manual check and residual risk.

### 10. Focused Tests

- [ ] Unit-test transition allowlists and invalid transitions.
- [ ] Unit-test scheduled projection without fixture duplication.
- [ ] Unit-test every walk-in form validation branch in pt-BR.
- [ ] Unit-test conditional service/professional eligibility and clearing.
- [ ] Unit-test injected-clock wait/current-state boundary cases.
- [ ] Unit-test safe URL allowlists, canonicalization, and PII exclusion.
- [ ] Unit-test exact summary/count/filter/rendered-subset equivalence.
- [ ] Unit-test scenario fixtures, reset, stale delayed operations, atomic
      failure, retry, persistent failure, and duplicate command prevention.
- [ ] Unit-test shared scheduling repository identity and start coherence.
- [ ] Component-test populated/loading/empty/filter-empty/error/disabled states.
- [ ] Component-test stable button labels, busy state, and live feedback.
- [ ] Extend module-registry, component-architecture, inventory, and
      production-boundary tests.
- [ ] Add Playwright for:
  - [ ] direct authenticated route and all navigation variants;
  - [ ] Agenda arrival -> waiting -> called -> in-service -> Agenda/Dashboard;
  - [ ] walk-in -> called -> in-service;
  - [ ] form conditional behavior, validation, focus, and duplicate prevention;
  - [ ] exact filters/counts/URL normalization;
  - [ ] reset and representative scenarios;
  - [ ] visual hierarchy and responsive evidence;
  - [ ] themes, forced colors, reduced motion, focus, target size, and axe.
- [ ] Run focused Agenda and Dashboard regressions.

### 11. Documentation And Durable Conventions

- [ ] Add `docs/studio/service-desk.md` covering scope, architecture, routes,
      states, source/reset, privacy, production boundary, and follow-ups.
- [ ] Update `apps/studio/README.md` for the accepted evaluation module and
      source behavior.
- [ ] Update `docs/studio/component-system.md` only for changed/new component
      contracts and record internal-only rationale where applicable.
- [ ] Update `docs/studio/testing.md` with focused and browser coverage.
- [ ] Update `docs/studio/schedule-prototype.md` only for the shared repository
      and scheduled transition coherence.
- [ ] Update root/env/deployment docs only if a real durable contract changes;
      no new source env is expected.
- [ ] Do not add new AGENTS/skill rules unless implementation proves a repeated
      convention not already captured.
- [ ] Update this execution plan only after evidence exists.

### 12. Final Verification And Handoff

- [ ] Run:

```bash
bun --filter studio routes:generate
bun --filter studio format
bun --filter studio lint
bun --filter studio typecheck
bun --filter studio test
bun --filter studio test:production-boundary
bun --filter studio build
bun --filter studio check
bun --filter studio test:e2e
bun run check
git diff --check
```

- [ ] Record exact command results and test counts.
- [ ] Record the base and final commit SHAs.
- [ ] Separate branch-caused failures from byte-identical baseline failures.
- [ ] Run the Triad preflight review before push/PR.
- [ ] Push the feature branch and open a PR against `staging`.
- [ ] Link the PR in Linear and follow evidence-based workflow states.
- [ ] Request no more than the accepted Codex/GitHub review cycles.
- [ ] Complete review triage, batch valid fixes, rerun focused/full checks, and
      record residual risks.
- [ ] Do not move to `Done` until merge to `staging` is confirmed.

## Definition Of Done

- The two accepted queue/check-in journeys are demonstrable repeatedly with
  deterministic synthetic data.
- Scheduled transitions remain coherent in Agenda and Dashboard.
- Walk-ins remain truthful temporary queue records.
- The route contains no fulfillment, finance, commission, or production scope.
- Visual hierarchy and component composition follow current Studio contracts.
- All validation/error copy is explicit pt-BR.
- Time claims and filtered navigation are mathematically bounded and exact.
- Accessibility/responsive/browser evidence is recorded.
- Production builds fail closed and exclude development data.
- Focused, regression, production-boundary, build, and check commands pass or
  have explicitly accepted baseline evidence.
- Durable docs and Linear handoff are complete.

## Verification Evidence

Record evidence as tasks are completed:

- Base commit:
- Feature commit:
- Branch:
- Pull request:
- Studio unit/component tests:
- Focused service-desk tests:
- Agenda/Dashboard regressions:
- Playwright:
- Production-boundary scan:
- Build/check:
- 1600x900 and 1440x900 visual review:
- 320 CSS-pixel and 200% zoom:
- Keyboard/focus:
- VoiceOver/NVDA:
- Forced colors/reduced motion/coarse pointer:
- Security/privacy review:
- Documentation review:
- Notes:

## Risks And Follow-Ups

- [ ] The next initiative must own service fulfillment from `Em atendimento`
      to `Pronto para pagamento`.
- [ ] A later finance initiative must own command tabs, payment, commissions,
      cash, and daily closing.
- [ ] Production work must define canonical visit/client identity, queue
      ordering, tenant/unit authorization, concurrency, idempotency, audit,
      persistence, clock/timezone, realtime, and observability.
- [ ] Client-directory and scheduling fixtures remain independent. Do not
      silently claim cross-module client synchronization.
- [ ] First-available preference remains human-assisted; do not present it as
      an optimizer.
- [ ] Real-device and assistive-technology evidence remains manual and must be
      recorded honestly.
