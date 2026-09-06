# 24 Production Checkout And Cash Operations - Execution Plan

## Source

- PRD: [24-production-checkout-and-cash-operations.md](../prds/24-production-checkout-and-cash-operations.md)
- Related issue/PR: Not created; this task creates repository planning documents only.
- Approval state: Approved
- Approved PRD version/date: 2026-09-05 version; explicitly approved by the user on 2026-09-05.

## Implementation Principles

- [x] Record explicit approval of the matching PRD before beginning runtime implementation — User, 2026-09-05.
- Preserve concurrent work; read current root/app instructions, predecessor status, git status and
  overlapping diffs before starting or resuming.
- Keep API business ownership beside IDP and use Bun/Elysia/Drizzle/PostgreSQL, existing Studio primitives
  and Brazilian Portuguese UI copy.
- Treat the PRD consistency and field inventories as acceptance contracts; do not copy known incumbent
  defects or invent a second form system.
- Use the smallest scoped shared fix with regression coverage when the accepted journey exposes a baseline
  defect; no unrelated app cleanup.
- Keep command keys, captured versions, tenant isolation and transaction boundaries explicit. UI pending
  state alone is not concurrency protection.
- Do not mark work Done without observable evidence; material product/permission/state/financial changes
  return both documents to revision.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001, REQ-002, REQ-007, REQ-011, REQ-012, REQ-013, REQ-020, REQ-021, REQ-037 / AC-001, AC-002, AC-004, AC-007, AC-008, AC-011, AC-018 | TASK-001 | Verify predecessor, handoff and cash policy contract; task-specific evidence below |
| REQ-025, REQ-026, REQ-027, REQ-031, REQ-032 / AC-012, AC-013, AC-014 | TASK-002 | Freeze inherited parity and money field inventory; task-specific evidence below |
| REQ-002, REQ-003, REQ-007, REQ-012, REQ-013, REQ-014, REQ-017, REQ-019, REQ-020, REQ-021, REQ-028, REQ-029, REQ-035 / AC-002, AC-004, AC-006, AC-008, AC-009, AC-010, AC-011, AC-016 | TASK-003 | Persist checkout, ledger, day and policy invariants; task-specific evidence below |
| REQ-004, REQ-005, REQ-006, REQ-008, REQ-009, REQ-015, REQ-016 / AC-003, AC-005, AC-009, AC-013 | TASK-004 | Implement exact monetary policies and validation; task-specific evidence below |
| REQ-001, REQ-002, REQ-005, REQ-007, REQ-008, REQ-009, REQ-011, REQ-024, REQ-028 / AC-001, AC-002, AC-003, AC-004, AC-005, AC-007, AC-017 | TASK-005 | Implement checkout opening, policy and drafts; task-specific evidence below |
| REQ-001, REQ-012, REQ-013, REQ-014, REQ-015, REQ-028, REQ-029 / AC-001, AC-008, AC-009, AC-010 | TASK-006 | Implement cash opening and immutable movements; task-specific evidence below |
| REQ-003, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-020, REQ-021, REQ-028, REQ-029 / AC-004, AC-005, AC-006, AC-007, AC-008, AC-010, AC-011 | TASK-007 | Implement atomic registration and correction; task-specific evidence below |
| REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-028, REQ-029 / AC-009, AC-010, AC-011 | TASK-008 | Implement closing and immutable revisions; task-specific evidence below |
| REQ-001, REQ-016, REQ-022, REQ-023, REQ-024, REQ-033, REQ-034 / AC-001, AC-009, AC-012, AC-015, AC-016, AC-017 | TASK-009 | Publish bounded API and authorized financial projections; task-specific evidence below |
| REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-030, REQ-031 / AC-006, AC-012, AC-013, AC-017 | TASK-010 | Integrate repositories, money masks and protected drafts; task-specific evidence below |
| REQ-002, REQ-005, REQ-007, REQ-008, REQ-009, REQ-011, REQ-020, REQ-021, REQ-024, REQ-025, REQ-026, REQ-027, REQ-032 / AC-002, AC-003, AC-004, AC-005, AC-007, AC-011, AC-013, AC-014, AC-017 | TASK-011 | Deliver checkout and method settings; task-specific evidence below |
| REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-022, REQ-023, REQ-025, REQ-026, REQ-027, REQ-030, REQ-032 / AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014 | TASK-012 | Deliver cash day, movements and closing history; task-specific evidence below |
| REQ-028, REQ-029, REQ-033, REQ-034, REQ-036 / AC-006, AC-010, AC-015, AC-016 | TASK-013 | Validate privacy, telemetry and SQL operations; task-specific evidence below |
| REQ-001, REQ-003, REQ-004, REQ-010, REQ-017, REQ-020, REQ-024, REQ-025, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-034, REQ-035, REQ-038 / AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018 | TASK-014 | Run full product acceptance and source rollback; task-specific evidence below |
| REQ-024, REQ-025, REQ-035, REQ-036, REQ-037, REQ-038 / AC-013, AC-015, AC-016, AC-017, AC-018 | TASK-015 | Finalize durable finance contracts and evidence; task-specific evidence below |

