# 27 Typed Report Catalog And Email Delivery - Execution Plan

## Source

- PRD: `docs/initiatives/prds/27-typed-report-catalog-and-email-delivery.md`
- Related issue/PR:
- Approval state: Approved
- Approved PRD version/date: Revised scope approved 2026-09-07

## Implementation Principles

- Do not begin implementation until the linked PRD version is explicitly approved.
- Keep technical identifiers and documents in English and user-facing copy in Brazilian Portuguese.
- Make report type, metric definitions, configuration, and delivery state explicit contracts.
- Use real Trigger.dev and R2 in the normal local workflow; allow doubles only inside tests or an explicitly selected test harness.
- Keep artifacts private, destination email server-resolved, queries bounded, and retries idempotent.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001–006 / AC-001–004 | TASK-001, TASK-005 | contract tests, Studio tests, browser flow |
| REQ-007–009 / AC-005–006 | TASK-001, TASK-002, TASK-003, TASK-006 | migration, unit/API/concurrency tests |
| REQ-010–016 / AC-007–011 | TASK-003, TASK-004, TASK-007 | provider integration and real dev smoke |
| REQ-012–014 / AC-008–009 | TASK-001, TASK-003, TASK-005, TASK-006 | authorization and lifecycle tests |
| REQ-017–018, REQ-020 / AC-012, AC-014 | TASK-002, TASK-003, TASK-006 | large-fixture queries, logs/traces assertions |
| REQ-019 / AC-013 | TASK-005, TASK-008 | automated and real-browser accessibility QA |
| REQ-021 / AC-015–016 | TASK-007, TASK-008, TASK-009 | repository gates and evidence report |
| REQ-001–006, REQ-009, REQ-013, REQ-019 / AC-001–005, AC-008, AC-013 | TASK-010, TASK-011 | Studio/API contract tests and browser flow |
| REQ-010–012, REQ-018, REQ-023 / AC-006–008, AC-014 | TASK-012 | storage-key and terminal-email failure matrix |
| REQ-022 / AC-001, AC-005, AC-012 | TASK-013 | reviewed report decision/column matrix and query tests |

## Dependency Order

The completed original implementation remains historical evidence. For the revised scope, TASK-013 freezes the accepted report catalog and CSV contracts first. TASK-010 and TASK-012 may then proceed in parallel because they primarily affect Studio and API/worker/storage boundaries respectively. TASK-011 depends on the revised request contract from TASK-012. TASK-008 resumes integrated product QA after TASK-010–013, and TASK-009 closes documentation and release evidence. Trigger.dev provider smoke remains blocked until its project and environment keys are provisioned.

## Tasks

### TASK-001 — Freeze typed report and delivery contracts

- Status: Done
- Covers: REQ-001–009, REQ-012–014; AC-001–006, AC-008–009
- Depends on: PRD approval
- Can parallelize with: None
- Relevant skills/docs: `triad-architecture`, `triad-api-development`, PostgreSQL/Drizzle guidance
- Expected artifacts: shared report catalog/schema, metric glossary, additive migration for type/version/configuration and delivery lifecycle, legacy-row compatibility.
- Implementation notes: keep immutable normalized request snapshots; separate generation from delivery status; use stable English identifiers and PT-BR labels at presentation boundaries.
- Verification: migration against a fresh and Initiative-25-shaped database; schema/contract tests.
- Evidence required before completion: approved formulas/denominators and migration/test output.

### TASK-002 — Implement bounded typed aggregations and render models

- Status: Done
- Covers: REQ-004, REQ-009, REQ-017, REQ-020; AC-005, AC-012
- Depends on: TASK-001
- Can parallelize with: TASK-005
- Relevant skills/docs: `triad-api-development`, `triad-testing`
- Expected artifacts: six tenant-qualified query services, typed PDF/CSV render models, pagination/streaming strategy, query indexes if evidence requires them.
- Implementation notes: document each measure and denominator; do not imply unsupported utilization, retention cohorts, or SLA.
- Verification: deterministic fixtures, cross-tenant negatives, boundary dates/timezones, reversals, empty data, and large seeded datasets with query-plan review.
- Evidence required before completion: per-report expected outputs and bounded-query evidence.

### TASK-003 — Extend request API and resilient worker lifecycle

