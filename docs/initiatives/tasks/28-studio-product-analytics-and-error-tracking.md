# 28 Studio Product Analytics And Error Tracking - Execution Plan

## Source

- PRD: `docs/initiatives/prds/28-studio-product-analytics-and-error-tracking.md`
- Related issue/PR: None yet
- Approval state: Approved
- Approved PRD version/date: 2026-09-12

## Implementation Principles

- Do not begin implementation until the linked PRD version is explicitly approved.
- Follow the accepted recommendation from the PRD.
- Keep scope bounded to the acceptance criteria.
- Use relevant Triad skills before implementation.
- Prefer simple designs that can scale to near-term needs without obvious bottlenecks.
- Report unexpected failures, not every expected non-success result.
- Keep provider work best-effort and every property explicitly allowlisted.
- Preserve the current site consent and API public-error contracts.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001, REQ-013, REQ-019 / AC-001, AC-013 | TASK-002, TASK-004, TASK-011 | Studio env/provider and production-boundary tests |
| REQ-002, REQ-003, REQ-012 / AC-001, AC-012 | TASK-003, TASK-004, TASK-010 | Identity/group lifecycle tests and future handoff contract review |
| REQ-004, REQ-005, REQ-014 / AC-002, AC-011 | TASK-005, TASK-012 | Typed event tests, Live Events, funnel and dashboard evidence |
| REQ-006 / AC-004 | TASK-006 | Frontend boundary and deduplication tests |
| REQ-007, REQ-018 / AC-003 | TASK-007, TASK-012 | Replay privacy audit and provider configuration evidence |
| REQ-008, REQ-010 / AC-005, AC-007 | TASK-008 | Elysia/global-local classification tests |
| REQ-009 / AC-006 | TASK-009 | Better Auth/background/worker/process failure tests |
| REQ-011, REQ-016 / AC-004, AC-005, AC-008 | TASK-003, TASK-006, TASK-008, TASK-009 | Correlation and sensitive-sentinel tests |
| REQ-015 / AC-009 | TASK-003, TASK-006, TASK-008, TASK-009 | Provider failure/timeout/no-op tests |
| REQ-017 / AC-010 | TASK-011, TASK-012 | Release/source-map deploy and provider resolution evidence |
| REQ-020 / AC-013 | TASK-001, TASK-011, TASK-012 | Proxy compatibility tests and measured operational review |
| REQ-001–REQ-020 / AC-014 | TASK-013 | Full verification and Definition of Done evidence |

## Dependency Order

TASK-001 establishes provider/runtime facts and the accepted taxonomy before dependencies or
contracts are changed. TASK-002 and TASK-003 establish shared configuration and safe adapters.
Studio identity, events, frontend errors, and replay (TASK-004–TASK-007) can then proceed in parallel
with API HTTP and non-HTTP error boundaries (TASK-008–TASK-009), subject to shared adapter contracts.
TASK-010 documents the future site handoff without adding runtime registration. TASK-011 wires
delivery and source maps after runtime contracts stabilize. TASK-012 configures and validates the
provider after deployable artifacts exist. TASK-013 performs the final cross-app verification.

Work on Studio and API modules can be parallelized after TASK-003. Changes to `env-schema.yaml`, the
analytics proxy, shared deployment workflows, and provider project must be serialized through
TASK-011/TASK-012 to avoid conflicting contracts or partial rollout.

## Tasks

### TASK-001 — Validate provider, runtime, proxy, and telemetry contracts

- Status: Completed
- Covers: REQ-004, REQ-006–REQ-012, REQ-017–REQ-020, AC-002–AC-012
- Depends on: None
- Can parallelize with: None
- Relevant skills/docs: `posthog-instrumentation`, `elysia`, `triad-architecture`, official PostHog
  SDK/Error Tracking/source-map docs, `docs/api/analytics-proxy.md`
- Expected artifacts: recorded SDK/tooling versions; accepted event/property catalog draft; expected-
  error classification table; frontend/API boundary inventory; proxy capacity/security decision;
  provider project/region confirmation.