## Dependency Order

Critical path: TASK-001 → TASK-003 → TASK-004 → TASK-005 → TASK-006 → TASK-007 → TASK-008 → TASK-009 →
TASK-010 → TASK-011 → TASK-012 → TASK-014 → TASK-015.
TASK-002 follows TASK-001 and finishes before TASK-010. TASK-013 follows TASK-009 and finishes before
TASK-014. Baseline/UI inventory can overlap backend work, but ledger schema, locks, access/source
composition and shared form mutations must be serialized. This is dependency information, not authorization
to spawn agents.
TASK-001 requires accepted Initiative 23 handoff/operational completion evidence; never implement financial
mutations against a memory-only or provisional service source.

## Tasks

### TASK-001 — Verify predecessor, handoff and cash policy contract

- [ ] Deliver and verify TASK-001.
- Status: Pending
- Covers: REQ-001, REQ-002, REQ-007, REQ-011, REQ-012, REQ-013, REQ-020, REQ-021, REQ-037, AC-001, AC-002,
  AC-004, AC-007, AC-008, AC-011, AC-018
- Depends on: Explicit PRD approval and predecessor acceptance; no implementation task dependency.
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-architecture, triad-api-development; PRDs/plans 21–24 and app AGENTS
- Expected artifacts: Dependency and financial-boundary audit recorded in this plan.
- Implementation notes: Record current git status/diffs and accepted 23 handoff schema/version, source
  behavior, completed guest/linked-client history and final evidence. Confirm 24 has no completion
  transition. Map all capabilities, policy defaults, day/timezone constraints, correction and reopen rules
  from this PRD. Audit existing setup/revenue prototypes to exclude commissions and caller actor names. Any
  contrary accepted predecessor rule requires revision before implementation.
- Verification and evidence required before completion: Read-only evidence of exact source revisions,
  handoff fixture/schema and explicit role/state/source matrix; 23 acceptance and transactional handoff
  gates are prerequisites, not assumed done.

### TASK-002 — Freeze inherited parity and money field inventory

- [ ] Deliver and verify TASK-002.
- Status: Pending
- Covers: REQ-025, REQ-026, REQ-027, REQ-031, REQ-032, AC-012, AC-013, AC-014
- Depends on: TASK-001
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-studio-development, impeccable, ux-copy; 23 Consistency Contract
- Expected artifacts: Cash/checkout/policy per-surface matrix with baseline screenshots and
  field/control/error mappings.
- Implementation notes: Inspect completed 23, Clients and Agenda screens plus existing revenue prototype.
  Bind every inherited consistency row and every monetary field to a current shared owner. Preserve route
  topology and tokens; explicitly specialize receipt line summary and cash reconciliation. Freeze
  empty-vs-zero inputs, exact mask conversion, confirmations, dirty drafts and stale preview copy. Mark
  prototype omissions/deviations rather than inheriting them.
- Verification and evidence required before completion: Baseline desktop/320px light/dark screenshots,
  computed control/spacing comparison and exact rendered copy inventory. No implementation before inventory
  is complete.

### TASK-003 — Persist checkout, ledger, day and policy invariants

