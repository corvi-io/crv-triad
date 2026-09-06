# 24 Production Checkout And Cash Operations

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: Not started
- Owner: CRV Triad
- Last updated: 2026-09-05
- Approved by/date: User / 2026-09-05

## Summary

Turn Initiative 23's completed services into persistent command tabs, manually registered receipts
and a bounded unit cash-day workflow. Staff review performed services, record how payment was
received outside TRIAD, and see a stable registration result. Owners/admins open a cash day, register
cash supply/withdrawal, correct mistaken registrations and reconcile counted cash with an immutable
closing snapshot. TRIAD does not collect money or confirm a bank transaction.

Execution plan: [24-production-checkout-and-cash-operations.md](../tasks/24-production-checkout-and-cash-operations.md).
Predecessor and shared consistency authority:
[23 Production Reception And Service Fulfillment](23-production-reception-and-service-fulfillment.md).

## Context

- Initiative 23 is planned, not implemented by this planning task. Its sealed handoff is the required
  source of completed items, labels, professionals, prices and finish timestamps.
- `docs/studio/revenue-operations.md` and `apps/studio/src/modules/revenue-operations/{contracts,
  money,cash,checkout-page,cash-page}.ts[x]` describe a sophisticated memory prototype, including
  mixed payment, immutable sale snapshots and daily closing. It is not a production ledger.
- `money.ts` already uses integer cents and deterministic net allocation, including a zero-subtotal
  case. Those are behavioral references to preserve at the server boundary, not permission to trust
  browser totals. Production needs exact arithmetic and overflow checks at every intermediate step.
- The prototype's `completePayment` transitions appointments and services. The approved target of
  23 completes operational work earlier: 24 must not revive the old financial/lifecycle coupling.
- Prototype payment settings and commissions are not persistent production policies from 21.
  This initiative persists only accepted tender enablement, not compensation rules.
- Prototype closing accepts responsible-person display data from the caller and bounds history in
  memory. Production attribution must come from the session and history must be server-paginated.
- Client forms, shared `MaskedInput`, `ActionDrawer`, error envelope and 23's Consistency Contract
  are the interaction baseline. Reuse requirements apply equally to monetary forms and service forms.
- No bank/gateway, fiscal requirement, production pilot or measured revenue baseline was provided.
  This proposal covers operational record keeping; no tax or accounting behavior is specified.

## Actors And Workflows

- Member/receptionist: opens an authorized completed visit's checkout, reviews its lines and
  registers receipts at unchanged prices using enabled methods. Can read that checkout's result,
  but not the unit's financial aggregates or other users' administrative cash operations.
- Owner/admin: also configures methods, adjusts open command tabs, opens/closes cash days, records
  cash movements, corrects mistaken registrations and reviews bounded financial history.
- Client: payer outside TRIAD; neither an authenticated financial actor nor a stored payment credential.

### Target Checkout Journey

1. `Registrar pagamento` on a completed visit opens `/service-desk/$sessionId/checkout`.
   Read the sealed handoff; an explicit idempotent open command creates one checkout snapshot.
   GET remains side-effect free. Earlier completed visits from 23 remain eligible.
2. Show `Comanda`, completed service/professional lines, values and total. Catalog rename/price
   changes do not change the handoff. Optional authorized price changes/discount/accrual require
   reasons and are saved as versioned commands before registering a receipt.
3. Staff chooses enabled Pix, cash, debit and/or credit and enters amounts. Cash shows amount
   applied, cash handed over and change. The interface says `Registre os valores já recebidos fora
   do TRIAD.` It does not claim to verify Pix, charge a card or initiate a transfer.
4. After explicit confirmation, the server recomputes totals, checks the current cash day, access,
   policy and checkout version, then atomically appends one registration and its tender/line facts.
5. The result shows `Pagamento registrado` or `Sem cobrança` for a zero total, a safe internal
   reference and immutable details. Operational visit completion/time remains unchanged.

### Target Cash Journey

1. Owner/admin opens `Caixa`, selects a real unit and reviews its local date. `Abrir caixa` records
   the physically counted opening cash, including explicit zero. No previous balance is guessed.
2. Receipts append to the open current unit/day. `Registrar suprimento` and `Registrar sangria`
   require a positive amount and reason; these are cash movements, not service revenue.
3. Summary separates registered gross receipts, registration reversals, net registered receipts,
   tender methods, opening cash, supply, withdrawal and expected physical cash.
4. `Fechar caixa` asks for counted cash and a reason for any difference, previews the current
   ledger version, and creates an immutable closing revision attributed to the authenticated actor.
5. A mistakenly closed current cash day can be reopened by owner/admin with a reason only while
   no later unit cash day has been opened. Prior closing snapshots remain immutable and a later
   close creates another numbered revision. Historical days are never rewritten.

### Correction And Recovery

- Before registration, edit the open command tab. After registration, owner/admin may cancel the
  mistaken registration in full with a reason and create a replacement registration for the same
  unchanged completed-service handoff. The original remains visible and linked to its reversal.
