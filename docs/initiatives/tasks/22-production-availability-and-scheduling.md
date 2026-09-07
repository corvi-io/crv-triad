# 22 Production Availability And Scheduling - Execution Plan

## Source

- PRD: `docs/initiatives/prds/22-production-availability-and-scheduling.md`
- Related issue/PR: Not created
- Approval state: Approved
- Approved PRD version/date: 2026-09-05

## Implementation Principles

- Do not begin implementation until the linked PRD version is explicitly approved.
- Follow the accepted recommendation from the PRD and keep scope bounded to its acceptance criteria.
- The user explicitly authorized runtime work on 2026-09-05 using the completed
  Initiative 21 contracts; the user confirmed predecessor completion during implementation.
  Preserve concurrent work and validate integration contracts before cutover.
- Preserve user-owned dirty work and inspect overlapping diffs before every implementation/resume.
- Use Clientes as the baseline for shared product anatomy; record every deliberate difference in the
  parity matrix before coding the difference.
- Never replace accepted behavior with placeholders, synthetic defaults, fake counters, disabled
  future actions, generic errors, or silent fixture fallbacks.
- Keep availability and scheduling as sibling API modules with narrow catalog/client dependencies.
- Update the Continuation Checkpoint before any pause, handoff, context switch, or task-owner change.
- Mark no task complete until its stated behavioral, browser, and documentation evidence exists.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001–REQ-008 / AC-001–AC-004 | TASK-001–TASK-005 | Dependency, domain, schema, repository, route, role, recurrence, and isolation tests |
| REQ-009–REQ-017 / AC-005–AC-008 | TASK-001–TASK-004, TASK-006–TASK-007 | Appointment domain/API, collision, idempotency, range/list, transition and query evidence |
| REQ-018–REQ-022 / AC-009–AC-011 | TASK-001, TASK-007–TASK-010 | Client create/preferences/history, professional and Dashboard projection tests |
| REQ-023–REQ-024 / AC-012 | TASK-007–TASK-010, TASK-014 | Source matrix, adapter, artifact, and no-hybrid evidence |
| REQ-025–REQ-037 / AC-013–AC-018 | TASK-002, TASK-008–TASK-012, TASK-015 | Parity matrix, forms/copy/layout/URL/a11y states and browser screenshots |
| REQ-038–REQ-042 / AC-001, AC-004, AC-006, AC-008, AC-019–AC-021 | TASK-003–TASK-007, TASK-013–TASK-015 | Bounds, query plan, concurrency, telemetry, migration, rollout and gates |
| REQ-043–REQ-047 / AC-013–AC-017, AC-021–AC-023 | TASK-001–TASK-002, TASK-011–TASK-016 | Resume drill, evidence gates, visual QA, coverage, docs and completion audit |

## Dependency Order

The critical path is Initiative 21 completion/current-contract audit → UX parity and API contract
freeze → additive schema → availability/scheduling domains → transactional repositories → composed
API → HTTP adapters/source split → availability and Agenda UI → Client/professional/Dashboard
integration → observability/performance/accessibility/product QA → rollout rehearsal → durable docs.

TASK-001 and TASK-002 are mandatory gates and execute in order. After both pass, TASK-003 domain and
schema design may be divided by module, but one owner controls shared migrations and contract files.
Availability must reach a stable projection contract before appointment collision integration closes.
Studio adapter scaffolding may use committed contract fixtures while API repositories are built, but
normal routes cannot switch until TASK-007 and TASK-010 pass. TASK-008 and TASK-009 can proceed in
parallel after the shared adapter/parity contracts stabilize. TASK-011–TASK-013 may collect focused
evidence alongside integration, while final QA/rollout/docs remain ordered.

## Continuation Checkpoint

- State: Complete — local product QA approved; final aggregate Studio check passed.
- Authorization: Initiative 21 is complete by explicit user confirmation. No approval is pending.
- Source: `feat/backstage-deployment`, HEAD `685fa22855fd313b5add072f189bd872b058bee9`; preserve
  all concurrent dirty work, including initiatives 23/24, service desk, deployment and profile images.
- Implementation: sibling availability/scheduling API modules, additive 0001/0002 migrations,
  explicit unit timezone, recurrence/exception/archive/restore, transactional commands, idempotency,
  optimistic versions, GiST collision exclusion, bounded private occupancy/list/history, real HTTP
  Agenda/availability/Dashboard, canonical quick client/preferences/history and professional upcoming.