- [ ] Deliver and verify TASK-003.
- Status: Pending
- Covers: REQ-002, REQ-003, REQ-007, REQ-012, REQ-013, REQ-014, REQ-017, REQ-019, REQ-020, REQ-021, REQ-028,
  REQ-029, REQ-035, AC-002, AC-004, AC-006, AC-008, AC-009, AC-010, AC-011, AC-016
- Depends on: TASK-001
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: apps/api/src/modules/revenue-operations/domain and database schemas, generated
  additive migration and PostgreSQL schema tests.
- Implementation notes: Model mutable versioned checkout/day/policy separately from immutable posted
  registrations/tenders/lines/reversals/closing revisions. Add tenant foreign keys and unique
  checkout/visit, active registration, original reversal and unit/local-date keys. Store server
  timezone/date attribution, metadata events and durable keyed-hash command receipts. Initialize all four
  tender defaults without importing memory rows. Define day/policy/checkout lock order consistently.
- Verification and evidence required before completion: Run generated migration on a disposable DB
  containing 21–23 data, verify preservation and defaults; exercise constraints, cross-tenant links and
  rollback. Record reviewed SQL and migration ID.

### TASK-004 — Implement exact monetary policies and validation

- [ ] Deliver and verify TASK-004.
- Status: Pending
- Covers: REQ-004, REQ-005, REQ-006, REQ-008, REQ-009, REQ-015, REQ-016, AC-003, AC-005, AC-009, AC-013
- Depends on: TASK-003
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing; prototype money.ts behavioral examples
- Expected artifacts: Server exact-money/allocation/tender/cash policies with focused
  boundary/property-style examples and safe error codes.
- Implementation notes: Use integer/BigInt intermediate arithmetic and validate all conversion/sum/product
  bounds. Implement discounts/surcharges/price override reasons, stable proportional remainder,
  zero-subtotal allocation, positive tender one-per-method and cash change. Define zero-total no-tender
  receipts. Separate service receipts, signed corrections and physical cash movements; no commissions or
  inferred profit.
- Verification and evidence required before completion: Deterministic unit examples from the PRD plus
  near-limit integers, rounding remnants, zero/empty, negative/overflow, duplicated method and forged
  totals. Assert line nets equal total and expected cash counts change once.

### TASK-005 — Implement checkout opening, policy and drafts

- [ ] Deliver and verify TASK-005.
- Status: Pending
- Covers: REQ-001, REQ-002, REQ-005, REQ-007, REQ-008, REQ-009, REQ-011, REQ-024, REQ-028, AC-001, AC-002,
  AC-003, AC-004, AC-005, AC-007, AC-017
- Depends on: TASK-004
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: Focused open-checkout, adjust, replace-tenders and configure-method use cases and
  route tests.
- Implementation notes: Open from immutable completed handoff via POST; GET is read-only. Snapshot handoff
  version, preserve performed lines and support guests/earlier visits. Restrict adjustments/configuration to
  owner/admin. Persist draft tenders with expected versions and invalidate review after price/policy changes
  without changing posted history. No operational visit or appointment mutation. Validate current policy at
  registration, not only when opened.
- Verification and evidence required before completion: Role/API tests, catalog rename/reprice after finish,
  repeated open requests, GET side-effect check, disabled method while dirty and zero total. Negative tests
  assert no IDP/service lifecycle writes.

### TASK-006 — Implement cash opening and immutable movements

- [ ] Deliver and verify TASK-006.
- Status: Pending
- Covers: REQ-001, REQ-012, REQ-013, REQ-014, REQ-015, REQ-028, REQ-029, AC-001, AC-008, AC-009, AC-010
- Depends on: TASK-005
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: Cash-day open, supply, withdrawal and movement-reversal use cases; unit/day timezone
  integration.
- Implementation notes: Require explicit counted opening amount and server current local date; unique
  unit/day and no guessed prior carry. Snapshot timezone and use the same transaction-aware unit guard in
  day opening and unit timezone edits; block changes while a day is open. Preserve unclosed previous days
  with a warning. Enforce current-day movements, positive amounts/reasons, withdrawal bound and one
  opposite-entry correction. Increment day version atomically and attribute actor from session.
