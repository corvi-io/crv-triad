# 19 Multi-Tenant Client Foundation And Backstage Operations - Execution Plan

## Source

- PRD: `docs/initiatives/prds/19-multi-tenant-client-foundation-and-platform-operations.md`
- Related issue/PR: Not created
- Approval state: Approved
- Approved PRD version/date: Backstage revision approved 2026-09-04

## Implementation Principles

- Do not begin implementation until the linked PRD version is explicitly approved.
- Follow the accepted recommendation from the PRD.
- Keep scope bounded to the acceptance criteria.
- Use relevant Triad skills before implementation.
- Prefer simple designs that can scale to near-term needs without obvious bottlenecks.
- Treat tenant scope as a server-enforced authorization boundary, not a browser filter.
- Keep platform authority, tenant membership, support context, and IDP identity separate.
- Keep role capabilities, plan entitlements, subscription access state, and quotas separate and
  compose them in one server-side decision.
- Treat access summaries and caches as UX/performance aids, never write authorization authority.
- Never implement tenant-user impersonation or an unscoped platform data bypass.
- Keep global administration in `apps/backstage`; Studio owns tenant management only.
- Reuse Studio's proven toolchain, tokens, primitives, auth patterns, and quality gates selectively;
  do not clone Studio business modules or development fixtures into Backstage.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001–REQ-004, REQ-027–REQ-028 / AC-001–AC-002, AC-015–AC-016 | TASK-001–TASK-004 | Better Auth organization configuration/schema, bootstrap, membership, invite-regression, and two-tenant integration tests |
| REQ-005–REQ-010 / AC-003–AC-005 | TASK-005–TASK-009 | Client domain/API/adapter/component and persistence journeys |
| REQ-011–REQ-016 / AC-006–AC-010 | TASK-010–TASK-014 | Platform role matrix, inventory, support-context, audit, and UI tests |
| REQ-017–REQ-018 / AC-005, AC-012 | TASK-007, TASK-009, TASK-014 | Conflict/error contract and recoverable UI tests |
| REQ-019–REQ-023 / AC-001, AC-008, AC-010–AC-011 | TASK-003, TASK-006–TASK-007, TASK-011–TASK-013, TASK-015 | Isolation, query, load, redaction, metrics, and trace evidence |
| REQ-024 / AC-012 | TASK-009, TASK-014, TASK-017 | Accessibility, responsive, theme, and role-based browser evidence |
| REQ-025–REQ-028 / AC-010, AC-013–AC-016 | TASK-001–TASK-004, TASK-013, TASK-016–TASK-018 | Plugin safety, invitation compatibility, audit retention, rollout, migration, rollback, docs, full checks, and Product QA |
| REQ-029–REQ-035 / AC-017–AC-022 | TASK-001–TASK-003, TASK-008–TASK-009, TASK-014, TASK-019, TASK-018 | Global identity modeling, multiple memberships, context routing/switching, cache isolation, and client-link privacy tests |
| REQ-036–REQ-039 / AC-023–AC-026 | TASK-001–TASK-004, TASK-010, TASK-013–TASK-015, TASK-020, TASK-018 | Single-owner invariant, admin boundaries, atomic transfer, exceptional recovery, audit, concurrency, and role-journey evidence |
| REQ-040–REQ-049 / AC-027–AC-033 | TASK-001–TASK-003, TASK-005–TASK-009, TASK-013, TASK-015–TASK-018, TASK-021–TASK-024 | Capability matrix, access requests, manual subscription state, entitlements, transactional quota, cache fallback, denial UX, docs, and E2E evidence |
| REQ-050–REQ-058 / AC-034–AC-041 | TASK-025–TASK-033 | Backstage boundary/scaffold, internal RBAC, tenant provisioning/lifecycle/detail, Studio extraction, ports/deployment, documentation, accessibility, E2E, and Product QA evidence |

## Dependency Order

The critical path is version-pinned Better Auth organization contract/schema validation, additive
identity-link modeling, server business authorization context, workspace selection/switching, client
domain/API, Studio HTTP integration,
access/subscription contract and persistence, platform assignment, principal-owner governance,
permission/paywall enforcement and UX, inventory, support context/audit, then rollout and
end-to-end verification. API
client-domain logic and Studio adapter contract tests may
proceed in parallel after the OpenAPI shapes are committed. Platform console component work may
proceed beside server inventory work after the platform contract is fixed, but cross-tenant support
UI must wait for support-context and audit semantics. Shared schema, REST composition, generated
route/OpenAPI artifacts, and Studio source wiring are serialized to avoid conflicting edits.
The Backstage revision then fixes the internal role/provisioning contracts, scaffolds the independent
app, reaches inventory/support parity, adds tenant/operator administration, removes the temporary
Studio surface, wires the product-family ports and delivery, and finishes with cross-app Product QA.
Studio extraction cannot begin before Backstage parity evidence exists.

## Tasks

### TASK-001 — Freeze business context and API contracts

- Status: Completed
- Covers: REQ-001–REQ-003, REQ-005–REQ-018, REQ-027–REQ-049, AC-001, AC-003–AC-010,
  AC-015–AC-033
- Depends on: None
- Can parallelize with: None
- Relevant skills/docs: `requirements-analysis`, `triad-architecture`, `triad-api-development`,
  `triad-studio-development`, `docs/api/conventions.md`
- Expected artifacts: Better Auth 1.6.23 organization option/schema decision, accepted route
  vocabulary, request/response schemas, error codes, role matrix, support-context lifecycle, query
  bounds, note/contact bounds, global-user/tenant/professional/client relationship rules, context
  routing, capability keys and role matrix, access-decision order/reason codes, subscription state
  matrix, immutable plan/version/entitlement/quota vocabulary, optimistic version contract, and
  committed OpenAPI design notes.
- Implementation notes: configure `allowUserToCreateOrganization: false`,
  `disableOrganizationDeletion: true`, static `owner`/`admin`/`member` roles without tenant-member invitation creation, no
  teams/dynamic access control, and reviewed `idp_` model mappings. Keep the plugin-required
  organization invitation model distinct from existing access invitations. Do not enable the admin
  plugin. Preserve the existing Studio
  `ClientRepository` behavior where it matches
  the PRD, but do not expose scenario IDs or fixture behavior. Separate list and detail projections;
  exclude notes/appointments from list payloads. Define platform routes under an explicit platform
  namespace without `/v1`.