- Status: Done
- Covers: REQ-007–010, REQ-012–014, REQ-017–018; AC-004–009, AC-012, AC-014
- Depends on: TASK-001, TASK-002
- Can parallelize with: TASK-004 after lifecycle interfaces stabilize
- Relevant skills/docs: `triad-api-development`, `trigger-tasks`, Elysia/OpenAPI conventions
- Expected artifacts: typed request endpoints, OpenAPI contracts, schema-validated Trigger task, tenant concurrency, global idempotency, state transitions, expiry/cleanup.
- Implementation notes: use type-only task imports at the backend trigger boundary; reconcile dispatch/upload/DB acknowledgement-loss cases.
- Verification: API and PostgreSQL integration tests, concurrent retry tests, Trigger adapter tests, cleanup tests.
- Evidence required before completion: one request/dispatch/artifact under replay and correct recovery from each injected failure.

### TASK-004 — Compose private R2 and transactional email delivery

- Status: Done
- Covers: REQ-010–012, REQ-014–016, REQ-018, REQ-021; AC-006–011, AC-014
- Depends on: TASK-001; stable worker lifecycle from TASK-003
- Can parallelize with: late TASK-003 and TASK-005
- Relevant skills/docs: `cloudflare-r2`, `trigger-tasks`, email provider conventions, repository security rules
- Expected artifacts: private R2 adapter with put/HEAD/expiry, server-side verified-recipient lookup, reporting-owned PT-BR email template, secure download grant, delivery retry policy.
- Implementation notes: no arbitrary recipient, attachment, public object, durable URL, secret, or object key in Studio/logs; reuse the verified artifact when retrying email.
- Verification: provider doubles for deterministic failure matrices plus integration tests against isolated provider fixtures.
- Evidence required before completion: storage/delivery convergence and privacy review.

### TASK-005 — Build the Studio catalog and two-step dialog

- Status: Done
- Covers: REQ-001–006, REQ-013, REQ-019; AC-001–004, AC-008, AC-013
- Depends on: TASK-001
- Can parallelize with: TASK-002
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `accessibility`, `ux-copy`, `react-useeffect`
- Expected artifacts: six TRIAD-styled cards, report-specific configuration form, confirmation step, masked destination, and expanded report history/status actions.
- Implementation notes: reference screenshots guide information architecture only; preserve TRIAD navy/gold system. Cancel before submit closes directly. Keep the catalog visible in empty states.
- Verification: component/route tests for every type, error/retry states, focus behavior, duplicate prevention, responsive/theme coverage.
- Evidence required before completion: screenshots and tests at desktop, 320px, light/dark, and 200% zoom.

### TASK-006 — Prove API, persistence, and provider reliability

- Status: Done
- Covers: REQ-007–014, REQ-017–018, REQ-020; AC-004–009, AC-012, AC-014–015
- Depends on: TASK-002, TASK-003, TASK-004
- Can parallelize with: TASK-005
- Relevant skills/docs: `triad-testing`, `vitest`
- Expected artifacts: fresh-PostgreSQL suite, tenant/capability matrix, generation/delivery failure matrix, large-data fixture, privacy-safe observability assertions.
- Implementation notes: explicitly test response loss after dispatch, concurrent retry, R2 success/DB failure, email success/ack failure, expiry, and unauthorized download.
- Verification: API check/build/test/coverage and isolated PostgreSQL suite.
- Evidence required before completion: command output and failure-injection matrix.

### TASK-007 — Make real providers the normal local development path

- Status: Blocked
- Covers: REQ-015–016, REQ-018, REQ-021; AC-010–011, AC-014, AC-016
- Depends on: TASK-003, TASK-004; user-provided Trigger.dev project/key and R2 development bucket/configuration
- Can parallelize with: final TASK-006
- Relevant skills/docs: `trigger-setup`, `trigger-tasks`, `cloudflare-r2`, environment-management rules
- Expected artifacts: `env-schema.yaml` declarations, app-local env example updates, Infisical path mapping/runbook, aligned Trigger packages/config, root or documented companion dev command, provider health/preflight and smoke script.
- Implementation notes: values live in Infisical `/api` and `/infrastructure`; no root `.env`; missing configuration fails closed. Test doubles require explicit test-only selection.
- Verification: start normal local stack; register Trigger task; request report in Studio; observe Trigger completion; verify R2 object; receive email; open authorized link; verify expiry/tenant denial.
- Evidence required before completion: redacted real-provider run IDs, HEAD metadata, email provider receipt, authorized download, and cleanup evidence.