- Verification and evidence required before completion: Real PostgreSQL duplicate day open, parallel
  movements, movement reversal replay, midnight/browser-zone mismatch and timezone edit race. Expected cash
  tests distinguish receipt and movement signs.

### TASK-007 — Implement atomic registration and correction

- [ ] Deliver and verify TASK-007.
- Status: Pending
- Covers: REQ-003, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-020, REQ-021, REQ-028, REQ-029, AC-004,
  AC-005, AC-006, AC-007, AC-008, AC-010, AC-011
- Depends on: TASK-006
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: Register, cancel-registration and replacement use cases; transactional
  receipt/ledger/audit integration tests.
- Implementation notes: Acquire policy, unit/day and checkout locks in the PRD order, check
  versions/access/policy/current date and seal receipt/tenders/line values in one transaction. Receipt
  replay precedes stale rejection after authorization. Reversal appends exact inverse facts to current open
  day, preserves old day/reference and never consults new catalog prices or disabled method eligibility.
  Full cancellation only, explicit outside-TRIAD confirmation, replacement under new version. No external
  payment/refund or service state change.
- Verification and evidence required before completion: Two actors and different keys, same-key lost
  response, changed-key payload, revocation, concurrent reverse/replace and failure after each write
  boundary. Assert one active receipt and original history unchanged, including prior-day correction.

### TASK-008 — Implement closing and immutable revisions

- [ ] Deliver and verify TASK-008.
- Status: Pending
- Covers: REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-028, REQ-029, AC-009, AC-010, AC-011
- Depends on: TASK-007
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: Summary/close/reopen use cases and immutable closing revision persistence.
- Implementation notes: Calculate one consistent aggregate snapshot from ledger, require expected day
  version and counted amount/reason. Closing competes under same lock with registration/movement/reversal.
  Show pending unregistered visit count separately from revenue. Reopen only current eligible day with
  reason, preserve first snapshot and increment revision on reclose. Historical correction posts today; no
  row rewrite or silent reopen.
- Verification and evidence required before completion: Real PostgreSQL close/register, close/reverse,
  close/move, double close and reopen races. Check counted-minus-expected, required reason, zero day, old
  open day, prior revision immutability and receipt inclusion at cutoff.

### TASK-009 — Publish bounded API and authorized financial projections

- [ ] Deliver and verify TASK-009.
- Status: Pending
- Covers: REQ-001, REQ-016, REQ-022, REQ-023, REQ-024, REQ-033, REQ-034, AC-001, AC-009, AC-012, AC-015,
  AC-016, AC-017
- Depends on: TASK-008
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing; local OpenAPI and access contracts
- Expected artifacts: Revenue Elysia plugin/local OpenAPI, bounded worklist/history/cash/closing reads and
  narrow Dashboard/Service Desk projections.
- Implementation notes: Wire focused module in REST composition. Use complete-dataset filters, deterministic
  10/20/50 pages and 31-date bounds; hydrate options/selected records without N+1. Separate member checkout
  reads from owner/admin aggregates including Dashboard fields. Expose safe machine codes/allowlisted fields
  and existing origin/session/throttling contracts. No unbounded listPaidSales counterpart or mutable GET.
- Verification and evidence required before completion: Composed app.handle role/foreign-ID tests and actual
  PostgreSQL filters beyond page one, history revisions and empty/filtered states. EXPLAIN critical
  tenant/day and receipt history queries; safe error sentinels.

### TASK-010 — Integrate repositories, money masks and protected drafts

- [ ] Deliver and verify TASK-010.
- Status: Pending
- Covers: REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-030, REQ-031, AC-006, AC-012, AC-013, AC-017
- Depends on: TASK-002, TASK-009
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-studio-development, triad-testing, ux-copy
- Expected artifacts: Revenue HTTP repository/queries/source entry, exact canonical-money adapter and shared
  form recovery integration.