- A reversal corrects TRIAD's record; it does not refund, move or verify money. UI requires explicit
  confirmation that the cancellation reflects the actual receipt record. Customer refunds and
  partial refunds remain out of scope and must not be mislabeled as a registration correction.
- Corrections of an earlier cash day post compensating entries to today's open day, with original
  reference/date preserved. The original closing is unchanged; the current day shows the adjustment.
- If the response is lost, query registration status and retry with the same key; a second cashier
  cannot produce another active receipt for the visit by using a different key.
- If no day is open or it closes during payment entry, retain the draft and explain recovery.
  Members see `Peça a um administrador para abrir o caixa desta unidade.` rather than a dead action.

## Goals

- Close the performed-service-to-receipt loop without relying on fixtures or pretending to process money.
- Prevent duplicated receipts, stale totals, wrong-day posting and mutable financial history.
- Provide useful physical cash reconciliation with explicit opening, movements and corrections.
- Preserve the same form, copy, error and concurrency standards as Clients and Initiative 23.

## Non-Goals

- Gateway/terminal/QR integrations, bank reconciliation, provider webhooks, settlement, receivables,
  installment schedules, outstanding credit, deposits, partial payment across days or card details.
- Fiscal receipts/invoices, accounting books, profit statements, tax handling, exports or accounting integrations.
- Commissions, commission payouts, payroll, tips, products, stock, packages and loyalty.
- Partial or customer refund workflows, editing completed services, reopening service execution,
  or recreating appointments as a financial correction.
- Professional financial self-service, Backstage cross-tenant finance access, dashboards filled
  with estimated/zero commission metrics, or a generalized event-sourcing platform.

## Requirements

### Functional

- REQ-001: Derive tenant/actor from active authenticated context and existing subscription/
  entitlement policy. Add `revenue.read_checkout` and `revenue.register` for owner/admin/member;
  `revenue.adjust`, `revenue.correct`, `revenue.configure`, `cash.read`, `cash.manage` for owner/admin.
  Check access server-side for reads, previews, retries and writes; no client-only privilege flag.
- REQ-002: Create one tenant-owned checkout per sealed completed visit through idempotent POST,
  snapshotting the handoff version/items without mutable catalog repricing. Reads never create
  checkouts. In-progress/canceled/no-performed-item visits are not eligible. One checkout cannot
  combine visits, tenants or units; guests do not require invented client records.
- REQ-003: Persist checkout, adjustment events, receipt registrations, tenders, complete reversals,
  cash days/movements, closing revisions and command receipts with UUIDv7 IDs, tenant foreign keys,
  server times, optimistic versions and immutable posted records. Enforce one checkout per visit,
  one unreversed registration per checkout and one reversal per registration in PostgreSQL.
- REQ-004: All monetary inputs/outputs are non-negative integer BRL cents bounded to safe integers;
  signed compensating ledger entries are internal and explicitly typed. Use integer/BigInt
  intermediate arithmetic, check sums/products/conversion bounds, and reject overflow. Never trust
  browser calculated totals or parse localized money with floating-point multiplication.
- REQ-005: Checkout line values default to the handoff. Owner/admin can change a line price or add
  one fixed discount and one fixed surcharge while open, each non-zero adjustment or price change
  requiring a trimmed 3–160-character reason. Validate total >= 0; members cannot adjust through
  crafted requests. Adjustments increment checkout version and invalidate previous tender drafts.
- REQ-006: Allocate total net line amounts proportionally using exact integer arithmetic and stable
  line order, distributing remaining cents deterministically. Sum of line nets equals checkout
  total. At zero subtotal, any positive total goes to the first line; empty-item checkout is invalid.
  Discounts/surcharges and original values remain inspectable; no commission is calculated.
- REQ-007: Persist tenant-wide accepted methods Pix, Dinheiro, Débito and Crédito as a versioned
  revenue policy. Initial policy enables all four explicitly as product defaults, not copied memory
  settings. Owner/admin may disable methods while preserving at least one. Expose the policy in the
  existing setup payment section without enabling prototype commission controls.
- REQ-008: Persist a versioned draft of at most four tender lines, one per method. Each applied
  amount is positive; multiple methods form `Pagamento combinado`. Cash alone allows received
  amount >= cash applied, deriving change. Sum applied must exactly equal total at registration;
  neither underpayment nor overpayment is accepted. A zero total accepts no tender lines and seals
  `Sem cobrança`, with a receipt reference but no invented cash or tender receipt.
- REQ-009: If total, policy or cash-day revision changes while entering tenders, preserve the local
  draft, show what needs review and require reconfirmation against current versions. Disabling a
  method does not change old receipts; registration rechecks current policy. Do not silently replace
  a method, clamp a value, redistribute a user's entered tenders or reuse an outdated preview.
