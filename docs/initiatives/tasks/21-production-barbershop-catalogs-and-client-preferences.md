# 21 Production Barbershop Catalogs And Client Preferences - Execution Plan

## Source

- PRD:
  `docs/initiatives/prds/21-production-barbershop-catalogs-and-client-preferences.md`
- Related issue/PR: Not created
- Approval state: Approved
- Approved PRD version/date: 2026-09-04

## Implementation Principles

- Do not begin implementation until the linked PRD version is explicitly approved.
- Follow the accepted recommendation from the PRD.
- Keep scope bounded to the acceptance criteria.
- Use relevant Triad skills before implementation.
- Prefer simple designs that can scale to near-term needs without obvious bottlenecks.
- Keep units, professionals, and services as sibling business modules; do not create a generic
  catch-all setup module or move business rules into the IDP.
- Keep aggregate existence separate from operational readiness and preserve stable historical
  references when records are archived.
- Keep all schema changes additive during rollout and never use fixture fallback as recovery.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001–REQ-006 / AC-001–AC-004, AC-006 | TASK-001–TASK-005 | Domain, schema, repository, route, lifecycle, and role tests |
| REQ-007–REQ-011 / AC-004–AC-005, AC-012–AC-013 | TASK-001–TASK-005 | Atomic relationship, readiness, archive, concurrency, and dependency tests |
| REQ-012–REQ-013, REQ-024 / AC-007–AC-008 | TASK-003–TASK-005, TASK-011 | Pagination/option contracts, query counts, and reviewed plans |
| REQ-014 / AC-003 | TASK-001, TASK-004–TASK-005, TASK-010 | Capability matrix and composed authorization tests |
| REQ-015–REQ-017 / AC-002, AC-004, AC-012, AC-014–AC-015 | TASK-006–TASK-008, TASK-011 | Adapter, component, browser, tenant-switch, and accessibility evidence |
| REQ-018–REQ-021 / AC-008–AC-011 | TASK-002–TASK-003, TASK-005, TASK-009 | Migration, API, selector, rename/archive, and compatibility tests |
| REQ-022–REQ-023, REQ-025–REQ-029 / AC-001, AC-005, AC-012, AC-016–AC-018 | TASK-001–TASK-005, TASK-010–TASK-012 | Isolation, transaction, audit, sentinel, migration, rollout, and gate evidence |
| REQ-030 / AC-019 | TASK-013 | Durable documentation review |
| REQ-031–REQ-033 / AC-020–AC-021 | TASK-001–TASK-006, TASK-009, TASK-014 | Preference/option schema, API, UI, isolation, and bound evidence |
| REQ-034 / AC-022 | TASK-014 | Backstage aggregate route/UI and tenant-count tests |
| REQ-035–REQ-036 / AC-023–AC-024 | TASK-001, TASK-014 | Consumer projection and snapshot contract evidence |

## Dependency Order

The critical path is contract baseline → additive schema/migration → pure domain behavior →
tenant-scoped repositories → composed API → Studio adapters/catalog UI → client preference UI →
cross-boundary QA and rollout evidence. TASK-001 must settle public contracts before parallel work.
After it, domain work in TASK-003 and additive schema work in TASK-002 may proceed in parallel, but
generated migrations and shared schema exports require one owner. Studio adapter scaffolding in
TASK-006 may proceed against committed contract fixtures while repositories/routes are implemented,
but integration cannot complete before TASK-005. TASK-007 and TASK-009 touch different Studio
modules and may run in parallel after TASK-006, coordinated around shared catalog-option contracts.
Observability/access work can progress beside repository work after stable action names and
capabilities exist. Final QA, rollout rehearsal, and durable documentation follow the integrated
behavior. TASK-014 is the cross-module integration gate and therefore executes after TASK-010 and
before TASK-011–TASK-013 despite its stable identifier.

## Tasks

### TASK-001 — Freeze aggregate, relationship, access, and compatibility contracts

- Status: Pending
- Covers: REQ-001–REQ-036, AC-001–AC-024
- Depends on: None
- Can parallelize with: None
- Relevant skills/docs: `triad-architecture`, `triad-api-development`, `triad-studio-development`,
  PRD 21, business context/access, setup and client docs