- Verification: contract review proves every request derives actor identity from session and no
  route treats a supplied tenant ID as authority.
- Evidence required before completion: reviewed contract/role tables mapped to PRD requirements.

### TASK-002 — Add additive tenancy and client persistence

- Status: Completed
- Covers: REQ-001–REQ-002, REQ-006–REQ-010, REQ-017, REQ-021, REQ-027–REQ-030,
  REQ-033–REQ-036, AC-001, AC-004–AC-005, AC-015–AC-017, AC-020–AC-021, AC-023
- Depends on: TASK-001
- Can parallelize with: TASK-010 after TASK-001
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, API persistence conventions
- Expected artifacts: generated-then-reviewed Better Auth organization/member/organization-
  invitation/session schema mapped into the explicit IDP Drizzle schema, input-disabled tenant and
  member status fields, additive migrations for those plugin models plus clients and client notes,
  and a nullable client identity reference that cannot be populated by contact matching,
  opaque IDs, compound tenant indexes, normalized contacts, constraints, timestamps, and optimistic
  versions. Include the database portion of the single-active-owner invariant where compatible with
  the pinned plugin schema.
- Implementation notes: use `idp_` prefixes for Better Auth plugin-owned identity tables and no IDP
  prefix for client business tables. Compare generated schema from the pinned package rather than
  copying latest documentation. Do not migrate synthetic Studio fixtures; keep hard deletion
  unavailable. Use foreign keys and tenant-scoped uniqueness where appropriate.
- Verification: migration up on an empty and existing-schema database, constraint tests, rollback
  procedure rehearsal without destructive down-migration, and reviewed index definitions.
- Evidence required before completion: migration output and database integration tests.

### TASK-003 — Implement server-side tenant authorization context

- Status: Completed
- Covers: REQ-002–REQ-003, REQ-019, REQ-029–REQ-032, REQ-035–REQ-037, AC-001,
  AC-006, AC-017–AC-019, AC-021, AC-023–AC-024
- Depends on: TASK-002
- Can parallelize with: None
- Relevant skills/docs: `triad-api-development`, `triad-idp-development`, Better Auth access docs
- Expected artifacts: narrow Better Auth session/active-organization dependency, organization
  membership lookup, business tenant context, forbidden/error mapping, and Elysia integration that
  business modules can consume explicitly.
- Implementation notes: let Better Auth own organization membership mechanics while business modules
  own their authorization mapping and tenant operational rules. Re-resolve authority on each
  request; do not authorize from client claims, `checkRolePermission`, or cached UI state. Return indistinguishable
  not-found/forbidden behavior when necessary to prevent cross-tenant enumeration.
- Verification: owner/member/multiple-membership/non-member/client-only/disabled-member/inactive-
  tenant, 50-membership bound and overflow rejection, active-organization switching, and known-
  foreign-ID tests.
- Evidence required before completion: complete business authorization decision matrix passing.

### TASK-004 — Add idempotent initial tenant/operator bootstrap

- Status: Completed
- Covers: REQ-004, REQ-011, REQ-036, AC-002, AC-006, AC-023
- Depends on: TASK-002, TASK-010
- Can parallelize with: TASK-005 after TASK-003
- Relevant skills/docs: `triad-api-development`, `triad-idp-development`, operations docs
- Expected artifacts: explicit server script accepting an existing IDP identity plus barbershop
  metadata, idempotently creating a Better Auth organization, owner membership, and
  platform-operator assignment.
- Implementation notes: use Better Auth's server organization APIs without session headers when
  creating on behalf of the existing user. Add no startup magic, hard-coded email, public
  provisioning, competing invitation journey, printed secret, or duplicate assignment. Fail safely
  when identity does not exist.
- Verification: first run, repeat run, missing-user, partial-existing-state, and transaction failure.
- Evidence required before completion: synthetic bootstrap transcript and database assertions.

### TASK-019 — Implement administrative context discovery and selection

- Status: Completed
- Covers: REQ-029–REQ-032, REQ-035, AC-017–AC-019, AC-021–AC-022
- Depends on: TASK-001–TASK-004
- Can parallelize with: TASK-005–TASK-007 after the context contract is stable
- Relevant skills/docs: `triad-idp-development`, `triad-studio-development`, `impeccable`,
  `accessibility`, Better Auth organization documentation
- Expected artifacts: bounded context-discovery response, Better Auth active-organization wiring,
  `/select-workspace`, post-auth routing decision, active-tenant shell indicator/switcher, platform
  entry when authorized, tenant-aware query-key policy, and safe no/loading/error/switch-failure
  states.
- Implementation notes: run the Impeccable `init` and `shape` workflow with the user before UI
  implementation because the project currently lacks `PRODUCT.md`. Enter `/overview` only for one
  tenant without platform authority; enter the platform console for a platform-only identity; use
  selection when two or more contexts exist. Treat platform operations as a separate context and never
  show client-only relationships. Confirm the server context before navigation; cancel or ignore
  in-flight old-context results and remove tenant-bound cache data atomically on switch.
- Verification: zero/one/many membership, one tenant plus platform, disabled membership, direct URL,
  long organization names, many organizations, repeated switching, race/failure, keyboard, screen
  reader, focus, 320px, zoom, theme, and reduced-motion tests.
- Evidence required before completion: context-routing matrix, cache-isolation proof, approved design
  brief, and browser/accessibility artifacts.

### TASK-005 — Implement client domain rules and use cases

- Status: Completed
- Covers: REQ-005–REQ-010, REQ-017–REQ-018, AC-003–AC-005
- Depends on: TASK-001, TASK-002
- Can parallelize with: TASK-003 where pure domain code has no persistence dependency
- Relevant skills/docs: `triad-api-development`, `requirements-analysis`, Studio client contract
- Expected artifacts: normalization, validation, duplicate detection, archive/restore, notes,
  optimistic conflict, pagination/filter/sort input, and list/detail projection use cases.