- REQ-010: Register all tender lines, line snapshots, metadata audit and command receipt in one
  transaction after version/eligibility/policy/day validation. Transactionally enforce one active
  registration per checkout even across different actors/keys. After a lost response, exact-key
  retry returns the accepted registration reference, never a second sale.
- REQ-011: Service completion, item history and lastVisitAt remain owned by 23. Registration or
  reversal does not mutate visit status, performed prices or appointment lifecycle. Read models
  separately show no registration, registered, no-charge or canceled registration, without
  asserting bank settlement, debt delinquency or refund.
- REQ-012: All registration posting dates derive from server registration time in the snapshotted
  unit timezone, independent of service date and browser timezone. No caller-supplied posting date,
  actor name or backdating. A checkout completed yesterday can be registered today; preserve both
  dates. Prevent timezone changes while a cash day is open; future days snapshot a new confirmed
  timezone without rewriting prior ledger dates.
- REQ-013: All receipts, including non-cash and zero-total registrations, require today's open
  unit cash day. Owner/admin opens one unique unit/local-date day with an explicit non-negative
  physically counted opening amount. A previous day may remain unclosed but is flagged; new day
  opening never carries balance automatically. Stale previous-day previews are invalid at midnight.
- REQ-014: Owner/admin may record positive cash supply or withdrawal on today's open day with
  reason and expected day version. These entries are immutable, attributed, and excluded from
  service revenue. A withdrawal cannot make expected cash negative. Mistaken movement correction
  is a linked opposite entry, limited to one reversal, not a destructive edit.
- REQ-015: Expected cash equals opening cash + cash applied from registrations − cash applied from
  registration reversals + supply − withdrawal plus explicit movement reversals. Count cash handed
  over minus change only once; Pix/debit/credit do not increase physical cash. Signed corrective
  effects may produce an anomaly requiring explanation, not silent clamping or hidden exclusion.
- REQ-016: Cash summary separates gross receipt registrations, reversed registrations, net receipts,
  no-charge count, payment-method totals, discounts/surcharges, opening/movements/expected cash and
  active closing state. Paid-service amounts come from receipts, never scheduled catalog values.
  Show no commission, barbershop-profit or professional-take-home totals.
- REQ-017: Close any open current/past unit day using expected day version, counted cash and an
  optional reason required at non-zero difference. Atomically snapshot all aggregates, cutoff/version,
  timezone/date, responsible user ID/display snapshot and server close time. Concurrent registration,
  movement or reversal either commits first and invalidates the preview, or sees a closed day.
  No accepted entry can be omitted from a successful closing snapshot.
- REQ-018: Close confirmation states that pending checkouts are not receipts and can be registered
  on a future open day. Display a bounded count of unregistered completed visits; do not pretend
  they are paid or create debt totals. Same-key close retries return the same closing revision.
- REQ-019: Owner/admin can reopen the current local-date day with a 3–160-character reason only
  when no later day exists for the unit. Preserve earlier immutable closing revisions; increment
  day version, audit reopening, and create a new numbered closing revision on subsequent close.
  Past-day closure corrections use present-day compensating entries, not reopen/backdate.
- REQ-020: Owner/admin can cancel one mistaken registration in full using a reason, expected
  checkout/current-day versions and explicit outside-TRIAD confirmation. Append an exact signed
  reversal of the original line/tender amounts to today's open day, retaining original reference,
  original posting date and immutable receipt. Never re-evaluate old enabled methods or prices to
  reject a legitimate reversal. A second reversal is deduplicated or rejected safely.
- REQ-021: After registration cancellation, the checkout can accept a replacement with new tender
  and adjustment commands under a new version. Link replacements to the preceding canceled
  registration. Refuse partial reversals or mutation of posted rows. Full history remains readable
  if no replacement is made; that state is `Registro cancelado`, not an automatic customer refund.
- REQ-022: Checkout details, pending-registration worklist, receipt history, cash movements and
  closing revisions use bounded server reads with 10/20/50 pages, deterministic sorts, 31-day
  maximum history windows and selected-ID hydration. Apply search/filter to the entire scoped
  dataset. Client search, amounts, reasons and tender drafts never enter URLs.
- REQ-023: Authorized cash/dashboard projections read the same ledger aggregates and invalidate
  after posting/correction/closing. Members may see their permitted checkout result but financial
  unit aggregates are not included in an otherwise permitted Dashboard response. Service pages
  show only a minimal authorized registration-status projection.
- REQ-024: Normal checkout/cash/setup-method routes use HTTP sources with no memory fallback,
  disabled future controls, provider-decline simulation or fake financial counters. Existing
  completed visits from 23 remain discoverable without backfilling receipts. Source disablement
  hides entry actions and leaves service completion usable.

### Consistency, Safety And Delivery

- REQ-025: Every row of 23's Consistency Contract is mandatory here, with the field/copy inventory
  below. Compare checkout/cash drawers and financial forms against Clients, Agenda and the completed
  23 UI. Record deliberate specialization and exact evidence; do not reopen visual identity decisions.