- Expected artifacts: reviewed field bounds, lifecycle/readiness rules, association invariants,
  capability matrix, list/detail/option shapes, stable error codes, version semantics, legacy
  preference compatibility matrix, and committed OpenAPI contract or route schemas usable by Studio.
- Implementation notes: inspect the pinned Elysia/OpenAPI patterns and existing client contract.
  Keep mutation inputs free of tenant IDs and `globalUserId`. Define explicit relationship replace
  commands rather than overloading base-record PATCH. Use stable English machine vocabulary and
  Brazilian Portuguese only in Studio presentation.
- Verification: contract review against every requirement and acceptance criterion; schema examples
  for active, pending, archived, renamed, legacy, denied, invalid, conflict, and foreign-tenant cases.
- Evidence required before completion: signed-off contract matrix with no unresolved implementation
  decisions and updated traceability if the accepted PRD changes.

### TASK-002 — Add additive catalog and client-preference persistence migration

- Status: Pending
- Covers: REQ-002–REQ-005, REQ-007, REQ-010, REQ-018–REQ-021, REQ-023, REQ-025,
  REQ-028, REQ-031–REQ-032, AC-001, AC-006, AC-009–AC-011, AC-017, AC-020
- Depends on: TASK-001
- Can parallelize with: TASK-003
- Relevant skills/docs: `postgres-drizzle`, `triad-api-development`, API persistence references
- Expected artifacts: Drizzle schemas and generated migration for units, professionals, services,
  three association tables, and client unit/professional/service preferences; tenant-safe compound
  keys/FKs; indexes; compatibility column retention; idempotent bounded service-label backfill
  command/report.
- Implementation notes: use the shared UUIDv7 generator in application creation paths. Store money
  as integer cents and time as validated local-time values without inventing timezone behavior.
  Index every FK and tenant/list/search path. Prevent cross-tenant associations in the database, not
  only application code. Backfill only unique normalized same-tenant matches and never print source
  labels or other PII. Do not add destructive down-migration or remove the legacy array.
- Verification: migration on empty and representative existing schema, repeat backfill, unique and
  check constraints, foreign-tenant insert attempts, index review, previous-version compatibility,
  and rollback rehearsal that leaves the additive schema in place.
- Evidence required before completion: generated SQL review, migration transcripts with safe counts,
  database assertions, and compatibility result.

### TASK-003 — Implement independent catalog domains and cross-catalog readiness

- Status: Pending
- Covers: REQ-001–REQ-011, REQ-022, REQ-025, AC-002, AC-004–AC-006, AC-012–AC-013
- Depends on: TASK-001
- Can parallelize with: TASK-002
- Relevant skills/docs: `triad-api-development`, `requirements-analysis`, PRD 21
- Expected artifacts: unit, professional, and service validation/normalization; create/update/archive/
  restore actions; readiness projection; association compatibility; version-conflict and dependency
  error vocabulary; narrow cross-module ports.
- Implementation notes: keep rules in sibling owning modules. A base create must not require a
  catalog relationship. Compute readiness from current active associations. Preserve associations
  on archive. Define the archive dependency reader as a bounded interface without adding scheduling
  tables. Avoid a generic CRUD superclass that erases domain vocabulary.
- Verification: table-driven unit tests for bounds, normalization, independent creation, readiness,
  incompatible/archived relationships, version conflicts, archive/restore, and safe error details.
- Evidence required before completion: passing domain suites mapped to aggregate invariants.

### TASK-004 — Implement tenant-scoped catalog and association repositories

- Status: Pending
- Covers: REQ-001–REQ-013, REQ-023–REQ-025, REQ-033, AC-001–AC-008, AC-012–AC-013,
  AC-021
