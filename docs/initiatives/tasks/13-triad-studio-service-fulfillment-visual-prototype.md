# 13 TRIAD Studio Service Fulfillment Visual Prototype - Execution Plan

## Source

- PRD:
  `docs/initiatives/prds/13-triad-studio-service-fulfillment-visual-prototype.md`
- Official UX source: connected Maestri note `triad-studio-o-triad-stud`,
  section 9.
- Visual MLP tracker: connected Maestri note
  `triad-studio-acompanhament`.
- Dependency:
  [ENG-46: Build the TRIAD Studio front-desk queue and check-in visual prototype](https://linear.app/corvi-io/issue/ENG-46/build-the-triad-studio-front-desk-queue-and-check-in-visual-prototype).
- Dependency PR:
  [PR #27: feat(studio): add front-desk queue and check-in](https://github.com/corvi-io/crv-triad/pull/27).
- Related issue:
  [ENG-47: Build the TRIAD Studio service fulfillment visual prototype](https://linear.app/corvi-io/issue/ENG-47/build-the-triad-studio-service-fulfillment-visual-prototype).

## Delivery Contract

Start from an existing `Em atendimento` queue entry and finish at
`Pronto para pagamento`.

Deliver:

- a dedicated service-session workspace under `Atendimentos`;
- itemized performed services;
- one eligible attributed professional per item;
- add/remove/change interactions;
- bounded operational notes;
- exact elapsed-time/state presentation;
- atomic finish and a truthful ready-for-payment handoff;
- deterministic scenarios and reset/reload behavior.

Do not deliver:

- prices or price editing;
- discounts, tips, fees, or financial add-ons;
- command-tab totals;
- payment methods or payment;
- appointment paid/completed claims;
- commissions, cash, daily closing, reports, or notifications;
- API, IDP, persistence, production authorization, polling, or realtime.

## Readiness Gate

- [x] Confirm ENG-46 is `Done`.
- [x] Confirm PR #27 is merged into `staging`.
- [x] Fetch the latest `origin/staging`.
- [x] Create an isolated checkout or Maestri floor from that revision.
- [x] Record base SHA.
- [x] Branch:
      `feature/eng-47-service-fulfillment`.
- [x] Read root and Studio AGENTS.
- [x] Read the PRD and this plan completely.
- [x] Read required skills:
  - [x] `triad-initiative-workflow`;
  - [x] `triad-architecture`;
  - [x] `triad-studio-development`;
  - [x] `accessibility`;
  - [x] `shadcn`;
  - [x] `tailwind-design-system`;
  - [x] `vercel-composition-patterns`;
  - [x] `vercel-react-best-practices`;
  - [x] `react-useeffect`;
  - [x] `ux-copy`.
- [x] Read the merged ENG-46 implementation and
      `docs/studio/service-desk.md`.
- [x] Record any divergence between merged ENG-46 and the planning contract
      before editing.

## Implementation Principles

- Keep the lifecycle inside `service-desk`; do not introduce a parallel
  service-fulfillment source.
- Use the existing `virtual:studio-service-desk-source` seam and no new public
  environment variable.
- Keep presentation independent from `src/dev`.
- Reuse the scheduling service/professional/unit catalogs and the existing
  injected source clock.
- Keep the initial service item immutable and allow removal only for added
  items.
- Attribute every item to one eligible active professional.
- Keep the scheduled appointment `in-progress` at
  `ready-for-payment`.
- Keep prices, totals, discounts, payment, and commission out of the UI and
  contracts.
- Derive counts, completeness, elapsed labels, and enabled actions through pure
  projections; avoid effect chains.
- Keep technical identifiers and docs English; keep UI and validation copy
  Brazilian Portuguese.

## Tasks

### 1. Dependency And Baseline Audit

- [x] Verify the Linear dependency and merged PR evidence.
- [x] Inspect the merged service-desk contracts, repository, source adapter,
      route, tests, and docs.
- [x] Run the focused existing service-desk tests before changes.
- [x] Record current component inventory and available shared primitives.
- [x] Run Bun-driven shadcn project inspection and official component discovery
      before adding any primitive.
- [x] Reuse existing shared components; no new shared component was required.
- [x] Confirm `hml`/`prd` source disablement and production-boundary markers.

### 2. Visual And Interaction Specification

- [x] Define the service-session workspace hierarchy before JSX:
  - [x] breadcrumb/return navigation;
  - [x] customer/source/status header;
  - [x] exact start and elapsed-time summary;
  - [x] `Serviços realizados` list;
  - [x] item add/remove/change actions;
  - [x] bounded notes;
  - [x] completeness and finish area.
- [x] Define wide, medium, 320-CSS-pixel, and 200%-zoom-equivalent layouts.
- [x] Ensure no document-level horizontal overflow.
- [x] Ensure sticky/fixed regions do not hide keyboard focus.
- [x] Define status with text plus icon/badge, never color alone.
- [x] Validate final pt-BR vocabulary and destructive/confirmation copy.

### 3. Service-Session Contract And Pure Rules

- [x] Extend service-desk contracts with:
  - [x] session ID and source queue-entry ID;
  - [x] scheduled/walk-in source and optional appointment ID;
  - [x] unit and customer snapshot;
  - [x] `in-progress` and `ready-for-payment` session states;
  - [x] `startedAt`, optional `finishedAt`, and bounded notes;
  - [x] ordered service items;
  - [x] initial/added item source;
  - [x] service and professional references;
  - [x] repository inputs/results/errors.
- [x] Keep customer PII and free text out of route search state.
- [x] Use a stable opaque session ID in the child route.
- [x] Add pure rules for:
  - [x] creating a session from an `in-service` queue entry;
  - [x] preserving the initial service and its starting attribution;
  - [x] eligible-professional lookup;
  - [x] added-item removal;
  - [x] professional reassignment;
  - [x] completion readiness;
  - [x] exact elapsed-time formatting;
  - [x] `ready-for-payment` transition.
- [x] Reject source-clock regression, invalid items, inactive/ineligible
      professionals, stale generations, and already-ready writes; handle exact
      duplicate retries and finish idempotently.
- [x] Keep bounded prototype lookups local; no unbounded collection scan was introduced.
- [x] Map repository errors to explicit pt-BR UX copy.

### 4. Repository And Deterministic Memory Source

- [x] Extend the existing `ServiceDeskRepository` with narrow session methods
      equivalent to:
  - [x] `getSession`;
  - [x] `addServiceItem`;
  - [x] `removeServiceItem`;
  - [x] `assignServiceItemProfessional`;
  - [x] `updateSessionNotes`;
  - [x] `finishSession`.
- [x] Create the session from the same queue entry when service starts or first
      opens, without a second disconnected visit record.
- [x] Reuse the existing injected clock and scheduling catalogs.
- [x] Keep mutations atomic and pending-safe.
- [x] Make retries/idempotency safe inside the memory source.
- [x] Fail before writes or restore the complete previous snapshot.
- [x] Increment scenario/reset generation and discard stale delayed operations.
- [x] Ensure a full reload reconstructs the selected scenario.
- [x] Do not create Client records or mutate Client history.
- [x] For scheduled entries, do not transition the appointment beyond
      `in-progress`.
- [x] Keep source availability tied to the existing service-desk/scheduling
      local/configured-`dev` boundary.
- [x] Add no new env variable, fake HTTP, storage, polling, or realtime.

### 5. Query Composition

- [x] Add session query keys, query, and focused mutations.
- [x] Invalidate only the affected service session and service-desk queue keys.
      directly affected scheduling keys.
- [x] Avoid broad `invalidateQueries` calls when an exact key is available.
- [x] No independent reads are exposed by the repository.
      separately.
- [x] Ensure stale navigation/session IDs cannot commit mutation results.
- [x] Keep presentation dependent only on the repository port.
- [x] Add production-boundary tests proving presentation does not import
      `src/dev`.

### 6. Route And Workspace

- [x] Add the authenticated service-session child route under
      `/service-desk/$sessionId`.
- [x] Keep `Atendimentos` active in all navigation variants.
- [x] Render `Atendimentos / Atendimento` breadcrumb semantics.
- [x] Use `ModuleLayout` and current Studio page composition without implicit
      bottom spacing.
- [x] Add a clear `Voltar para atendimentos` action that preserves queue context.
- [x] Render loading, missing-session, recoverable-error, and ready states with
      shared `Skeleton`, `Empty`, and `Alert` anatomy.
- [x] Keep scenario/reset/failure vocabulary outside ordinary product chrome.

### 7. Service Items

- [x] Render the initial item with service and professional attribution.
- [x] Make initial-item immutability visible without implying a financial lock.
- [x] Add `Adicionar serviço` with an explicit form composition.
- [x] Populate services from the existing scheduling catalog.
- [x] Populate professionals from the selected service's active eligible set.
- [x] Require one eligible professional per added item.
- [x] Allow professional reassignment for every item while `in-progress`.
- [x] Allow removal only for added items.
- [x] Allow duplicate service catalog selections as separate items.
- [x] Use stable item IDs and accessible action names.
- [x] Prevent duplicate submissions with stable button labels and shared
      `isLoading`.
- [x] Show concise success/error feedback without customer PII.

### 8. Notes

- [x] Implement bounded `Observações do atendimento`.
- [x] Keep the single notes control as local state; no multi-field form or
      React Hook Form/Zod schema is warranted.
- [x] Add explicit pt-BR copy for the maximum-length branch.
- [x] Add `aria-invalid` and a linked visible field error.
- [x] Add guidance against credentials, card data, documents, health data, and
      other sensitive information.
- [x] Keep notes out of URLs, toasts, logs, and telemetry.
- [x] Preserve previous notes on failed updates.

### 9. Finish And Handoff

- [x] Derive completion readiness from pure rules.
- [x] Disable finish when any item lacks an eligible professional.
- [x] Use an accessible confirmation with:
  - [x] clear title;
  - [x] consequence: the session becomes `Pronto para pagamento`;
  - [x] `Continuar atendimento` secondary action;
  - [x] `Finalizar atendimento` primary action.
- [x] Keep focus trapped/restored correctly.
- [x] Transition the session atomically to `ready-for-payment`.
- [x] Show the ready state and return path.
- [x] Expose `Pronto para pagamento` truthfully on the service-desk surface.
- [x] Do not render price, total, discount, payment, commission, cash, or
      completion/revenue claims.
- [x] Verify linked scheduled appointments remain `in-progress`.
- [x] Do not add reopen behavior.

### 10. Scenarios And Reset

- [x] Add deterministic scenarios for:
  - [x] typical single service;
  - [x] multiple services with one professional;
  - [x] multiple professionals;
  - [x] long-running service;
  - [x] long labels and bounded notes;
  - [x] no eligible professional;
  - [x] ready for payment;
  - [x] slow operations through the shared source engine;
  - [x] next operation failure;
  - [x] persistent load failure.
- [x] Keep scenarios synthetic and clearly non-production.
- [x] Verify reset/reload repeatability and generation safety.
- [x] Keep the technical scenario contract out of product copy.

### 11. Component And Design-System Gate

- [x] Reuse existing Studio components before adding code.
- [x] Use Bun-driven shadcn CLI inspection; no registry component was installed.
- [x] Use Base UI primitives, not Radix `asChild`.
- [x] Use full Card anatomy, Badge, Alert, Empty, Skeleton,
      Separator, Sonner, and existing confirmation/form primitives.
- [x] Use semantic tokens and existing variants.
- [x] Use `gap-*`, `size-*`, `truncate`, and direct owner imports.
- [x] Use `Icon`-suffixed icon imports and supported `data-icon` anatomy.
- [x] Do not add raw feature colors, manual dark overrides, manual overlay
      z-index, custom badges/skeletons, `space-*`, or mega-barrels.
- [x] Prefer explicit variants/children/provider interfaces over boolean-prop
      proliferation.
- [x] Update `docs/studio/component-system.md` for changed shared contracts.
      component contract.

### 12. Accessibility And Responsive Verification

- [x] Verify semantic headings and named regions.
- [x] Verify keyboard operation and logical focus order.
- [x] Verify visible focus and dialog trigger restoration.
- [x] Verify dialog focus trap and trigger restoration.
- [x] Verify accessible names for item actions.
- [x] Verify 24 by 24 CSS pixel minimum targets.
- [x] Verify labels, descriptions, linked errors, and live feedback.
- [x] Verify status does not depend on color.
- [x] Reuse the existing computed light/dark semantic-token contrast coverage.
- [x] Verify system theme and forced colors.
- [x] Verify reduced motion.
- [x] Verify 320-CSS-pixel reflow and no document overflow.
- [x] Verify the 320-CSS-pixel equivalent of a 640px viewport at 200% zoom.
- [x] Run focused axe WCAG 2.2 A/AA checks.
- [x] Record VoiceOver/NVDA and physical coarse-pointer checks honestly as
      manual evidence or explicit residuals.

### 13. Tests And Regression Coverage

- [x] Add unit tests for pure rules and boundary timestamps.
- [x] Add repository tests for atomicity, rollback, idempotency, clock regression, and generation.
- [x] Add component tests for recoverable loading, feedback, retry keys, and pending state.
- [x] Add Playwright journeys from ENG-46 queue to service completion.
- [x] Verify scheduled and walk-in sessions.
- [x] Verify Agenda and Dashboard do not show premature completion/revenue.
- [x] Verify the service-desk board shows exact state/count subsets.
- [x] Verify production disablement and artifact exclusion.
- [x] Verify no PII/free text enters URL state or diagnostic output.
- [x] Review textual component inventory; no inventory update was required.

### 14. Documentation And Handoff

- [x] Update `docs/studio/service-desk.md` with the fulfillment contract.
- [x] Update `apps/studio/README.md` for route/runtime scope.
- [x] Update `docs/studio/testing.md` for scenarios/evidence.
- [x] Update initiative checkboxes only after evidence exists.
- After merge: update `triad-studio-acompanhament` only with merge evidence.
- [x] Run `triad-preflight-review`.
- [x] Open draft PR #28 against `staging`.
- Excluded from this bounded review batch: Linear link/status mutations.
- [x] Record the immutable final SHA in PR #28 after commit/push; a commit
      cannot contain its own SHA. Record exact test counts, browser evidence, skipped manual
      checks, and residual risks.

## Verification Commands

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

## Verification Evidence

- Base SHA: `fe624291c5938dcb5c5a3ad83368066b481f8937`
- Final SHA: recorded in PR #28 after the immutable commit is pushed; a commit cannot contain its
  own SHA.
- Studio routes/format: passed; 254 files formatted with no fixes on the final run.
- Studio lint: passed; 259 files checked with no fixes.
- Studio typecheck: passed.
- Studio unit/component tests: 38 files, 263 tests passed.
- Focused service-session tests: 4 files, 30 tests passed.
- Service Desk Playwright: 9/9 passed, including fixture mutation persistence across board
  round-trips and immediate child-route search canonicalization. The targeted canonicalization
  probe also passed independently 1/1.
- Production-boundary scan: passed across 52 files and 1,158,063 bytes.
- Build/check: build passed with 3,697 modules; Studio check and root check passed.
- Playwright: focused Service Desk 9/9 passed. The independently verified full 65-test parallel run
  produced 47 passed and 18 baseline failures: 1 Dashboard, 14 Agenda, and 3 Theme. Two
  branch-caused nested-overlay failures found in the earlier run were fixed with semantic modal
  layering and passed in the final 9/9 focused probe; the 18 remaining failures are the
  already-proven unrelated shared scheduling/theme scenario race. The prior schedule-only
  four-worker reproduction was
  2/16, including the same 30-vs-42 appointment contamination. Playwright infrastructure was not
  changed.
- 1600x900 and 1440x900 visual review: existing screenshots plus the expanded fulfillment journey
  passed.
- 320 CSS-pixel and 200% zoom: automated 320-CSS-pixel zoom-equivalent reflow passed without
  document overflow; physical browser zoom was unavailable.
- Keyboard/focus: dialog keyboard entry, modal focus management, Escape restoration, and queue
  drawer restoration passed.
- VoiceOver/NVDA: unavailable; remains a manual residual.
- Forced colors/reduced motion/coarse pointer: headless forced colors and reduced motion passed;
  physical coarse pointer was unavailable.
- Security/privacy review: parent and child Service Desk routes immediately canonicalize URL search
  to the six validated technical keys; no PII/free text remains in URLs, toasts, operation IDs,
  logs, or telemetry; no secrets, storage, HTTP, or public environment input was added.
- Documentation review: Studio service-desk, testing, component-system, PRD, and this plan are
  aligned with the implemented contract and exact evidence.
- Notes: Automated evidence covers 1600x900, 1440x900, 320 CSS pixels, keyboard/focus,
  dark/system, forced colors, reduced motion, target size, and axe. Physical VoiceOver/NVDA,
  real 200% browser zoom, and a physical coarse-pointer device were not available.

## Risks And Follow-Ups

- [x] ENG-46/PR #27 merged before implementation began.
- Future: the next finance initiative must own command-tab values, discounts,
      payment methods, payment registration, and the exact appointment
      completion boundary.
- Future: a later initiative must own commissions.
- Future production work must define canonical visit/client identity,
      tenant/unit authorization, roles, concurrency, idempotency, audit,
      persistence, retention, clock/timezone, bounded APIs, realtime, and
      observability.
- The prototype's immutable initial item is an evaluation decision, not a
      final production policy.
- Real-device and assistive-technology evidence remains manual and must be
      reported honestly.
