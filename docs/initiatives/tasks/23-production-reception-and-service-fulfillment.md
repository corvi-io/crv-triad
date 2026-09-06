# 23 Production Reception And Service Fulfillment - Execution Plan

## Source

- PRD:
  [23-production-reception-and-service-fulfillment.md](../prds/23-production-reception-and-service-fulfillment.md)
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
| REQ-001, REQ-003, REQ-009, REQ-029, REQ-030, REQ-033 / AC-001, AC-002, AC-005, AC-015, AC-018 | TASK-001 | Predecessor and transaction compatibility gate; task-specific evidence below |
| REQ-020, REQ-021, REQ-023, REQ-024, REQ-026, REQ-027, REQ-028 / AC-003, AC-010, AC-011, AC-012, AC-013, AC-014 | TASK-002 | Freeze consistency inventory and baseline evidence; task-specific evidence below |
| REQ-002, REQ-003, REQ-004, REQ-005, REQ-007, REQ-011, REQ-013, REQ-014, REQ-015, REQ-022, REQ-029 / AC-002, AC-003, AC-007, AC-008, AC-011 | TASK-003 | Persist visits, items and command invariants; task-specific evidence below |
| REQ-008, REQ-009, REQ-010, REQ-012, REQ-029, REQ-030, REQ-032 / AC-005, AC-006, AC-015, AC-017 | TASK-004 | Unify appointment and service occupancy safely; task-specific evidence below |
| REQ-001, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-014, REQ-022, REQ-029 / AC-001, AC-002, AC-003, AC-004, AC-011 | TASK-005 | Implement reception admission and queue commands; task-specific evidence below |
| REQ-008, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-019, REQ-022, REQ-029 / AC-005, AC-006, AC-007, AC-008, AC-009, AC-011 | TASK-006 | Implement sequential fulfillment and sealed handoff; task-specific evidence below |
| REQ-001, REQ-016, REQ-017, REQ-018, REQ-019, REQ-025, REQ-028, REQ-032 / AC-001, AC-004, AC-008, AC-009, AC-012, AC-013, AC-015 | TASK-007 | Expose bounded HTTP reads, authorization and projections; task-specific evidence below |
| REQ-018, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-028 / AC-009, AC-010, AC-011, AC-012, AC-013 | TASK-008 | Integrate tenant-safe repositories and shared form recovery; task-specific evidence below |
| REQ-004, REQ-005, REQ-006, REQ-007, REQ-016, REQ-020, REQ-026, REQ-027, REQ-028 / AC-003, AC-004, AC-010, AC-012, AC-013, AC-014 | TASK-009 | Deliver production reception board and list; task-specific evidence below |
| REQ-008, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-017, REQ-019, REQ-020, REQ-026, REQ-027 / AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-014 | TASK-010 | Deliver service workspace and completed history; task-specific evidence below |
| REQ-022, REQ-028, REQ-029, REQ-031, REQ-032 / AC-011, AC-015, AC-016 | TASK-011 | Operational telemetry and privacy gate; task-specific evidence below |
| REQ-001, REQ-009, REQ-013, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-029, REQ-032, REQ-034 / AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-018 | TASK-012 | Run integrated regression and concurrency acceptance; task-specific evidence below |
| REQ-018, REQ-019, REQ-030, REQ-032, REQ-034 / AC-009, AC-015, AC-017, AC-018 | TASK-013 | Validate source cutover and compatible rollback; task-specific evidence below |
| REQ-017, REQ-018, REQ-019, REQ-020, REQ-030, REQ-031, REQ-033, REQ-034 / AC-008, AC-009, AC-010, AC-016, AC-017, AC-018 | TASK-014 | Update durable contracts and approval evidence; task-specific evidence below |

## Dependency Order

Critical path: TASK-001 → TASK-003 → TASK-004 → TASK-005 → TASK-006 → TASK-007 → TASK-008 → TASK-009 →
TASK-010 → TASK-012 → TASK-013 → TASK-014.
TASK-002 follows TASK-001 and must finish before TASK-008. TASK-011 follows TASK-007 and must finish before
TASK-012. Research/UI baseline and API work have separate artifacts; schema, scheduling/access composition
and shared form edits remain serialized. This describes safe task overlap, not authorization to spawn
agents.
Initiative 24 may use the reviewed handoff contract for planning, but cannot enable financial production
behavior before 23 acceptance and compatibility evidence.