- REQ-026: Shared brMoney mask provides localized display and canonical decimal strings; convert
  those strings to validated cents exactly at the domain adapter. Use existing shared date picker,
  fields, errors and drawer shells. Every field has label, required condition, default, canonical
  shape, mask/placeholder, bounds and server-error mapping; no browser-native money spinner.
- REQ-027: Drafts capture original checkout/day/policy versions; dirty forms survive refocus,
  polling, validation, conflict and transient failure. Expected errors are inline, first-invalid
  focused; form conflicts offer explicit latest-data review and discard confirmation, never forced
  reload or silently updated versions. Posted financial operations use server-confirmed UI states.
- REQ-028: Every mutation uses scoped UUID idempotency and expected versions; replay recognition
  precedes stale checks but follows current authorization. Reusing a key with another payload is a
  conflict; request fingerprints use keyed hashing with no raw payload/PII. Receipts are durable in
  v1. After an unknown outcome keep the key and reconcile status before permitting a new intent.
- REQ-029: Acquire the tenant method-policy lock first (shared for readers/posting, exclusive for
  configuration), then tenant/unit/day locks and checkout/receipt rows in stable ID order. Every
  writer uses this order or its relevant ordered subset. Unit timezone edits and day opening use
  a transaction-aware unit guard so an open day cannot race a timezone change. There is no
  browser-orchestrated multi-write transaction. Day version increments for every posted entry,
  close and reopen.
- REQ-030: Tenant-scoped query keys and late-response discard cover method options, checkout,
  worklist, cash and history. Visible cash summaries refetch no more often than every 15 seconds
  and on focus/reconnect; pause hidden polling. Show stale state with last successful update and
  retry; refreshing never resets dirty inputs. Mutations revalidate financial state atomically.
- REQ-031: URL allowlists contain only technical unit/date/page/sort/record identifiers and intent;
  strip defaults. Dirty dismissal, nested overlays, tenant switch, auth expiry and duplicate submit
  follow 23's contract. Financial drafts are not stored in local/session storage or analytics.
- REQ-032: Checkout, policy and cash forms preserve keyboard operation, focus return, named
  skeletons, required/error associations, light/dark/system, 320 CSS-pixel reflow, actual 200% zoom,
  forced colors, reduced motion and non-color-only balances/statuses. Color alone never signals a
  difference or reversal. Announce recalculated totals without reading all rows or stealing focus.
- REQ-033: Errors expose stable safe codes and allowlisted field paths, not SQL, submitted amounts,
  reason text or provider details. Logs/traces/metrics/audit metadata exclude PII, money values,
  tender payloads, reasons, command keys, private headers and credentials; authorized business
  records retain required financial values separately from telemetry.
- REQ-034: Add tenant-leading indexes, bounded aggregate queries and database constraints. Test
  exact persistence, concurrent register/close/reverse, rollback and query plans on disposable
  PostgreSQL. Do not download all receipts to calculate a day or trigger one query per line/client.
- REQ-035: Generate additive migrations and validated default method-policy initialization. Never
  import memory sales, infer payments from visits or reset previous data. Deploy compatible API
  before enabling HTTP screens; retain posted rows and read-only history during rollback.
- REQ-036: Trace safe operation result, request/tenant/actor/opaque IDs, duration, conflict class,
  replay and transaction outcome. Monitor duplicate-post prevention, invariant failures, lock wait,
  reconciliation errors and sustained request failures. Supply an investigation runbook without
  recommending direct SQL edits of posted financial records.
- REQ-037: Continuations read the approved PRDs/plans and current predecessor diffs, update exact
  task/decisions/migrations/checks/failures/next step, and revise the contract before changing
  permissions, corrections, monetary semantics, UI behavior or financial scope.
- REQ-038: Require app checks, >=80% four-dimensional coverage, real PostgreSQL and live browser
  acceptance evidence, including touched Clients/Agenda/23 regressions. Update durable revenue,
  cash/access/source/deployment/QA docs and existing product/design scope claims where obsolete;
  retain the distinction between manually registered receipts and payment processing.

## Financial State And Invariant Examples

Checkout command state is `open` or `registered`. A zero-total registration is a registered checkout
with result kind `no-charge`, not a fictional paid tender. Full registration cancellation returns
the checkout to `open` under a new version while history/status projection explicitly shows
`Registro cancelado` until replacement. Receipt records retain `registered` or `reversed` identity;
their original posted values are immutable. Cash-day state is `open` or `closed`; reopening mutates
only day state/version and appends an event, never an earlier closing revision.

These are synthetic acceptance fixtures, not pricing promises or customer data.

