# 26 Role-Aware Onboarding And First-Run Refinements - Execution Plan

## Source

- PRD: `docs/initiatives/prds/26-role-aware-onboarding-and-first-run-refinements.md`
- Related issue/PR:
- Approval state: Approved
- Approved PRD version/date: Approved / 2026-09-06
- Required predecessor:
  `docs/initiatives/prds/25-production-business-profile-commissions-and-management-reporting.md`

## Implementation Principles

- Do not begin implementation until this PRD is explicitly approved and Initiative 25's implemented
  profile/logo/readiness contracts have been reconciled.
- Treat `/Users/marcusgabrields/Downloads/TRIAD-Studio-refinamentos-20260905.zip` as design evidence
  only. Do not copy its code, CSS, routes, generated files, auth behavior, memory repositories, or
  session-based completion mechanism.
- Follow the accepted progressive, role-aware path to real work; do not introduce a blocking modal,
  generic guided tour, local authoritative completion flag, or duplicate setup surface.
- Follow the approved delight thesis, `confirmed context becomes operational momentum`: one
  restrained TRIAD gold thread may connect invitation, real progress, the earned `schedule_ready`
  milestone, and Agenda entry. Do not scatter generic effects across routine operational work.
- Keep business readiness and professional invitation context outside IDP. Inject a narrow optional
  projection into IDP-owned resolution/email behavior at the API composition boundary.
- Preserve invite-gated access, existing acceptance transactions, server-owned authorization,
  active tenant isolation, and Agenda scheduling rules.
- Use Brazilian Portuguese for UI/email copy and English for technical artifacts.
- Keep implementation bounded to the acceptance criteria and use the relevant Triad skills before
  each task.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001–REQ-005 / AC-001–AC-004 | TASK-001, TASK-002, TASK-003, TASK-005, TASK-009 | Readiness/capability API tests and owner/member Studio journeys |
| REQ-006–REQ-010 / AC-005–AC-009 | TASK-001, TASK-004, TASK-005, TASK-006, TASK-009 | Context projection, email, resolve/accept, legacy, security and routing evidence |
| REQ-011–REQ-013 / AC-010–AC-012 | TASK-007, TASK-009 | Controlled geometry/time unit tests and desktop/mobile Agenda journeys |
| REQ-014 / AC-013 | TASK-003, TASK-005, TASK-006, TASK-007, TASK-009 | Keyboard, axe, reflow, zoom, theme, reduced-motion and screen-reader evidence |
| REQ-015 / AC-014 | TASK-002, TASK-004, TASK-009 | Bounded SQL, query-plan, tenant isolation and dense-fixture evidence |
| REQ-016 / AC-015 | TASK-008, TASK-009 | Redacted events/metrics tests and analytics-unavailable journey |
| REQ-017 / AC-016 | TASK-001, TASK-004, TASK-006, TASK-010 | Compatibility, deploy-order, pending-invite, flag and rollback rehearsal |
| REQ-018 / AC-017 | TASK-010 | Durable docs and no-code-reuse rationale review |
| REQ-019–REQ-020 / AC-018–AC-019 | TASK-001, TASK-003, TASK-005, TASK-007, TASK-009, TASK-010 | Delight thesis, visual continuity, motion budget, reduced-motion and performance evidence |

## Dependency Order

TASK-001 is the mandatory predecessor-reconciliation gate and must run after Initiative 25 is
complete. TASK-002 then freezes the business readiness contract; TASK-003 consumes it in Studio.
TASK-004 can begin after TASK-001 in parallel with TASK-002 because it owns the separate invitation
context provider and compatibility contract. TASK-005 and TASK-006 follow TASK-004 and may proceed
in parallel only after their shared response/email vocabulary is frozen. TASK-007 is independent of
the readiness/invitation implementation after TASK-001 confirms Initiative 25 did not replace the
Agenda surface. TASK-008 follows stable outcome IDs from TASK-002/TASK-004/TASK-007. TASK-009 runs
after all behaviors exist; TASK-010 records final evidence and delivery/rollback decisions.

Shared files are serialized: the API REST composition root belongs to TASK-004; auth-client and
post-accept routing belong to TASK-005; transactional email templates/sender belong to TASK-006;
Agenda board files belong to TASK-007; overview/setup files belong to TASK-003. Generated OpenAPI or
route artifacts are updated by their owning task and never edited concurrently.