## Tasks

### TASK-001 — Predecessor and transaction compatibility gate

- [ ] Deliver and verify TASK-001.
- Status: Pending
- Covers: REQ-001, REQ-003, REQ-009, REQ-029, REQ-030, REQ-033, AC-001, AC-002, AC-005, AC-015, AC-018
- Depends on: Explicit PRD approval and predecessor acceptance; no implementation task dependency.
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-architecture, triad-api-development; PRDs/plans 21–24; apps/api and
  apps/studio AGENTS
- Expected artifacts: Dependency audit in this plan; reviewed scheduling transaction/occupancy contract and
  current migration inventory.
- Implementation notes: Read git status and overlapping diffs; record 21/22 acceptance evidence and exact
  commit/worktree basis. Inspect transitionFromFulfillment, lockSchedule, appointment exclusion/occupies,
  availability writes and catalog archive readers. Confirm one transaction context can coordinate visit and
  scheduling writes. Preserve user work and current additive migration order. Map every old/new writer
  during rollout; no baseline reset. If accepted predecessor contracts contradict the PRD, stop dependent
  implementation and revise the plan rather than inventing a substitute.
- Verification and evidence required before completion: Read-only source/diff inspection and contract matrix
  covering booking, reschedule, availability, service start/finish and archive. Evidence: paths/revisions,
  predecessor remaining gates, lock/transaction design and compatible cutover checklist.

### TASK-002 — Freeze consistency inventory and baseline evidence

- [ ] Deliver and verify TASK-002.
- Status: Pending
- Covers: REQ-020, REQ-021, REQ-023, REQ-024, REQ-026, REQ-027, REQ-028, AC-003, AC-010, AC-011, AC-012,
  AC-013, AC-014
- Depends on: TASK-001
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-studio-development, impeccable, ux-copy; PRD Consistency Contract and field
  inventory
- Expected artifacts: Per-surface parity matrix recorded in this plan or linked execution evidence; baseline
  screenshots for Clients, Agenda, catalog drawer and affected shared forms.
- Implementation notes: Inventory every service route, overlay, field, selector, action, error, empty,
  loading and read-only state. Bind each to the exact shared component and PRD field/copy rule. Record known
  baseline divergences (toast/page reload conflict, reset-on-refetch, implicit cache scope) without
  promoting them to requirements. Capture current approved screens before changing UI. Freeze
  focus/draft/URL behavior and label/default/canonical/mask/error mapping for each field; no generic form
  renderer.
- Verification and evidence required before completion: Live baseline review at desktop and 320px in
  light/dark plus source comparison. Evidence is a populated matrix with source, intended specialization,
  screenshot and regression target; not a checkbox saying looks consistent.

### TASK-003 — Persist visits, items and command invariants

- [ ] Deliver and verify TASK-003.
- Status: Pending
- Covers: REQ-002, REQ-003, REQ-004, REQ-005, REQ-007, REQ-011, REQ-013, REQ-014, REQ-015, REQ-022, REQ-029,
  AC-002, AC-003, AC-007, AC-008, AC-011
- Depends on: TASK-001
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing; current sibling database conventions
- Expected artifacts: apps/api/src/modules/service-desk/domain and database schema; generated additive
  Drizzle migration; unit and PostgreSQL schema tests.
- Implementation notes: Define explicit visit/item states, guest/client exclusivity, server time and
  timezone snapshots, 20-item bound, sealed handoff, metadata events and durable keyed-hash receipts. Add
  compound tenant references, unique appointment admission and one active item per visit. Separate completed
  item snapshots from mutable pending items and operational notes. Define replay-before-version behavior and
  private reason storage. No generic status update or hard delete.
- Verification and evidence required before completion: Unit transition/validation matrix and actual
  PostgreSQL constraints including cross-tenant IDs, duplicate admission, bad versions and rollback.
  Evidence: generated SQL review, disposable DB target identification without credentials, test output and
  accepted migration ID.

### TASK-004 — Unify appointment and service occupancy safely

- [ ] Deliver and verify TASK-004.
- Status: Pending
- Covers: REQ-008, REQ-009, REQ-010, REQ-012, REQ-029, REQ-030, REQ-032, AC-005, AC-006, AC-015, AC-017
- Depends on: TASK-003
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing; scheduling and availability contracts
- Expected artifacts: Scheduling-owned unified occupancy projection, live-service claim, additive backfill
  and transaction-aware internal ports under apps/api/src/modules/scheduling and availability.