| Scenario | Expected result |
| --- | --- |
| R$ 50,00 service, R$ 20,00 Pix and R$ 30,00 cash, R$ 50,00 cash handed over | R$ 20,00 change; receipt R$ 50,00; cash increases R$ 30,00. |
| Opening R$ 100,00, cash receipts R$ 30,00, supply R$ 20,00, withdrawal R$ 10,00 | Expected cash R$ 140,00; counting R$ 135,00 gives −R$ 5,00 requiring a reason. |
| R$ 0,00 checkout | No tender line; one `Sem cobrança` reference; no increase in received amount. |
| Receipt registered yesterday, erroneous cash amount reversed today | Yesterday's closing stays unchanged; today's correction references yesterday and subtracts original cash applied. |
| Reversal followed by corrected Pix receipt | One canceled original, one linked reversal and one active replacement; no change to performed visit. |
| Two cashiers register the same checkout with different keys | At most one active registration; loser reviews the accepted receipt. |
| Receipt arrives after close preview but before close commit | Close returns version conflict; refresh preview before reconfirming counted cash. |
| Accidental current-day close followed by reopen and another receipt | First closing stays immutable; next closing has a new revision covering all accepted entries. |

## Checkout And Cash Field/Copy Inventory

All remaining composition rules are incorporated from 23's Consistency Contract. These values are
the domain-specific additions; placeholders are examples, never initial submitted values.

| Field / action | Label / placeholder or copy | Canonical value, default and validation |
| --- | --- | --- |
| read-only handoff | Comanda / Serviços realizados | Server snapshots; no editable client or service selectors. |
| line price | Valor do serviço / R$ 0,00 | Shared brMoney; current snapshot default, safe non-negative cents; owner/admin only. |
| discount | Desconto / R$ 0,00 | Zero default; cents, non-negative total; reason required if non-zero. |
| surcharge | Acréscimo / R$ 0,00 | Zero default; safe cents; reason required if non-zero. |
| adjustment reason | Motivo do ajuste / Ex.: Correção do valor combinado | 3–160 trimmed characters when required; inline error. |
| method | Forma de pagamento / Selecione uma forma de pagamento | Explicit enabled selection; no guessed Pix/cash default. |
| applied amount | Valor aplicado / R$ 0,00 | Empty draft, positive cents; zero-total flow omits field. |
| cash received | Valor recebido em dinheiro / R$ 0,00 | Required for cash, >= applied; helper: `Informe quanto foi entregue em dinheiro.` |
| change | Troco | Read-only difference; distinguish from applied amount and total. |
| amount remaining | Falta registrar | Derived read-only; never a saved debt or editable amount. |
| register action | Registrar pagamento | Confirmation: `Confirme que os valores foram recebidos fora do TRIAD. Este registro não realiza cobranças.` |
| zero-total action | Concluir sem cobrança | Confirmation: `Esta comanda será concluída sem registro de recebimento.` |
| successful receipt | Pagamento registrado. | Read-only result and internal reference; never `Pix confirmado` or `Pagamento aprovado`. |
| cash day | Unidade / Data | Real unit selector and shared DatePicker; historical dates read-only except closing an existing open day. |
| opening amount | Saldo inicial em dinheiro / R$ 0,00 | Empty input; explicit zero permitted; counted physical starting amount. |
| movement amount | Valor / R$ 0,00 | Empty input, positive cents; supply/withdrawal explicit command. |
| movement reason | Motivo / Ex.: Reforço de troco | Required 3–160; private business record, no toast echo. |
| cash counted | Dinheiro contado / R$ 0,00 | Empty input; zero valid; do not prefill expected amount as if counted. |
| closing difference | Diferença | Signed counted − expected; text `A menos`/`A mais` plus value, not just red/green. |
| difference reason | Motivo da diferença / Ex.: Diferença identificada na conferência | Required when non-zero, 3–160 characters. |
| close action | Fechar caixa | Confirmation explains immutability of this revision and pending checkouts. |
| reopen | Reabrir caixa | Required reason; confirmation: `O fechamento anterior será mantido no histórico.` |
| registration cancellation | Cancelar registro de pagamento | Confirmation: `O registro original será mantido. Esta ação não devolve dinheiro ao cliente.` Required reason and outside-TRIAD confirmation. |
| replacement | Registrar pagamento novamente | Only after cancellation; retain linked history, no automated external collection. |
| stale checkout | Esta comanda foi atualizada desde que você abriu esta tela. Revise os dados antes de registrar o pagamento. | Inline review; draft remains, no silent value replacement. |
| stale day | O movimento do caixa mudou. Atualize a conferência antes de fechar. | Refresh preview, retain counted input, require renewed confirmation. |
| closed day | O caixa desta unidade está fechado. | Owner/admin receives allowed recovery; member sees administrator guidance. |
| disabled method | Esta forma de pagamento não está mais disponível. Revise o pagamento. | Linked method error; preserve entered amounts until reviewed. |
| unknown outcome | Não foi possível confirmar o registro. Verifique a comanda antes de tentar novamente. | Reconcile and same-key retry; no fictional provider decline. |
| empty receipt history | Nenhum pagamento registrado neste período. | Truthful empty, distinct from zero-total completed visits and filtered-empty. |

## Brainstorm

### Problem Framing

