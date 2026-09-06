# 25 Production Business Profile, Commissions And Management Reporting - Execution Plan

## Source

- PRD: `docs/initiatives/prds/25-production-business-profile-commissions-and-management-reporting.md`
- Related issue/PR:
- Approval state: Approved
- Approved PRD version/date: Approved / 2026-09-06

## Implementation Principles

- Do not begin implementation until the linked PRD version is explicitly approved.
- Follow the accepted recommendation: bounded synchronous report aggregates plus asynchronous
  Trigger.dev PDF/CSV artifacts in private R2.
- Keep PostgreSQL authoritative for profile, commission and report state; provider runs and objects
  never authorize user access.
- Preserve Initiative 23/24 financial and lifecycle boundaries and never invent historical
  commissions.
- Treat the current frontend as the accepted product contract. Do not remove or simplify a field,
  behavior, state or interaction to fit a backend implementation. Use the PRD's exception and
  reapproval process only for a verified hard constraint.
- Keep business profile/media outside IDP and keep all user-facing Studio copy in Brazilian Portuguese.
- Use relevant Triad skills before implementation and update this plan when predecessor review
  changes an accepted contract.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001–REQ-004 / AC-001–AC-002 | TASK-002, TASK-003, TASK-004, TASK-011 | Profile domain/API/UI, storage-contract and access tests |
| REQ-005–REQ-009, REQ-022–REQ-023 / AC-003–AC-004 | TASK-005, TASK-006, TASK-007, TASK-011 | Policy, snapshot, reversal, concurrency and reconciliation tests |
| REQ-010–REQ-013 (including REQ-012), REQ-021, REQ-024 / AC-005–AC-006 | TASK-008, TASK-009, TASK-011 | Aggregate SQL/API/UI and report invariant tests |
| REQ-014–REQ-020 (including REQ-017), REQ-025 / AC-007–AC-009 | TASK-010, TASK-011, TASK-012, TASK-013 | Job state, Trigger/R2 failure, artifact and download tests |
| REQ-026 / AC-011 | TASK-014, TASK-016 | Telemetry/audit redaction and operational failure evidence |
| REQ-027–REQ-028 / AC-010 | TASK-004, TASK-007, TASK-009, TASK-013, TASK-015 | Vitest, axe, Playwright and manual assistive-technology evidence |
| REQ-029–REQ-030 / AC-012 | TASK-001, TASK-012, TASK-016, TASK-017 | Env/readiness, provider fake, rollout and rollback evidence |
| REQ-031–REQ-032 / AC-013 | TASK-001, TASK-018, TASK-004, TASK-007, TASK-009, TASK-013, TASK-015 | Baseline inventory, adapter conformance and paired visual/behavior parity evidence |

## Dependency Order

TASK-001 freezes predecessor/provider contracts. TASK-018 captures the frontend contract before any
integration change and gates all Studio integration tasks. TASK-002 establishes additive persistence and must
precede API/domain writes. After TASK-002, profile storage/API work (TASK-003) and commission policy
work (TASK-005) may proceed in parallel. Their Studio consumers (TASK-004 and TASK-007) follow their
respective APIs. Receipt snapshots (TASK-006) depend on the commission policy and Initiative 24
contract. Reporting aggregates (TASK-008) depend on final 23/24 plus commission facts; reporting UI
(TASK-009) follows. Async report persistence/task contracts (TASK-010) can begin after TASK-002 and
run parallel to aggregate UI work, but generation/storage (TASK-011/TASK-012) depends on stable
report definitions. Generated-report UI (TASK-013) follows the job API. Observability, QA and docs
finish after all paths exist. Shared schema, access capability, REST composition, env and generated
route files are serialized through the owning task to avoid parallel conflicts.

## Tasks

### TASK-001 — Freeze predecessor, provider and UX contracts