- API: 38 files / 340 tests; coverage 89.76 statements / 81.68 branches / 90.22 functions / 91.63
  lines; build passed. PostgreSQL 4 files / 18 tests passed on `initiative22_suite_test`.
- Studio: threshold-bearing coverage run 8 passed 69 files / 678 tests, 84.62 statements / 80.13
  branches / 83.00 functions / 86.06 lines. No coverage exclusions or lowered thresholds.
- Browser: 11 production tests and 95-file artifact boundary passed; 2 real HTTP/PostgreSQL tests
  passed; adjacent regression 44 passed plus corrected keyboard recheck 1 passed. Real touch
  recurrence/create/reschedule/cancel passed with zero axe WCAG 2.2 violations and zero page errors.
- Recovery/isolation: canonical quick-create cancellation/save, offline stable-key retry, conflict,
  stale-version explicit reload, cross-module invalidation, owner/admin/member permissions and
  same-user two-tenant switch with stale tab/foreign IDs all verified locally.
- Visual evidence: responsive r2 light/dark 320px, keyboard focus, forced colors, reduced motion,
  equivalent 200% reflow and touch screenshots inspected. Sonner now uses existing semantic feedback
  colors after observed 4.25:1 success contrast failure. Mechanical detector ran exactly once (`[]`).
- Local runner: `bun scripts/scheduling-local-qa.ts`, `/tmp/initiative22-local-runner.log`;
  Studio 3102/API 8102/PostgreSQL loopback 55442, `initiative22_test`. Credentials are ignored at
  `apps/api/.artifacts/initiative22/credentials.json`. Normal app ports and remote DB are untouched.
- Migration/performance: representative baseline upgrade/repeat migration preserved null timezone
  and existing column access; rollback retains additive schema. 10k temporary rows used indexed
  page/history queries (0.142/0.056 ms); 1k rules/42 dates yielded 30k occurrences in 16.36 ms.
  These are local observations, not a capacity guarantee.
- Evidence: `acceptance-matrix.md`, `ui-inventory.md`, `qa-findings.md`, and `product-qa.md/json` in
  `docs/initiatives/evidence/22-production-availability-and-scheduling`. Final report is approved
  with weighted score 9.0; do not revert to superseded intermediate coverage metrics.
- Workflow: Studio `coverage:check` enforces 80% in all four metrics; CI and staged-Studio pre-commit
  use the same command. AGENTS and env metadata are unchanged because ownership and deployment inputs
  are unchanged; the preflight skill's stale FastAPI mention was corrected to Bun/Elysia.
- Final checks: `/tmp/initiative22-studio-check-final.log` passed all 678 tests, types, Biome, build
  and artifact boundary. `/tmp/initiative22-production-final-confirmation.log` passed 11/11.
  API health returned OK and Studio login returned HTTP 200; `git diff --check` passed.
- Next safe action: user tests the local Studio at port 3102 with the existing QA owner and date
  2026-09-07. Restart the isolated runner only if it is stopped. No implementation gate remains.
  Do not commit, publish, deploy, clean the live QA DB, or disturb concurrent work without new scope.

## Tasks

### TASK-001 — Audit Initiative 21 completion and freeze dependency contracts

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-001–REQ-024, REQ-038–REQ-045, AC-001–AC-012, AC-019–AC-022
- Depends on: Explicit approval of this initiative; Initiative 21 declared complete with evidence
- Can parallelize with: None
- Relevant skills/docs: `triad-initiative-workflow`, `triad-architecture`, Initiative 21 PRD/plan/
  evidence, `triad-preflight-review`
- Expected artifacts: completed dependency matrix for clients, units/timezones, invited professionals,
  services, relationships, catalog options, capabilities, versions, archives, preference projections,
  source targets, and known Initiative 21 residual risks.
- Implementation notes: read the actual merged/current contracts and migrations, not only Initiative
  21's initial PRD. Inspect `git status` and overlapping diffs. If required fields, ownership, access,
  route shapes, or lifecycle semantics materially conflict with PRD 22, stop and return it to
  `Awaiting approval`; do not adapt silently.
- Verification: Initiative 21 Definition of Done evidence; API/Studio catalog/client checks; explicit
  examples for active/archived/pending/foreign records and option hydration.
- Evidence required before completion: signed dependency matrix, exact source version, residual-risk
  list, and updated Continuation Checkpoint.