- Implementation notes: require a name and phone or email; bound all strings and lists; treat
  appointments/visit dates as unavailable projections; keep UI messages outside the domain.
- Verification: table-driven unit tests for valid, invalid, duplicate, archive, note, and stale cases.
- Evidence required before completion: domain test suite mapped to client requirements.

### TASK-006 — Implement tenant-scoped client persistence repositories

- Status: Completed
- Covers: REQ-005–REQ-010, REQ-017, REQ-019–REQ-021, AC-001, AC-004–AC-005, AC-011
- Depends on: TASK-002, TASK-003, TASK-005
- Can parallelize with: TASK-008 after TASK-001
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`
- Expected artifacts: Drizzle repository queries for list/detail/mutations/notes/duplicates with
  tenant predicates, bounded joins, deterministic pagination, transactions, and version conditions.
- Implementation notes: never fetch a record globally and compare tenant afterward. Avoid N+1 note
  and duplicate queries; do not return notes in list projections.
- Verification: PostgreSQL integration tests with at least two tenants, query-count checks, conflict
  races, transaction rollback, and reviewed query plans on synthetic data.
- Evidence required before completion: isolation matrix and query evidence.

### TASK-007 — Expose and document client API routes

- Status: Completed
- Covers: REQ-003, REQ-005–REQ-010, REQ-017–REQ-020, AC-001, AC-003–AC-005
- Depends on: TASK-003, TASK-005, TASK-006; access-control completion depends on TASK-022–TASK-023
- Can parallelize with: None
- Relevant skills/docs: `triad-api-development`, `elysia`, OpenAPI route conventions
- Expected artifacts: module-owned Elysia plugin, Zod/Elysia validation schemas, stable errors,
  pagination metadata, request IDs, OpenAPI declarations, and REST composition.
- Implementation notes: use bounded query parameters and route templates; distinguish validation
  and optimistic conflict safely; enforce tenant context before data access.
- Verification: in-process route tests plus composed real-database API tests for success, malformed
  input, unauthenticated, forbidden, foreign IDs, conflicts, and safe errors.
- Evidence required before completion: OpenAPI snapshot and passing route/integration coverage.

### TASK-008 — Build the Studio client HTTP adapter and source wiring

- Status: Completed
- Covers: REQ-005–REQ-010, REQ-018, REQ-025, REQ-029–REQ-032, AC-003–AC-005,
  AC-014, AC-017–AC-019
- Depends on: TASK-001, TASK-019; integration completion depends on TASK-007
- Can parallelize with: TASK-005–TASK-006 using contract fixtures
- Relevant skills/docs: `triad-studio-development`, `orval` if accepted after inspecting generated
  output, `docs/studio/client-management.md`
- Expected artifacts: committed narrow API contract/client, HTTP `ClientRepository`, safe error
  mapping, credentials/correlation handling, env/source configuration, and production-boundary
  rules that exclude memory fixtures.
- Implementation notes: prefer generated types from the committed OpenAPI contract where they fit;
  keep Better Auth client separate. Do not fall back to memory on network or authorization failure.
- Verification: adapter contract tests against representative responses and source-target build tests.
- Evidence required before completion: adapter parity matrix and production artifact scan.

### TASK-009 — Adapt Client UI to real server behavior

- Status: Completed
- Covers: REQ-005–REQ-010, REQ-017–REQ-018, REQ-024, REQ-029–REQ-035,
  AC-003–AC-005, AC-012, AC-017–AC-022
- Depends on: TASK-008
- Can parallelize with: None
- Relevant skills/docs: `triad-studio-development`, `accessibility`, `ux-copy`, existing client docs
- Expected artifacts: server-backed list/detail/mutations, URL-compatible pagination/filter/sort,
  bounded duplicate checks, conflict recovery, tenant forbidden state, accessible feedback, and
  updated tests/docs.
- Implementation notes: preserve existing component patterns and Portuguese copy; remove scenario
  behavior from the real source; keep appointments explicitly unavailable rather than fabricated;
  never display or populate a client identity link from matching email. Partition all query keys by
  confirmed organization and cooperate with the global switch invalidation policy.
- Verification: Vitest and Playwright for persistence across reload, validation, conflict, duplicate,
  archive/restore, notes, focus, screen reader, responsive, theme, and failure states.
- Evidence required before completion: browser journey and accessibility artifacts.

### TASK-010 — Add platform authority and support persistence

- Status: Completed
- Covers: REQ-011, REQ-013, REQ-016, REQ-021–REQ-023, REQ-039, AC-002, AC-006,
  AC-008–AC-010, AC-026
- Depends on: TASK-001
- Can parallelize with: TASK-002, then migration integration is serialized
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, security/privacy section
- Expected artifacts: platform-operator assignment, support-context, and append-only support audit
  schemas/migrations with active/revoked/expiry state, reason bounds, and indexes.
- Implementation notes: store a digest if a bearer-style support credential is necessary; never log
  or return audit PII payloads. Platform assignment is not inferred from IDP admin.
- Verification: constraint, expiry, revocation, redaction, and immutable-application-path tests.
- Evidence required before completion: migration and security-test results.

### TASK-020 — Enforce principal ownership governance and recovery

- Status: Completed
- Covers: REQ-036–REQ-039, AC-023–AC-026
- Depends on: TASK-001–TASK-004, TASK-010
- Can parallelize with: TASK-005–TASK-007 after organization hooks/contracts are stable
- Relevant skills/docs: `triad-idp-development`, `better-auth-best-practices`,
  `organization-best-practices`, `postgres-drizzle`, `triad-testing`
- Expected artifacts: exactly-one-owner constraint strategy, guarded Better Auth organization hooks
  and routes, owner/admin permission matrix, recently-authenticated transfer command, idempotency and
  optimistic concurrency, exceptional platform recovery command, high-severity audit metadata, and
  the minimum Studio ownership-transfer/platform-recovery surfaces required to operate them.
- Implementation notes: do not expose generic owner assignment. Reject remove, disable, leave, or
  role-update paths that affect the principal owner except through the dedicated atomic transfer.
  Normal transfer requires the current owner; recovery requires an active platform operator and
  never impersonates. Legal owners remain business metadata, not authorization owners.
- Verification: database/application invariant tests, direct Better Auth endpoint bypass attempts,
  concurrent transfers, stale authentication, stale version, inactive/cross-tenant targets,
  idempotent retry, audit redaction/severity, keyboard/focus/error UI, and rollback behavior.
- Evidence required before completion: concurrency-backed proof that every committed tenant state
  retains exactly one active owner plus normal/recovery role-matrix evidence.

### TASK-021 — Add plan, subscription, entitlement, quota, and access-request persistence

- Status: Completed
- Covers: REQ-043–REQ-047, REQ-049, AC-028–AC-031, AC-033
- Depends on: TASK-001, TASK-002
- Can parallelize with: TASK-010, TASK-020
- Relevant skills/docs: `triad-architecture`, `triad-api-development`, `postgres-drizzle`,
  `triad-testing`
- Expected artifacts: additive business-owned tables for stable plan keys, immutable plan versions,
  feature entitlements, nullable quota definitions, one current tenant subscription, access-request
  lifecycle, and the constraints/indexes needed for idempotency, history, and concurrency. Include
  documented seed data for non-commercial 5/100/1,000 active-client tiers and a trusted manual/mock
  subscription command.
- Implementation notes: keep all commercial rules outside `modules/idp`; do not persist payment
  credentials or invent provider payloads. Preserve prior plan-version facts rather than mutating
  history. Make manual assignment auditable and safe to rerun.
- Verification: empty/existing database migrations, unique-current-subscription and pending-request
  constraints, seed idempotency, state transitions, and rollback rehearsal without destructive data
  removal.
- Evidence required before completion: reviewed schema/migration output and database integration
  tests.

### TASK-022 — Implement centralized access decisions and permission requests

- Status: Completed
- Covers: REQ-040–REQ-045, REQ-048, AC-027–AC-029, AC-032
- Depends on: TASK-003, TASK-021
- Can parallelize with: TASK-005
- Relevant skills/docs: `triad-api-development`, `triad-idp-development`, `elysia`,
  `postgres-drizzle`, `triad-testing`
- Expected artifacts: stable capability catalog, static role-capability matrix, composed access
  decision service, active-context access-summary route, safe denial codes, and create/list/approve/
  deny access-request use cases and routes with audit evidence.
- Implementation notes: evaluate authentication, context, tenant/subscription state, capability,
  entitlement, then quota in a deterministic fail-closed order. Approval selects only an existing
  role; it cannot create per-user grants. Never authorize from access-summary content or reveal a
  foreign resource through the denial reason.
- Verification: decision-table tests for every role/state/reason, direct-route bypass attempts,
  stale summaries, tenant switching, request deduplication, approver boundaries, and audit redaction.
- Evidence required before completion: access matrix and API tests mapped to each protected action.

### TASK-023 — Enforce transactional client quotas and cache-safe summaries

- Status: Completed
- Covers: REQ-040, REQ-044–REQ-048, AC-027, AC-029–AC-032
- Depends on: TASK-005, TASK-006, TASK-021, TASK-022
- Can parallelize with: TASK-011
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`, API
  observability conventions