- Depends on: TASK-002, TASK-003
- Can parallelize with: TASK-010 after TASK-001
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`
- Expected artifacts: Drizzle repositories for bounded lists/details/options, lifecycle mutations,
  relationship replacement, readiness projection, version predicates, and dependency counts.
- Implementation notes: begin every lookup and mutation with tenant predicates. Replace relationship
  sets and validate locked current state in one transaction. Do not query relationships once per
  list row; keep relation-heavy data out of list projections. Option search returns at most 50
  active matches plus bounded selected-ID hydration.
- Verification: PostgreSQL tests across two tenants, known foreign IDs, transaction rollback,
  concurrent updates, archive races, deterministic pages, selected archived options, query counts,
  and reviewed `EXPLAIN` plans on synthetic high-cardinality data.
- Evidence required before completion: isolation matrix, concurrency results, query-count assertions,
  and plan/index review.

### TASK-005 — Expose and compose catalog, assignment, and client-preference APIs

- Status: Pending
- Covers: REQ-001, REQ-006–REQ-025, REQ-031–REQ-033, AC-001–AC-014, AC-016,
  AC-020–AC-021
- Depends on: TASK-001–TASK-004, TASK-010
- Can parallelize with: TASK-006 contract scaffolding
- Relevant skills/docs: `triad-api-development`, `elysia`, API route/error/testing references
- Expected artifacts: module-owned Elysia plugins under `/api/units`, `/api/professionals`, and
  `/api/services`; explicit association routes; service option search; extended client preference
  request/projection; access enforcement; safe errors; request correlation; REST composition and
  OpenAPI output.
- Implementation notes: preserve `/api` without `/v1`. Client lists do not join preferences; detail
  bounds projections to 20. Compatibility responses keep unmatched legacy labels read-only and new
  writes accept only IDs. Validate selected IDs and replace preferences inside the client mutation
  transaction. Avoid forwarding database exceptions or input values.
- Verification: in-process route and composed PostgreSQL API tests for success, validation,
  unauthenticated, role/plan denial, foreign IDs, conflict, relationship atomicity, option bounds,
  rename/archive projection, legacy behavior, safe 500s, and OpenAPI snapshots.
- Evidence required before completion: API behavior matrix, committed contract, safe-error sentinel
  result, and passing integration suite.

### TASK-006 — Split Studio setup source composition and add catalog HTTP adapters

- Status: Pending
- Covers: REQ-015–REQ-016, REQ-022, REQ-028, REQ-033, AC-002, AC-012, AC-014,
  AC-017, AC-021
- Depends on: TASK-001; integration completion depends on TASK-005
- Can parallelize with: TASK-003–TASK-005 using contract fixtures
- Relevant skills/docs: `triad-studio-development`, Studio component-system reference,
  `docs/studio/barbershop-setup.md`
- Expected artifacts: module-owned production catalog repository ports, HTTP adapters, tenant-aware
  query keys, safe error mapping, source configuration, and explicit composition with remaining
  memory-only/disabled setup capabilities.
- Implementation notes: do not let one repository instance ambiguously combine persistent catalogs
  with memory-only payments/availability. Catalog routes use HTTP in production-capable targets and
  fail closed. Preserve the deterministic memory source only for the explicitly non-production
  evaluation path and production artifact boundaries. Do not duplicate Better Auth request logic.
- Verification: adapter contract tests, source target matrix, tenant-switch cancellation/cache
  removal, HTTP failure without fixture fallback, production-boundary build and artifact scan.
- Evidence required before completion: adapter parity matrix and source/build boundary evidence.

### TASK-007 — Adapt the Studio catalog CRUD experience to real server behavior

- Status: Pending
- Covers: REQ-015–REQ-017, REQ-022, REQ-027, AC-002–AC-007, AC-012–AC-015
- Depends on: TASK-006
- Can parallelize with: TASK-009
- Relevant skills/docs: `triad-studio-development`, `accessibility`, `impeccable`, `ux-copy`, setup docs
- Expected artifacts: server-backed unit/professional/service lists, details, independent unit/service create, professional invite/edit,
  relationship editing, readiness guidance, archive/restore, permission shaping, conflict recovery,
  loading/error/empty states, and updated route/component tests.
- Implementation notes: reuse current DataTable, shared search/filter controls, ActionDrawer, forms,
  confirmation, masks, and status components. Remove mandatory relationship validation from base
  create; edit relationships as explicit atomic sections/actions. Keep URL state non-PII and backed
  by API query parameters. Do not expose out-of-scope professional access, commission, account, or
  service-override controls as if persisted.
- Verification: Vitest and Playwright across owner/admin/member, independent creation, pending-to-
  ready transition, invalid/incompatible relationship, stale edit, archive/restore, retry, reload,
  URL restore, and tenant switch.
- Evidence required before completion: automated journeys and reviewed desktop/mobile UI evidence.

### TASK-008 — Reconcile setup readiness with the production catalog boundary

- Status: Pending
- Covers: REQ-006, REQ-008, REQ-015–REQ-017, REQ-030, AC-004, AC-014, AC-019
- Depends on: TASK-006–TASK-007
- Can parallelize with: TASK-009
- Relevant skills/docs: `triad-architecture`, `triad-studio-development`, setup PRDs/docs
- Expected artifacts: honest setup overview/readiness projection that distinguishes production
  catalog facts from unavailable or memory-only availability/payment/commission facts; no mixed-
  source completion claim in `hml`/`prd`.
- Implementation notes: do not mark full barbershop setup complete from three catalogs alone. Keep
  out-of-scope sections explicitly unavailable in production or behind their accepted evaluation
  source. Avoid copying catalog data back into the memory repository.
- Verification: target/source matrix tests for local/dev/hml/prd and browser assertions that every
  readiness statement is supported by its active source.
- Evidence required before completion: reviewed readiness matrix and production-boundary tests.

### TASK-009 — Replace client free-text preferences with catalog-backed preferences

- Status: Pending
- Covers: REQ-013, REQ-018–REQ-022, REQ-027–REQ-028, REQ-031–REQ-033,
  AC-008–AC-012, AC-014–AC-015, AC-017, AC-020–AC-021
- Depends on: TASK-005–TASK-006
- Can parallelize with: TASK-007–TASK-008
- Relevant skills/docs: `triad-studio-development`, `accessibility`, `ux-copy`, client docs
- Expected artifacts: bounded async unit/professional/service multi-selects, selected-ID hydration,
  client adapter contract update, active/archived/legacy presentations, recoverable search errors,
  and updated client tests.
- Implementation notes: accept zero to 20 service IDs and zero to five professional/unit IDs. Do not
  load complete catalogs, allow arbitrary option creation, imply ordering/exclusivity, or
  automatically choose an appointment allocation. Keep other form values through search/save
  errors. Existing archived selections remain visible/removable but cannot be newly added; legacy
  service labels are clearly historical and read-only. Partition all options and clients by tenant.
- Verification: component/adapter/E2E tests for all three preference types, search bounds, zero/many
  selections, rename, archive, legacy service values, foreign/stale IDs, retry, keyboard/focus/
  screen reader, 320px, zoom, and tenant switching.
- Evidence required before completion: preference compatibility matrix and browser/accessibility
  artifacts.

### TASK-010 — Extend catalog authorization and metadata-only audit/observability

- Status: Pending
- Covers: REQ-014, REQ-022, REQ-026, REQ-029, AC-003, AC-016
- Depends on: TASK-001
- Can parallelize with: TASK-002–TASK-004
- Relevant skills/docs: `triad-api-development`, business context/access, logging and observability
  guidelines
- Expected artifacts: `catalogs.read` and `catalogs.manage` capability definitions, role matrix,
  plan-entitlement/bootstrap compatibility, mutation audit events, metrics, traces, and safe
  structured event vocabulary.
- Implementation notes: owner/admin receive read/manage; member receives read. Do not interpret
  prototype professional access switches. Record changed field names but not values. Use route
  templates, not raw URLs/search terms, for telemetry dimensions. Preserve request correlation.
- Verification: role/plan/subscription matrix, access-summary tests, audit completeness, telemetry
  cardinality review, and sensitive sentinel assertions across success and failure.
- Evidence required before completion: authorization matrix and sanitized observability samples.

### TASK-011 — Prove performance, scale, concurrency, and accessibility behavior

- Status: Pending
- Covers: REQ-024–REQ-027, AC-005, AC-007–AC-008, AC-012, AC-015–AC-016
- Depends on: TASK-004–TASK-010, TASK-014
- Can parallelize with: TASK-012 migration/rollback preparation after TASK-005
- Relevant skills/docs: `triad-testing`, `triad-product-qa`, `accessibility`, API/Studio testing docs
- Expected artifacts: query-bound and N+1 evidence, concurrent mutation results, focused axe and
  manual browser evidence, role/tenant/failure journeys, and safe telemetry inspection.
- Implementation notes: use synthetic data and describe its limits. Do not convert response-time
  observations into capacity claims. Test list and option paths at high cardinality and verify
  bounded result/memory behavior. Exercise physical screen reader/coarse pointer when available and
  record residual manual checks otherwise.
- Verification: PostgreSQL query/count/plan suite; concurrent updates; owner/admin/member and two-
  tenant journeys; desktop, 320 CSS pixels, 200% zoom, keyboard, focused screen reader/axe, theme,
  reduced motion, errors, conflicts, and long content.
- Evidence required before completion: reviewable performance, concurrency, QA, and accessibility
  artifacts with limitations stated.

### TASK-012 — Rehearse compatible rollout, migration, and rollback

- Status: Pending
- Covers: REQ-021, REQ-028, AC-011, AC-014, AC-016–AC-018
- Depends on: TASK-002, TASK-005–TASK-010, TASK-014
- Can parallelize with: TASK-011 after integrated API availability
- Relevant skills/docs: `triad-release-workflow`, API/Studio deployment docs, migration runbook
- Expected artifacts: ordered deployment checklist, migration/backfill command, safe outcome report,
  health/smoke checks, source enablement control, previous-version compatibility proof, rollback
  rehearsal, and cleanup follow-up condition.
- Implementation notes: database first, compatible API second, Studio last. Roll back Studio before
  API and leave additive data intact. Do not enable production catalog UI until migration and health
  evidence pass. Do not remove the legacy column in this initiative.
- Verification: empty and representative database rehearsal, idempotent rerun, previous/new API and
  Studio compatibility matrix, two-tenant smoke test, simulated API rollback, and safe logs.
- Evidence required before completion: timestamped rollout/rollback transcript and decision-ready
  release checklist.

### TASK-013 — Update durable contracts and complete initiative gates

- Status: Pending
- Covers: REQ-030, AC-018–AC-019
- Depends on: TASK-011–TASK-012, TASK-014
- Can parallelize with: None
- Relevant skills/docs: `triad-architecture`, `triad-testing`, docs instructions, planning gates
- Expected artifacts: updated `docs/api/business-context-and-access.md`, new or revised durable
  catalog API documentation, `docs/studio/barbershop-setup.md`,
  `docs/studio/client-management.md`, `docs/backstage/operations.md`, downstream consumer contract
  documentation, applicable app READMEs/component inventory, initiative evidence/status, and
  recorded residual risks/follow-ups.
- Implementation notes: state which capabilities are production-backed and which remain prototype-
  only. Update AGENTS/skills/env schema only if a durable convention or deployment input changed;
  otherwise record why no update is required. Do not duplicate the PRD in durable docs.
- Verification: link and terminology review, documentation against actual routes/behavior, complete
  traceability audit, Definition of Done gate, and all commands below.
- Evidence required before completion: final evidence index, complete AC mapping, documented
  deviations/skips, and approval-aware Definition of Done result.

### TASK-014 — Integrate catalog intelligence across existing system boundaries

- Status: Pending
- Covers: REQ-033–REQ-036, AC-021–AC-024
- Depends on: TASK-004–TASK-006, TASK-010
- Can parallelize with: TASK-007–TASK-009 after option contracts stabilize
- Relevant skills/docs: `triad-architecture`, `triad-api-development`,
  `triad-backstage-development`, `triad-studio-development`, scheduling/service-desk/revenue/
  reporting/notification docs
- Expected artifacts: bounded unit/professional/service option projections with relationship
  filters; Backstage active/archived aggregate counts and UI; explicit current-catalog versus
  historical-snapshot contracts; contract fixtures/tests for downstream module seams; prohibition
  tests for real-catalog/synthetic-operation source mixing.
- Implementation notes: expose minimum option fields and never professional contacts or unit
  addresses. Backstage receives counts only and gains no catalog browsing/mutation. Agenda,
  availability, Service Desk, and notifications consume current active projections only when their
  production initiatives exist. Revenue/checkout/reporting retain event-time ID/name/duration/price/
  rule snapshots. Do not rewrite current synthetic fixture IDs to production IDs or fetch real
  catalogs inside memory scenarios.
- Verification: bounded/filtered option API tests, two-tenant Backstage count tests, safe response
  shape tests, snapshot immutability fixtures after rename/archive, and production-boundary tests
  proving no hybrid source composition.
- Evidence required before completion: reviewed cross-module integration matrix, API/UI test results,
  snapshot contract evidence, and absence-of-hybrid-source proof.

## Verification Evidence

### Local testable checkpoint — 2026-09-04

- Additive catalog, preference, and entitlement migrations applied successfully to the configured
  local PostgreSQL database.
- Studio local source changed to authenticated HTTP for the barbershop catalogs.
- Unit/service CRUD, professional invite/edit, relationship persistence, archive/restore, bounded options,
  stable-ID client preferences, and Backstage aggregate counts are integrated.
- Availability, payment settings, and operational
  synthetic modules remain outside the production-backed catalog source as required.
- Remaining Definition of Done evidence includes dedicated PostgreSQL isolation/concurrency suites,
  browser E2E evidence, legacy-label backfill reporting, and the release rehearsal.

Record evidence as tasks are completed:

- Command: `bun --filter api check`
- Result: Passed — 252 tests
- Notes: Includes API format/lint/type/unit gates.
- Command: `bun --filter api coverage:check`
- Result: Passed — 89.90% statements, 80.16% branches, 91.69% functions, 91.62% lines
- Notes: Meets the required 80% global thresholds.
- Command: `bun --filter api test:integration:postgres`
- Result: Blocked locally — the opt-in suite requires a loopback, non-default-port database whose
  name ends in `_test`; `TEST_DATABASE_URL` is not configured.
- Notes: The configured application database migration and a disposable invitation acceptance/link
  smoke test passed, but they do not replace the isolated suite.
- Command: `bun --filter api build`
- Result: Passed
- Notes: Production API compilation.
- Command: `bun --filter studio check`
- Result: Passed — typecheck, 394 tests, production build, and production boundary.
- Notes: Biome reports one non-blocking pre-existing redundant-fragment info in Service Desk.
- Command: `bun --filter studio test:e2e`
- Result: Passed — 17 Chromium journeys
- Notes: Covers navigation and clean paths, split-period unit creation, independent service creation,
  relationship filtering, setup rendering with axe, responsive behavior, and operational prototypes.
- Command: `bun --filter studio build`
- Result: Passed
- Notes: Production Studio build.
- Command: `bun --filter backstage check`
- Result: Passed — 4 tests and production-boundary build
- Notes: Backstage format/lint/type/test gate, including catalog aggregate projections.
- Command: `bun --filter backstage build`
- Result: Passed through `backstage check`
- Notes: Production Backstage build without tenant catalog records or Studio fixtures.

## Risks And Follow-Ups

- [ ] Resolve unmatched/ambiguous legacy service-preference labels before approving removal of the
  compatibility column in a later initiative.
- [x] Persist multiple weekly opening periods for disjoint weekday groups and validate ordering plus
  weekday exclusivity.
- [ ] Validate split intervals on the same weekday before production availability design.
- [x] Replace standalone professional creation with invite-only onboarding, pending business
  attributes, acceptance-time IDP-user linking, and identity-derived personal profile display.
- [ ] Add scheduling-owned active dependency readers when appointments become persistent.
- [ ] Revisit association bounds and option-search performance only with measured tenant data.
- [ ] Validate whether client affinities later need ordering, a single primary choice, or
  professional-by-service semantics before adding any automatic behavior.

## Scope Changes

- 2026-09-04 — Product owner rejected standalone professional records and employees without login.
  Professional onboarding is now mandatory invitation → acceptance → IDP identity linking. Remove
  duplicated name/email/phone ownership from the business relationship. This approved correction
  supersedes the original deferred-linking assumption in REQ-004 and TASK-003.

## Definition of Done

- [ ] The implemented PRD version was explicitly approved.
- [ ] All applicable gates in
      `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [ ] Every in-scope AC has reviewable evidence.
- [ ] Deviations, skipped checks, residual risks, and follow-ups are recorded.