- Implementation notes: Backfill occupying appointments and validate parity before cutover. Preserve
  historical booking fields; update every booking/reschedule/cancel/availability path to check unified
  occupancy and active claims under the shared tenant schedule lock. Adapt trusted fulfillment transitions
  to participate in caller transaction without nested independently committed writes. Implement
  own-reservation consumption, cross-unit exclusion, actual-finish release and extension conflict. While a
  service is overdue, block new bookings/reschedules for that professional until finish or a valid
  extension; retain existing next bookings with conflict guidance. Add trusted exceptional cancel only for
  Service Desk. Catalogue dependency readers must include active work.
- Verification and evidence required before completion: Real concurrent PostgreSQL start/start, start/book,
  start/reschedule, start/block, early finish and extension races across units. Inject failure after
  occupancy update and assert full rollback. Rehearse old/new writer compatibility with existing 22 data and
  inspect critical EXPLAIN plans.

### TASK-005 — Implement reception admission and queue commands

- [ ] Deliver and verify TASK-005.
- Status: Pending
- Covers: REQ-001, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-014, REQ-022, REQ-029, AC-001, AC-002,
  AC-003, AC-004, AC-011
- Depends on: TASK-004
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: Focused service-desk application use cases and composed HTTP command tests under
  apps/api/tests.
- Implementation notes: Implement arrivals and atomic admit; guest/existing-client walk-ins; server-local
  arrival correction; FIFO order; call/return; pre-service exit and allowed metadata edits. Pass session
  actor and expected versions. Resolve current client/catalog eligibility through narrow ports; never
  auto-create Client or professional. Integrate waiting and trusted cancel transitions within the same
  transaction and audit/receipt commit.
- Verification and evidence required before completion: Behavior tests for all identity modes, future
  arrival, archived references, same-appointment duplicate keys/users, rejected roles and failure after the
  first mutation. Exact retry must not increment versions or duplicate events.

### TASK-006 — Implement sequential fulfillment and sealed handoff

- [ ] Deliver and verify TASK-006.
- Status: Pending
- Covers: REQ-008, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-019, REQ-022, REQ-029, AC-005,
  AC-006, AC-007, AC-008, AC-009, AC-011
- Depends on: TASK-005
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: Start/item/extend/finish/interrupt use cases; immutable handoff port and transactional
  integration tests.
- Implementation notes: Start only called visits; resolve planned interval with active claims and current
  eligibility. Preserve booking snapshot for initial scheduled item and current catalog snapshot for added
  items. One active item, explicit start/finish next, pending removal, notes, manager interruption. Seal
  only completed items; zero-item interrupted visits cancel without handoff. Commit
  visit/appointment/events/client projection and occupancy release atomically. Expose no public payment
  mutation.
- Verification and evidence required before completion: Unit and real PostgreSQL
  happy/partial/interrupted/replayed flows; 20-item limit, clock regression, archived professional,
  competing finish/extend, no partial handoff and duplicate keys with changed payload. Evidence includes
  exact sealed handoff schema consumed by 24.

### TASK-007 — Expose bounded HTTP reads, authorization and projections

- [ ] Deliver and verify TASK-007.
- Status: Pending
- Covers: REQ-001, REQ-016, REQ-017, REQ-018, REQ-019, REQ-025, REQ-028, REQ-032, AC-001, AC-004, AC-008,
  AC-009, AC-012, AC-013, AC-015
- Depends on: TASK-006
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing; local OpenAPI and access module
- Expected artifacts: Service Desk Elysia plugin and local OpenAPI artifact; bounded
  arrivals/stages/history/detail; Client/Agenda/Dashboard projection changes.
- Implementation notes: Wire module in apps/api/src/entrypoints/rest/app.ts. Add explicit
  capabilities/entitlements without IDP roles. Publish safe field/error contracts and query limits. Include
  active visits from previous dates, server counts, complete-dataset filters and selected-ID hydration.
  Update linked Client lastVisitAt/history from performed facts; return private occupancy without names.
  Handoff is internal and billing projection optional. Avoid per-record reads and broad support access.
- Verification and evidence required before completion: Composed app.handle route tests for all roles and
  denial reasons, foreign IDs, URL/query validation, paging beyond first page and midnight carryover. Actual
  SQL tests and EXPLAIN for active queue and client history; safe sentinel errors.