- Implementation notes: prove Bun and Trigger bundle compatibility with focused disposable tests;
  inventory Elysia root/local hooks, returned statuses, Better Auth mount behavior, queued microtasks,
  Trigger tasks, and process failures. Do not assume a root hook observes encapsulated or caught errors.
- Verification: run focused SDK initialization/capture/flush and proxy requests without product code
  changes; review the classification against existing stable error codes.
- Evidence required before completion: repository/provider evidence supports the chosen SDKs,
  ingestion route, source-map tool, all in-scope capture boundaries, and safe taxonomy.

### TASK-002 — Add environment and deployment-facing telemetry configuration

- Status: Completed
- Covers: REQ-001, REQ-013, REQ-017–REQ-020, AC-001, AC-010, AC-013
- Depends on: TASK-001
- Can parallelize with: TASK-003
- Relevant skills/docs: `triad-api-development`, `triad-studio-development`, environment/deployment docs
- Expected artifacts: Studio public project key/host/environment/release/sampling configuration; API
  server project key/host/environment/release configuration; source-map upload secret and project
  identifiers in the correct Infisical/deployment category; updated app env schemas/examples.
- Implementation notes: keep browser values public and administrative/source-map credentials secret;
  require production values at delivery gates while retaining intentional provider-free local tests.
- Verification: env parsing tests, deployment mapping tests, missing-production-value negative tests,
  and secret/public boundary inspection.
- Evidence required before completion: each runtime/deploy source is declared once, safely categorized,
  validated by target, and absent from logs and committed values.

### TASK-003 — Implement privacy-safe PostHog adapters and shared classification

- Status: Completed
- Covers: REQ-002, REQ-003, REQ-006, REQ-008–REQ-013, REQ-015–REQ-018, AC-001, AC-004–AC-009
- Depends on: TASK-001
- Can parallelize with: TASK-002
- Relevant skills/docs: `posthog-instrumentation`, `observability-guidelines`, app safety rules
- Expected artifacts: Studio analytics facade; API error-reporter port and PostHog adapter; no-op
  adapters; property allowlists; route normalization; expected-error classifier; fingerprint and
  deduplication rules; provider lifecycle contract.
- Implementation notes: keep Studio and API ownership separate rather than creating a premature shared
  package. The API reporter must accept a narrow sanitized envelope, never an arbitrary object/error
  context. Error capture failures must be swallowed after safe structured failure logging.
- Verification: unit tests for classification, sanitization, route normalization, fingerprinting,
  no-op behavior, timeout/failure behavior, and sensitive sentinels.
- Evidence required before completion: adapters cannot accept prohibited payloads through their typed
  contracts and tests show expected failures are excluded.

### TASK-004 — Compose Studio initialization, identity, tenant groups, and logout reset

- Status: Completed
- Covers: REQ-001–REQ-003, REQ-012, REQ-013, REQ-015, AC-001, AC-009, AC-012
- Depends on: TASK-002, TASK-003
- Can parallelize with: TASK-008, TASK-009
- Relevant skills/docs: `triad-studio-development`, Better Auth session contracts
- Expected artifacts: provider composition near `apps/studio/src/main.tsx`; session identity synchronizer;
  active-workspace group synchronizer; logout/session-loss reset integration; test helpers.
- Implementation notes: initialize anonymously at login, identify only after validated session data,
  set only allowlisted properties, replace group context on workspace switch, and reset before a later
  browser user can emit events. Exclude preview/test pollution explicitly.
- Verification: component/unit tests for anonymous login, session resolution, account transition,
  session expiry, logout, two sequential users, tenant switching, missing config, and provider failure.
- Evidence required before completion: call-order assertions prove no PII identification, no identity
  bleed, and no auth dependency on PostHog.

### TASK-005 — Implement the typed Studio product event catalog

- Status: Completed
- Covers: REQ-004, REQ-005, REQ-011–REQ-014, REQ-016, REQ-018, AC-002, AC-011
- Depends on: TASK-003, TASK-004
- Can parallelize with: TASK-006, TASK-007, TASK-008, TASK-009
- Relevant skills/docs: `posthog-instrumentation`, `triad-studio-development`, module durable docs
- Expected artifacts: documented event/property catalog and instrumentation at accepted route,
  onboarding, scheduling, service-desk, checkout/cash, client, reporting, and notification boundaries.