## Tasks

### TASK-001 — Reconcile Initiative 25 and freeze the first-value contract

- Status: Complete
- Covers: REQ-001–REQ-010, REQ-017, AC-001–AC-009, AC-016
- Depends on: Explicit approval of Initiative 26; Initiative 25 implementation and evidence complete
- Can parallelize with: None
- Relevant skills/docs: `triad-initiative-workflow`, `triad-architecture`, `requirements-analysis`,
  `impeccable`, Initiative 25 PRD/plan/evidence, designer package analysis
- Expected artifacts: Recorded contract diff for Initiative 25 profile/logo/readiness; frozen
  `schedule_ready` fact map; capability-to-landing-destination matrix; invitation-context ownership
  diagram; approved gold-thread delight thesis, focal storyboard, settled/reduced-motion states and
  motion budget; confirmation that no designer source file will be applied
- Implementation notes: Verify actual code/schema/OpenAPI rather than relying on Initiative 25's
  current plan. If Initiative 25 materially changes profile ownership, logo access, readiness, or
  setup navigation, return both Initiative 26 documents to `Awaiting approval` with the changed
  boundary instead of adapting silently.
- Verification: Review merged Initiative 25 evidence, current module registry, auth acceptance,
  catalog/scheduling contracts, and production source composition
- Evidence required before completion: Every readiness fact and post-accept destination has one
  authoritative owner; no overlapping Initiative 25 file is being actively edited by another agent

### TASK-002 — Implement the bounded activation-readiness API

- Status: Complete
- Covers: REQ-001–REQ-005, REQ-015–REQ-017, AC-001–AC-004, AC-014–AC-016
- Depends on: TASK-001
- Can parallelize with: TASK-004, TASK-007
- Relevant skills/docs: `triad-api-development`, `triad-architecture`, `elysia`, `postgres-drizzle`,
  `triad-testing`, Initiatives 21/22/25
- Expected artifacts: Business-owned onboarding/readiness module or equally bounded application
  composition; repository ports/use case; authenticated REST plugin; OpenAPI response/error schema;
  capability and tenant wiring; focused unit/integration/query tests
- Implementation notes: Prefer `apps/api/src/modules/onboarding` if the post-Initiative 25 codebase
  has no existing owner that can honestly compose readiness. Return stable step/outcome IDs only;
  derive tenant from session; use indexed existence/aggregate checks and a bounded effective
  availability window; do not persist completion, duplicate catalog facts, or scan appointment
  history.
- Verification: `app.handle(new Request(...))` access/error tests, disposable PostgreSQL tenant/
  regression/dense fixtures, query-plan inspection, cross-tenant sentinels, and API package checks
- Evidence required before completion: Owner/admin/member matrix passes; step order remains
  deterministic; query count is bounded independently of catalog size; no browser flag affects the
  response

### TASK-003 — Add progressive owner/admin activation to existing Studio surfaces

- Status: Complete
- Covers: REQ-001–REQ-005, REQ-014, REQ-017, REQ-019–REQ-020, AC-001–AC-004, AC-013,
  AC-016, AC-018–AC-019
- Depends on: TASK-002
- Can parallelize with: TASK-005, TASK-006, TASK-007
- Relevant skills/docs: `triad-studio-development`, `impeccable` onboard/delight/animate/polish, `ux-copy`,
  `accessibility`, `react-useeffect`, `vercel-react-best-practices`, Studio surface brief
- Expected artifacts: HTTP readiness client/query; compact `/overview` activation card; detailed
  integration with the existing setup overview; capability-aware links; loading/error/complete/
  regressed states; gold-thread progress and one-time `schedule_ready` focal sequence with settled
  and reduced-motion variants; tests and component-inventory update if a shared composite is added
- Implementation notes: Use real routes/forms and incumbent navy/gold tokens. Keep one primary next
  action, concise progress, and optional navigation. Do not port the package modal or five-step
  workflow, block the shell, invent time estimates, require payment/reporting, or write authoritative
  completion to browser storage. Invalidate only affected readiness keys after real mutations.
- Implementation notes: Make the earned completion sequence specific to TRIAD: the real checklist
  rail becomes a scarce gold thread leading to `Abrir agenda`, then hands visual continuity to the
  Agenda time axis. Use CSS/existing primitives by default, keep content visible without scripts,
  never delay navigation, and avoid confetti, particles, parallax, bounce, looping effects, strong
  operational shadows, or dense-surface gradients.