### TASK-008 — Integrate tenant-safe repositories and shared form recovery

- [ ] Deliver and verify TASK-008.
- Status: Pending
- Covers: REQ-018, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-028, AC-009, AC-010,
  AC-011, AC-012, AC-013
- Depends on: TASK-002, TASK-007
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-studio-development, triad-testing, ux-copy
- Expected artifacts: Service Desk HTTP adapter/query keys/source entry; focused shared form-error or Client
  quick-create fixes only where required; adapter and form tests.
- Implementation notes: Replace synthetic unit contracts in production paths. Scope all query/option keys
  and request cancellation to tenant/unit. Implement 15-second visible refresh and explicit freshness state,
  stable command keys and captured versions. Map expected field errors inline; preserve drafts on
  refetch/conflict and inspect latest data explicitly. Add dirty dismissal and unknown-outcome recovery.
  Reuse canonical Client creation and preserve parent draft; correct only baseline behavior this reuse
  requires with regression coverage.
- Verification and evidence required before completion: Tests for server details.field, unexpected field,
  same-key retry, focus/reconnect, refetch while dirty, tenant switch and late response,
  Escape/backdrop/navigation, permission expiry and double Enter/click. No window reload or silent version
  adoption.

### TASK-009 — Deliver production reception board and list

- [ ] Deliver and verify TASK-009.
- Status: Pending
- Covers: REQ-004, REQ-005, REQ-006, REQ-007, REQ-016, REQ-020, REQ-026, REQ-027, REQ-028, AC-003, AC-004,
  AC-010, AC-012, AC-013, AC-014
- Depends on: TASK-008
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-studio-development, impeccable, ux-copy; frozen inventory from TASK-002
- Expected artifacts: apps/studio/src/modules/service-desk/service-desk-page.tsx and domain admission
  form/URL composition with shared controls.
- Implementation notes: Render bounded arrivals, three queue stages and accessible list alternative; add new
  visit and exact client/guest field rules. Reuse ActionDrawer, FormSection, masks, selectors and PageHeader
  actions. Use separate cursor stage loading and numbered history pagination. Provide explicit
  call/start/return/exit commands and touch/keyboard equivalents. No extra outer inset, fake counts,
  priority optimizer or scenario controls.
- Verification and evidence required before completion: Browser scheduled admission, guest and canonical
  quick-create/cancel, filtered empty, missing dependencies, options retry and list/board parity at
  desktop/320px. Field-level copy and computed spacing evidence for all admission states.

### TASK-010 — Deliver service workspace and completed history

- [ ] Deliver and verify TASK-010.
- Status: Pending
- Covers: REQ-008, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-017, REQ-019, REQ-020, REQ-026,
  REQ-027, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-014
- Depends on: TASK-009
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-studio-development, impeccable, ux-copy
- Expected artifacts: service-session-page.tsx and item/closure overlays; completed/canceled history and
  links to Client/Agenda/professional/Dashboard.
- Implementation notes: Compose sequential item controls, current duration/overrun, permitted extension and
  manager interruption. Show immutable completed items and read-only closed visits. Preserve original
  booking vs performed facts and separate completion from optional registration. With finance unavailable,
  offer a useful return/history path; no disabled checkout teaser. Retain view context when returning and
  preserve focus after an item is removed.
- Verification and evidence required before completion: Live scheduled and guest full journeys, multiple
  sequential professionals, extension collision, interrupted/no-performed-item closure and refresh after
  finish. Assert coherent related screens and no manufactured payment/lastVisit for guests or canceled
  visits.

### TASK-011 — Operational telemetry and privacy gate

- [ ] Deliver and verify TASK-011.
- Status: Pending
- Covers: REQ-022, REQ-028, REQ-029, REQ-031, REQ-032, AC-011, AC-015, AC-016
- Depends on: TASK-007
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-testing
- Expected artifacts: Safe telemetry spans/events and runbook draft; sentinel and invariant diagnostic tests.
- Implementation notes: Instrument schedule-lock wait, operation duration/results, stale refresh/replay,
  finish failures and old live claims through existing telemetry destination. Keep audit atomic and exclude
  names/phones/notes/prices/reasons/keys from telemetry and receipts. Use safe IDs and changed field names
  only. Record alert thresholds/destination from rehearsal and expected investigation steps; never
  auto-finish old work.