Reception needs a trustworthy record of receipt after performed service. The owner needs to explain
physical cash at the end of a day. A correct total alone is insufficient if a retry duplicates it,
a stale close misses it, or a mistaken registration cannot be corrected visibly.

### Gaps And Unknowns

- The prototype proves UI vocabulary but not safe finance persistence. Policy ownership, role
  separation, day attribution, zero-value services, corrections and concurrency are now explicit.
- No production commission contract exists. Do not infer compensation from default prototype rates
  or show zero as if commission had been decided.
- Payment settings becoming persistent is a narrow prerequisite within 24. It must not activate
  unrelated setup policies or inherit disabled development source behavior.
- Actual pilot cash practices may be more complex. One unit/day, one opening amount and explicit
  supply/withdrawal are the proposed first scope; no multiple drawers/shifts or automatic carry.

### Counterpoints

- Payment registration alone is smaller but leaves cash reconciliation and mistaken entry recovery
  external. Including opening, movements and full registration correction closes that operational gap.
- An immutable ledger without correction would push operators toward duplicate receipts or direct
  database edits. Append compensating records and retain original history instead.
- A payment provider now adds asynchronous settlement and secrets without first validating the
  internal record model. Keep the future adapter separate from ledger ownership.
- Commissions are useful but widen pricing, policy and payout semantics. Defer explicitly and make
  gross/net receipt labels precise; received revenue is not profit.
- Doing nothing leaves completed work with no trustworthy receipt or cash record in TRIAD.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Receipt register only | Smallest successor | No practical cash closure or movement reconciliation | A pilot with an external cash system |
| B | Manual receipts plus cash-day ledger and corrections | Complete bounded daily receipt workflow | More concurrency and history cases | Recommended |
| C | Provider collection, commissions and full finance | Broad finance coverage | Large external and policy dependencies | Separate validated initiatives after B |

### Recommendation

Option B. Include the minimal recovery actions needed to trust posted data, retain server-owned
exact arithmetic, and inherit the established consistency contract rather than redesigning finance.

## Architecture And Boundaries

- API: sibling `apps/api/src/modules/revenue-operations` owns checkouts, receipt ledger and cash
  lifecycle. Use focused use cases and `database` persistence consistent with current business
  modules; no catch-all setup/IDP finance service. Consume Service Desk through the sealed handoff
  port; do not query another module's private tables from UI or mutate operational completion.
- Proposed module-prefixed REST: `/api/revenue-operations/checkouts`, `/checkouts/:id`, explicit
  `/adjustments`, `/tenders`, `/register` commands beneath a checkout; `/receipts`,
  `/receipts/:id/cancel`; `/payment-methods`; `/cash-days`, `/cash-days/:id`,
  `/cash-days/:id/movements`, `/close`, `/reopen`, and paginated `/closings`. Contract schemas
  include expected versions and idempotency keys for mutations; GET is read-only. Publish in local
  OpenAPI and compose Elysia plugins through the existing REST root, no `/v1`.
- Error vocabulary: existing access reasons, 400 `invalid_request`/safe field, safe 404,
  409 `version_conflict`, `idempotency_conflict`, `already_registered`, `not_ready`,
  `cash_day_closed`, `cash_day_required`, `payment_method_disabled`, `invalid_transition`;
  safe 429 and generic 500. Server returns codes, UI owns Portuguese copy.
- IDP: unchanged authentication, invite and user lifecycle. Session owns actor attribution; business
  capabilities extend the existing access module. No authority from caller-supplied names.
- Studio: reuse existing checkout/cash route topology and module ports; replace normal memory
  composition with HTTP. Extend setup payment section only for accepted enabled-method policy.
  Related Dashboard/service changes use narrow authorized projections.
- Site/Backstage: no runtime surface, privilege or provider integration.
- Data: tenant-owned immutable posted rows with linked compensating entries and mutable versioned
  drafts/day state. This is a focused ledger, not a generic event-store framework.
- External provider: none; future provider adapters must not become owners of internal service or
  receipt identity. No card number, CVV, Pix key, bank account or transaction credentials collected.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Checkout, manual receipt, cash and correction | requirements-analysis, this PRD |
| Architecture | Applicable | Handoff and finance ownership | triad-architecture, triad-api-development |
| API | Applicable | Safe explicit commands, policy and aggregates | triad-api-development |
| Identity and authorization | Applicable | Cash and price privilege separation | business-context-and-access.md |
| Persistence | Applicable | Ledger invariants, versions, additive migration | API conventions, triad-testing |
| Studio UI | Applicable | Client/23 consistency and money masks | triad-studio-development, impeccable, ux-copy |
| Site UI | Not applicable | No public payment or marketing flow | Root boundaries |
| Accessibility | Applicable | Amounts, confirmation, errors and history | Consistency Contract, accessibility during QA |
| Performance and scale | Applicable | Ledger growth, day locks, bounded aggregates | REQ-022, REQ-029, REQ-034 |
| Security and privacy | Applicable | Private financial records and capability filtering | REQ-001, REQ-031, REQ-033 |
| Observability | Applicable | Posting, reconciliation and lock diagnostics | REQ-036 |
| Reliability and delivery | Applicable | Lost responses, reversals, safe rollback | REQ-028, REQ-035 |
| Testing and QA | Applicable | Exact cents and real concurrent transactions | triad-testing, triad-product-qa during execution |
| Documentation | Applicable | Production finance, source and access contract | REQ-038 |

