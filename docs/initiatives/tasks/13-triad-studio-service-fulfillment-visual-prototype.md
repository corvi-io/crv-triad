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
- [ ] Suggested branch:
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

- [ ] Verify the Linear dependency and merged PR evidence.
- [ ] Inspect the merged service-desk contracts, repository, source adapter,
      route, tests, and docs.
- [ ] Run the focused existing service-desk tests before changes.
- [ ] Record current component inventory and available shared primitives.
- [ ] Run Bun-driven shadcn project inspection and official component discovery
      before adding any primitive.
- [ ] Record why a new shared component is required if existing Studio and
      official shadcn components do not satisfy the accepted need.
- [ ] Confirm `hml`/`prd` source disablement and production-boundary markers.

### 2. Visual And Interaction Specification

- [ ] Define the service-session workspace hierarchy before JSX:
  - [ ] breadcrumb/return navigation;
  - [ ] customer/source/status header;
  - [ ] exact start and elapsed-time summary;
  - [ ] `Serviços realizados` list;
  - [ ] item add/remove/change actions;
  - [ ] bounded notes;
  - [ ] completeness and finish area.
- [ ] Define wide, medium, 320-CSS-pixel, and 200%-zoom layouts.
- [ ] Ensure no document-level horizontal overflow.
- [ ] Ensure sticky/fixed regions do not hide keyboard focus.
- [ ] Define status with text plus icon/badge, never color alone.
- [ ] Validate final pt-BR vocabulary and destructive/confirmation copy.

### 3. Service-Session Contract And Pure Rules

- [ ] Extend service-desk contracts with:
  - [ ] session ID and source queue-entry ID;
  - [ ] scheduled/walk-in source and optional appointment ID;
  - [ ] unit and customer snapshot;
  - [ ] `in-progress` and `ready-for-payment` session states;
  - [ ] `startedAt`, optional `finishedAt`, and bounded notes;
  - [ ] ordered service items;
  - [ ] initial/added item source;
  - [ ] service and professional references;
  - [ ] repository inputs/results/errors.
- [ ] Keep customer PII and free text out of route search state.
- [ ] Use a stable opaque session ID in the child route.
- [ ] Add pure rules for:
  - [ ] creating a session from an `in-service` queue entry;
  - [ ] preserving the initial service/professional;
  - [ ] eligible-professional lookup;
  - [ ] added-item removal;
  - [ ] professional reassignment;
  - [ ] completion readiness;
  - [ ] exact elapsed-time formatting;
  - [ ] `ready-for-payment` transition.
- [ ] Reject future-clock, invalid-item, inactive-professional,
      ineligible-professional, stale-state, duplicate-finish, and already-ready
      operations.
- [ ] Build bounded maps for repeated service/professional lookup where useful.
- [ ] Keep error vocabulary technical and map it to explicit pt-BR UX copy.

### 4. Repository And Deterministic Memory Source

- [ ] Extend the existing `ServiceDeskRepository` with narrow session methods
      equivalent to:
  - [ ] `getSession`;
  - [ ] `addServiceItem`;
  - [ ] `removeServiceItem`;
  - [ ] `assignServiceItemProfessional`;
  - [ ] `updateSessionNotes`;
  - [ ] `finishSession`.
- [ ] Create the session from the same queue entry when service starts or first
      opens, without a second disconnected visit record.
- [ ] Reuse the existing injected clock and scheduling catalogs.
- [ ] Keep mutations atomic and pending-safe.
- [ ] Make retries/idempotency safe inside the memory source.
- [ ] Fail before writes or restore the complete previous snapshot.
- [ ] Increment scenario/reset generation and discard stale delayed operations.
- [ ] Ensure a full reload reconstructs the selected scenario.
- [ ] Do not create Client records or mutate Client history.
- [ ] For scheduled entries, do not transition the appointment beyond
      `in-progress`.
- [ ] Keep source availability tied to the existing service-desk/scheduling
      local/configured-`dev` boundary.
- [ ] Add no new env variable, fake HTTP, storage, polling, or realtime.

### 5. Query Composition

- [ ] Add session query keys, query, and focused mutations.
- [ ] Invalidate only the affected service session, service-desk board, and
      directly affected scheduling keys.
- [ ] Avoid broad `invalidateQueries` calls when an exact key is available.
- [ ] Start independent reads together if the repository exposes them
      separately.