- Implementation notes: favor completion/outcome and candidate value events over raw clicks; keep event
  names English `snake_case`; do not claim server confirmation; include app/environment/release/route
  and safe role/group context; do not instrument development-only memory scenarios as production data.
- Verification: focused module tests assert event timing, once-only semantics where applicable,
  property allowlists, failed-action distinction, and absence of payload values.
- Evidence required before completion: every emitted event answers a documented product question and
  has an owner, trigger, properties, privacy classification, and test.

### TASK-006 — Add layered Studio error tracking and deduplication

- Status: Completed
- Covers: REQ-006, REQ-010, REQ-011, REQ-015–REQ-018, AC-004, AC-007–AC-009
- Depends on: TASK-003, TASK-004
- Can parallelize with: TASK-005, TASK-007, TASK-008, TASK-009
- Relevant skills/docs: `triad-studio-development`, React/TanStack provider contracts,
  `posthog-instrumentation`
- Expected artifacts: root error component/boundary; runtime and unhandled-rejection listeners; router,
  QueryCache, MutationCache, and caught-workflow reporting integration; request-ID extraction;
  deduplication tests and accessible recovery behavior.
- Implementation notes: one failure may cross several boundaries, so use stable fingerprint/context and
  capture ownership rules. Exclude aborts, handled form/domain errors, auth/access outcomes, and
  expected retries. Preserve Portuguese actionable UI errors and focus behavior.
- Verification: inject one representative failure per boundary and assert a single sanitized report,
  correct recovery UI, safe request correlation, and unchanged behavior when reporting fails.
- Evidence required before completion: AC-004, AC-007, AC-008, and frontend portions of AC-009 have
  automated evidence.

### TASK-007 — Configure and audit privacy-bounded Studio session replay

- Status: Completed
- Covers: REQ-007, REQ-016, REQ-018, AC-003, AC-008
- Depends on: TASK-003, TASK-004
- Can parallelize with: TASK-005, TASK-006, TASK-008, TASK-009
- Relevant skills/docs: `triad-studio-development`, `accessibility`, PostHog replay/privacy docs
- Expected artifacts: replay masking/blocking selectors or attributes; initial sampling configuration;
  automated structural privacy tests; manual privacy audit checklist/evidence.
- Implementation notes: mask all inputs and default-block dynamic business/account surfaces until
  individually reviewed. Do not weaken accessible names or visual recovery behavior to achieve masking.
- Verification: inspect representative login, onboarding, client, agenda, service, checkout/cash,
  reporting, notification, profile, and workspace-switch recordings with sensitive sentinels.
- Evidence required before completion: no prohibited value/text is visible in captured replay and the
  sampling choice is documented with a review trigger.

### TASK-008 — Capture and safely map Elysia HTTP failures

- Status: Completed
- Covers: REQ-008, REQ-010, REQ-011, REQ-015, REQ-016, REQ-018, AC-005, AC-007–AC-009
- Depends on: TASK-002, TASK-003
- Can parallelize with: TASK-004–TASK-007
- Relevant skills/docs: `elysia`, `triad-api-development`, API error reference
- Expected artifacts: REST-wide `onError` registered before affected routes; safe unexpected-error
  response mapping; explicit reporter injection or shared mapping for existing route-local
  `internal_error` conversions; request/module/route classification.
- Implementation notes: Elysia documents that thrown lifecycle errors reach `onError`, while returned
  `status(...)` values do not. Preserve registered domain mappings and public code-only envelopes.
  Never forward raw errors to responses or arbitrary error context to PostHog.
- Verification: `app.handle` tests cover global thrown error, parse/validation/not-found, known domain
  error, local caught unexpected error, invalid cookie/signature where applicable, provider failure,
  deduplication, request ID, and sensitive sentinels.
- Evidence required before completion: every inventoried CRV-owned HTTP `internal_error` boundary is
  captured or has a documented evidence-backed exclusion, with no expected outcome reported.