### TASK-002 — Freeze UX parity, field inventory, copy, state, and source contracts

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-023–REQ-037, REQ-043–REQ-046, AC-012–AC-018, AC-022
- Depends on: TASK-001
- Can parallelize with: None
- Relevant skills/docs: `impeccable` (`shape`, Operate mode), `triad-studio-development`,
  `accessibility`, `ux-copy`, `shadcn`, Client/setup/Agenda/component/theme docs
- Expected artifacts: committed Client-baseline parity matrix; complete availability/appointment
  field inventories; exact Portuguese labels/placeholders/descriptions/actions/errors/success copy;
  default/dependency-clearing rules; responsive topology; focus/announcement map; target/source matrix;
  and approved design brief for preserved visual direction.
- Implementation notes: inspect real Client and catalog screens in the browser. For each shared
  pattern decide `reuse`, `deliberate specialization`, or `not applicable` with reason. Specify every
  visible field and state before UI work; no builder-created placeholder, default, disabled control,
  or spacing convention is allowed. Check installed components, official shadcn, then reviewed
  registries before accepting a custom shared component.
- Verification: design/product review of typical/minimum/maximum content, all states, desktop/320px,
  light/dark, keyboard, zoom, forced colors, reduced motion, and long Portuguese strings.
- Evidence required before completion: approved parity matrix/design brief and zero unresolved UI
  decisions disguised as implementation.

### TASK-003 — Define scheduling/availability API and database contracts

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-001–REQ-016, REQ-038–REQ-042, AC-001–AC-008, AC-019–AC-020
- Depends on: TASK-001–TASK-002
- Can parallelize with: Studio adapter fixture design after public contract freeze
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `elysia`, API conventions
- Expected artifacts: OpenAPI route/command/query/error shapes; capability matrix; timezone/local/UTC
  rules; recurrence/precedence rules; transition matrix; idempotency/version semantics; schema,
  constraints, indexes, transactions, retention and rollback design.
- Implementation notes: keep tenant IDs out of mutation inputs. Define board range separately from
  paginated history. Define private occupancy as a distinct projection. Specify trusted future
  service/checkout transitions without exposing a generic status mutation.
- Verification: contract examples for DST ambiguity, recurrence exceptions, catalog archive,
  collision, duplicate retry, stale write, foreign ID, invalid transition, and safe errors.
- Evidence required before completion: reviewed contract/schema matrix with every domain decision
  resolved and mapped to tests.

### TASK-004 — Add additive timezone, availability, appointment, idempotency, and event migrations

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-002, REQ-004–REQ-008, REQ-011–REQ-016, REQ-039–REQ-042, AC-002–AC-007,
  AC-019–AC-020
- Depends on: TASK-003
- Can parallelize with: TASK-005 pure domain work
- Relevant skills/docs: `postgres-drizzle`, `triad-api-development`, migration/release docs
- Expected artifacts: Drizzle schemas/generated SQL plus reviewed raw SQL where exclusion support is
  required; additive unit timezone; availability series/exceptions; appointments; command
  idempotency; immutable appointment events; tenant-safe compound keys and access-path indexes.
- Implementation notes: do not backfill a guessed timezone or migrate fixtures. Database-enforce
  tenant relationships and occupying-range exclusion. Preserve schema during application rollback.
  Index every FK and tenant/unit/professional/time query path.
- Verification: migrate empty and representative Initiative 21 database, constraint violations,
  concurrent overlap attempts, idempotent migration, previous application compatibility, index/
  query-plan review, and rollback rehearsal without destructive down migration.
- Evidence required before completion: SQL review, migration transcripts, database assertions, and
  safe rollback evidence.

### TASK-005 — Implement availability domain and bounded recurrence projection

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-001–REQ-008, REQ-038–REQ-041, AC-001–AC-004, AC-019
- Depends on: TASK-003; persistence completion depends on TASK-004
- Can parallelize with: TASK-006 pure scheduling domain
- Relevant skills/docs: `triad-api-development`, `triad-testing`, scheduling/setup docs
- Expected artifacts: validation, series lifecycle, exception batch, precedence, timezone conversion,
  bounded occurrence projector, tenant-scoped repository, stable errors, audit/telemetry hooks.
- Implementation notes: make recurrence expansion pure and deterministic. Apply exception plus
  override atomically. Expose appointment occupancy read-only through an injected port. Reject
  invalid/archived/incompatible catalog references at transaction time.