- Expected artifacts: entitlement and subscription checks on client routes, transactionally safe
  active-client capacity reservation for create/restore, capacity release through archive, bounded
  quota summaries, version-keyed role/plan caching, subscription/quota cache invalidation, and
  database fallback.
- Implementation notes: never use a cached counter as the sole write authority. Reads and archive
  remain available at the limit. Make cache optional so correctness and local development do not
  depend on new infrastructure.
- Verification: below/at/over-limit tests for all seeded tiers, concurrent requests for one remaining
  slot, archive/restore cycles, tenant isolation, stale/missing cache, and subscription transition
  races.
- Evidence required before completion: concurrency evidence proving the effective limit is not
  exceeded and measured access-decision/query behavior on documented synthetic data.

### TASK-024 — Build permission-aware navigation, access requests, and paywall UX

- Status: Completed
- Covers: REQ-041–REQ-043, REQ-046, REQ-048, AC-027–AC-028, AC-030, AC-032
- Depends on: TASK-008, TASK-019, TASK-022, TASK-023
- Can parallelize with: TASK-014 after shared shell access-summary behavior is fixed
- Relevant skills/docs: `triad-studio-development`, `impeccable`, `accessibility`, `ux-copy`,
  `triad-testing`
- Expected artifacts: active-context access provider, capability-shaped navigation and actions,
  direct-route guard presentation, reusable Brazilian Portuguese forbidden/request-access/
  subscription-required/module-not-included/quota-reached states, access-request review surface,
  upgrade explanation, and cache partition/invalidation on tenant switch.
- Implementation notes: omit actions that never apply to the role; present rather than conceal
  recoverable plan/quota states with current/limit data when authorized. Do not advertise checkout
  or successful payment. Preserve keyboard focus, semantic announcements, responsive layout,
  themes, and direct-route recovery.
- Verification: component and browser matrix for owner/admin/member, all denial reasons, request
  lifecycle, stale access state, direct URLs, tenant switches, 320-pixel/zoom/theme/reduced-motion,
  keyboard, and screen reader behavior.
- Evidence required before completion: automated tests plus Product QA screenshots/journey notes.

### TASK-011 — Implement platform inventory and aggregate queries

- Status: Completed
- Covers: REQ-011–REQ-012, REQ-020–REQ-023, AC-006–AC-007, AC-011
- Depends on: TASK-002, TASK-003, TASK-010
- Can parallelize with: TASK-012 after shared authorization is stable
- Relevant skills/docs: `triad-api-development`, `postgres-drizzle`, `triad-testing`
- Expected artifacts: platform authorization context, paginated tenant inventory, bounded search and
  allowlisted sort, grouped membership/client counts, safe errors, and OpenAPI routes.
- Implementation notes: return no client PII in default inventory. Produce counts without per-tenant
  follow-up queries. Inactive operator assignment fails closed.
- Verification: role matrix, correct counts, pagination determinism, query-count/plan evidence, and
  safe response tests.