## Performance And Scalability

Ledger volume grows with visits, tender lines, corrections and cash movements. Bound checkout
lines to 23's 20, tender lines to four, options/pages to 50 and history to 31 local days. Index
tenant/unit/posting-date/ID, tenant/checkout, unique active registration, original-reversal link
and unit/day/revision. Aggregate receipts and reversals in bounded set-based queries, not an
unbounded browser sale list. Use deterministic pagination and avoid per-receipt client/item queries.

At millions of receipts, the current-day aggregate scans only the tenant/unit/day index range;
historical queries require bounded date filters. Record safe query plans, scanned counts and warm
latency before introducing rollups or partitioning. Unit/day locks serialize posting and close;
measure wait and keep transactions short with no external work inside them. No provider limits or
measured production capacity claims apply. Retention/partitioning requires a separate reviewed
policy; v1 performs no automated purge of receipts or idempotency records.

## Security, Privacy, And Abuse

Inherit existing session/origin/CORS and authenticated throttling contracts. Bound requests, reject
massive integers and forged totals, and expose safe retry behavior for 429. Full registered values
are authorized business data, not telemetry. Members cannot fetch cash summary indirectly through
Dashboard, export-like unbounded lists or a preview endpoint. Revoked capability prevents a new
write and authorized replay. Cash correction never becomes a disguised external refund command.

## Accessibility And UX

23's full Consistency Contract is normative. Checkout remains a focused child workspace with a
clear route back to the visit. On mobile, service lines precede payment entry and the confirmation
summary follows a logical reading order; no side panel traps the only submit button. Money masks
preserve caret/delete/paste behavior and empty versus zero semantics. Closing and reversal dialogs
name consequences and restore focus. Tables render signed values with text; large totals and long
names wrap safely. Permissions, stale previews, no open day, disabled methods and zero-total flows
are explicit states, not disabled unexplained buttons.

## Logging And Observability

Record safe metadata for opening/adjusting/registering/reversing/closing/reopening with request
correlation, duration, result and entity IDs. Monitor transaction errors, conflicting previews,
duplicate prevention, lock wait and invariant reconciliation failures. Trace handoff fetch and
ledger commit without payloads. Investigation may link an authorized receipt reference to internal
metadata but must not print tender data, values, reasons or client identities. Define operational
alert thresholds and destination from measured rehearsal and existing telemetry during delivery.

## Delivery And Rollback

1. Finish 23's sealed-handoff and source gates, verify current schemas/diffs, then generate additive
   finance migrations. Initialize enabled-method policy with all four defaults; no prototype sales
   or payments are migrated and no operational visit is marked paid.
2. Deploy compatible API/policies before enabling checkout/cash HTTP routes. Existing 23 completed
   visits can open a checkout on demand; counts remain factual. No new provider/env credential.
3. Rollback disables finance writes and exposes last compatible read-only history while preserving
   ledger/day/reversal data. It never removes posted rows, reenables memory finance, or changes
   service completion. Rehearse reenablement and retry reconciliation with preserved command receipts.
4. Any new deployment source must be declared in `env-schema.yaml` and mapped through app-local
   public names; prefer extending existing source composition. Preserve local ports. Deployment and
   release publication remain separate explicit actions after implementation acceptance.

## Success Measures

- One real-service checkout survives mixed receipt registration, reload and duplicate retries with
  a single active receipt; a unit cash day balances opening/movements/receipts and counted cash.
- Guardrails: no rounding drift, no mutable posted history, no lost receipt at closing, no stale
  overwritten tender draft, no cross-tenant/member aggregate leak and no financial action changing
  performed-service facts.
- During first pilot week, product owner observes receipt/cash completion and correction journeys
  and reviews safe aggregate conflicts/failures. Establish timing/error baseline from observation;
  no invented conversion, revenue uplift or adoption target.

## Acceptance Criteria

- [ ] AC-001: Capability tests cover members, owner/admin, revoked subscription/session, forged
  role/actor, foreign IDs and Dashboard aggregate leakage. (REQ-001, REQ-023, REQ-033)
- [ ] AC-002: One immutable handoff creates one checkout through explicit POST; GET has no side
  effect, guests and earlier completed visits work, and catalog edits do not reprice it. (REQ-002, REQ-003)
- [ ] AC-003: Exact-cent, overflow, rounding remainder, zero subtotal and zero-total cases yield
  reconciling line/checkout values; browser forged totals are rejected. (REQ-004–REQ-006)
