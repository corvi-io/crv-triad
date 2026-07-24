# 14 TRIAD Studio Revenue Operations Visual Prototype

## Summary

Complete the next two frontend-first MLP slices after service fulfillment:

1. command tab, payment registration, and item-level commissions;
2. cash operations and daily closing.

The initiative validates the complete visual journey from
`Pronto para pagamento` to a closed operational day. It uses deterministic,
resettable in-memory data and exact financial projections, without processing
real money, integrating a payment gateway, persisting backend data, or claiming
production-grade authorization.

## Context

- Current state:
  - ENG-47 and PR #28 deliver the service-session lifecycle from
    `Em atendimento` to `Pronto para pagamento`.
  - The accepted scheduling, service-desk, Dashboard, service, professional,
    unit, and client prototypes already provide the visual foundations for this
    initiative.
  - The official UX note defines command-tab payment, item-level commission,
    and daily closing as consecutive MLP capabilities.
- Problem:
  - The visual journey stops before payment.
  - The team cannot validate totals, adjustments, mixed tenders, commissions,
    operational cash reconciliation, or closing history.
  - Dashboard financial figures cannot yet be derived from paid sales.
- Why now:
  - These two slices close the operational loop without prematurely building a
    production finance backend.
  - They maximize completion of the first MLP while preserving one coherent
    source of frontend financial truth.
- Related sources:
  - Official Maestri UX note: `triad-studio-o-triad-stud`, sections 10, 11,
    and 12.
  - Visual MLP tracker: `triad-studio-acompanhament`.
  - ENG-47:
    `Build the TRIAD Studio service fulfillment visual prototype`.
  - PR #28: `feat(studio): add service fulfillment prototype`.
  - `docs/initiatives/prds/13-triad-studio-service-fulfillment-visual-prototype.md`.
- Linear initiative:
  [TRIAD Studio Revenue Operations Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-revenue-operations-visual-prototype-deb787984cb3).