- Evidence required before completion: cross-role API evidence and N+1 guard.

### TASK-012 — Implement reason-bound support contexts

- Status: Completed
- Covers: REQ-013–REQ-014, REQ-016, REQ-022–REQ-023, AC-008–AC-010
- Depends on: TASK-003, TASK-007, TASK-010
- Can parallelize with: TASK-011 after platform authorization is stable
- Relevant skills/docs: `triad-api-development`, security/privacy and observability sections
- Expected artifacts: create/resolve/exit/revoke/expire use cases and routes; server-side elevated
  tenant context; transactionally coupled mutation audit; bounded detail-read audit.
- Implementation notes: revalidate operator and tenant state on every elevated request. Preserve the
  real actor. Do not issue a tenant user's session or reuse browser tenant IDs as proof.
- Verification: missing reason, wrong tenant, expiry, revocation, inactive operator/tenant, forged
  context, concurrent revocation, and successful audited read/write tests.
- Evidence required before completion: full support authorization state-machine evidence.

### TASK-013 — Add privacy-safe observability and operational controls

- Status: Completed
- Covers: REQ-016, REQ-018, REQ-022–REQ-023, REQ-026, REQ-038–REQ-039,
  REQ-043, REQ-045–REQ-049, AC-010–AC-011, AC-013, AC-025–AC-026, AC-028–AC-033
- Depends on: TASK-007, TASK-011–TASK-012, TASK-021–TASK-023
- Can parallelize with: TASK-014 after contracts stabilize
- Relevant skills/docs: `logging-best-practices`, `observability-guidelines`, API conventions
- Expected artifacts: structured metadata events, route metrics/traces, redaction tests, bounded
  365-day audit cleanup, operator revocation/audit inspection commands, manual subscription and
  quota-reconciliation operations, access-decision/cache-fallback metrics, and baseline-driven alert
  documentation.
- Implementation notes: never emit request bodies, raw search terms, client values, or auth/support
  credentials. Audit storage and operational logs have distinct purposes.
- Verification: sentinel-based leak tests, correlation tests, failure diagnosis exercise, and
  synthetic metrics review.
- Evidence required before completion: redaction report and runbook exercise.

### TASK-014 — Build the separate Studio platform console and support UX

- Status: Completed
- Covers: REQ-012–REQ-015, REQ-018, REQ-024–REQ-025, REQ-029–REQ-032, REQ-038–REQ-039,
  AC-006–AC-009, AC-012, AC-014, AC-017–AC-019, AC-022, AC-025–AC-026
- Depends on: TASK-011–TASK-012, TASK-019
- Can parallelize with: TASK-013
- Relevant skills/docs: `triad-studio-development`, `accessibility`, `ux-copy`, `impeccable`
- Expected artifacts: server-gated platform route/navigation, tenant inventory table, count/detail
  presentation, reason form, persistent support banner, reused client capability under elevated
  context, exit/expiry recovery, and independent rollout control.
- Implementation notes: do not expose platform navigation based solely on static frontend role data;
  handle direct URLs safely. Do not present support mode as tenant impersonation. Reuse established
  DataTable, pagination, drawer/form, feedback, and shell patterns.
- Verification: role/direct-URL matrix, support entry/use/exit/expiry, focus/announcements, 320px,
  zoom, light/dark, reduced motion, and no-PII default inventory tests.
- Evidence required before completion: component, browser, accessibility, and visual QA evidence.

### TASK-015 — Validate performance, scale, concurrency, and isolation

- Status: Completed
- Covers: REQ-017, REQ-019–REQ-023, REQ-036–REQ-040, REQ-044–REQ-048, AC-001,
  AC-005, AC-008, AC-010–AC-011, AC-023–AC-027, AC-029–AC-032
- Depends on: TASK-006–TASK-007, TASK-011–TASK-013, TASK-021–TASK-023
- Can parallelize with: TASK-014
- Relevant skills/docs: `triad-testing`, `postgres-drizzle`, performance section in the PRD
- Expected artifacts: documented synthetic dataset generator, query plans, query-count assertions,
  concurrent mutation tests, authorization matrix, bounded payload evidence, and measured baseline.
- Implementation notes: state dataset size and environment with every result; do not convert baseline
  observations into unsupported production capacity claims.
- Verification: repeatable scripts/tests fail on cross-tenant leakage, unbounded results, N+1 count
  behavior, stale overwrites, or missing hot-path indexes.
- Evidence required before completion: reviewed performance/isolation report.

### TASK-016 — Prepare staged configuration, migration, and rollback

- Status: Completed
- Covers: REQ-004, REQ-022, REQ-025, REQ-044–REQ-049, AC-002, AC-013–AC-014,
  AC-029–AC-031, AC-033
- Depends on: TASK-004, TASK-008, TASK-010, TASK-014, TASK-020–TASK-024
- Can parallelize with: TASK-017
- Relevant skills/docs: `triad-release-workflow`, env schema and deployment docs
- Expected artifacts: env-schema declarations only when runtime values are necessary, Infisical path
  plan, API-first rollout, internal operator enablement, tenant adapter enablement, support expiry
  default, migration backup/forward-fix, feature disable, and application rollback instructions.
- Implementation notes: keep secrets server-side and app-local env runtime-shaped. Do not roll back
  populated additive tables destructively.
- Verification: dev/hml deployment rehearsal, bootstrap, flag disable/enable, operator revocation,
  and application rollback with retained data.
- Evidence required before completion: timestamped non-production rehearsal notes.

### TASK-017 — Update durable architecture and operational documentation

- Status: Completed
- Covers: REQ-001–REQ-049, AC-013, AC-015–AC-033
- Depends on: Contract portions of TASK-001; finalize after TASK-013–TASK-016 and TASK-019–TASK-024
- Can parallelize with: TASK-016
- Relevant skills/docs: root/app/docs `AGENTS.md`, `docs/api`, `docs/studio`, documentation gate
- Expected artifacts: tenancy/business authorization, role-capability matrix, access decision and
  request lifecycle, client API/runtime, versioned plans, subscription state matrix, entitlement and
  quota semantics, manual/mock operations, cache consistency/fallback, future provider seam,
  paywall/denial UX, platform operations, support access/audit, bootstrap, privacy, deployment,
  rollback, and testing docs; corrected stale FastAPI wording in the Triad architecture boundary
  reference.