- Verification: Vitest component/router tests plus Playwright owner/admin/member, resume/regression,
  slow/error, 320px, zoom, keyboard, theme, reduced-motion, and axe journeys
- Evidence required before completion: Screenshots at desktop/mobile in light/dark; a member never
  receives owner setup as the primary next step; completion changes only after confirmed server data

### TASK-004 — Compose secure business context for identity invitations

- Status: Complete
- Covers: REQ-006–REQ-009, REQ-015–REQ-017, AC-005–AC-009, AC-014–AC-016
- Depends on: TASK-001
- Can parallelize with: TASK-002, TASK-007
- Relevant skills/docs: `triad-api-development`, `triad-idp-development`, `triad-architecture`,
  `elysia`, `postgres-drizzle`, `triad-testing`, IDP auth/access and routes references
- Expected artifacts: Narrow `InvitationDisplayContext` contract; business-owned provider joining
  the exact professional invitation to organization/profile, bounded assigned units, professional
  role, optional inviter, and optional safe logo; dependency injection at REST composition;
  extended optional resolve/OpenAPI contract; legacy/bootstrap fallbacks and query tests
- Implementation notes: IDP validates token and owns identity status; the business provider owns all
  product display facts. Do not import professional/unit/profile tables from IDP code, add business
  rules to `idp_invitations`, expose raw object keys/URLs, reveal context for non-valid tokens, or
  create N+1 unit hydration. Preserve `Cache-Control: no-store`, referrer policy, global/token rate
  limits, resend behavior, and safe generic states.
- Verification: In-process Elysia and PostgreSQL tests for valid/malformed/terminal/multi-unit/
  missing-logo/missing-inviter/bootstrap/legacy cases, query bounds/indexes, sensitive log/body
  sentinels, and concurrent/repeated acceptance
- Evidence required before completion: IDP has no product-domain import; terminal tokens reveal no
  context; one valid token produces a minimal, tenant-correct projection with bounded queries

### TASK-005 — Refine invitation acceptance and role-correct workspace entry

- Status: Complete
- Covers: REQ-004–REQ-010, REQ-014, REQ-017, REQ-019–REQ-020, AC-004–AC-009, AC-013,
  AC-016, AC-018–AC-019
- Depends on: TASK-004
- Can parallelize with: TASK-003, TASK-006, TASK-007
- Relevant skills/docs: `triad-studio-development`, `triad-idp-development`, `impeccable`, `ux-copy`,
  `accessibility`, `react-useeffect`, Studio authenticated surface brief
- Expected artifacts: Updated invitation client types; contextual acceptance composition and logo/
  initials/TRIAD fallback; direct new/existing-access copy; session/workspace invalidation;
  capability-based landing selection; one-time contextual threshold reveal and gold-thread handoff;
  settled/reduced-motion variants; terminal/recovery states; unit/router tests
- Implementation notes: Preserve stable button labels/loading, password accessibility, token removal
  from browser history, and existing acceptance semantics. Do not identify arbitrary account
  existence, route every user to setup, trust response context as authorization, or persist business
  context in the URL/analytics/browser beyond the live flow.
- Verification: Component/router tests and Playwright for new/existing accounts, multiple
  organizations, member/owner roles, mismatch, changed/expired token, partial completion, long names,
  multiple units, navigation invalidation, keyboard, screen reader, mobile, and themes
- Evidence required before completion: All AC-004–AC-009 paths pass and no prohibited implementation
  vocabulary appears in rendered acceptance UI

### TASK-006 — Align contextual invitation email delivery and previews

- Status: Complete
- Covers: REQ-006–REQ-010, REQ-014, REQ-017, AC-005–AC-009, AC-013, AC-016
- Depends on: TASK-004
- Can parallelize with: TASK-003, TASK-005, TASK-007
- Relevant skills/docs: `triad-idp-development`, `triad-api-development`, `ux-copy`, `accessibility`,
  transactional-email docs and tests
- Expected artifacts: Version-compatible invitation email input; contextual subject, preview, HTML,
  and text template; business-logo/fallback treatment; creation/resend wiring; bootstrap/generic
  fallback; snapshot/render/delivery tests and safe email previews