- [ ] AC-004: Method configuration persists, role restrictions hold, disabled methods require
  draft review, and old receipts/reversals remain readable and valid. (REQ-007, REQ-009)
- [ ] AC-005: Each method, mixed tenders, cash change, short/excess payment, duplicate method and
  zero-total registration behave as specified. (REQ-008, REQ-010)
- [ ] AC-006: Two cashiers/different keys and same-key lost-response retries create at most one
  active registration with matching audit/receipt facts and no partial writes. (REQ-003, REQ-010, REQ-028)
- [ ] AC-007: Register/reverse/replace never changes operational completion or lastVisitAt; UI
  distinguishes registration from bank confirmation or refund. (REQ-011, REQ-020, REQ-021)
- [ ] AC-008: Opening, midnight, service-date/payment-date differences, timezone changes and an
  unclosed previous day obey posting rules with no automatic balance carry. (REQ-012, REQ-013)
- [ ] AC-009: Supply/withdrawal/movement reversal and cash change satisfy expected-cash equations;
  summaries exclude commissions and distinguish gross/reversal/net. (REQ-014–REQ-016)
- [ ] AC-010: Competing close/register/move/reverse includes committed entries or returns conflict;
  counted difference and pending-checkout warning are correct. (REQ-017, REQ-018, REQ-029)
- [ ] AC-011: Current-day reopen retains old closing revisions and denies historical reopen;
  full receipt correction posts to the current day and replacement links history. (REQ-019–REQ-021)
- [ ] AC-012: History/worklist filtering beyond the first page, page bounds, authorized projections,
  stale refresh and tenant switching are correct. (REQ-022, REQ-023, REQ-030, REQ-031)
- [ ] AC-013: Every inherited consistency row and money field has rendered evidence; paste,
  caret, empty/zero, required reasons, server field errors and draft-preserving conflicts pass.
  (REQ-025–REQ-027)
- [ ] AC-014: Keyboard, desktop/320px light/dark, actual 200% zoom, forced colors, reduced motion,
  read-only receipt and focus-return journeys have reviewable evidence. (REQ-032)
- [ ] AC-015: Sentinel values are absent from public errors, logs, traces, metrics and receipts'
  idempotency metadata; authorized ledger values remain available only in business reads. (REQ-033, REQ-036)
- [ ] AC-016: Actual PostgreSQL schema/migrations/critical query plans and posting rollback pass;
  no fixture receipt or destructive baseline change appears. (REQ-034, REQ-035)
- [ ] AC-017: Production artifact scans and write-disable/reenable rehearsal preserve receipts,
  history and 23 completion without fake provider or commission behavior. (REQ-024, REQ-035)
- [ ] AC-018: App checks/coverage, live QA, continuity, durable docs and any residual manual gaps
  have explicit evidence before Done. (REQ-037, REQ-038)

## Verification Plan

Unit: exact cents and boundary arithmetic, line allocation, tender/day/correction state matrices,
schemas and safe copy. Integration: real Elysia contracts, session roles and disposable PostgreSQL
for posting/close/correction races, immutable history and rollback. Browser: inherited consistency
matrix, all payment methods and mixed receipt, two cashiers, policy changes, midnight, cash opening/
movements/closing/reopen, prior-day correction and baseline regressions. Commands and evidence
ownership are in the plan. No runtime acceptance was executed during this source/document research.

## Open Questions

### Blocking

None for the proposed contract. Approval includes manual registration only, member cash-access
restrictions, all-four default methods, mandatory open cash day, full mistaken-registration
correction and current-day reopen. A different policy requires both documents to be revised.

### Non-Blocking

- Commissions and provider collection — product owner validates as later initiatives after pilot.
- Multiple drawers/shifts and automatic carry — revisit only with observed operational need.
- Retention, fiscal/accounting scope and exports — define with appropriate domain review before
  introducing these capabilities; no inferred policy or automatic purge in this initiative.

## Assumptions

- One cash day per unit/local date is the first useful operational scope, and managers can open it
  before reception registers receipts. Validate at approval and first pilot.
- Receipts are manually attested outside-TRIAD payments; TRIAD does not verify external success.
- Full correction of a mistaken record is necessary in the first release; actual customer refunds
  remain separate. Validate terminology and recovery in live owner/admin QA.
- Initiative 23's immutable price/item handoff is available before implementation integration.

## Definition of Ready

- [x] Evidence, target workflows, alternatives, permissions and monetary decisions are explicit.
- [x] Requirements, acceptance criteria and ordered tasks provide bidirectional coverage.
- [x] Consistency, security, privacy, exact data, scale, rollback and operational recovery are designed.
- [x] No unresolved product decision is disguised as an implementation task.
- [x] Approved; predecessor and runtime checks remain mandatory execution gates.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-05 | Awaiting approval | Pending user decision | Planning request fulfilled; no approval inferred for financial implementation. |
| 2026-09-05 | Approved | User | Explicitly approved both initiatives: “pode aprovar as 2”. Scope unchanged; implementation has not started. |