- Implementation notes: update README/AGENTS/skills only where durable workflow or agent behavior
  changes; do not duplicate the full PRD.
- Verification: link/path checks and review against implemented runtime behavior.
- Evidence required before completion: documentation diff mapped to affected contracts.

### TASK-018 — Run final verification and Product QA

- Status: Completed
- Covers: REQ-001–REQ-049, AC-001–AC-033
- Depends on: TASK-002–TASK-017, TASK-019–TASK-024
- Can parallelize with: None
- Relevant skills/docs: `triad-preflight-review`, `triad-product-qa`, `triad-testing`
- Expected artifacts: complete automated results, migration evidence, tenant/platform role journeys,
  accessibility/responsive evidence, privacy sentinel results, production-boundary scan, deviations,
  and rollback verification.
- Implementation notes: test organization-plugin configuration/schema drift, existing invitations,
  zero/one/many administrative contexts, client-only identity, owner who is also representable as a
  professional, cross-tenant professional membership, context-switch races, owner, admin, member,
  non-member, IDP-admin-only, platform operator without context, active support, expired support,
  revoked operator, admin owner-bypass attempts, normal/concurrent transfer, and exceptional
  recovery. Also test every capability/subscription/entitlement/quota denial, access-request
  approval boundary, seeded limit, concurrent final slot, cache fallback, direct URL, hidden action,
  and tenant-switch summary invalidation. Record residual manual checks and
  do not mark acceptance criteria complete without evidence.
- Verification: `bun --filter api check`, `bun --filter api coverage:check`,
  `bun --filter studio check`, `bun --filter studio test:e2e`, applicable root checks, migration/load
  scripts, and corrective Product QA.
- Evidence required before completion: all ACs traced to reviewable results and Definition of Done.

### TASK-025 — Establish the Backstage product and architecture boundary

- Status: Completed
- Covers: REQ-050–REQ-052, REQ-057–REQ-058, AC-034, AC-039–AC-041
- Depends on: TASK-018
- Can parallelize with: None
- Relevant skills/docs: `triad-architecture`, `triad-initiative-workflow`, `impeccable`, root and
  Studio architecture/design documentation
- Expected artifacts: accepted `apps/backstage` ownership contract, updated root product/port
  boundaries, Backstage PRODUCT/DESIGN direction and surface brief, scoped AGENTS instructions, and
  a `triad-backstage-development` skill with focused references.
- Implementation notes: use the user-approved TRIAD Backstage name and Operate mode. Preserve TRIAD
  family recognition while establishing an internal-operations information architecture. Do not
  treat a copied Studio directory as product design or retain Studio business modules by accident.
- Verification: boundary review maps every global route and dependency to Backstage, Studio, API,
  IDP, or deferred Barber ownership with no ambiguous shared authority.
- Evidence required before completion: reviewed product/design/architecture artifacts and updated
  normative instructions.

### TASK-026 — Add Backstage operator roles and capability enforcement

- Status: Completed
- Covers: REQ-011, REQ-050, REQ-055, AC-034, AC-037
- Depends on: TASK-025
- Can parallelize with: TASK-027 after the capability contract is fixed
- Relevant skills/docs: `triad-api-development`, `triad-idp-development`, `postgres-drizzle`,
  `triad-testing`
- Expected artifacts: additive operator-role schema migration, `system_owner`/`operations`/`support`/
  `billing` capability matrix, active-assignment resolver, operator summary endpoint, bootstrap/
  recovery command, and privacy-safe audit records.
- Implementation notes: migrate existing active operators conservatively to `system_owner` only
  when explicitly selected by the bootstrap input. Operator mutation remains outside this initial
  administrative slice. IDP admin and tenant membership confer no Backstage capability.
- Verification: role/endpoint matrix, direct-call denials, disabled operator, idempotent bootstrap,
  migration, and audit-redaction tests.
- Evidence required before completion: database and API tests proving every internal capability and
  negative boundary.

### TASK-027 — Implement atomic tenant provisioning and lifecycle APIs

- Status: Completed
- Covers: REQ-053–REQ-056, AC-035–AC-038
- Depends on: TASK-025–TASK-026
- Can parallelize with: TASK-028 after route schemas are committed
- Relevant skills/docs: `triad-api-development`, `triad-idp-development`, `better-auth-best-practices`,
  `postgres-drizzle`, `elysia`, `triad-testing`
- Expected artifacts: operator-gated tenant create/detail/update/suspend/reactivate routes, exact-email
  existing-owner resolution, provider-neutral manual subscription assignment, optimistic versions,
  stable errors, transactions and audit.
- Implementation notes: tenant creation must commit organization, exactly one owner or reserved
  pending owner transition, and current subscription atomically. Never expose fuzzy user search,
  public provisioning, hard deletion, credentials, or ownerless active tenants. Suspension takes
  effect on the next server authorization decision.
- Verification: existing-owner path, duplicate email/slug, injected partial failures, stale lifecycle
  version, operator-role denial, owner invariant,
  subscription assignment, and audit redaction against PostgreSQL.
- Evidence required before completion: transactional integration tests and committed OpenAPI evidence.

### TASK-028 — Scaffold the independent Backstage application

- Status: Completed
- Covers: REQ-050, REQ-052, REQ-057–REQ-058, AC-034, AC-040–AC-041
- Depends on: TASK-025
- Can parallelize with: TASK-026–TASK-027
- Relevant skills/docs: `triad-backstage-development`, `impeccable`, `shadcn`, `tailwind-design-system`,
  `vercel-react-best-practices`, `vitest`
- Expected artifacts: `apps/backstage` Bun workspace with Vite/React, TanStack Router/Query, Better
  Auth client, Tailwind v4, vetted shadcn/Base UI primitives, app shell, auth/operator gate, env
  parser/example, Biome/TypeScript/Vitest/Playwright configs, production-boundary script, README,
  component inventory, PRODUCT/DESIGN artifacts and port `3003`.