- Status: Complete — evidence: [contract and provider readiness](../evidence/25-production-business-profile-commissions-and-management-reporting/contracts-and-provider-readiness.md)
- Covers: REQ-015–REQ-018, REQ-027–REQ-030, AC-012
- Depends on: Initiative 23/24 review completion for final contract names; PRD approval
- Can parallelize with: None
- Relevant skills/docs: `triad-initiative-workflow`, `triad-architecture`, `impeccable`, `ux-copy`,
  installed `trigger-setup`, `trigger-tasks`, `cloudflare-r2`, and official provider docs
- Expected artifacts: accepted 23/24 contract map; current SDK/version decision; report/commission
  UX brief recorded in durable Studio docs; provider resource checklist and safe env-name map
- Implementation notes: verify current official APIs before dependency installation; configure
  Trigger.dev from `apps/api` with Bun runtime, an API-owned task directory, same-version CLI/SDK/
  build packages, named exports and type-only trigger imports; use a global-scope hashed idempotency
  key from the internal request ID plus a named export queue/tenant concurrency key. Resolve the
  authenticated Studio surface brief; keep interactive versus artifact generation split; use R2
  through the S3-compatible server port with conditional writes, `HEAD` verification and short-lived
  GET signing; record final image byte/dimension limits and URL lifetime
- Verification: repository evidence review, dependency compatibility check, env-schema naming review
- Evidence required before completion: no unresolved predecessor behavior or provider API question
  remains disguised as coding work

### TASK-018 — Capture and enforce the frontend parity baseline

- Status: Pending
- Covers: REQ-031–REQ-032, AC-013
- Depends on: TASK-001; must complete before TASK-004, TASK-007, TASK-009 and TASK-013 modify the UI
- Can parallelize with: TASK-002
- Relevant skills/docs: `impeccable`, `ux-copy`, `triad-studio-development`, `triad-testing`,
  `triad-product-qa`, current initiatives 14–16 and Studio durable docs
- Expected artifacts: versioned field/action/state/validation/calculation/responsive/accessibility
  inventory for business data, payment/commission and reports; desktop/mobile screenshots for all
  representative scenarios; shared repository conformance contract; explicit exception template
- Implementation notes: inventory the shipped UI rather than reconstructing it from the new API;
  include hidden/recovery/partial/empty/error states and exact accepted calculations/copy. Memory
  adapters remain available to tests until the HTTP source passes. An integration PR with an
  unexplained missing inventory row cannot pass review.
- Verification: existing Vitest/Playwright suites run unchanged; characterize uncovered behavior;
  verify production-boundary tests still exclude fixtures while test targets exercise both sources
- Evidence required before completion: baseline reviewed before backend-driven UI edits and every
  row has an automated or explicit manual verification route

### TASK-002 — Add additive schemas, migrations and access capabilities

- Status: In progress — generated schema/migration and focused unit evidence complete; disposable PostgreSQL rehearsal remains pending
- Covers: REQ-001–REQ-002, REQ-005–REQ-006, REQ-014, REQ-022–REQ-023, REQ-030,
  AC-001, AC-003, AC-007, AC-012