- Verification: table/property-style date cases, DST invalid/ambiguous cases, range bounds,
  recurrence/exclusions, overlaps, occurrence/series scopes, stale versions, rollback, two tenants,
  and safe sentinel errors.
- Evidence required before completion: domain/database/API-ready availability suite and projection
  examples for day/week/month.

### TASK-006 — Implement appointment domain, transitions, collision, and projections

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-001, REQ-009–REQ-022, REQ-038–REQ-041, AC-001, AC-005–AC-011, AC-019
- Depends on: TASK-003; persistence completion depends on TASK-004–TASK-005
- Can parallelize with: TASK-005 pure/domain work
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`, Client/catalog docs
- Expected artifacts: appointment create/edit/reschedule/confirm/check-in/cancel/no-show use cases;
  catalog/client snapshot resolver; availability/collision policy; transition matrix; idempotency;
  event append; board/list/private occupancy; Client/professional/Dashboard projections.
- Implementation notes: server resolves price/duration/snapshots and locks/rechecks mutable facts in
  one transaction. Use database exclusion as final collision authority. Keep future service/checkout
  transition functions narrow and non-public. Client list next-appointment must be set-based.
- Verification: domain matrix, concurrent collisions, retry-after-timeout, stale writes, archive
  races, transition legality, snapshot immutability, two tenants, bounded projections, query counts,
  and client `lastVisitAt` remaining unavailable.
- Evidence required before completion: scheduling behavior/isolation/concurrency/query evidence.

### TASK-007 — Expose, authorize, observe, and compose production HTTP APIs

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-001–REQ-024, REQ-038–REQ-042, AC-001–AC-012, AC-019–AC-021
- Depends on: TASK-004–TASK-006
- Can parallelize with: TASK-008 using committed contract fixtures
- Relevant skills/docs: `triad-api-development`, `elysia`, `triad-testing`, business access docs
- Expected artifacts: module-owned availability/scheduling Elysia plugins; range/list/detail/command
  routes; capabilities/entitlements; explicit composition root wiring; OpenAPI; stable safe errors;
  metadata-only audit, metrics, traces, and alerts.
- Implementation notes: use `/api` without `/v1`; require bounded ranges/pages and idempotency on
  commands; authorize before data lookup; return safe request IDs; never expose raw database errors
  or private occupancy details.
- Verification: in-process routes plus composed PostgreSQL tests for auth/roles/plan, validation,
  success, foreign IDs, conflict, stale, retry, 500 sentinel, bounds, and OpenAPI snapshots.
- Evidence required before completion: route matrix, authorization matrix, sanitized telemetry, and
  passing API gates.

### TASK-008 — Build Studio HTTP adapters and fail-closed source composition

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-017–REQ-024, REQ-032–REQ-033, REQ-042, AC-008–AC-012, AC-017–AC-020
- Depends on: TASK-002–TASK-003; integration completion depends on TASK-007
- Can parallelize with: TASK-004–TASK-007 using contract fixtures
- Relevant skills/docs: `triad-studio-development`, component-system source rules, Agenda/setup docs
- Expected artifacts: typed availability/scheduling repository ports, HTTP adapters, safe error
  mapping, tenant-aware query keys/cancellation, target source matrix, production-boundary artifact
  rules, and explicit development QA fixture entrypoints.
- Implementation notes: normal Agenda/setup/Dashboard use one HTTP-backed scheduling composition.
  Do not keep a split-brain normal route or fall back to memory. Cancel/remove old-tenant data before
  rendering new context. Keep Client and Better Auth adapters separate.
- Verification: adapter contracts; local/dev/hml/prd matrix; tenant-switch race; network/auth/conflict
  errors without fixtures; production artifact scan; no real-catalog/synthetic-operation mixing.
- Evidence required before completion: adapter parity and source-boundary matrix.

### TASK-009 — Adapt persistent availability management UI

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-002–REQ-008, REQ-023–REQ-037, AC-002–AC-004, AC-012–AC-018
- Depends on: TASK-002, TASK-005, TASK-008
- Can parallelize with: TASK-010 after shared adapter/parity contracts stabilize
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `accessibility`, `ux-copy`, setup docs
- Expected artifacts: HTTP-backed day/week/month calendar; unit/professional selectors; timezone and
  missing-setup states; explicit block editor; recurrence/occurrence scope; conflicts/stale/retry;
  Client-baseline drawer/form/feedback/layout behavior; focused tests and screenshots.
- Implementation notes: reuse the existing calendar interaction only where it meets the frozen
  contracts. Drag is optional acceleration. Keep forms explicit, labels persistent, placeholders
  supporting only, masks/composed date/time controls shared, and editor draft intact on failure.
- Verification: owner/admin/member, recurrence/one-off, occurrence/series, invalid hours/overlap,
  conflict, stale, loading/error/empty, keyboard/touch, focus, screen reader, 320px/zoom/themes/
  forced-colors/reduced-motion, and screenshot parity.
- Evidence required before completion: availability journey, state matrix, accessibility and visual
  artifacts reviewed against TASK-002.

### TASK-010 — Adapt production Agenda and appointment lifecycle UI

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-009–REQ-019, REQ-023–REQ-037, AC-005–AC-010, AC-012–AC-018
- Depends on: TASK-002, TASK-006, TASK-008
- Can parallelize with: TASK-009
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `accessibility`, `ux-copy`, Agenda docs
- Expected artifacts: real unit/date/scope/view controls; server-backed filters; coherent day/week
  board and paginated list; create/view/edit/reschedule/cancel/no-show/check-in drawers/dialogs;
  canonical client selector/quick-create; preference suggestions; all states and screenshots.
- Implementation notes: remove hard-coded IDs, duplicated customer fields, synthetic defaults,
  payment/rating/tags, editable generic status, and prototype copy. Preserve accepted temporal cards,
  list alternative, private occupancy, pointer/keyboard paths, and exact Client shared anatomy.
- Verification: full lifecycle, quick-create preservation, eligibility, conflict/stale/idempotent retry,
  filters/URLs/deep links, no setup/no results/errors, pointer/touch/keyboard, focus/announcements,
  desktop/320px/zoom/themes/forced-colors/reduced-motion, and screenshot parity.
- Evidence required before completion: Agenda journey/state/parity/accessibility artifacts.

### TASK-011 — Integrate Client, professional detail, and Dashboard projections

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-020–REQ-024, REQ-025–REQ-037, AC-011–AC-018
- Depends on: TASK-006–TASK-010
- Can parallelize with: TASK-012 observability/performance review
- Relevant skills/docs: `triad-studio-development`, Client/catalog/Dashboard docs
- Expected artifacts: client history/next appointment; professional today/upcoming Agenda; unit/service
  deep links where bounded; Dashboard real scheduling projection; coordinated query invalidation and
  no duplicate source.
- Implementation notes: keep Client list set-based and history bounded. Do not fabricate last visit,
  completed service, revenue, payment, or queue data. Use non-PII deep-link search params and the same
  appointment drawer/detail contract where appropriate.
- Verification: create/reschedule/cancel effects across all consumers, tenant switch, archived
  snapshots, URL links, query counts, loading/error/empty states, and Client parity regression.
- Evidence required before completion: cross-module coherence matrix and browser/database evidence.

### TASK-012 — Execute product consistency, copy, and continuation review

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-025–REQ-037, REQ-043–REQ-046, AC-013–AC-018, AC-022
- Depends on: TASK-009–TASK-011
- Can parallelize with: TASK-013
- Relevant skills/docs: `impeccable` (`audit`, `polish`), `ux-copy`, `accessibility`, Client baseline,
  design/component docs
- Expected artifacts: completed parity matrix, field/copy inventory diff, placeholder/mask/default
  scan, computed style/spacing/scroll report, batched desktop/mobile light/dark screenshots, defect
  list, one bounded correction pass, confirmation pass, and continuation-resume drill.
- Implementation notes: inspect Client and scheduling surfaces side by side. Fail the task for any
  unexplained mismatch, placeholder-as-label, prototype copy, invented default/action, inconsistent
  feedback, duplicated inset, clipped overlay, idle scrollbar, raw error, or missing state. Run the
  Impeccable mechanical detector once after UI changes, as required by the skill.
- Verification: browser-computed dimensions/contrast/overflow; text inventory; visual review; all
  AC-013–AC-018 states; interrupt after a recorded checkpoint and verify safe resumption without
  rediscovery.
- Evidence required before completion: resolved defect report, before/after artifacts, detector
  output, and successful resume transcript.

### TASK-013 — Prove performance, privacy, concurrency, and operational diagnosis

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-038–REQ-041, REQ-046–REQ-047, AC-001, AC-004, AC-006, AC-008,
  AC-016, AC-019, AC-021
- Depends on: TASK-005–TASK-011
- Can parallelize with: TASK-012
- Relevant skills/docs: `triad-testing`, `triad-product-qa`, `postgres-drizzle`, observability guidance
- Expected artifacts: query-count/plans, high-cardinality bounded fixtures, collision races,
  recurrence timing, UI render/overflow evidence, sensitive sentinels, telemetry samples, and
  threshold-bearing coverage results.
- Implementation notes: make no capacity claim from fixtures. Verify no N+1, global scans, unbounded
  expansion, raw search telemetry, or PII in errors/events. Review stale in-flight work during tenant
  switch and simultaneous reception commands.
- Verification: PostgreSQL plans/counts, concurrent command harness, API/Studio coverage, browser
  responsiveness, sentinel scans, and alert-path simulation.
- Evidence required before completion: performance/concurrency/privacy report with limitations and
  all threshold commands passing.

### TASK-014 — Rehearse migration, source cutover, compatibility, and rollback

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-023–REQ-024, REQ-040–REQ-042, AC-012, AC-019–AC-021
- Depends on: TASK-004, TASK-007–TASK-013
- Can parallelize with: None
- Relevant skills/docs: `triad-release-workflow`, API/Studio deployment docs
- Expected artifacts: ordered database/API/Studio rollout, timezone-confirmation behavior, health and
  smoke checks, source enablement, previous-version compatibility, failure simulation, rollback, and
  production artifact scan.
- Implementation notes: database first, compatible API second, Studio source last. Preserve data on
  rollback and present explicit unavailable state instead of fixtures. Confirm local/dev/hml/prd
  behavior separately.
- Verification: empty/existing migration, two-tenant smoke, collision smoke, previous/new version
  matrix, API failure during cutover, Studio/API rollback, and safe logs.
- Evidence required before completion: timestamped rollout/rollback transcript and release checklist.

### TASK-015 — Execute final automated and corrective product QA gates

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-025–REQ-047, AC-013–AC-023
- Depends on: TASK-012–TASK-014
- Can parallelize with: None
- Relevant skills/docs: `triad-preflight-review`, `triad-product-qa`, `triad-testing`, `accessibility`,
  approved parity matrix
- Expected artifacts: final command results, real local browser journeys against API/PostgreSQL,
  corrective findings/fixes, desktop/mobile screenshots, accessibility evidence, regression matrix,
  and residual manual checks.
- Implementation notes: QA must use real HTTP/database paths and at least two distinguishable tenants.
  Recheck every finding after correction. Automated Playwright is repeatability evidence, not a
  substitute for product-owner visual review. Do not waive consistency failures as subjective.
- Verification: commands below plus owner/admin/member, two-tenant, typical/empty/error/conflict/
  archived/long-content journeys and Client/catalog/auth/shell regressions.
- Evidence required before completion: final QA report with every AC mapped, failures resolved or
  explicitly approved as residual risk, and no unsupported pass claim.

### TASK-016 — Update durable documentation and close initiative evidence

- Status: Complete — evidence in the completion ledger below.
- Covers: REQ-041–REQ-047, AC-019–AC-023
- Depends on: TASK-015
- Can parallelize with: None
- Relevant skills/docs: `triad-architecture`, docs instructions, planning gates
- Expected artifacts: updated `docs/api/business-context-and-access.md`, scheduling/availability API
  docs, `docs/studio/schedule-prototype.md` replaced or revised as production scheduling docs,
  `docs/studio/barbershop-setup.md`, client/Dashboard/component/testing/deployment docs, app READMEs,
  initiative status/evidence, deviations, and follow-ups.
- Implementation notes: update AGENTS/skills/env schema only when durable conventions or deployment
  inputs change; otherwise record why not. Clearly assign deferred queue/fulfillment transitions.
  Complete the Continuation Checkpoint even at final handoff.
- Verification: docs-to-runtime/route/copy review, links, terminology, traceability, Definition of
  Done, and approval history.
- Evidence required before completion: final evidence index and reviewable initiative closure.

## Verification Evidence

Record evidence as tasks are completed:

- Command: `bun --filter api check`
- Result: Pending
- Notes: API format/lint/type/unit gate.
- Command: `bun --filter api coverage:check`
- Result: Pending
- Notes: At least 80% statements, branches, functions, and lines.
- Command: `bun --filter api test:integration:postgres`
- Result: Pending
- Notes: Migrations, tenant isolation, recurrence, collision, idempotency, and queries.
- Command: `bun --filter api build`
- Result: Pending
- Notes: Production API compilation.
- Command: `bun --filter studio check`
- Result: Pending
- Notes: Routes, format/lint, types, unit/component, and production boundary.
- Command: `bun --filter studio test:e2e`
- Result: Pending
- Notes: Real scheduling and regression browser journeys.
- Command: `bun --filter studio test:production-boundary`
- Result: Pending
- Notes: No fixture fallback or scenario artifacts on normal production routes.
- Command: `bun --filter studio build`
- Result: Pending
- Notes: Production Studio build.
- Command: Impeccable detector over changed Studio targets
- Result: Pending
- Notes: Run once after UI completion, followed by one bounded correction/confirmation cycle.

## Risks And Follow-Ups

- [x] Initiative 21 completed; current contracts audited and additive integration verified.
- [ ] Professional self-service schedule/visibility policy needs a later product/access decision.
- [ ] Realtime transport needs measured demand and a separate delivery decision.
- [ ] Queue/service fulfillment must receive the trusted waiting/in-progress/completed transition ports.
- [ ] Retention/partitioning needs real growth and legal evidence.
- [ ] Public booking, reminders, recurring bookings, waitlists, and provider sync remain separate.

## Scope Changes

- None. Record change, reason, PRD/AC impact, and approval decision before implementation continues.

## Definition of Done

- [x] The implemented PRD version was explicitly approved on 2026-09-05.
- [ ] All applicable gates in
      `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [ ] Every in-scope AC has reviewable evidence.