- Implementation notes: Use existing brMoney display/canonical control, convert decimal string to bounded
  cents exactly. Preserve empty versus explicit zero. Scope keys/options to tenant/unit, keep original
  versions and stable command keys; no optimistic paid/closed state. Add visible-only refresh, stale
  indication and unknown-outcome reconciliation. Dirty cancel/Escape/backdrop/route handling and latest-data
  review reuse 23 contract with no localStorage or forced reload.
- Verification and evidence required before completion: Mask paste/caret/backspace/delete, huge values,
  decimal conversion, field error mapping, focus/refetch while dirty, stale preview, double submit, lost
  response and late tenant response tests. Regression test touched shared primitives in Clients and 23.

### TASK-011 — Deliver checkout and method settings

- [ ] Deliver and verify TASK-011.
- Status: Pending
- Covers: REQ-002, REQ-005, REQ-007, REQ-008, REQ-009, REQ-011, REQ-020, REQ-021, REQ-024, REQ-025, REQ-026,
  REQ-027, REQ-032, AC-002, AC-003, AC-004, AC-005, AC-007, AC-011, AC-013, AC-014, AC-017
- Depends on: TASK-010
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-studio-development, impeccable, ux-copy
- Expected artifacts: checkout-page.tsx and domain forms, receipt/correction history; narrow production
  setup payment-method section.
- Implementation notes: Render read-only performed-service lines, authorized adjustments, enabled methods,
  mixed/cash/change and no-charge flow. Register only after explicit attestation; name result Pagamento
  registrado. Add owner/admin full mistaken-registration cancellation/replacement with original/reversal
  references; no refund/provider-decline copy. Persist real method settings without enabling commissions.
  Preserve focused route and return to completed visit.
- Verification and evidence required before completion: Live each-method/mixed/cash/zero, disabled method,
  member denial, open-day missing, stale amount, registered read-only and reversal/replacement journeys.
  Compare every field/copy row and confirmation against frozen matrix.

### TASK-012 — Deliver cash day, movements and closing history

- [ ] Deliver and verify TASK-012.
- Status: Pending
- Covers: REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-022, REQ-023, REQ-025,
  REQ-026, REQ-027, REQ-030, REQ-032, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014
- Depends on: TASK-011
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-studio-development, impeccable, ux-copy
- Expected artifacts: cash-page.tsx and explicit opening/movement/close/reopen overlays plus bounded
  history/detail.
- Implementation notes: Compose unit/date context, clear gross/reversal/net receipts, physical cash equation
  and signed difference. Opening/count inputs remain empty until entered; reasons map inline. Expose manager
  actions only, preserve closed snapshots and revisions, warn on prior open day and pending checkouts.
  Server pagination/search apply beyond loaded records. No commission/profit tiles or placeholder values.
- Verification and evidence required before completion: Live opening, supply, withdrawal, cash registration,
  counted difference, version-conflicted close, current reopen/reclose, old-day correction and closing
  history. Narrow viewport/keyboard focus and long-money/name states; server denies forged member commands.

### TASK-013 — Validate privacy, telemetry and SQL operations

- [ ] Deliver and verify TASK-013.
- Status: Pending
- Covers: REQ-028, REQ-029, REQ-033, REQ-034, REQ-036, AC-006, AC-010, AC-015, AC-016
- Depends on: TASK-009
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: Safe telemetry and financial investigation runbook; sentinel, query-plan and
  transaction diagnostics.
- Implementation notes: Instrument metadata-only register/reverse/close outcomes, replay, lock wait and
  invariant failures through existing telemetry destination. Keep financial amounts/reasons in authorized
  business records only. Record critical query plans and bounded scan counts; establish operational
  thresholds/destination during rehearsal. Runbook uses allowed correction commands, never direct posted-row
  SQL edits.
- Verification and evidence required before completion: Sentinel body/reason/amount/contact/key tests across
  errors/log capture/audit metadata/receipts; demonstrate failure diagnosis with safe IDs. Inspect exact
  PostgreSQL read/write paths, transaction rollback and warm query samples without printing credentials or
  private parameters.

### TASK-014 — Run full product acceptance and source rollback