- Depends on: TASK-001
- Can parallelize with: TASK-018
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`
- Expected artifacts: business profile/logo metadata, commission policy/snapshot/reversal and report
  request/attempt/artifact schemas; indexes/constraints; capability/entitlement seeds; generated
  Drizzle migration through project-standard commands
- Implementation notes: use UUIDv7, compound tenant foreign keys, optimistic versions and additive
  compatibility; model explicit unavailable historical commission coverage; never hand-edit generated
  dependency metadata or invent backfill
- Verification: schema/type tests, migration apply/rollback rehearsal against disposable PostgreSQL,
  constraint/concurrency integration tests and query-plan fixtures
- Evidence required before completion: clean migration evidence and cross-tenant/uniqueness invariants

### TASK-003 — Implement business profile and logo application/API contracts

- Status: Pending
- Covers: REQ-001–REQ-004, REQ-021, REQ-023, REQ-025–REQ-026, AC-001–AC-002, AC-011
- Depends on: TASK-002
- Can parallelize with: TASK-005
- Relevant skills/docs: `triad-api-development`, `elysia`, `postgres-drizzle`, `logging-best-practices`
- Expected artifacts: business profile domain validation/repository/service; REST plugin/OpenAPI;
  business-owned logo storage port; local and R2 adapters; replacement cleanup/reconciliation path;
  access/audit wiring
- Implementation notes: do not import IDP profile-image implementation; validate decoded image,
  normalize output, randomize key and commit new reference before cleanup; use explicit timeouts and
  redact all media/contact data
- Verification: domain/unit tests, in-process Elysia tests, PostgreSQL integration tests, fake R2
  partial-failure tests, access matrix and content-confusion/malicious-image cases
- Evidence required before completion: prior logo survives every failed replacement phase and member
  mutation/cross-tenant access fails closed

### TASK-004 — Productionize Studio business data experience

- Status: Pending
- Covers: REQ-001–REQ-004, REQ-021, REQ-027–REQ-028, AC-001–AC-002, AC-010
- Depends on: TASK-003, TASK-018
- Can parallelize with: TASK-006
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `ux-copy`, `accessibility`,
  `react-useeffect`, `vercel-react-best-practices`
- Expected artifacts: HTTP repository/query mutations; profile/contact/logo form; previews and
  replace/remove confirmation; setup readiness projection; Portuguese loading/error/success copy
- Implementation notes: preserve one resumable setup surface and existing form primitives; do not
  expose object keys/URLs; retain drafts and old logo on failure; update shell identity only from
  confirmed query data
- Verification: Vitest/component tests, source-boundary checks, Playwright owner/admin/member,
  keyboard/focus, desktop/mobile, theme and axe journeys
- Evidence required before completion: screenshots at desktop/mobile in light/dark plus behavioral
  evidence for upload failure, stale conflict and focus recovery

### TASK-005 — Implement complete commission policy domain and APIs

- Status: Pending
- Covers: REQ-005–REQ-006, REQ-009, REQ-021–REQ-023, AC-003
- Depends on: TASK-002
- Can parallelize with: TASK-003
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`
- Expected artifacts: commission rule validation, precedence and lifecycle services; repository;
  bounded aggregate/detail and mutation routes/OpenAPI; access/audit integration; optional reviewed
  legacy percentage migration preview
- Implementation notes: one default per professional and one override per pair; percentage/fixed/
  none union; commission-bearing fields excluded from unauthorized catalog projections
- Verification: precedence/boundary/property tests, stale/duplicate/foreign-tenant PostgreSQL tests,
  pagination/query-plan and access-policy route tests
- Evidence required before completion: every policy kind and denial/concurrency path has deterministic
  behavior without leaking values

### TASK-006 — Seal commission and reversal facts at receipt registration

- Status: Pending
- Covers: REQ-007–REQ-008, REQ-022–REQ-025, REQ-030, AC-004, AC-006, AC-012
- Depends on: TASK-005 and final Initiative 24 receipt contract
- Can parallelize with: TASK-004
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`
- Expected artifacts: exact-cent calculator; policy resolver; receipt transaction integration;
  immutable snapshot/reversal repository; compatibility projection for unavailable older receipts
- Implementation notes: reuse Initiative 24 net-line allocation authority; cap fixed commission;
  snapshot labels/provenance; replacement uses current policy; never recompute an accepted snapshot
- Verification: exhaustive boundary/property tests for cents/rates/overflow; PostgreSQL atomicity,
  concurrent policy/receipt, reversal/replacement and rollback tests
- Evidence required before completion: source receipt, commission, reversal and barbershop shares
  reconcile exactly in all accepted scenarios

### TASK-007 — Productionize commission configuration and inspection UI

- Status: Pending
- Covers: REQ-005–REQ-009, REQ-021, REQ-027–REQ-028, AC-003–AC-004, AC-010
- Depends on: TASK-005, TASK-006, TASK-018
- Can parallelize with: TASK-008 after TASK-006
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `ux-copy`, `accessibility`
- Expected artifacts: payment/commission setup section; professional defaults and service exceptions;
  effective-rule preview; bounded commission summary/detail; unavailable-history disclosure
- Implementation notes: progressive disclosure keeps the default rule primary and exceptions nested;
  use direct future-effect copy and tabular money; do not imply payout or silently expose finance to members
- Verification: component/calculator projection tests, access/source boundaries, Playwright create/edit/
  none/fixed/percentage/stale/error/member-denial/mobile/axe journeys
- Evidence required before completion: user can explain effective versus historical rule from the UI
  and all copy avoids payout/accounting claims

### TASK-008 — Implement production reporting aggregates and facets

- Status: Pending
- Covers: REQ-009–REQ-013, REQ-022–REQ-026, AC-005–AC-006, AC-011
- Depends on: TASK-006 and final Initiative 23/24 schemas
- Can parallelize with: TASK-007, TASK-010
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`,
  `observability-guidelines`