### TASK-008 — Execute corrective browser and accessibility QA

- Status: In progress
- Covers: REQ-001–006, REQ-013–019; AC-001–015
- Depends on: TASK-005, TASK-006, TASK-007
- Can parallelize with: None
- Relevant skills/docs: `triad-product-qa`, `accessibility`
- Expected artifacts: real-browser journey across owner/admin/member and two tenants; screenshots and corrective fixes.
- Implementation notes: cover empty/data-rich states, all six cards, both formats, failure/retry, email/download, keyboard, axe, 320px, zoom, and themes.
- Verification: Playwright and manual browser evidence against API/PostgreSQL and real dev providers.
- Evidence required before completion: passing journey matrix and zero unresolved serious accessibility/security findings.

### TASK-009 — Close gates, documentation, and staging handoff

- Status: Done
- Covers: REQ-016, REQ-018, REQ-021; AC-010, AC-014–016
- Depends on: TASK-008
- Can parallelize with: None
- Relevant skills/docs: `triad-preflight-review`, `triad-release-workflow`, documentation rules
- Expected artifacts: metric glossary, local/provider runbook, env manifest documentation, QA evidence report, preflight and hml smoke checklist.
- Implementation notes: resolve the known Trigger dependency security findings before staging; do not treat local success as hml provider validation.
- Verification: full monorepo check/build/test/coverage/security/production-boundary gates, clean worktree, real dev smoke, then hml smoke after deployment.
- Evidence required before completion: final SHA, clean status, gate outputs, documentation links, and redacted dev/hml provider evidence.

### TASK-010 — Replace analytics page with the system-standard catalog wizard

- Status: Pending
- Covers: REQ-001–006, REQ-013, REQ-019; AC-001–004, AC-008, AC-013
- Depends on: Revised PRD approval; TASK-013 for final catalog membership
- Can parallelize with: TASK-012
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `accessibility`, `ux-copy`
- Expected artifacts: catalog-only route; no global analytics/filters; two-step dialog matching the workspace context-switcher composition; contextual Portuguese aggregate labels; CSV-only confirmation; no report history/status/download UI.
- Implementation notes: preserve focus trap/restore, draft state on back navigation, stable button labels, 320px reflow, themes, and duplicate-submit prevention.
- Verification: focused Studio component/route tests, design detector, responsive/theme/accessibility browser journeys.
- Evidence required before completion: screenshots and tests proving catalog-only layout, both wizard stages, “Todos” labels, and absence of history/direct download.

### TASK-011 — Enforce the CSV-only request contract

- Status: Done
- Covers: REQ-005, REQ-007, REQ-009, REQ-017; AC-003–005, AC-009, AC-012
- Depends on: TASK-013; TASK-012 lifecycle contract
- Can parallelize with: Late TASK-010
- Relevant skills/docs: `triad-api-development`, `triad-testing`
- Expected artifacts: CSV-only API schema and catalog, CSV-only worker renderer path for new requests, legacy PDF compatibility limited to already-persisted requests, updated Studio contracts.
- Implementation notes: reject new `pdf` input with a safe validation error; do not destructively rewrite legacy request rows or artifacts.
- Verification: schema, route, worker, compatibility, and Studio request tests.
- Evidence required before completion: new CSV requests succeed, PDF requests fail safely, and legacy rows remain convergent until expiry.

### TASK-012 — Standardize R2 ownership namespaces and terminal emails

- Status: In progress
- Covers: REQ-010–012, REQ-018, REQ-023; AC-006–008, AC-014
- Depends on: Revised PRD approval
- Can parallelize with: TASK-010
- Relevant skills/docs: `triad-architecture`, `triad-idp-development`, `triad-api-development`, `cloudflare-r2`, `trigger-tasks`, `triad-testing`
- Expected artifacts: shared documented object-key grammar; identity avatar keys under `users/{userId}/profile/avatar/`; tenant logo keys under `tenants/{tenantId}/branding/logo/`; report keys under `tenants/{tenantId}/reports/{reportType}/{year}/{month}/{requestId}/attempt-{attempt}.csv`; success and terminal-generation-failure email templates/use cases.
- Implementation notes: user-owned identity assets survive tenant deletion; tenant cleanup must be prefix-bounded to `tenants/{tenantId}/`; keys contain no PII; email-provider failure remains an independently retried operational state.
- Verification: key-builder unit tests, tenant-cleanup boundary negatives, worker generation-failure and email-failure matrices, privacy-safe observability assertions.
- Evidence required before completion: exact key outputs, proof tenant cleanup cannot address `users/`, and one terminal email per idempotent outcome.