### TASK-009 — Cover Better Auth, background, Trigger, and process error boundaries

- Status: Completed
- Covers: REQ-009–REQ-011, REQ-015–REQ-019, AC-006–AC-010, AC-013
- Depends on: TASK-002, TASK-003
- Can parallelize with: TASK-004–TASK-008
- Relevant skills/docs: `triad-idp-development`, `trigger-tasks`, `triad-api-development`, Better Auth
  adapter and process lifecycle docs
- Expected artifacts: explicit sanitized capture at each accepted non-root-Elysia boundary; server
  startup/shutdown reporter lifecycle and bounded flush; Trigger task reporter composition; documented
  exclusions where provider/runtime behavior cannot be safely observed.
- Implementation notes: preserve Better Auth's mounted handler and enumeration-safe responses. Do not
  register broad process listeners that hide crashes or change exit codes. Background capture must not
  turn provider failure into job failure or suppress the original job failure.
- Verification: focused adapter/task/process tests inject unexpected failures, expected provider/domain
  failures, timeout, sensitive sentinels, and shutdown flush behavior.
- Evidence required before completion: the boundary matrix records capture/test or justified exclusion
  for Better Auth, queued local work, report worker, Trigger task, startup, and shutdown.

### TASK-010 — Document the future landing-page identity continuity contract

- Status: Completed
- Covers: REQ-002, REQ-012, REQ-013, REQ-016, AC-012
- Depends on: TASK-003, TASK-004
- Can parallelize with: TASK-005–TASK-009
- Relevant skills/docs: `triad-site-development`, `posthog-instrumentation`, `docs/site/analytics.md`
- Expected artifacts: durable cross-app identity sequence and helper/test seam documenting consented
  anonymous site ID, future successful sign-up identification by user UUID, Studio continuation, and
  logout reset.
- Implementation notes: do not add registration UI/routes/events now; do not put identity tokens or
  raw distinct IDs in redirect URLs; do not override a declined marketing consent choice.
- Verification: contract review and unit-level helper/type tests where a stable seam is useful, plus
  regression tests proving current site consent behavior is unchanged.
- Evidence required before completion: AC-012 is reviewable without claiming that public sign-up exists.

### TASK-011 — Integrate deployment, private source maps, release metadata, and rollback

- Status: Completed
- Covers: REQ-017, REQ-019, REQ-020, AC-010, AC-013
- Depends on: TASK-002, TASK-004, TASK-006, TASK-008, TASK-009
- Can parallelize with: None
- Relevant skills/docs: deployment docs, GitHub Actions/provider official docs
- Expected artifacts: build release identifiers; private source-map generation/upload/removal flow;
  environment mapping and required-value gates; proxy/deploy compatibility tests; rollback controls.
- Implementation notes: uploaded maps must match the deployed release and must not remain publicly
  served. Provider credentials belong in Infisical `/infrastructure` or the correct server-only path,
  never Vite variables. Preserve automatic deployment boundaries.
- Verification: deployment script tests, artifact inspection proving public bundles contain no source
  maps/credentials, dry-run or non-production upload evidence, and missing-secret negative tests.
- Evidence required before completion: a deployed non-production exception resolves to reviewed source
  and rollback can disable telemetry/replay without changing the application artifact contract.

### TASK-012 — Configure and validate PostHog project operations

- Status: Blocked — PostHog CLI project ID/key values are empty and live review is unavailable
- Covers: REQ-005, REQ-007, REQ-014, REQ-017–REQ-020, AC-003, AC-010, AC-011, AC-013
- Depends on: TASK-005–TASK-011
- Can parallelize with: None
- Relevant skills/docs: `posthog-instrumentation`, provider operations docs
- Expected artifacts: activation/adoption/retention dashboard; frontend/API error health dashboard;
  replay sampling and retention; project access review; source-map/release validation; optional
  issue-notification rules; provider URLs recorded in durable docs.
- Implementation notes: default dashboards to production filters, distinguish persons from tenant
  groups, and avoid thresholds until baseline evidence exists. Keep existing site dashboard intact.