- Expected artifacts: reporting domain definitions; bounded aggregate/facet repositories; REST/OpenAPI;
  coverage metadata; cursor commission detail; indexes/query-plan documentation
- Implementation notes: preserve accepted definitions and split-tender allocation; aggregate in SQL/
  server domain without raw browser data; separate incomplete history from mathematical zero
- Verification: golden reconciliation/property tests, PostgreSQL multi-tenant/filter/pagination/N+1/
  explain-plan tests, route access and bounded-range tests
- Evidence required before completion: all report sections reconcile against the same seeded immutable
  facts for filters, reversals and replacements

### TASK-009 — Connect and refine the production reports experience

- Status: Pending
- Covers: REQ-010–REQ-013, REQ-020–REQ-021, REQ-027–REQ-028, AC-005–AC-006, AC-010
- Depends on: TASK-008, TASK-018
- Can parallelize with: TASK-011
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `ux-copy`, `accessibility`,
  `vercel-react-best-practices`, `react-useeffect`
- Expected artifacts: HTTP reporting adapter; normalized URL filters; management summary hierarchy;
  textual takeaways; charts/table equivalents; coverage and recovery states; production source removal
- Implementation notes: one filter context for every section; keep safe prior result during refresh;
  charts supplement decisions; filters collapse accessibly on narrow screens; avoid sequential client fetches
- Verification: projection/component tests, production-boundary build, Playwright filters/reload/partial/
  empty/error/access/320px/zoom/theme/axe journeys and performance inspection
- Evidence required before completion: no fixture marker/raw dataset in production and every chart fact
  is available textually and tabularly

### TASK-010 — Implement report request state machine and Trigger.dev dispatch

- Status: Pending
- Covers: REQ-014–REQ-016, REQ-020, REQ-023, REQ-025–REQ-026, AC-007, AC-011
- Depends on: TASK-002, TASK-001 provider contract
- Can parallelize with: TASK-008
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `trigger.dev` official docs,
  `logging-best-practices`, `observability-guidelines`
- Expected artifacts: report request application service/repository/routes; idempotent provider port;
  local deterministic fake; `apps/api/trigger.config.ts`; API-owned named `schemaTask`; named export
  queue with tenant concurrency; status/retry contracts
- Implementation notes: persist then dispatch by task ID using a type-only import; opaque Zod-validated
  versioned payload only; create a global-scope hashed idempotency key from the logical request ID;
  current database state gates every task phase; explicit terminal failures/timeouts/retry; provider
  run reference and metadata are correlation only and contain no report values
- Verification: state-machine/property tests, concurrent duplicate requests, lost dispatch response,
  worker replay and access/status route integration tests
- Evidence required before completion: each partial-failure point converges to one logical request or
  an actionable terminal state

### TASK-011 — Generate accessible PDF and safe streamed CSV artifacts

- Status: Pending
- Covers: REQ-011, REQ-016–REQ-019, REQ-022, REQ-024–REQ-028, AC-006–AC-008, AC-010
- Depends on: TASK-008, TASK-010
- Can parallelize with: TASK-009
- Relevant skills/docs: `triad-api-development`, `accessibility`, `ux-copy`, `triad-testing`
- Expected artifacts: versioned export dataset contract; PDF summary renderer; streamed UTF-8 CSV
  renderer; formula-injection defense; checksums/content metadata; deterministic artifact fixtures