- [ ] Ensure stale navigation/session IDs cannot commit mutation results.
- [ ] Keep presentation dependent only on the repository port.
- [ ] Add production-boundary tests proving presentation does not import
      `src/dev`.

### 6. Route And Workspace

- [ ] Add the authenticated service-session child route under
      `/service-desk/$sessionId`.
- [ ] Keep `Atendimentos` active in all navigation variants.
- [ ] Render `Atendimentos / Atendimento` breadcrumb semantics.
- [ ] Use `ModuleLayout` and current Studio page composition without implicit
      bottom spacing.
- [ ] Add a clear `Voltar para atendimentos` action.
- [ ] Render loading, missing-session, persistent-error, and ready states with
      shared `Skeleton`, `Empty`, and `Alert` anatomy.
- [ ] Keep scenario/reset/failure vocabulary outside ordinary product chrome.

### 7. Service Items

- [ ] Render the initial item with service and professional attribution.
- [ ] Make initial-item immutability visible without implying a financial lock.
- [ ] Add `Adicionar serviço` with an explicit form composition.
- [ ] Populate services from the existing scheduling catalog.
- [ ] Populate professionals from the selected service's active eligible set.
- [ ] Require one eligible professional per added item.
- [ ] Allow professional reassignment for every item while `in-progress`.
- [ ] Allow removal only for added items.
- [ ] Allow duplicate service catalog selections as separate items.
- [ ] Use stable item IDs and accessible action names.
- [ ] Prevent duplicate submissions with stable button labels and shared
      `isLoading`.
- [ ] Show concise success/error feedback without customer PII.

### 8. Notes

- [ ] Implement bounded `Observações do atendimento`.
- [ ] Use an explicit React Hook Form/Zod schema if the notes interaction is a
      form.
- [ ] Add explicit pt-BR messages for every minimum/maximum/required branch.
- [ ] Add `noValidate`, linked errors, `aria-invalid`, and first-invalid focus.
- [ ] Add guidance against credentials, card data, documents, health data, and
      other sensitive information.
- [ ] Keep notes out of URLs, toasts, logs, and telemetry.
- [ ] Preserve previous notes on failed updates.

### 9. Finish And Handoff

- [ ] Derive completion readiness from pure rules.
- [ ] Disable/explain finish when any item lacks an eligible professional.
- [ ] Use an accessible confirmation with:
  - [ ] clear title;
  - [ ] consequence: the session becomes `Pronto para pagamento`;
  - [ ] `Continuar atendimento` secondary action;
  - [ ] `Finalizar atendimento` primary action.
- [ ] Keep focus trapped/restored correctly.
- [ ] Transition the session atomically to `ready-for-payment`.
- [ ] Show the ready state and return path.
- [ ] Expose `Pronto para pagamento` truthfully on the service-desk surface.
- [ ] Do not render price, total, discount, payment, commission, cash, or
      completion/revenue claims.
- [ ] Verify linked scheduled appointments remain `in-progress`.
- [ ] Do not add reopen behavior.

### 10. Scenarios And Reset

- [ ] Add deterministic scenarios for:
  - [ ] typical single service;
  - [ ] multiple services with one professional;
  - [ ] multiple professionals;
  - [ ] long-running service;
  - [ ] long labels and bounded notes;
  - [ ] no eligible professional;
  - [ ] ready for payment;
  - [ ] slow load/mutation;
  - [ ] next mutation failure;
  - [ ] persistent load failure.
- [ ] Keep scenarios synthetic and clearly non-production.
- [ ] Verify reset/reload repeatability and generation safety.
- [ ] Keep the technical scenario contract out of product copy.

### 11. Component And Design-System Gate

- [ ] Reuse existing Studio components before adding code.
- [ ] Use Bun-driven shadcn CLI docs/view/dry-run/diff for any candidate.
- [ ] Use Base UI `render`, not Radix `asChild`.
- [ ] Use full Card anatomy, Avatar fallback, Badge, Alert, Empty, Skeleton,
      Separator, Sonner, and existing confirmation/form primitives.
- [ ] Use semantic tokens and existing variants.
- [ ] Use `gap-*`, `size-*`, `truncate`, `cn()`, and direct owner imports.
- [ ] Use `Icon`-suffixed icon imports and supported `data-icon` anatomy.
- [ ] Do not add raw feature colors, manual dark overrides, manual overlay
      z-index, custom badges/skeletons, `space-*`, or mega-barrels.
- [ ] Prefer explicit variants/children/provider interfaces over boolean-prop
      proliferation.