- Implementation notes: copy only reviewed Studio foundation files whose contracts apply, preserving
  provenance through repository history. Adapt names, routes, env prefixes, shell, navigation and
  tests to Backstage. Do not copy `src/dev`, tenant context, client/revenue/scheduling/service modules,
  fixtures, Studio deployment names, or memory-source flags.
- Verification: install integrity, route generation, lint, typecheck, unit tests, build, production
  boundary, auth/non-operator direct URL denial, and bundle inspection.
- Evidence required before completion: clean focused Backstage checks with inventory showing no
  undeclared copied component or Studio-domain import.

### TASK-029 — Move inventory, tenant detail and support UX to Backstage

- Status: Completed
- Covers: REQ-012–REQ-016, REQ-050, REQ-052–REQ-053, AC-007–AC-010, AC-034–AC-035, AC-041
- Depends on: TASK-026–TASK-028
- Can parallelize with: None
- Relevant skills/docs: `triad-backstage-development`, `impeccable`, `accessibility`, `ux-copy`,
  `triad-testing`
- Expected artifacts: Backstage dashboard, bounded tenant table, tenant detail, plan/quota/status
  presentation, reason-bound support entry, memory-only credential handling, persistent support
  banner, read-only support views, server revocation/expiry recovery, and operator-aware navigation.
- Implementation notes: migrate behavior, not route coupling. Replace `/platform` vocabulary with
  Backstage product language. Default inventory/detail must remain PII-free; support keeps the real
  operator identity and never impersonates a tenant user.
- Verification: component and browser role/direct-URL matrix, inventory bounds, tenant details,
  support create/read/revoke/expiry, old-credential denial, refresh behavior, accessibility,
  responsive/theme/reduced-motion and visual review.
- Evidence required before completion: API/UI/E2E evidence with inspected desktop and 320px captures.

### TASK-030 — Build Backstage tenant lifecycle administration

- Status: Completed
- Covers: REQ-054–REQ-056, AC-036–AC-038, AC-041
- Depends on: TASK-026–TASK-029
- Can parallelize with: None
- Relevant skills/docs: `triad-backstage-development`, `impeccable`, `accessibility`, `ux-copy`,
  `react-useeffect`, `triad-testing`
- Expected artifacts: create-tenant form, existing-owner outcome, tenant detail,
  suspend/reactivate controls, provider-neutral subscription context,
  pending/success/conflict/failure recovery and audit-visible results.
- Implementation notes: use RHF/Zod and stable Portuguese labels; retain form input after recoverable
  errors, focus the first invalid field, prevent duplicate submission, and require typed or explicit
  confirmation plus reason for high-impact actions. Do not imply payment collection.
- Verification: unit/component/E2E happy, invalid, duplicate, stale, forbidden, concurrent, partial-
  failure, refresh-persistence, keyboard and screen-reader journeys.
- Evidence required before completion: complete provisioning/lifecycle/operator browser journeys
  backed by PostgreSQL state and audit evidence.

### TASK-031 — Remove global administration from Studio after parity

- Status: Completed
- Covers: REQ-031, REQ-051, AC-018, AC-039
- Depends on: TASK-029–TASK-030
- Can parallelize with: None
- Relevant skills/docs: `triad-studio-development`, `triad-architecture`, `triad-testing`
- Expected artifacts: removal of Studio platform routes/module/support state and platform selector
  branch, regenerated route tree, tenant-only context routing, adjusted auth/session tests, docs and
  a migration note for bookmarks.
- Implementation notes: do not remove shared API platform contracts or Backstage code. Preserve
  zero/one/many tenant behavior and the no-workspace state for Backstage-only users. No cross-app
  automatic redirect is required in this slice.
- Verification: source scan finds no Studio global administration surface; Studio unit/E2E/build and
  production-boundary tests prove tenant flows and direct old-route not-found behavior.
- Evidence required before completion: Studio regression results after Backstage parity evidence.

### TASK-032 — Wire ports, environments and independent delivery

- Status: Completed
- Covers: REQ-050, REQ-057, AC-034, AC-040
- Depends on: TASK-028–TASK-031
- Can parallelize with: TASK-033 documentation drafting
- Relevant skills/docs: `triad-release-workflow`, `github-actions-docs`, env schema, delivery workflows
- Expected artifacts: landing page port `3004`, reserved Barber port `3001`, Backstage env declarations
  under Infisical `/backstage` with `BACKSTAGE__*` sources, trusted API origins, Cloudflare Pages
  targets, affected-app detection, independent build/deploy outputs, local/release docs and rollback.
- Implementation notes: keep frontend env browser-safe and runtime-shaped. Do not create an empty
  Barber app. API deploy must precede Backstage when contracts change; Studio platform removal must
  deploy only after Backstage parity.
- Verification: local simultaneous port startup, env-schema validation, workflow tests/dry review,
  per-app affected detection, production builds and staged rollback rehearsal without destructive
  database changes.
- Evidence required before completion: safe delivery evidence for API, Studio, Backstage and site.

### TASK-033 — Complete cross-app documentation and Product QA

- Status: Completed
- Covers: REQ-050–REQ-058, AC-034–AC-041
- Depends on: TASK-025–TASK-032
- Can parallelize with: None
- Relevant skills/docs: `triad-product-qa`, `triad-preflight-review`, `impeccable`, `accessibility`,
  `triad-testing`
- Expected artifacts: updated root/app READMEs, AGENTS, Triad skills, API/Studio/Backstage/operations/
  QA docs, immutable Markdown/JSON QA report, screenshots, detector result, finish review, migration/
  rollback evidence, and updated initiative status/evidence.
- Implementation notes: exercise system owner, operations, support, billing, disabled operator,
  IDP-admin-only, tenant-owner-only, existing tenant owner, active/suspended tenant, support
  expiry/revocation, stale/concurrent provisioning and old Studio URLs using the real local browser,
  API and isolated PostgreSQL. Never record credentials or fixture PII.
- Verification: `bun --filter api check`, API coverage/integration, `bun --filter studio check`,
  Studio E2E, `bun --filter backstage check`, Backstage E2E, `bun --filter site check`, root
  `bun run check`, production-boundary scans, `git diff --check`, manual detector exactly once and
  final visual reviewer/documenter gates.