- Implementation notes: do not screenshot the web page; generate semantic document structure from
  server facts; paginate/stream detail rows; include filters/timezone/reference and stable column dictionary
- Verification: golden fixtures, reconciliation, CSV hostile-cell tests, bounded-memory test with large
  synthetic pages, PDF structural/manual inspection and cancellation/retry tests
- Evidence required before completion: artifacts exactly match report definitions and remain usable by
  assistive technology/common spreadsheet software

### TASK-012 — Add private R2 artifact storage, retention and provider readiness

- Status: Pending
- Covers: REQ-003–REQ-004, REQ-016–REQ-018, REQ-025–REQ-026, REQ-029–REQ-030,
  AC-002, AC-007–AC-009, AC-011–AC-012
- Depends on: TASK-003, TASK-010, TASK-011
- Can parallelize with: None because it owns shared env/deployment contracts
- Relevant skills/docs: `triad-api-development`, Cloudflare R2 official docs,
  `observability-guidelines`, deployment docs
- Expected artifacts: R2 report adapter and deterministic keys/checksums; authenticated download grant;
  cleanup/reconciliation process; lifecycle configuration/runbook; `env-schema.yaml`, app-local env and
  readiness updates; Infisical/GitHub environment mapping docs
- Implementation notes: least-privilege separate environment resources; private bucket; no browser PUT/
  list/delete; short-lived GET only; S3-compatible server writes set content type/checksum, use
  conditional create plus `HEAD` for retry convergence and bounded batch cleanup; server-side
  generation requires no CORS; secrets never enter frontend
- Verification: fake and provisioned-environment put/head/get/delete/lifecycle tests, wrong-tenant/
  expired-grant denial, readiness failure and orphan cleanup/retry evidence
- Evidence required before completion: `hml` export gate remains disabled until user-provisioned resources
  pass the documented readiness checklist

### TASK-013 — Add generated-report history, progress, retry and download UI

- Status: Pending
- Covers: REQ-014, REQ-018, REQ-020–REQ-021, REQ-027–REQ-028, AC-007–AC-010
- Depends on: TASK-010, TASK-012, TASK-018
- Can parallelize with: TASK-014
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `ux-copy`, `accessibility`,
  `react-useeffect`, `vercel-react-best-practices`
- Expected artifacts: export confirmation; immediate optimistic/persisted row; cursor history; visible-
  page polling/backoff; retry/regenerate/download; provider-unavailable and expiry states
- Implementation notes: history is part of Reports, not a new dashboard; status updates use query
  invalidation/timers outside render synchronization traps; never persist presigned URLs or financial drafts
- Verification: fake-clock unit tests and Playwright queue→run→ready, reload, offline, hidden-page,
  failure/retry, expiry/regenerate, revoked-access, keyboard/mobile/theme/axe journeys
- Evidence required before completion: no duplicate request on uncertain response and no polling after
  terminal/hidden state

### TASK-014 — Instrument privacy-safe audit, logs, traces, metrics and alerts

- Status: Pending
- Covers: REQ-006, REQ-013, REQ-015–REQ-018, REQ-025–REQ-026, AC-011
- Depends on: TASK-003, TASK-006, TASK-008, TASK-010, TASK-012
- Can parallelize with: TASK-013
- Relevant skills/docs: `logging-best-practices`, `observability-guidelines`, `triad-api-development`
- Expected artifacts: canonical structured events, audit actions, spans/correlation, bounded metrics,
  readiness/terminal-failure dashboards or queries, baseline-first alert runbook
- Implementation notes: run an explicit sensitive-data inventory; hash/omit high-cardinality dimensions;
  never record filters, contents, contact values, identifiable amounts, object URLs or secrets
- Verification: telemetry contract/redaction tests, induced provider/query/reconciliation failures and
  trace correlation inspection