- [ ] Deliver and verify TASK-014.
- Status: Pending
- Covers: REQ-001, REQ-003, REQ-004, REQ-010, REQ-017, REQ-020, REQ-024, REQ-025, REQ-027, REQ-028, REQ-029,
  REQ-030, REQ-031, REQ-032, REQ-034, REQ-035, REQ-038, AC-001, AC-002, AC-003, AC-004, AC-005, AC-006,
  AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018
- Depends on: TASK-012, TASK-013
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-testing, triad-product-qa, accessibility; affected app skills
- Expected artifacts: Passing unit/route/component/PostgreSQL suites, live QA report, production source
  scans and write-disable/reenable rehearsal.
- Implementation notes: Run commands below and all AC journeys including two cashiers, close race, prior-day
  reversal, policy change, midnight and auth/tenant switch. Inspect desktop/320px light/dark plus actual
  zoom/focus/masks against baseline. Rehearse additive migration and rollback retaining receipts/day
  revisions; disabled finance must not affect 23 completion or reactivate memory. Fix scoped findings and
  recheck affected paths; no release publication.
- Verification and evidence required before completion: Exact commands/exits/coverage, PostgreSQL target and
  race assertions, screenshot/state matrix and manual checks. Verify no fixtures/provider
  simulation/commission claims in production and earlier 23 visits remain usable.

### TASK-015 — Finalize durable finance contracts and evidence

- [ ] Deliver and verify TASK-015.
- Status: Pending
- Covers: REQ-024, REQ-025, REQ-035, REQ-036, REQ-037, REQ-038, AC-013, AC-015, AC-016, AC-017, AC-018
- Depends on: TASK-014
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-architecture, triad-initiative-workflow; documentation reference
- Expected artifacts: docs/studio/revenue-operations.md, service-desk.md, dashboard.md, barbershop-setup.md;
  API finance/access/runbook docs; app READMEs/testing/deployment/component inventory and relevant
  PRODUCT/DESIGN scope claims.
- Implementation notes: Replace frontend-only claims only for delivered functions; document ledger versus
  payment processing, day/correction/reopen semantics, method defaults, role matrix and separate commission
  scope. Update 23 handoff references without changing approved operations. Update AGENTS/Triad skills only
  if durable workflow requires it; otherwise record rationale. Reconcile every AC, manual gap, source
  rollout and exact continuation checkpoint.
- Verification and evidence required before completion: Documentation/link review and bidirectional
  requirement/AC/task/evidence audit; final scoped diff. Done requires all acceptance evidence and actual
  approval, not a completed document or successful build alone.

## Verification Commands

Run from workspace root with `rtk` as required by local instructions. These are execution requirements, not
tests run during planning. Resolve a dedicated disposable local PostgreSQL target before any database
mutation; do not use the live browser QA database for destructive integration suites.

```sh
rtk bun --filter api check
rtk bun --filter api coverage:check
rtk bun --filter api test:integration:postgres
rtk bun --filter studio check
rtk bun --cwd apps/studio run test --coverage --coverage.thresholds.statements=80 --coverage.thresholds.branches=80 --coverage.thresholds.functions=80 --coverage.thresholds.lines=80
rtk bunx turbo run build --filter=api --filter=studio
rtk bun --filter studio test:production-boundary
rtk bun --filter studio test:e2e
rtk bun --filter studio test:e2e:production
```

The PostgreSQL command uses `TEST_DATABASE_URL` supplied through the established safe local environment;
never print it. Generate reviewed additive SQL with `rtk bun --filter api db:generate` and apply it only to
the resolved disposable verification database using `rtk bun --filter api db:migrate`. Reconcile migration
generation with concurrent 21/22/23 work; do not reuse migration numbers or regenerate the baseline.

Use existing package scripts and root Turborepo for multi-app build orchestration. Narrow E2E filters may be
recorded during development, but the final accepted set includes affected shared Clients/Agenda regressions,
source boundaries and the new journeys. If the package scripts or tooling change, record the exact
replacement command and reason instead of claiming a command ran.

Live acceptance uses the `triad-product-qa` skill during execution, with API + PostgreSQL + Studio, two
authenticated browser sessions, desktop (1440×900 or established 1600×900 baseline) and 320 CSS pixels in
light/dark. Record actual browser 200% zoom separately from a resized screenshot, keyboard-only and
coarse-pointer paths, focus restoration, forced colors, reduced motion and screen-reader checks. Automated
axe does not prove manual checks. No new QA server/database port is chosen until checking the local
environment; preserve normal app ports.