- Implementation notes: Email and acceptance page use one vocabulary and context model. Name the
  barbershop prominently; list bounded unit names and professional role; show inviter only when
  available and approved. Never embed private permanent logo URLs, secrets, internal identity roles,
  or unsupported claims. Email delivery failure must not corrupt invitation state.
- Verification: HTML/text render tests for contextual, multi-unit, no-logo, no-inviter, bootstrap,
  and resend cases; link/token correctness; escaped hostile strings; email-client preview inspection
- Evidence required before completion: Subject/body/page facts match for the same valid invitation,
  generic fallback remains truthful, and confidential fields are absent from logs/snapshots

### TASK-007 — Position today's Agenda once at the current operational time

- Status: Complete
- Covers: REQ-011–REQ-014, REQ-017, REQ-019–REQ-020, AC-010–AC-013, AC-016,
  AC-018–AC-019
- Depends on: TASK-001
- Can parallelize with: TASK-002–TASK-006
- Relevant skills/docs: `triad-studio-development`, `impeccable` harden/polish, `accessibility`,
  `react-useeffect`, `vercel-react-best-practices`, `triad-testing`, Studio scheduling docs
- Expected artifacts: Pure offset/clamp/key helpers; safe scroller and marker references in
  `agenda-board.tsx`; one-time post-layout positioning; out-of-range opening-boundary fallback;
  settled gold-thread/current-time-axis continuation that never changes marker semantics;
  controlled-time/geometry/motion tests and browser coverage
- Implementation notes: Measure the actual marker/content position, viewport height, and sticky
  header impact. Assign only internal `scrollTop`, preserve `scrollLeft`, focus, and page scroll, use
  no visible smooth behavior, and do not key the effect to minute/appointment identities that cause
  recenter. Treat a resize after positioning as user-owned position.
- Verification: Unit tests for middle/start/end clamp, today/non-today, out-of-range, key changes,
  and repeated renders; Playwright desktop/mobile for minute tick, query refresh, manual scroll,
  date/unit switching, horizontal preservation, reduced motion, and focus
- Evidence required before completion: Initial eligible positioning is correct within documented
  geometry tolerance and every subsequent non-key update leaves the user's position untouched

### TASK-008 — Add privacy-safe onboarding observability

- Status: Complete
- Covers: REQ-016, AC-015
- Depends on: TASK-002, TASK-004, TASK-007
- Can parallelize with: None
- Relevant skills/docs: `logging-best-practices`, `observability-guidelines`, `triad-api-development`,
  `posthog-instrumentation` only if client product analytics is approved, analytics proxy docs
- Expected artifacts: Stable low-cardinality outcome vocabulary; redacted structured events,
  counters/histograms, traces where useful, baseline dashboard/query definitions, and alert proposal;
  documented client analytics decision
- Implementation notes: Operational metrics are required; client analytics is conditional on an
  explicit consent/identity decision and must degrade independently. Use opaque authorized
  correlation and stable step/outcome codes only. Never capture invitation/token/email/name/unit/
  role/logo/business/appointment fields or raw URLs/payloads.
- Verification: Sensitive sentinel tests, cardinality review, analytics-disabled/failing tests, and
  event-to-acceptance/readiness outcome reconciliation on deterministic fixtures
- Evidence required before completion: Reviewable sample events contain no prohibited fields and
  core onboarding behavior succeeds with telemetry sinks unavailable

### TASK-009 — Execute cross-boundary automated and product QA

- Status: Complete
- Covers: REQ-001–REQ-020, AC-001–AC-019
- Depends on: TASK-003, TASK-005, TASK-006, TASK-007, TASK-008
- Can parallelize with: None
- Relevant skills/docs: `triad-testing`, `triad-product-qa`, `accessibility`, `impeccable` polish,
  API/IDP/Studio development skills
- Expected artifacts: Passing API/Studio unit/integration/E2E suites; query/concurrency/security
  evidence; real local browser journey report; desktop/mobile light/dark screenshots; accessibility
  and manual residual record; rollback/pending-invite rehearsal
- Implementation notes: Test owner/admin/member, new/existing/bootstrap/legacy invitations,
  multi-tenant switching, readiness regression, long/multiple-unit context, invalid/security paths,
  analytics failure, every Agenda positioning case, milestone interruption/replay prevention,
  background/hidden behavior, and settled/reduced-motion effects. Record browser performance for the
  focal sequence and verify no action waits for it. Run Impeccable mechanical detection once on final
  changed UI targets, fix its valid findings in one batch, and confirm once.