- Verification: inspect Live Events, persons/groups, replays, Issues, release/source resolution, every
  dashboard query, and proxy traffic in the accepted region.
- Evidence required before completion: provider artifacts populate from deliberate safe test journeys
  and their URLs/settings are documented without credentials.

### TASK-013 — Run cross-app QA and close Definition of Done evidence

- Status: Blocked — automated verification is complete; live provider/browser QA depends on TASK-012
- Covers: REQ-001–REQ-020, AC-001–AC-014
- Depends on: TASK-012
- Can parallelize with: None
- Relevant skills/docs: `triad-testing`, `triad-product-qa`, initiative planning gates
- Expected artifacts: automated command results; browser/provider QA report; privacy and accessibility
  evidence; traceability update; residual-risk/follow-up record.
- Implementation notes: exercise configured and provider-unavailable states, two sequential users,
  tenant switching, expected failures, deliberate unexpected frontend/API/non-HTTP failures, replay
  masking, site consent regression, and rollback.
- Verification: run every command and manual journey from the PRD verification plan; run
  `git diff --check`; inspect final diff and documentation coverage.
- Evidence required before completion: every AC row has a direct artifact/result, all applicable
  Definition of Done gates pass, and skipped checks or deviations are explicit.

## Verification Evidence

Record evidence as tasks are completed:

- `bun --filter api check`: 54 files and 457 tests passed, including TypeScript and Biome.
- `bun --filter api coverage:check`: passed at 87.12% statements, 80.03% branches, 86.80%
  functions, and 89.00% lines before the final boundary-only wiring; the subsequent API check passed.
- `bun --filter studio build`: passed; PostHog is isolated in a lazy 303.39 kB chunk rather than the
  758.71 kB main bundle.
- `bun --filter studio test:production-boundary`: passed across 122 production files; deployed
  boundaries do not include development sources.
- `.github/scripts/env-management.test.ts` and `api-deployment-contract.test.ts`: 19 tests passed.
- `git diff --check`: passed.
- Infisical runtime configuration: the existing `SITE__PUBLIC_POSTHOG_KEY` was copied without
  disclosure to `STUDIO__VITE_POSTHOG_KEY` and `API__POSTHOG_PROJECT_KEY` in `dev`, `hml`, and `prd`;
  all three values match in every environment and the Studio ingestion host is configured.
- Provider availability audit: the names `INFRA__POSTHOG_CLI_API_KEY` and
  `INFRA__POSTHOG_CLI_PROJECT_ID` exist in Infisical `/infrastructure` for `dev`, `hml`, and `prd`,
  but their values are empty. The project key accepted a synthetic event and exception submission,
  while provider API verification returned `401` because the administrative key is not provisioned.
  No deployed source-map upload, dashboard, issue, or live replay inspection was possible.
- `bun --filter studio coverage:check`: 88 files and 849 tests passed at 84.61% statements, 80.01%
  branches, 82.43% functions, and 86.21% lines. The first run exposed missing configured-adapter
  branch evidence; focused lifecycle/privacy-safe facade coverage was added before the passing rerun.
- `bun run check`: all four workspace applications passed their complete check pipelines; Studio
  repeated its 849 tests, production build, and 122-file production-boundary verification.

## Risks And Follow-Ups

- [ ] Validate that the existing PostHog project, plan, region, and retention support the intended
  Studio, replay, error, and source-map workload.
- [ ] Measure proxy traffic/latency after rollout and move to a managed or dedicated proxy if it
  competes with identity or business API workloads.
- [ ] Review the canonical activation milestone after baseline collection.
- [ ] Revisit Backstage error tracking and full distributed tracing through separate initiatives.
- [ ] Implement the landing-page sign-up identity handoff only when public registration is accepted.

## Scope Changes

- 2026-09-12: Initial scope limits backend PostHog usage to unexpected error tracking, while Studio
  owns product analytics, replay, and frontend error tracking. Site registration remains future-only.

## Definition of Done

- [x] The implemented PRD version was explicitly approved.
- [ ] All applicable gates in
      `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [ ] Every in-scope AC has reviewable evidence.
- [x] Deviations, skipped checks, residual risks, and follow-ups are recorded.