- [ ] Update `docs/studio/component-system.md` for every changed or new shared
      component contract.

### 12. Accessibility And Responsive Verification

- [ ] Verify semantic headings and named regions.
- [ ] Verify keyboard operation and logical focus order.
- [ ] Verify visible and unobscured focus in every scroll state.
- [ ] Verify dialog focus trap and trigger restoration.
- [ ] Verify accessible names for icon-only item actions.
- [ ] Verify 24 by 24 CSS pixel minimum targets.
- [ ] Verify labels, descriptions, linked errors, and live feedback.
- [ ] Verify status does not depend on color.
- [ ] Measure computed contrast in light and dark.
- [ ] Verify system theme and forced colors.
- [ ] Verify reduced motion.
- [ ] Verify 320-CSS-pixel reflow and no document overflow.
- [ ] Verify browser behavior at 200% zoom.
- [ ] Run focused axe WCAG 2.2 A/AA checks.
- [ ] Record VoiceOver/NVDA and physical coarse-pointer checks honestly as
      manual evidence or explicit residuals.

### 13. Tests And Regression Coverage

- [ ] Add unit tests for all pure rules and boundary timestamps.
- [ ] Add repository tests for atomicity, rollback, idempotency, and generation.
- [ ] Add component tests for forms, feedback, focus, and ready state.
- [ ] Add Playwright journeys from ENG-46 queue to service completion.
- [ ] Verify scheduled and walk-in sessions.
- [ ] Verify Agenda and Dashboard do not show premature completion/revenue.
- [ ] Verify the service-desk board shows exact state/count subsets.
- [ ] Verify production disablement and artifact exclusion.
- [ ] Verify no PII/free text enters URL state or diagnostic output.
- [ ] Update textual component inventory tests when required.

### 14. Documentation And Handoff

- [ ] Update `docs/studio/service-desk.md` with the merged fulfillment contract.
- [ ] Update `apps/studio/README.md` when route/runtime scope changes.
- [ ] Update `docs/studio/testing.md` for new scenarios/evidence.
- [ ] Update initiative checkboxes only after evidence exists.
- [ ] Update `triad-studio-acompanhament` only after merge evidence.
- [ ] Run `triad-preflight-review`.
- [ ] Open a PR against `staging`.
- [ ] Link the PR in Linear and use evidence-based status transitions.
- [ ] Record final SHA, exact test counts, browser evidence, skipped manual
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
- Final SHA: `ea9de1f` (implementation commit before evidence-only amend)
- Studio format: passed; 253 files formatted, 10 changed by the formatter.
- Studio lint: passed; 258 files checked.
- Studio typecheck: passed.
- Studio unit/component tests: 37 files, 253 tests passed.
- Focused service-session tests: 3 files, 20 tests passed.
- Service-desk/Agenda/Dashboard regressions: focused Service Desk 5/5 passed; root checks passed.
- Production-boundary scan: passed across 52 files and 1,157,593 bytes.
- Build/check: build passed with 3,697 modules; Studio check and root check passed.
- Playwright: focused Service Desk 5/5 passed. Full 63-test parallel run exposed the pre-existing
  shared scheduling-scenario race (45 passed, 18 failed); schedule-only parallel reproduction
  produced the same unrelated 30-vs-42 appointment contamination.
- 1600x900 and 1440x900 visual review:
- 320 CSS-pixel and 200% zoom:
- Keyboard/focus:
- VoiceOver/NVDA:
- Forced colors/reduced motion/coarse pointer:
- Security/privacy review:
- Documentation review:
- Notes: Automated evidence covers 1600x900, 1440x900, 320 CSS pixels, keyboard/focus,
  dark/system, forced colors, reduced motion, target size, and axe. Physical VoiceOver/NVDA,
  real 200% browser zoom, and a physical coarse-pointer device were not available.

## Risks And Follow-Ups

- [ ] ENG-46/PR #27 must merge before implementation begins.
- [ ] The next finance initiative must own command-tab values, discounts,
      payment methods, payment registration, and the exact appointment
      completion boundary.
- [ ] A later initiative must own commissions.
- [ ] Production work must define canonical visit/client identity,
      tenant/unit authorization, roles, concurrency, idempotency, audit,
      persistence, retention, clock/timezone, bounded APIs, realtime, and
      observability.
- [ ] The prototype's immutable initial item is an evaluation decision, not a
      final production policy.
- [ ] Real-device and assistive-technology evidence remains manual and must be
      reported honestly.