- Evidence required before completion: one request is diagnosable API→Trigger→R2→DB without sensitive data

### TASK-015 — Run comprehensive automated and corrective product QA

- Status: Pending
- Covers: REQ-001–REQ-030, AC-001–AC-012
- Depends on: TASK-004, TASK-007, TASK-009, TASK-013, TASK-014
- Can parallelize with: None
- Relevant skills/docs: `triad-testing`, `triad-product-qa`, `triad-preflight-review`, `impeccable`,
  `accessibility`
- Expected artifacts: passing checks and coverage; real-browser acceptance matrix; desktop/mobile
  screenshots; accessibility evidence; tenant/role/provider-failure/reconciliation QA findings and fixes
- Implementation notes: run one bounded Impeccable visual inspection pass over desktop/mobile together,
  fix material findings in one batch, confirm once; use real local API/PostgreSQL and provider fakes,
  adding provisioned `hml` evidence when credentials exist
- Verification: commands from PRD plus affected coverage, migration, production artifact and manual journeys
- Evidence required before completion: every AC has linked reviewable evidence and no unresolved critical finding

### TASK-016 — Complete rollout, rollback and operational readiness

- Status: Pending
- Covers: REQ-025–REQ-026, REQ-029–REQ-030, AC-011–AC-012
- Depends on: TASK-012, TASK-014, TASK-015; user-provisioned Trigger.dev/R2 resources for `hml`
- Can parallelize with: TASK-017 documentation drafting only
- Relevant skills/docs: `triad-api-development`, deployment docs, provider official docs,
  `triad-release-workflow` when promotion begins
- Expected artifacts: staged capability enablement; readiness endpoints/checks; timeout/retry/concurrency/
  retention settings; cleanup drill; rollback rehearsal; provider outage drill; baseline telemetry record
- Implementation notes: absence of production credentials blocks provider-enabled promotion, not local
  completion; never place values in GitHub or `env-schema.yaml`; preserve immutable facts on rollback
- Verification: `hml` smoke tests, task deployment/version check, private download/access test, feature-
  gate disable/re-enable, retry/orphan/expiry and rollback drills
- Evidence required before completion: operations can enable, diagnose and disable each slice independently

### TASK-017 — Update durable documentation and close traceability

- Status: Pending
- Covers: REQ-019, REQ-029–REQ-030, AC-008, AC-012
- Depends on: TASK-015; may draft during TASK-016 but closes after its evidence
- Can parallelize with: TASK-016 until finalization
- Relevant skills/docs: `triad-initiative-workflow`, `triad-architecture`, API/Studio/deployment docs
- Expected artifacts: updated API module and Studio feature docs; barbershop profile/commission/report
  definitions; export column dictionary; env/provider/runbook/retention/rollback docs; initiative evidence
  and final status updates
- Implementation notes: update README/AGENTS/skills only when durable conventions changed; document why
  Site/IDP/Backstage remain unchanged; link evidence rather than claiming unrun checks
- Verification: doc links/commands, traceability audit, planning-gate Definition of Done review
- Evidence required before completion: every requirement and AC maps bidirectionally to a completed task
  and evidence, with deviations/follow-ups recorded

## Verification Evidence

Record evidence as tasks are completed:

- Command:
- Result:
- Notes:

## Risks And Follow-Ups

- [ ] Provider projects, buckets and credentials do not yet exist; TASK-016 cannot complete its `hml`
  provider evidence until the user provisions them.
- [ ] Initiative 23/24 review changes may require a material PRD revision and reapproval before TASK-006.
- [ ] Numeric provider quotas, task concurrency and alert thresholds must be based on provisioned limits
  and observed pilot behavior.
- [ ] XLSX, scheduled/email delivery, payouts/statements, public profile and booking remain separate
  product decisions.

## Scope Changes

- None.

## Definition of Done

- [ ] The implemented PRD version was explicitly approved.
- [ ] All applicable gates in
      `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [ ] Every in-scope AC has reviewable evidence.
- [ ] Deviations, skipped checks, residual risks, and follow-ups are recorded.