- Verification: `bun --filter api test`, `bun --filter api check`, `bun --filter api build`,
  `bun --filter studio test`, `bun --filter studio test:e2e`, `bun --filter studio check`,
  `bun --filter studio build`, and `bun run check`
- Evidence required before completion: Every AC has linked behavioral evidence; skipped checks and
  manual assistive-technology residuals are explicit; no success claim relies on file existence

### TASK-010 — Finalize rollout, rollback, and durable documentation

- Status: Complete
- Covers: REQ-017–REQ-020, AC-016–AC-019
- Depends on: TASK-009
- Can parallelize with: None
- Relevant skills/docs: `triad-architecture`, `triad-release-workflow`, `triad-preflight-review`,
  `triad-initiative-workflow`, API/IDP/Studio docs
- Expected artifacts: Updated Studio setup/scheduling/component docs; API invitation/readiness docs;
  IDP invitation boundary docs; app READMEs if route/runtime behavior changed; deployment sequence,
  compatibility and rollback notes; documented delight thesis, motion tokens/budget, settled and
  reduced-motion behavior; initiative evidence/status updates
- Implementation notes: Record Initiative 25 reconciliation and the reason designer code was not
  reused. Update AGENTS/skills only if a durable new convention emerged. Deploy optional API fields
  before Studio, validate pending invitations in hml, and keep invitation/Agenda rollback paths
  independent.
- Verification: Documentation link/contract review, env-schema no-change or update rationale,
  staging smoke tests, pending-invite compatibility, rollback rehearsal, and final preflight
- Evidence required before completion: Definition of Done is fully reviewable, all deviations and
  residual risks have an owner/destination, and docs match actual runtime behavior

## Verification Evidence

Record evidence as tasks are completed:

- API focused: 5 files / 58 tests passed after blocker corrections.
- PostgreSQL: disposable `idp26_test`, sequential execution, 9 files / 45 tests passed.
- API package: check, build, and coverage gate passed; exact final totals are recorded in the
  Initiative 26 evidence document.
- Studio package: 80 files / 788 tests, production-boundary check, and build passed.
- Playwright: 101/101 passed with four workers after reconciling legacy context/access mocks,
  deterministic fixture clocks, and the drawer transition assertion.
- Notes: external R2/Resend rendering and hml pending-invitation smoke remain deployment checks;
  no provider secret was persisted or logged.

## Risks And Follow-Ups

- [x] Initiative 25 may materially change profile/logo/readiness ownership; TASK-001 reconciled
  its implemented contract before any overlapping edit.
- [x] Over-broad readiness can recreate the rejected wizard as a checklist. Preserved
  `schedule_ready` as the only required owner activation milestone.
- [x] Invitation context can become an enumeration or leakage vector. Kept it behind a valid opaque
  token, minimal, no-store, rate-limited, and absent from terminal states/logs.
- [x] Cross-module projection can become a catch-all aggregator. Kept stable step IDs and narrow
  existence queries; do not expose raw domain entities.
- [x] Layout timing can recenter Agenda after user interaction. Eligibility is one-time per
  date/unit key and test minute/refresh/resize/manual-scroll cases.
- [x] Visual ambition can become generic spectacle or performance debt. Kept one earned gold-thread
  system, no new dependency by default, no navigation delay, and require settled/reduced-motion plus
  measured desktop/mobile evidence.
- [x] Client analytics remains deferred until consent/identity governance is confirmed; operational
  server metrics must still establish a baseline.
- [x] Consider an explicit `Voltar para agora` command only after evidence shows users need repeat
  navigation; it is outside this initiative.

## Scope Changes

- 2026-09-06: User fixed the identifier as Initiative 26, declared Initiative 25 concurrent work,
  and required both connected-note issues—contextual invitations and Agenda current-time initial
  position—to be resolved inside this onboarding initiative.
- 2026-09-06: User explicitly approved expanding the initiative with a stunning, effect-rich
  onboarding experience; scope remains Approved with effects bounded to earned first-run moments.

## Definition of Done

- [x] The implemented PRD version was explicitly approved.
- [x] Initiative 25 completion was reconciled before overlapping implementation.
- [x] All applicable gates in
      `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [x] Every in-scope AC has reviewable evidence.
- [x] Deviations, skipped checks, residual risks, and follow-ups are recorded.
