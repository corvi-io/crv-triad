# 14 TRIAD Studio Revenue Operations Visual Prototype - Execution Plan

## Source

- PRD:
  `docs/initiatives/prds/14-triad-studio-revenue-operations-visual-prototype.md`
- Official UX source: connected Maestri note `triad-studio-o-triad-stud`,
  sections 10, 11, and 12.
- Visual MLP tracker: connected Maestri note
  `triad-studio-acompanhament`.
- Completed dependency:
  [ENG-47: Build the TRIAD Studio service fulfillment visual prototype](https://linear.app/corvi-io/issue/ENG-47/build-the-triad-studio-service-fulfillment-visual-prototype).
- Completed dependency PR:
  [PR #28: feat(studio): add service fulfillment prototype](https://github.com/corvi-io/crv-triad/pull/28).
- Linear initiative:
  [TRIAD Studio Revenue Operations Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-revenue-operations-visual-prototype-deb787984cb3).
- Delivery tasks:
  - [ENG-48: Build the TRIAD Studio checkout, payment, and commissions visual prototype](https://linear.app/corvi-io/issue/ENG-48/build-the-triad-studio-checkout-payment-and-commissions-visual).
  - [ENG-49: Build the TRIAD Studio cash operations and daily closing visual prototype](https://linear.app/corvi-io/issue/ENG-49/build-the-triad-studio-cash-operations-and-daily-closing-visual).

## Delivery Contract

Deliver two ordered frontend-only tasks inside one initiative:

1. checkout, payment registration, and item-level commission;
2. cash operations and daily closing.

Task 2 is blocked by Task 1. Both may be planned in `Ready`; the dependency
relation defines implementation order.

The accepted prototype:

- uses deterministic, resettable in-memory data;
- calculates money as integer cents and rates as basis points;
- registers but does not process payment;
- never handles card credentials, gateway keys, tokens, or real money;
- keeps API/provider integration as an explicit future seam;
- is disabled in `hml` and `prd`.

## Shared Readiness Gate

- [ ] Confirm ENG-47 is `Done`.
- [ ] Confirm PR #28 is merged into `staging`.
- [ ] Fetch the latest `origin/staging`.
- [ ] Create an isolated checkout or Maestri floor from that revision.
- [ ] Record the base SHA.
- [ ] Read root and Studio AGENTS.
- [ ] Read the PRD and this plan completely.
- [ ] Read required skills:
  - [ ] `triad-initiative-workflow`;
  - [ ] `triad-architecture`;
  - [ ] `triad-studio-development`;
  - [ ] `accessibility`;
  - [ ] `shadcn`;
  - [ ] `tailwind-design-system`;
  - [ ] `vercel-composition-patterns`;
  - [ ] `vercel-react-best-practices`;
  - [ ] `react-useeffect`;
  - [ ] `ux-copy`.
- [ ] Inspect the merged ENG-47 contracts, routes, source composition, tests,
      and durable docs.
- [ ] Record any divergence between merged behavior and the planning contract
      before editing.
- [ ] Run focused existing service-desk, scheduling, and Dashboard tests.

## Shared Implementation Principles

- Add a distinct `revenue-operations` domain module; do not grow
  service-desk into an accounting module.
- Consume the service-session handoff through a public repository/coordinator
  contract.
- Never import another module's presentation or `src/dev` fixtures.
- Compose the deterministic source through a virtual module and fail closed
  outside local/configured `dev`.
- Prefer source enablement derived from the accepted service-desk/scheduling
  memory composition; do not add gateway or provider env variables.
- Use integer cents, basis points, pure projections, and invariant tests.
- Keep UI and validation text Brazilian Portuguese.
- Keep code, contracts, routes, filenames, docs, tests, branches, commits, and
  PRs English.
- Reuse current Studio/shadcn components, semantic tokens, and accepted layout
  patterns.
- Keep scenario/reset/latency/failure controls outside normal product chrome.
- Do not log PII, notes, payment details, financial payloads, tokens, or
  private headers.

## Task 1: Checkout, Payment, And Commissions

### Task Metadata

- Title:
  `Build the TRIAD Studio checkout, payment, and commissions visual prototype`
- Suggested branch:
  `feature/eng-48-checkout-payment-commissions`
- State: `Ready`
- Priority: `High`
- Blocked by: none; ENG-47 is completed.
- Related:
  - ENG-47 service fulfillment;
  - ENG-45 operational Dashboard;
  - ENG-41 scheduling visual prototype;
  - ENG-34 service/professional/unit setup.

### Task 1 Scope

- Add `/service-desk/$sessionId/checkout`.
- Review service items, professionals, price snapshots, adjustments, and exact
  total.
- Register Pix, cash, debit, credit, or exact mixed tenders.
- Preview and snapshot item-level commissions.
- Atomically complete payment and update accepted scheduling/service-desk
  projections.
- Feed only supported Dashboard financial facts from paid sales.
- Provide deterministic scenarios and reset/reload controls.

### Task 1 Explicit Exclusions

- Payment processing, gateway, QR, terminal, raw card fields, installments, or
  provider callbacks.
- Refund, chargeback, settlement, receivable, fiscal document, accounting, or
  commission payout.
- Daily cash closing or history.
- Client-history mutation without canonical identity.
- API, persistence, production authorization, polling, or realtime.

### 1.1 Baseline And Design Audit

- [ ] Verify the dependency commit is present in the implementation base.
- [ ] Inspect `service-desk`, scheduling, Dashboard, catalog, and navigation
      public contracts.
- [ ] Inspect current shared components and the installed shadcn registry with
      Bun before adding primitives.
- [ ] Record why any new shared component is necessary.
- [ ] Define the route hierarchy and wide, medium, 320px, and 200%-zoom
      compositions before JSX.
- [ ] Validate final pt-BR vocabulary for command tab, adjustment, commission,
      payment, change, remaining amount, and completion.

### 1.2 Revenue Domain Contracts

- [ ] Add contracts equivalent to:
  - [ ] `Checkout`;
  - [ ] `CheckoutLine`;
  - [ ] `CheckoutAdjustment`;
  - [ ] `PaymentTender`;
  - [ ] `PaidSale`;
  - [ ] `CommissionRule`;
  - [ ] `ItemCommissionSnapshot`;
  - [ ] repository inputs, results, and stable errors.
- [ ] Use opaque stable IDs and integer timestamps.
- [ ] Use integer cents for every monetary field.
- [ ] Use integer basis points for commission percentages.
- [ ] Add pure invariant helpers for non-negative values and exact
      reconciliation.
- [ ] Keep customer data, values, reasons, and payment details out of route
      search state.

### 1.3 Service-Session Handoff

- [ ] Define a narrow public handoff from a `ready-for-payment` service
      session.
- [ ] Include session/optional appointment IDs, source, unit, customer
      snapshot, performed lines, professionals, price snapshots, and time.
- [ ] Reject sessions that are absent, stale, not ready, already superseded, or
      from an unavailable source.
- [ ] Preserve scheduled versus walk-in semantics.
- [ ] Do not import service-desk route components or `src/dev` fixtures.
- [ ] Add boundary tests for allowed module imports.

### 1.4 Exact Totals And Adjustments

- [ ] Derive base subtotal from accepted service price snapshots.
- [ ] Support authorized item-price override with a bounded reason.
- [ ] Support one fixed-cent command discount and one fixed-cent surcharge.
- [ ] Require bounded reasons for non-zero adjustments.
- [ ] Prevent negative line values and totals.
- [ ] Allocate adjustments proportionally by adjusted line value.
- [ ] Allocate cent remainders in stable item order.
- [ ] Add invariants proving line allocations reconcile exactly with the final
      total.
- [ ] Keep unauthorized scenarios visible without claiming production RBAC.

### 1.5 Commission Rules

- [ ] Support:
  - [ ] professional default percentage;
  - [ ] service/professional percentage override;
  - [ ] service/professional fixed-cent override;
  - [ ] explicit no commission.
- [ ] Implement precedence:
  - [ ] service/professional override;
  - [ ] professional default;
  - [ ] no commission.
- [ ] Calculate on each line's net allocated value.
- [ ] Cap fixed commission at the non-negative line base.
- [ ] Snapshot matched rule, source, base, rate/fixed amount, calculated value,
      and professional.
- [ ] Reconcile gross, commission, and barbershop amounts exactly.
- [ ] Make it explicit that payout is outside the prototype.

### 1.6 Payment Tender Rules

- [ ] Support Pix, cash, debit, credit, and mixed registration.
- [ ] Represent mixed payment as two or more tender lines.
- [ ] Require tender applied amounts to equal the final total exactly.
- [ ] Derive exact remaining amount after each tender line.
- [ ] For cash, accept received cents greater than or equal to applied cents
      and derive change.
- [ ] Reject negative, zero where invalid, excessive, incomplete, or duplicate
      tender inputs.
- [ ] Render no card number, CVV, token, QR, gateway, or terminal field.
- [ ] Keep any demonstration reference obviously synthetic and non-sensitive.

### 1.7 Repository And Memory Coordinator

- [ ] Add narrow repository methods equivalent to:
  - [ ] `getCheckout`;
  - [ ] `updateLinePrice`;
  - [ ] `updateAdjustments`;
  - [ ] `previewCommissions`;
  - [ ] `replaceTenders`;
  - [ ] `completePayment`;
  - [ ] `getPaidSale`.
- [ ] Build checkout from the accepted service-session handoff, not a duplicate
      fixture.
- [ ] Make payment completion atomic and idempotent.
- [ ] Fail before writes or restore the complete prior snapshot.
- [ ] On success, create one paid sale and immutable item commission snapshots.
- [ ] Coordinate scheduled appointment transition to `completed`/`paid`.
- [ ] Complete walk-in without creating an appointment.
- [ ] Update supported Dashboard projections from the same paid-sale source.
- [ ] Preserve the checkout unchanged on synthetic decline or repository
      failure.
- [ ] Increment generation on scenario/reset and discard stale delayed work.
- [ ] Reconstruct selected scenario on full reload.

### 1.8 Query Composition

- [ ] Add stable exact checkout, sale, and commission query keys.
- [ ] Add focused queries and mutations over the repository port.
- [ ] Invalidate only affected checkout, service session, queue, appointment,
      Dashboard, and future cash-summary keys.
- [ ] Start independent reads together.
- [ ] Avoid effect chains for totals, commission, remaining amount, and enabled
      actions.
- [ ] Prevent stale route/session mutations from committing results.

### 1.9 Checkout Route And UI

- [ ] Add the authenticated child route
      `/service-desk/$sessionId/checkout`.
- [ ] Keep `Atendimentos` active in all navigation variants.
- [ ] Render breadcrumb semantics equivalent to
      `Atendimentos / Atendimento / Pagamento`.
- [ ] Compose:
  - [ ] customer/source/status header;
  - [ ] command lines;
  - [ ] adjustments;
  - [ ] commission preview;
  - [ ] payment method/tender editor;
  - [ ] exact summary;
  - [ ] completion action.
- [ ] Render loading, missing, persistent-error, open, pending, and paid states
      with accepted shared anatomy.
- [ ] Keep fixture vocabulary out of ordinary product chrome.
- [ ] Keep focus visible and unobscured at all supported sizes.

### 1.10 Forms And Confirmation

- [ ] Use explicit React Hook Form/Zod schemas for non-trivial adjustment and
      tender forms.
- [ ] Provide explicit pt-BR validation messages for every constraint.
- [ ] Use `noValidate`, linked descriptions, `aria-invalid`, error summary
      where useful, and first-invalid focus.
- [ ] Add guidance not to enter personal, card, credential, or sensitive data
      in reason fields.
- [ ] Use stable button labels and shared loading behavior.
- [ ] Add an accessible final confirmation with exact total and consequence.
- [ ] Trap and restore dialog focus correctly.
- [ ] Announce success or failure without PII or payment details.

### 1.11 Paid State And Dashboard

- [ ] Render a read-only paid summary without claiming a fiscal receipt.
- [ ] Prevent price, adjustment, tender, or commission mutation after payment.
- [ ] Return duplicate completion attempts to the existing paid result.
- [ ] Show the service-desk entry as completed/paid.
- [ ] Show a linked scheduled appointment as completed/paid.
- [ ] Keep walk-in truth explicit.
- [ ] Update only Dashboard metrics supported by the paid-sale projection.
- [ ] Prefer unavailable/unchanged states over fabricated financial metrics.

### 1.12 Task 1 Scenarios

- [ ] Add deterministic scenarios for:
  - [ ] typical Pix;
  - [ ] cash with change;
  - [ ] debit;
  - [ ] credit;
  - [ ] exact mixed tenders;
  - [ ] discount;
  - [ ] surcharge;
  - [ ] authorized item-price override;
  - [ ] unauthorized adjustment;
  - [ ] percentage commission;
  - [ ] fixed commission;
  - [ ] no commission;
  - [ ] multiple professionals;
  - [ ] scheduled completion;
  - [ ] walk-in completion;
  - [ ] synthetic decline;
  - [ ] slow load/payment;
  - [ ] fail-next mutation;
  - [ ] persistent error;
  - [ ] already paid;
  - [ ] long bounded content.
- [ ] Verify reset and reload for every stateful scenario.

### 1.13 Task 1 Verification

- [ ] Unit-test money, allocation, commission, tender, transition, and
      idempotency invariants.
- [ ] Component-test forms, keyboard behavior, errors, pending state, and
      confirmation focus.
- [ ] Integration-test atomic cross-surface transitions.
- [ ] Route-test valid, missing, not-ready, paid, and unavailable-source states.
- [ ] Production-boundary-test no `src/dev`, backend, or provider leakage.
- [ ] Playwright-test Pix, cash, mixed, failure recovery, reset, and reload.
- [ ] Run automated axe checks.
- [ ] Manually test keyboard, VoiceOver or NVDA, forced colors, reduced motion,
      coarse pointer, 320px, and 200% zoom.
- [ ] Run from `apps/studio`:
  - [ ] `bun run test`;
  - [ ] `bun run check`;
  - [ ] `bun run build`.
- [ ] Capture light/dark desktop and narrow-screen evidence.
- [ ] Update durable Studio documentation.
- [ ] Move Task 1 through Linear workflow only with evidence.

## Task 2: Cash Operations And Daily Closing

### Task Metadata

- Title:
  `Build the TRIAD Studio cash operations and daily closing visual prototype`
- Suggested branch:
  `feature/eng-49-cash-daily-closing`
- State: `Ready`
- Priority: `High`
- Blocked by: Task 1.
- Related:
  - Task 1 checkout/payment/commissions;
  - ENG-45 operational Dashboard;
  - ENG-41 scheduling visual prototype.

### Task 2 Scope

- Add authenticated top-level `/cash` navigation.
- Derive the open-day summary from accepted paid sales and scheduling facts.
- Show totals by method, professional, commission, adjustment, and operational
  outcome.
- Record counted cash and exact difference.
- Confirm one immutable closing per unit/date.
- Review bounded read-only closing history.
- Provide deterministic scenarios and reset/reload controls.

### Task 2 Explicit Exclusions

- Gateway/provider settlement or reconciliation.
- Refund, chargeback, receivable, transfer, deposit, withdrawal, shift drawer,
  bank balance, fiscal, accounting, or payout workflow.
- Reopening or editing a closed day.
- General reports and notifications.
- API, persistence, production authorization, polling, or realtime.

### 2.1 Dependency And Baseline Audit

- [ ] Confirm Task 1 is `Done` and its PR is merged into `staging`.
- [ ] Start from the merged Task 1 revision and record the base SHA.
- [ ] Inspect paid-sale, commission, scheduling outcome, Dashboard, navigation,
      and source composition contracts.
- [ ] Run focused Task 1 tests before editing.
- [ ] Inspect current shared components and shadcn registry before adding
      primitives.
- [ ] Record divergences before implementation.

### 2.2 Closing Domain Contracts

- [ ] Add contracts equivalent to:
  - [ ] `OperationalDay`;
  - [ ] `OpenDaySummary`;
  - [ ] `PaymentMethodSummary`;
  - [ ] `ProfessionalRevenueSummary`;
  - [ ] `CashCount`;
  - [ ] `DailyClosingSnapshot`;
  - [ ] repository inputs, results, and stable errors.
- [ ] Scope every operation by unit and operational date.
- [ ] Use integer cents for all financial values.
- [ ] Define `open` and `closed` lifecycle states.
- [ ] Allow one closing per unit/date.
- [ ] Keep closed snapshots immutable.

### 2.3 Pure Aggregations

- [ ] Derive from accepted public contracts:
  - [ ] paid-sale count;
  - [ ] received total;
  - [ ] totals by payment method;
  - [ ] discounts and surcharges;
  - [ ] cancellations and no-shows;
  - [ ] commission and barbershop totals;
  - [ ] values by professional;
  - [ ] expected cash.
- [ ] Derive counted-cash difference exactly.
- [ ] Reconcile payment-method totals to received total.
- [ ] Reconcile commission plus barbershop amounts to supported net service
      revenue.
- [ ] Keep deterministic sorting and tie breaking.
- [ ] Handle the zero-sale/empty-day case intentionally.

### 2.4 Repository And Memory Source

- [ ] Add narrow methods equivalent to:
  - [ ] `getOpenDaySummary`;
  - [ ] `closeDay`;
  - [ ] `listDailyClosings`;
  - [ ] `getDailyClosing`.
- [ ] Read paid sales from the Task 1 source of truth.
- [ ] Read cancellation/no-show facts through the scheduling public contract.
- [ ] Do not copy financial fixtures into the cash route.
- [ ] Make close atomic and idempotent.
- [ ] Store the exact accepted projection as an immutable snapshot.
- [ ] Preserve the open day and entered values on failure.
- [ ] Reject stale, already-closed, wrong-unit, wrong-date, and invalid-count
      operations.
- [ ] Increment generation on scenario/reset and discard stale delayed work.
- [ ] Reconstruct the selected scenario on reload.

### 2.5 Query Composition

- [ ] Add stable exact keys for open day, closing history, and closing detail.
- [ ] Add focused queries and close mutation.
- [ ] Invalidate only the affected unit/date summary and closing history.
- [ ] Start independent reads together.
- [ ] Avoid effect chains for aggregates, difference, and validation.
- [ ] Prevent stale unit/date navigation from committing mutation results.

### 2.6 Navigation And Route

- [ ] Add top-level `/cash` labeled `Caixa`.
- [ ] Support expanded, collapsed, and mobile navigation.
- [ ] Use the accepted icon, tooltip, active state, target size, and focus
      treatment.
- [ ] Keep `Caixa` active on summary and history/detail states.
- [ ] Preserve deep links without PII or financial payloads in the URL.
- [ ] Fail closed when the frontend source is unavailable.

### 2.7 Open-Day UI

- [ ] Compose:
  - [ ] unit/date context;
  - [ ] open/closed status;
  - [ ] received total and paid-sale count;
  - [ ] payment-method summary;
  - [ ] discounts/surcharges;
  - [ ] cancellations/no-shows;
  - [ ] commission/barbershop summary;
  - [ ] professional breakdown;
  - [ ] expected/counted/difference cash;
  - [ ] close action.
- [ ] Render exact zero, loading, error, open, pending, and closed states.
- [ ] Use semantic responsive alternatives at narrow widths.
- [ ] Do not expose fixture vocabulary in ordinary product chrome.
- [ ] Keep status understandable without color.

### 2.8 Cash Count And Close Confirmation

- [ ] Implement counted cash as an exact integer-cent form input.
- [ ] Derive the difference without storing redundant React state.
- [ ] Require a bounded reason when the difference is non-zero.
- [ ] Provide explicit pt-BR validation for invalid, missing, or excessive
      values/content.
- [ ] Add `noValidate`, linked descriptions, `aria-invalid`, error summary
      where useful, and first-invalid focus.
- [ ] Warn against entering customer, credential, card, or other sensitive
      information.
- [ ] Show an accessible confirmation with exact values and immutable
      consequence.
- [ ] Use stable loading labels and prevent duplicate close submissions.
- [ ] Restore focus after cancel/error and move focus purposefully after
      success.

### 2.9 Closed State And History

- [ ] Render the closing snapshot read-only.
- [ ] Show closing time and responsible-person display snapshot without
      exposing identity internals.
- [ ] Show counted cash, difference, bounded reason, and all stored aggregates.
- [ ] Provide no reopen or edit control.
- [ ] Add bounded historical closing list and read-only detail.
- [ ] Define empty and dense-history states.
- [ ] Document production pagination and indexed unit/date requirements.

### 2.10 Task 2 Scenarios

- [ ] Add deterministic scenarios for:
  - [ ] typical open day;
  - [ ] exact counted cash;
  - [ ] positive cash difference;
  - [ ] negative cash difference;
  - [ ] empty day;
  - [ ] multiple payment methods;
  - [ ] discounts and surcharges;
  - [ ] cancellations and no-shows;
  - [ ] multiple professionals and commissions;
  - [ ] slow load/close;
  - [ ] fail-next close;
  - [ ] persistent error;
  - [ ] already closed;
  - [ ] dense bounded history;
  - [ ] long bounded reason.
- [ ] Verify reset and reload for every stateful scenario.

### 2.11 Task 2 Verification

- [ ] Unit-test aggregates, cash difference, lifecycle, snapshot immutability,
      and idempotency.
- [ ] Component-test forms, keyboard behavior, errors, pending state, and
      confirmation focus.
- [ ] Integration-test paid-sale and scheduling aggregation.
- [ ] Route-test open, empty, error, closed, history, and unavailable-source
      states.
- [ ] Production-boundary-test no `src/dev`, API, or provider leakage.
- [ ] Playwright-test typical close, difference reason, failure recovery,
      already closed, history, reset, and reload.
- [ ] Run automated axe checks.
- [ ] Manually test keyboard, VoiceOver or NVDA, forced colors, reduced motion,
      coarse pointer, 320px, and 200% zoom.
- [ ] Run from `apps/studio`:
  - [ ] `bun run test`;
  - [ ] `bun run check`;
  - [ ] `bun run build`.
- [ ] Capture light/dark desktop and narrow-screen evidence.
- [ ] Update durable Studio documentation.
- [ ] Move Task 2 through Linear workflow only with evidence.

## Review Gate

- [ ] Confirm task scope did not expand into API, provider, real payment,
      refunds, settlement, accounting, or reporting.
- [ ] Confirm exact-money invariants and cross-surface truth.
- [ ] Confirm no sensitive payment field or secret exists in Studio.
- [ ] Confirm all UI/validation copy is pt-BR and technical artifacts are
      English.
- [ ] Confirm semantic tokens and accepted component anatomy.
- [ ] Confirm no effect chain synchronizes derived financial state.
- [ ] Confirm focused query invalidation and stale-generation protection.
- [ ] Confirm presentation cannot import `src/dev`.
- [ ] Confirm local/configured-`dev` only and fail-closed production boundary.
- [ ] Confirm accessibility evidence.
- [ ] Confirm docs and Linear/GitHub evidence.

## Handoff

### Task 1 Handoff

- [ ] Record implementation SHA and PR.
- [ ] Attach test/check/build output.
- [ ] Attach visual and accessibility evidence.
- [ ] Link durable docs.
- [ ] Mark MLP command tab/payment and commission items complete only after
      evidence.
- [ ] Unblock Task 2 after merge.

### Task 2 Handoff

- [ ] Record implementation SHA and PR.
- [ ] Attach test/check/build output.
- [ ] Attach visual and accessibility evidence.
- [ ] Link durable docs.
- [ ] Mark MLP daily closing complete only after evidence.
- [ ] Record remaining MLP follow-ups: reports, notifications, and any still
      partial cross-module items.

## Suggested Commit Sequence

### Task 1

1. `feat(studio): add revenue checkout contracts`
2. `feat(studio): add deterministic payment source`
3. `feat(studio): add checkout and commission experience`
4. `test(studio): cover payment and commission journeys`
5. `docs(studio): document revenue checkout prototype`

### Task 2

1. `feat(studio): add daily closing contracts`
2. `feat(studio): add deterministic cash source`
3. `feat(studio): add cash and closing experience`
4. `test(studio): cover daily closing journeys`
5. `docs(studio): document cash operations prototype`