- [ ] The UI parity matrix and Continuation Checkpoint are complete and accurate.
- [ ] Deviations, skipped checks, residual risks, and follow-ups are recorded.




## Completion ledger

| Task | Completed evidence |
| --- | --- |
| TASK-001 | Dependency audit, user-confirmed Initiative 21 completion, source HEAD and preserved dirty baseline |
| TASK-002 | `ui-inventory.md` shared anatomy, field/copy/default/source contract and inspected Client parity |
| TASK-003 | `docs/api/availability-and-scheduling.md`; sibling modules, capability and canonical reference contracts |
| TASK-004 | Additive 0001/0002 SQL/snapshots; empty and representative-existing migration rehearsal |
| TASK-005 | Availability domain/API/PostgreSQL tests, recurrence scopes/exclusions and 42-date bounds |
| TASK-006 | Scheduling tests, GiST concurrent collision proof, immutable snapshots and bounded projections |
| TASK-007 | 68 route cases, authentication/capabilities/foreign IDs, safe metadata observer |
| TASK-008 | HTTP adapter tests, 95-file production boundary and 11 production browser cases |
| TASK-009 | Real recurring/one-off archive/restore, timezones, read-only member, stale recovery and calendar components |
| TASK-010 | Real booking lifecycle, quick client, offline/conflict/stale retry, keyboard/touch and URL/list/board tests |
| TASK-011 | Real Dashboard, Client history/next appointment, professional detail, tenant-switch invalidation |
| TASK-012 | `qa-findings.md`, inspected screenshots, one detector run, checkpoint-based resumption |
| TASK-013 | Local query plans/timing, concurrency/sensitive-sentinel tests; API and Studio four-metric coverage gates passed |
| TASK-014 | Local baseline upgrade, repeat migrate, old-column compatibility, additive data-preserving rollback and HTTP cutover failure tests |
| TASK-015 | `product-qa.md/json`, `acceptance-matrix.md`, final 678-test check, live and production browser confirmations |
| TASK-016 | API/Studio/README/adjacent module/component/testing/deployment docs, same CI/pre-commit coverage command, completed checkpoint |

All criteria AC-001–AC-023 are verified in the acceptance matrix. Deferred queue/fulfillment work,
release publication and deployment are outside this completed local implementation scope.

## Product acceptance and staging handoff — 2026-09-05

The product owner approved availability and scheduling after interactive local testing.
The owner additionally requested restoration of the original Dashboard composition, with real
integrated scheduling values and explicit pending states for unavailable operational metrics,
followed by preflight, Codex review and merge into staging. Production promotion is not included.
The release branch preserves staging migration history and appends 0018–0020; the shared local
checkout and its concurrent migration consolidation remain untouched.