- Delivery tasks:
  - [ENG-48: Build the TRIAD Studio checkout, payment, and commissions visual prototype](https://linear.app/corvi-io/issue/ENG-48/build-the-triad-studio-checkout-payment-and-commissions-visual).
  - [ENG-49: Build the TRIAD Studio cash operations and daily closing visual prototype](https://linear.app/corvi-io/issue/ENG-49/build-the-triad-studio-cash-operations-and-daily-closing-visual).

## Delivery Units

### Delivery 1: Checkout, Payment, And Commissions

Continue an existing `ready-for-payment` service session into a command-tab
checkout. Let the operator review service items and professionals, apply
bounded adjustments, register one or more payment methods, and complete the
sale. Calculate and snapshot one commission per paid service item.

### Delivery 2: Cash Operations And Daily Closing

Introduce the `Caixa` module. Derive an exact operational summary from paid
sales and scheduling facts, let the responsible person count cash, explain a
difference, confirm closing, and review immutable historical closing
snapshots.

Delivery 2 depends on Delivery 1 because a daily closing must aggregate
accepted paid-sale and commission records rather than invent a second financial
dataset.

## Goals

- Validate an end-to-end frontend journey from `Pronto para pagamento` to
  `Pago`.
- Register Pix, cash, debit, credit, and mixed payment methods without
  processing real money.
- Keep monetary arithmetic exact through integer cents and commission rates
  exact through basis points.
- Calculate item-level commissions with deterministic, explicit precedence.
- Keep scheduled and walk-in journeys truthful after payment.
- Feed supported Dashboard revenue facts from the same paid-sale source.
- Validate an accessible `Caixa` route, open-day summary, cash count, difference
  review, close confirmation, and immutable history.
- Provide deterministic normal, edge, loading, failure, reset, and reload
  scenarios for both deliveries.
- Preserve future API and gateway seams without implementing them.

## Non-Goals

- Payment gateway, acquirer, terminal, QR Code, bank, or provider integration.
- Real charges, transfers, settlement, receivables, anticipation, chargebacks,
  refunds, or reconciliation.
- Card PAN, CVV, magnetic-stripe data, credentials, access tokens, webhook
  secrets, or provider keys, including synthetic examples of those values.
- Fiscal documents, invoices, tax calculation, accounting, or a complete
  finance module.
- Actual professional commission payout.
- Production persistence, concurrency control, tenancy, role enforcement,
  audit trail, API routes, database tables, migrations, polling, or realtime.
- Product inventory, packages, subscriptions, tips, or product sales.
- Cross-module Client-history mutation without a canonical shared client
  identity contract.
- Reopening a paid sale or closed day.
- General reports and notifications from sections 13 and 14 of the UX source.
- A new component library, palette, or visual language.

## Brainstorm

### Intended Journey

1. A scheduled or walk-in service reaches `Pronto para pagamento`.
2. The operator opens its checkout under `Atendimentos`.
3. The operator reviews performed services, professionals, and price snapshots.
4. The operator optionally applies a bounded discount, surcharge, or authorized
   item-price override with a reason.
5. The system projects net service lines and item-level commissions.
6. The operator registers one payment method or a mixed set of tenders.
7. Applied tender amounts exactly cover the sale total.
8. The operator confirms payment.
9. The system atomically snapshots the paid sale and commissions.
10. A scheduled appointment becomes operationally completed and financially
    paid; a walk-in completes without a fabricated appointment.
11. Dashboard revenue facts become derivable from paid sales.
12. The responsible person opens `Caixa`, reviews the day's exact summary,
    enters counted cash, explains any difference, and closes the day.
13. The immutable closing snapshot becomes available in history.

### Gaps And Decisions

#### Product Gaps

- Final production authorization for price overrides, discounts, and closing
  is not defined. The prototype exposes deterministic authorized and
  unauthorized scenarios but does not claim real permission enforcement.
- The commission base is not fully specified. The prototype calculates on each
  service line after its item-price override and after a deterministic
  proportional allocation of command-level discount or surcharge.
- Reopening and correcting a paid sale or closed day are not specified. They
  remain outside this initiative.
- Client history cannot be updated truthfully until scheduling, service desk,
  and Clients share a canonical client identifier. The prototype retains a
  sale-local customer snapshot and does not fabricate cross-module mutation.
- Cash drawer opening balances, withdrawals, deposits, and shift handoffs are
  not defined. Delivery 2 validates received cash and daily reconciliation
  only.

#### Technical Gaps

- The service-desk source owns the visit lifecycle while this initiative needs
  durable financial concepts. Growing presentation-specific service-desk state
  indefinitely would blur ownership.
- A new `revenue-operations` domain module should own checkout, paid-sale,
  commission, and closing contracts.
- The module must consume the accepted service-session snapshot through a
  public port or coordinator seam. It must not import service-desk
  presentation or another module's `src/dev` fixtures.
- The browser prototype needs one coherent in-memory coordinator so payment,
  Agenda, Dashboard, and Caixa do not drift.
- The production API will later require transactional persistence,
  idempotency, authorization, audit, pagination, indexed unit/date queries,
  and provider reconciliation.

#### Security And Privacy Gaps

- No sensitive payment credential is required to validate this UI.
- Free-text reasons and closing notes can contain personal or financial
  information. They must be bounded and excluded from URLs, logs, toasts, and
  telemetry.
- Payment completion and day closing must be atomic and idempotent at the
  memory repository boundary.
- A delayed mutation from an earlier scenario/reset generation must never
  write into the active scenario.
- A future provider integration must verify signed webhooks and fetch provider
  state server-to-server before mutating the ledger; this is a future backend
  requirement, not frontend behavior.

### Counterpoints

- Combining both deliveries creates a larger initiative, but they share the
  same exact-money model and the closing flow cannot be truthful without paid
  sales. Separate implementation tasks keep review and dependency boundaries
  clear.
- Putting checkout inside a new top-level `Comandas` module would expose a new
  navigation concept before the MLP requires it. A child route under
  `Atendimentos` preserves the current operational journey.
- Putting daily closing under `Atendimentos` would hide a primary MLP module.
  `Caixa` deserves the top-level route already defined by UX.
- Simulating a gateway would create fake assurance around provider behavior.
  The prototype should register payment intent and result locally, clearly
  labeled as demonstration data.
- Updating Client history would make the demo feel complete, but it would be
  false without canonical identity. The gap remains explicit.
- Floating-point arithmetic is simpler to write, but unacceptable even in a
  finance prototype because rounding behavior is part of the interaction being
  validated.

### Options

| Option | Description | Pros | Cons | Decision |
| --- | --- | --- | --- | --- |
| A | Extend service-desk with every finance object | Fewer initial files | Blurs visit and revenue ownership | Reject |
| B | Add `revenue-operations` with a public coordinator seam | Clear future API boundary and shared truth | Requires explicit integration contracts | Accept |
| C | Simulate a gateway client in the browser | Looks closer to production | Creates unsafe and misleading behavior | Reject |
| D | Build the production API and gateway now | Durable transactional model | Premature before visual validation | Future |

## Recommended Architecture

### Ownership

- `apps/studio/src/modules/service-desk/**` continues to own the operational
  visit and performed-service handoff.
- `apps/studio/src/modules/revenue-operations/**` owns:
  - checkout projections and mutation contracts;
  - paid-sale snapshots;
  - payment-tender records;
  - commission rules and item commission snapshots;
  - open-day projections and immutable closing snapshots.
- `apps/studio/src/dev/revenue-operations/**` owns deterministic memory
  scenarios and controls.
- Presentation consumes repository ports only and never imports `src/dev`.
- No business-domain rule is added to `apps/idp`.
- No API, site, or unrelated app change is part of this initiative.

### Composition And Environment Boundary

- Compose the repository through a virtual module equivalent to
  `virtual:studio-revenue-operations-source`.
- Prefer deriving local/configured-`dev` enablement from the accepted
  scheduling/service-desk memory source instead of adding another public env
  variable.
- Fail closed in `hml` and `prd`.
- Do not add gateway/provider env vars, secrets, or frontend credentials.
- Keep scenario, latency, reset, and failure controls outside normal product
  chrome.

### Shared Source Of Truth

- The revenue repository reads a stable service-session handoff:
  - session and optional appointment IDs;
  - scheduled/walk-in source;
  - unit and customer snapshot;
  - performed service items;
  - service and professional snapshots;
  - catalog price snapshots;
  - service finish time.
- A successful payment writes one paid-sale snapshot and item commissions.
- It then coordinates the public service-desk/scheduling transition:
  - scheduled: appointment `completed`, payment status `paid`;
  - walk-in: no appointment is created.
- Dashboard revenue reads paid-sale projections from the revenue source.
- Daily closing reads paid sales and accepted scheduling facts from public
  repository contracts, not duplicated fixtures.

## Exact Financial Contract

### Money And Rates

- Store and calculate BRL amounts as integer cents.
- Store commission percentage rates as integer basis points.
- Never use binary floating-point values for totals, allocations, or
  commissions.
- Format amounts with Brazilian Portuguese locale at the presentation edge.
- All totals must be non-negative and internally reconcilable.

### Service Lines And Adjustments

- Each checkout line starts from the service catalog price snapshot accepted by
  the completed service session.
- An item-price override:
  - uses integer cents;
  - requires a bounded reason;
  - is available only in deterministic authorized scenarios;
  - never claims production permission enforcement.
- The command tab supports one bounded fixed-cent discount and one bounded
  fixed-cent surcharge, each with a reason when non-zero.
- Percentage command adjustments remain outside this prototype.
- A discount cannot make the total negative.
- Discount and surcharge allocation across service lines is proportional to
  each adjusted line value.
- Cent remainders are allocated by stable service-item order so reload and
  retry produce the same result.

### Commission Rules

- Supported rule types:
  - professional default percentage;
  - service/professional percentage override;
  - service/professional fixed-cent override;
  - explicit no-commission rule.
- Precedence:
  1. service/professional-specific override;
  2. professional default;
  3. no commission.
- Every paid service item snapshots:
  - matched rule and source;
  - commission base cents;
  - rate or fixed amount;
  - calculated commission cents;
  - professional ID and label snapshot.
- The commission base is the item's net allocated value after accepted
  adjustments.
- A fixed commission is capped at the item's non-negative commission base.
- The actual transfer or payout remains outside TRIAD Studio's first MLP.

### Payment Registration

- Supported methods:
  - `Pix`;
  - `Dinheiro`;
  - `Débito`;
  - `Crédito`;
  - `Misto`.
- `Misto` means two or more internal tender lines for one sale. It does not
  mean provider split payment.
- Tender applied amounts must sum exactly to the checkout total.
- Cash can record received cents greater than or equal to its applied amount
  and derive non-negative change.
- No raw card fields, QR Code, tokenization, installments, terminal connection,
  or provider request is rendered.
- A clearly synthetic internal reference may identify the demonstration
  payment, but it must not resemble a real credential.
- Payment completion is atomic, idempotent, pending-safe, and generation-safe.
- A failure leaves the checkout, service session, appointment, Dashboard, and
  daily cash state unchanged.

## Delivery 1 Product Contract

### Route And Navigation

- Add `/service-desk/$sessionId/checkout`.
- Keep `Atendimentos` active in expanded, collapsed, and mobile navigation.
- Use breadcrumb semantics equivalent to
  `Atendimentos / Atendimento / Pagamento`.
- Never place customer data, values, notes, or payment details in the URL.
- Invalid or unavailable sessions show a bounded recovery state.

### Checkout Hierarchy

- Header:
  - customer snapshot;
  - scheduled/walk-in source;
  - `Pronto para pagamento` or `Pago`;
  - service timing and return action.
- Command summary:
  - performed service items;
  - attributed professionals;
  - base and adjusted values;
  - discount, surcharge, and total.
- Commission preview:
  - item-level professional;
  - applied rule;
  - commission amount;
  - barbershop amount.
- Payment:
  - method selection;
  - single or mixed tender lines;
  - exact remaining amount;
  - cash received/change when applicable.
- Completion:
  - concise review;
  - confirmation;
  - paid receipt-like summary with no fiscal-document claim.

### Lifecycle

- Only a `ready-for-payment` session can create or mutate an open checkout.
- An open checkout can be retried after a failed mutation.
- Successful payment transitions the checkout and sale to `paid`.
- The source service session becomes completed/paid according to its public
  contract.
- A linked appointment becomes `completed` and `paid`.
- The operation cannot create a fake appointment for a walk-in.
- A paid sale is read-only in this prototype.
- Duplicate completion returns the accepted paid result without a second sale.

### Dashboard Truth

- Paid sales may update:
  - received revenue;
  - completed visits;
  - average ticket;
  - payment-method composition;
  - professional and service revenue when supported.
- Operational appointment counts continue to come from scheduling.
- Dashboard must not use pre-adjustment catalog price when a paid-sale snapshot
  exists.
- Unsupported metrics remain unchanged or explicitly unavailable rather than
  fabricated.

## Delivery 2 Product Contract

### Route And Navigation

- Add the authenticated top-level `/cash` route labeled `Caixa`.
- Support expanded, collapsed, and mobile navigation.
- Use `Caixa` as the active module.
- Keep scenario/reset controls out of primary navigation and ordinary product
  chrome.

### Open-Day Summary

- Scope all values by selected unit and operational date.
- Present:
  - paid-sale count and received total;
  - values by payment method;
  - discounts and surcharges;
  - cancellations and no-shows from accepted scheduling facts;
  - commission total and barbershop amount;
  - values by professional;
  - expected cash;
  - counted cash after input;
  - calculated cash difference.
- Empty days use a purposeful zero/empty state and can still be closed when the
  product scenario permits it.
- Aggregations use the same paid-sale snapshots as checkout and Dashboard.

### Close Day

- Let the responsible person enter counted cash in integer cents.
- Require a bounded reason when the absolute cash difference is non-zero.
- Show a final accessible confirmation with the exact totals and consequence.
- Allow only one closing per unit and operational date.
- Closing is atomic, idempotent, pending-safe, and generation-safe.
- A successful close stores an immutable snapshot of the displayed aggregates,
  counted cash, difference, bounded note, responsible-person display snapshot,
  and closing time.
- A failed close leaves the day open and the previous inputs recoverable.
- No reopen or edit-after-close action is provided.

### Closing History

- Show a bounded list of historical closing snapshots.
- Allow opening a read-only detail.
- Keep filters and fixture size bounded in the prototype.
- Document that production history requires pagination and indexed unit/date
  queries.

## Deterministic Scenario Matrix

### Checkout Scenarios

- typical single-service Pix payment;
- cash payment with change;
- debit or credit registration;
- exact mixed payment;
- discount with reason;
- surcharge with reason;
- authorized item-price override;
- unauthorized adjustment state;
- percentage commission;
- fixed commission;
- no commission;
- multiple services and professionals;
- long but bounded labels/reasons;
- zero or invalid remainder prevented;
- synthetic payment decline;
- slow load and slow payment;
- fail-next mutation;
- persistent error;
- already-paid/idempotent retry;
- scheduled and walk-in completion.

### Cash And Closing Scenarios

- typical open day;
- empty day;
- multiple payment methods;
- cash difference requiring a reason;
- exact counted cash;
- discounts, cancellations, and commissions;
- multiple professionals;
- slow load and slow close;
- fail-next close;
- persistent error;
- already-closed day;
- bounded dense history.

### Reset Contract

- Scenario and reset reconstruct deterministic state.
- Reload restores the selected scenario.
- Reset invalidates the previous generation.
- Delayed reads or mutations from a stale generation are discarded.
- Reset cannot partially preserve paid sales or a closing snapshot.
- Product UI does not expose fixture implementation vocabulary.

## Accessibility

- Meet WCAG 2.2 AA expectations for the implemented journey.
- Support keyboard-only operation, visible and unobscured focus, correct dialog
  focus trap/restore, and programmatic error association.
- Provide at least 24 by 24 CSS pixel pointer targets.
- Never communicate payment, commission, or closing status by color alone.
- Announce mutation results concisely without customer or payment data.
- Keep stable button labels and express pending state through the shared
  loading contract.
- Support light, dark, system theme, forced colors, reduced motion,
  320-CSS-pixel width, 200% zoom, and coarse pointer input.
- Keep tables understandable at narrow widths through semantic responsive
  alternatives rather than document-level horizontal overflow.
- Validate automated axe checks and manual VoiceOver or NVDA journeys.

## Component And Frontend Standards

- Reuse accepted Studio layouts and shared primitives first.
- Inspect the installed shadcn registry through Bun before adding a primitive.
- Use Base UI-compatible composition and `render` behavior.
- Use React Hook Form and Zod for non-trivial forms, with explicit Brazilian
  Portuguese messages for every constraint.
- Apply `noValidate`, error summaries where useful, `aria-invalid`, linked
  descriptions, and first-invalid focus.
- Use semantic Tailwind tokens only; do not add raw colors or redundant manual
  dark overrides.
- Use complete shared `Card`, `Badge`, `Alert`, `Empty`, `Skeleton`,
  `Separator`, and `Sonner` anatomy where applicable.
- Derive totals, remaining amounts, commissions, and summaries through pure
  projections. Do not synchronize derived values through `useEffect` chains.
- Keep stable exact query keys and narrow invalidation.
- Avoid boolean-prop proliferation; compose checkout, tender, commission, and
  closing sections through explicit variants or compound structure.
- Keep UI and validation text Brazilian Portuguese; keep contracts, routes,
  filenames, docs, tests, and code in English.

## Performance And Scalability

- Use bounded fixture collections and maps for service, professional, sale, and
  rule lookup.
- Memoize only demonstrably expensive projections with stable inputs.
- Avoid polling, simulated realtime, sequential independent reads, and broad
  query invalidation.
- Keep payment and close mutations atomic at the repository boundary.
- Define future API list contracts as paginated and unit/date scoped.
- Future persistence should index paid sales and closings by tenant, unit,
  operational date, status, and stable ID.
- Future provider webhooks require idempotent event storage and asynchronous
  reconciliation, outside this frontend initiative.

## Logging And Observability

- Do not log:
  - customer names or contact data;
  - adjustment/closing notes;
  - complete financial payloads;
  - credentials, tokens, headers, or payment-sensitive data.
- Development diagnostics may record safe technical event names, synthetic
  IDs, scenario names, durations, and stable error codes.
- Future production events should cover checkout opened, payment accepted or
  rejected, sale finalized, close attempted, and close finalized with
  privacy-safe dimensions and no raw business payload.
- User-facing error messages remain actionable and do not expose internal
  stack/provider details.

## Future Gateway Contract

The frontend prototype must leave room for a backend adapter that can support:

- Pix and card/terminal payment creation;
- idempotency keys;
- tenant and unit isolation;
- signed webhook verification and server-side fetch-back;
- asynchronous payment states;
- refunds and cancellation;
- settlement and receivable reconciliation;
- provider subaccounts when the commercial model requires them;
- auditable mapping between provider transactions and the internal ledger.

The internal paid-sale ledger remains the source of product truth. A future
gateway is an adapter and must not become the owner of TRIAD domain state.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Prototype appears to process real payments | Explicit demonstration copy; no provider UI, keys, card fields, or QR |
| Rounding creates inconsistent totals | Integer cents, basis points, pure deterministic allocation, invariant tests |
| Commission policy is mistaken for final production policy | Label it as an accepted prototype assumption and snapshot matched rules |
| Checkout, Dashboard, and Caixa drift | One revenue repository and shared paid-sale projections |
| Duplicate click creates duplicate sale/close | Pending guards plus idempotent repository mutations |
| Reset races delayed writes | Generation token checked before every commit |
| Client history is fabricated | Preserve a local snapshot and defer canonical cross-module mutation |
| Closed day can be silently altered | Immutable snapshot and no reopen path |
| Large tables fail on mobile or zoom | Responsive semantic alternatives and explicit 320px/200% testing |
| Future gateway leaks secrets into Studio | Backend-only provider integration and no frontend secrets |

## Acceptance Criteria

### Delivery 1

- [x] A `ready-for-payment` session opens a complete checkout workspace under
      `Atendimentos`.
- [x] Exact service-line, adjustment, total, and remaining values are derived
      in integer cents.
- [x] Pix, cash, debit, credit, and exact mixed payment can be validated.
- [x] Cash received and change are calculated truthfully.
- [x] Invalid or incomplete tender combinations cannot be submitted.
- [x] Item-level commission follows the documented precedence and exact-money
      rules.
- [x] Successful payment atomically creates one paid sale and immutable
      commission snapshots.
- [x] Scheduled payment completes and marks the linked appointment paid;
      walk-in payment creates no appointment.
- [x] Dashboard supported financial facts derive from paid sales.
- [x] Failure and duplicate submission cannot partially mutate state.
- [x] Paid sales are read-only.

### Delivery 2

- [ ] `Caixa` is available as an authenticated top-level module.
- [ ] Open-day totals reconcile with the same paid-sale source used by
      checkout and Dashboard.
- [ ] Payment-method, adjustment, cancellation, commission, professional, and
      cash summaries are exact and scoped by unit/date.
- [ ] Counted cash derives an exact difference.
- [ ] A non-zero difference requires a bounded reason.
- [ ] Closing is atomic, idempotent, and creates one immutable snapshot.
- [ ] A failed closing leaves the day open without partial state.
- [ ] Historical closings are bounded and read-only.
- [ ] No reopen, settlement, refund, provider, or accounting claim is exposed.

### Shared Quality

- [ ] Normal, edge, loading, failure, reload, and reset scenarios are
      deterministic.
- [ ] Stale delayed operations cannot write after scenario/reset changes.
- [ ] No presentation module imports `src/dev`.
- [ ] Memory-only behavior is unavailable in `hml` and `prd`.
- [ ] No secrets or sensitive payment fields are introduced.
- [ ] Keyboard, focus, screen-reader, forced-colors, reduced-motion, 320px,
      200%-zoom, and coarse-pointer requirements pass.
- [ ] Focused unit, component, integration, route, production-boundary, and
      Playwright tests pass.
- [ ] `bun run test`, `bun run check`, and `bun run build` pass from
      `apps/studio`.
- [ ] Durable Studio documentation explains the accepted prototype contracts
      and future API/provider boundary.

## Definition Of Done

- Delivery 1 is merged and evidenced before Delivery 2 begins implementation.
- Both Linear tasks meet their independent acceptance criteria.
- Both visual journeys are manually validated in light and dark themes at
  desktop, 320 CSS pixels, and 200% zoom.
- Deterministic reset/reload and failure recovery are demonstrated.
- The MLP tracker marks command tab/payment, commission, and daily closing
  complete only after implementation evidence exists.
- The initiative remains explicitly frontend-only and contains no real payment
  or backend claim.
- Documentation, screenshots, test evidence, and Linear/GitHub links are
  attached at handoff.