### TASK-013 — Revalidate the customer value of every catalog report

- Status: Done
- Covers: REQ-001, REQ-004, REQ-009, REQ-022; AC-001–005, AC-012
- Depends on: Revised PRD approval
- Can parallelize with: None
- Relevant skills/docs: `requirements-analysis`, `triad-architecture`, `triad-api-development`
- Expected artifacts: decision matrix for each candidate report covering pain, business question, supported action, authoritative facts, formulas/denominators, CSV columns, filters, overlap, limitations, and readiness; catalog/schema updates for any rename, merge, defer, or removal.
- Implementation notes: do not claim profit, utilization, SLA, opportunity loss, retention, or accounting reconciliation beyond persisted authoritative facts.
- Verification: product review against repository query evidence and deterministic per-report fixtures.
- Evidence required before completion: every shipped card maps to a distinct customer decision and a tested CSV contract.

## Verification Evidence

Record evidence as tasks are completed:

- Command: `bun run check` at the repository root.
- Result: 4/4 packages passed; API 403/403; Studio 811/811 plus production boundary on the reconciled tree at `60df630`.
- Command: fresh `idp27_root_test` PostgreSQL database plus `bun run test:integration:postgres`.
- Result: 10 files and 61/61 tests passed against a database recreated from zero, including six truthful metric sets, combined split-tender filters, cross-tenant negatives, dispatch/acknowledgement recovery, storage recovery, and independent email retry.
- Command: Studio coverage and focused reporting Playwright.
- Result: coverage 84.76/80.11/82.72/86.39 and Playwright 3/3 with axe, keyboard, 320px, 200% zoom, themes, and reduced motion.
- Command: `bun run db:migrate` against the configured local Neon database.
- Result: migrations 0029 and 0030 applied successfully on 2026-09-06.
- Command: two independent read-only corrective audits of the reporting lifecycle, metrics, privacy boundary, and tenant isolation.
- Result: all six blocking findings closed at `60df630`; no code blocker remains.
- Command: `bun audit`.
- Result: not green: 23 transitive findings (1 critical, 10 high, 11 moderate, 1 low), including Trigger.dev dependencies. Staging remains blocked until these are upgraded, mitigated, or explicitly risk-accepted through the release process.
- Notes: real Trigger.dev/R2/email smoke remains blocked on provider values promised by the product owner. API global coverage remains an inherited repository gate failure (403 tests pass; branch coverage remains below the configured global threshold) and is not represented as green.

## Risks And Follow-Ups

- [ ] User must provide a dedicated R2 development bucket/configuration and Trigger.dev development project/key before TASK-007 can complete.
- [ ] Confirm transactional email sandbox/recipient policy for local development.
- [ ] Resolve current Trigger.dev transitive dependency security-gate findings before staging.
- [ ] Measure demand before adding schedules, attachments, arbitrary recipients, active-client, utilization, or SLA reports.

## Scope Changes

- 2026-09-06: normal local development changed from a fake export provider to real Trigger.dev and R2; doubles are test-only. PRD requirements and TASK-007 added accordingly.
- 2026-09-07: requested a catalog-only route, Studio-standard two-step dialog, CSV-only output, email-only terminal outcomes, report-value revalidation, and ownership-aware R2 paths that keep user identity assets independent of tenant deletion. Added TASK-010–013 and returned approval to `Awaiting approval`.
- 2026-09-07: product owner approved the revised direction as intentionally evolvable; implementation resumed.

## Definition of Done

- [ ] The implemented PRD version was explicitly approved.
- [ ] All applicable gates in `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [ ] Every in-scope AC has reviewable evidence.
- [ ] Normal local and hml flows use real Trigger.dev/R2/email providers and pass smoke validation.
- [ ] Deviations, skipped checks, residual risks, and follow-ups are recorded.