- Verification and evidence required before completion: Inject private sentinels through validation,
  constraints and failures; inspect serialized errors/events/receipts/log capture. Demonstrate diagnosis of
  failed finish and stuck claim using safe metadata. Record bounds and plans, not invented throughput.

### TASK-012 — Run integrated regression and concurrency acceptance

- [ ] Deliver and verify TASK-012.
- Status: Pending
- Covers: REQ-001, REQ-009, REQ-013, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027,
  REQ-029, REQ-032, REQ-034, AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010,
  AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-018
- Depends on: TASK-010, TASK-011
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-testing, triad-product-qa, accessibility; affected app skills
- Expected artifacts: Focused unit/component/route/PostgreSQL/E2E tests and live QA report linked from
  Verification Evidence.
- Implementation notes: Execute the command suite below and the full AC matrix. Exercise two users and two
  tabs, duplicate and lost responses, stale forms, midnight, late tenant responses and service/booking
  races. Inspect rendered UI against frozen Clients/Agenda references; include changed shared-component
  regressions. Fix accepted-scope defects before final verification and record all manual limits honestly.
- Verification and evidence required before completion: Checks/coverage exit successfully; disposable
  PostgreSQL tests prove actual SQL/atomicity; live browser report includes desktop and 320px light/dark,
  actual 200% zoom, keyboard/focus, forced colors, reduced motion and screen-reader evidence or named unmet
  gate.

### TASK-013 — Validate source cutover and compatible rollback

- [ ] Deliver and verify TASK-013.
- Status: Pending
- Covers: REQ-018, REQ-019, REQ-030, REQ-032, REQ-034, AC-009, AC-015, AC-017, AC-018
- Depends on: TASK-012
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-api-development, triad-studio-development, triad-testing
- Expected artifacts: Updated production-boundary assertions/source composition and reviewed
  rollout/rollback rehearsal.
- Implementation notes: Enable only complete HTTP flows after predecessor/migration/API gates. Scan
  production artifacts for Service Desk fixtures and synthetic IDs without banning legitimate domain copy.
  Rehearse disabling writes while preserving visits/claims and compatible booking behavior; never restore a
  pre-service-occupancy writer or reset data. Verify 24-off completion and later handoff visibility. Declare
  any necessary source mapping in env-schema; no unrelated pipeline/release changes.
- Verification and evidence required before completion: Production build/artifact commands and additive
  migration/backfill/rollback rehearsal with preexisting 22 appointments and new visits retained. Record
  compatible application revisions, safe source state and reenabling behavior.

### TASK-014 — Update durable contracts and approval evidence

- [ ] Deliver and verify TASK-014.
- Status: Pending
- Covers: REQ-017, REQ-018, REQ-019, REQ-020, REQ-030, REQ-031, REQ-033, REQ-034, AC-008, AC-009, AC-010,
  AC-016, AC-017, AC-018
- Depends on: TASK-013
- Can parallelize with: Only independent artifact preparation allowed by Dependency Order; no concurrent
  shared schema/source edits.
- Relevant skills/docs: triad-architecture, triad-initiative-workflow; documentation reference
- Expected artifacts: docs/studio/service-desk.md, scheduling.md, client-management.md, dashboard.md; API
  Service Desk/occupancy/access docs; affected READMEs and component/testing/deployment inventories.
- Implementation notes: Replace prototype claims only for delivered behavior; document guest identity,
  completed-service semantics, sequential execution, trusted transaction ports, source matrix and 24
  handoff. Update AGENTS/Triad skills only when an applicable durable convention changes, otherwise record
  why unchanged. Link every AC to actual evidence and reconcile the approved 24 dependency assumptions without marking its implementation
  complete. Record residual risks and exact continuation state.
- Verification and evidence required before completion: Link/content review, full traceability audit and
  final git diff scoped to authorized changes. Done requires all relevant evidence, not merely files, a
  passing typecheck or copied screenshots.

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

- [ ] API owner: tenant-wide schedule lock may limit a very active tenant; measure wait before changing lock
  granularity.
- [ ] Product owner: validate sequential services and explicit guest identity in the first pilot; parallel
  service or guest conversion requires a later initiative.
- [ ] Product/API owners: evaluate realtime and retention only with measured demand; no silent receipt
  expiry or automated visit deletion.
- [ ] Delivery owner: prevent pre-service-occupancy writers during rollback; preserve existing booking
  safety and active claims.

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