- Evidence required before completion: every AC-034–AC-041 mapped to reviewable passing evidence and
  the revised Definition of Done closed.

## Verification Evidence

Record evidence as tasks are completed:

- TASK-001 (2026-09-04): `docs/api/business-context-and-access.md` records the reviewed Better Auth
  1.6.23 organization mapping, authority boundary, role/capability and subscription matrices,
  resource bounds, concurrency contract, stable route/error vocabulary, support lifecycle, privacy
  rules, and requirement traceability. Package source under the pinned
  `better-auth/dist/plugins/organization` was inspected for the session, organization, member, and
  organization-invitation schema fields. Contract review confirms that supplied tenant IDs are
  selection/support inputs only and ordinary business authority is session-derived and revalidated.
- Persistence and API (2026-09-04): generated, reviewed, and applied additive migrations
  `0005`–`0009` to both the configured local-development database and a disposable PostgreSQL 17
  database at loopback port 55433. Composite-FK dependency ordering was corrected before the final
  successful runs. The isolated suite passed 4/4 tests, including known foreign-tenant client IDs,
  empty foreign lists, transactional rollback, and five concurrent creates competing for two quota
  slots. The disposable container was removed after verification.
- Authorization and operations (2026-09-04): session-derived context revalidation, the static role
  matrix, fail-closed subscription/entitlement/quota decisions, access requests, one-owner database
  invariant, atomic transfer, exceptional operator recovery, immutable test-tier provisioning, and
  privacy-safe governance/support audit records are implemented. The API check passed 189/189 unit
  tests. Coverage gates passed at 84.58% statements, 80.12% branches, 83.52% functions, and 85.75%
  lines.
- Studio and Product QA (2026-09-04): production HTTP client wiring, zero/one/many context routing,
  cache cancellation/removal, permission-aware navigation/paywall states, bounded platform
  inventory, and reason-bound support create/read/revoke/exit are implemented. Browser journeys
  passed 3/3 for 1440px selection, 320px dark/reduced-motion platform with Axe, and support entry,
  read, server revoke, exit, plus immediate 403 for the old credential. `impeccable` detector returned
  no findings; the independent finish review reached `GO` after its server-revocation blocker was
  fixed. The direction marker survived the production build and the artifact scan found no client
  memory/scenario markers.
- Rollout and documentation (2026-09-04): `docs/api/business-context-and-access.md`,
  `docs/studio/multi-tenant-contexts.md`, and `docs/operations/multi-tenant-access-runbook.md` cover
  context, access, bootstrap, support, privacy, API-first rollout, non-destructive rollback, and
  incident behavior. No external hml/prd promotion was performed; release publication remains a
  separate explicit decision under the repository release policy.
- Backstage revision (2026-09-04): additive migrations `0010`–`0011` were applied to the configured
  Neon development database; `gabriel@corvi.io` was idempotently confirmed as the sole active
  `system_owner`, with zero tenants left for first-run creation. The independent Backstage app runs
  on `3003`, passed its unit suite, production-boundary build, Playwright/Axe desktop and mobile
  journey, and the one required Impeccable detector pass with no findings. API passed 195 tests,
  Studio passed 382 tests after global administration removal, CI configuration passed 19 tests,
  site check passed, and the root four-app check completed successfully.
- Final preflight (2026-09-04): the four-app root check, API build, CI configuration suite, and API
  coverage gate passed. API coverage reached 88.40% statements, 80.13% branches, 90.90% functions,
  and 90.85% lines across 225 tests. The preflight added behavioral coverage for tenant-scoped
  client routes and Backstage authority/support routes and fixed the client update schema exposed by
  those tests. The opt-in PostgreSQL suite was not rerun because `TEST_DATABASE_URL` was not
  configured; the earlier disposable-PostgreSQL execution remains the database evidence for this
  initiative.

## Risks And Follow-Ups

- [ ] Cross-tenant support authority may be broader than real support demand; review audit evidence
  before adding any non-client intervention.
- [ ] Audit retention and privacy requests require a durable policy before contractual production
  commitments.
- [ ] Granular tenant RBAC, customer identity claiming/portal, client merge/import/export, and
  additional platform operations require separate approved initiatives.
- [ ] Legal-shareholder records or multiple-authorization-owner governance require a separate
  initiative; tenant admins cover broad operational access in this slice.
- [ ] Payment-provider selection, checkout, invoices, tax, refunds, verified webhooks, grace-period
  policy, and commercial plan names/prices/limits require a separate approved initiative.
- [ ] Custom roles, per-member grants, and external notification delivery for access requests remain
  deferred until the static role matrix proves insufficient.
- [ ] Client appointment projections remain unavailable until scheduling integration owns them.

## Scope Changes

- 2026-09-04: Initial scope combines the tenant foundation, first client CRUD, tenant inventory, and
  bounded support intervention. Unrestricted god mode and impersonation are explicitly excluded.
- 2026-09-04: Scope now supports multiple organization memberships per global identity,
  post-authentication workspace selection, safe in-session switching, independent professional and
  client relationships, and a privacy-safe future client identity reference.
- 2026-09-04: Tenant governance now enforces one principal owner, supports multiple admins, and adds
  atomic normal transfer plus reason-bound, audited platform recovery.
- 2026-09-04: Foundation now includes centralized capability decisions, access-request UX, a
  provider-neutral manual/mock subscription source, versioned plan entitlements, transactional
  client quotas, cache-safe summaries, paywall states, and mandatory evolution documentation.
- 2026-09-04: The user revised the delivered global-administration boundary in place. Tenant
  inventory, support and future internal operations move from Studio into the independent TRIAD
  Backstage app. The revision adds tenant provisioning/lifecycle and internal role separation,
  reserves the product-family ports, and preserves Studio platform routes only until Backstage
  parity proves a safe cutover.

## Definition of Done

- [x] The revised Backstage PRD version was explicitly approved.
- [x] All applicable gates in
      `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [x] Every in-scope AC has reviewable evidence.
- [x] Deviations, skipped checks, residual risks, and follow-ups are recorded.