## Verification Evidence

| Evidence | Current result | Required record during execution |
| --- | --- | --- |
| Planning research | Source and documentation inspected; no runtime validation | PRD evidence table and reviewed contract decisions |
| Planning structure validation (2026-09-05) | Passed: unique IDs, requirement/AC coverage, task fields, ordered dependencies, standards classifications, relative links and Markdown hygiene | Read-only Python validation across both PRDs/plans; 72 requirements, 36 ACs and 29 tasks; no runtime suite executed |
| Predecessor acceptance | Execution prerequisite, not certified here | Commit/worktree basis and remaining/completed gates |
| Consistency baseline | PRD matrix specified; live baseline pending | Per-surface source, exact copy/control contract and screenshots |
| API and PostgreSQL | Not run | Commands, exit codes, disposable target identity, race and rollback evidence |
| Studio and production boundary | Not run | Commands, exits, coverage totals, artifact scan output |
| Live QA | Not run | Journeys/roles/viewports/states, screenshots, defects and manual limitations |
| Rollback | Planned only | Compatible versions, retained-record checks and reenabling result |

Every AC requires a direct evidence link or a precise record here. A passing suite name is insufficient for
a concurrency, money or browser-comparison claim.

## Continuation Checkpoint

- Active phase: Approved on 2026-09-05; runtime implementation not started.
- Completed: Source/document research, proposed product decisions, consistency/copy inventory,
  requirement/acceptance mapping and dependency-ordered execution plan.
- Not started: All runtime code, migrations, API/UI implementation, test execution, live baseline/QA,
  deployment and release.
- Decisions: User explicitly approved both initiatives on 2026-09-05 (“pode aprovar as 2”); the linked PRD scope is unchanged.
- Changed by this planning task: Only new initiative 23/24 PRDs and task plans.
- Concurrent work risk: The inspected worktree contains extensive active 21/22 API/Studio/migration/document
  changes. Re-read current status and diff at execution; do not reset, format, stage or overwrite unrelated
  work.
- Commands/results during execution: None yet; planning validation is recorded in the final handoff.
- Known failures: No runtime result claimed; predecessor final acceptance and manual UI evidence remain
  prerequisites.
- Exact next action: Begin TASK-001 with the current predecessor and overlap audit when execution starts; initiative 24 retains its dependency on initiative 23.
- At every interruption, replace this checkpoint with exact active task, completed/remaining behavior,
  changed paths, new migration IDs, decisions, commands/exits, failures and next action.

## Risks And Follow-Ups

- [ ] Product owner: validate manager-opened unit/day operations, method defaults and full registration
  correction in pilot.
- [ ] Product owner: scope commissions, actual customer refunds, bank/provider collection and multiple
  drawers separately; never relabel deferred data as zero.
- [ ] API owner: measure unit/day lock and aggregate costs before rollups/partitioning.
- [ ] Delivery owner: retain immutable ledger/reversals/closing revisions and command receipts across
  rollback; no direct SQL posted-record repairs.

## Scope Changes

- No implementation deviations. The linked PRD decisions were explicitly approved by the user on 2026-09-05; scope unchanged.
- Record future change, rationale, affected REQ/AC/TASK IDs, PRD revision and user decision here before
  dependent implementation.

## Definition of Done

- [ ] The implemented PRD version was explicitly approved.
- [ ] All applicable gates in `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [ ] Every in-scope AC and consistency row has reviewable evidence.
- [ ] Relevant tests, check/build and four-dimensional coverage gates pass.
- [ ] Real PostgreSQL concurrency/migration/rollback and live browser acceptance are verified.
- [ ] Authorization, privacy, accessibility, responsive/failure states and related baseline regressions are
  covered.
- [ ] Durable docs/source/operational contracts and the Continuation Checkpoint are accurate.
- [ ] Deviations, skipped manual checks, residual risks and follow-up owners are recorded; unresolved
  required gates prevent Done.
