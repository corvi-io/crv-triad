# 28 Studio Product Analytics And Error Tracking

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: Implemented; provider activation pending
- Owner: CRV Triad
- Last updated: 2026-09-12
- Approved by/date: Marcus / 2026-09-12

Repository implementation and automated verification are complete. The existing Site project key is
also configured for Studio and API in Infisical `dev`, `hml`, and `prd`. Provider-side dashboards,
retention/access review, uploaded source-map validation, and live replay/privacy inspection remain
pending until a deployed Studio release and authenticated provider review are available. Infisical
contains the PostHog project ID and CLI key names in `/infrastructure` for all three environments,
but their values are empty and must be provisioned before the production delivery gate can pass.

## Summary

Instrument TRIAD Studio with always-on authenticated product analytics, privacy-bounded session
replay, and browser error tracking, and instrument the API with error tracking only. The initiative
must connect product behavior, tenant context, releases, request correlation, and unexpected failures
without sending business payloads or personally identifiable information to PostHog. It must also
establish the identity contract needed to connect the existing anonymous public-site journey to a
future landing-page sign-up flow without implementing that flow now.

## Context

- Current state: the public Astro site already uses consent-gated anonymous PostHog analytics,
  privacy-bounded replay, a first-party `/e/*` proxy, and a server-confirmed lead event. Studio and
  the general API runtime do not initialize PostHog for product analytics or error tracking.
- Problem: product decisions for the authenticated experience cannot be grounded in activation,
  adoption, and retention data, while unexpected browser and API failures are not correlated with
  user journeys, tenants, releases, replays, or request IDs.
- Why now: the production Studio has multiple real workflows, and the existing site integration
  provides a reusable provider project and ingestion boundary. Establishing identity and taxonomy
  before adding more journeys reduces fragmented analytics later.
- Related docs/issues: `docs/site/analytics.md`, `docs/api/analytics-proxy.md`, initiative 18, and
  the product initiatives that introduced onboarding, scheduling, service desk, checkout, clients,
  reporting, and operational notifications.
- Repository evidence:
  - `apps/site/src/scripts/analytics.ts` initializes `posthog-js` only after marketing consent and
    keeps the visitor anonymous.
  - `apps/api/src/modules/analytics/http/routes.ts` owns the constrained first-party proxy.
  - `apps/api/src/entrypoints/rest/app.ts` composes the Elysia application but currently has no
    REST-wide `onError` hook.
  - Several API route plugins already convert known and unexpected failures locally, so a global
    hook alone cannot observe every existing `internal_error` response.
  - `apps/api/src/modules/idp/http/middleware/request-context.ts` establishes `X-Request-ID`.
  - `apps/studio/src/main.tsx` composes TanStack Query, TanStack Router, and authentication without
    an analytics/error-tracking provider or global query/mutation error observer.
  - `apps/studio/src/modules/auth/services/auth-provider.tsx` exposes the authenticated user UUID;
    workspace context supplies the tenant boundary after selection.

## Actors And Workflows

- Primary actors: authenticated Studio users, product/engineering operators investigating adoption
  or incidents, and API operators diagnosing unexpected failures.
- Current workflow: operators infer Studio usage from application state and investigate failures
  through isolated UI symptoms and structured logs. Site analytics stop at the anonymous marketing
  journey.
- Target workflow:
  1. PostHog initializes on the Studio login surface without a separate analytics-consent gate.
  2. Pre-authentication activity remains anonymous; after a valid session, Studio identifies the
     person with the internal user UUID and associates events with the active tenant UUID.
  3. Explicit events describe meaningful activation and product workflows; page navigation and
     privacy-bounded replay provide supporting context.
  4. Unexpected frontend failures are captured once with route, release, environment, safe user and
     tenant correlation, and replay context when available.
  5. Unexpected API failures are captured through the appropriate Elysia, Better Auth,
     background/worker, and process boundaries with request/release correlation.
  6. Expected validation, authorization, not-found, concurrency, and domain outcomes remain normal
     product behavior rather than error-tracking issues.
- Alternate/failure/recovery flows:
  - Missing or invalid PostHog configuration disables telemetry without blocking login or product
    operation outside production; production delivery gates reject missing required configuration.
  - Provider latency or failure never changes a browser action, API response, background job result,
    or process shutdown contract.
  - A user logout calls `reset()` before another account can inherit the prior identity.
  - A workspace switch updates the PostHog group context without merging tenants.
  - A marketing visitor who declined consent has no pre-sign-up analytics history; a future Studio
    session still begins its always-on authenticated history.

## Goals

- Measure Studio activation, adoption, engagement, and retention through explicit stable events.
- Correlate frontend exceptions with the affected route, release, pseudonymous user, tenant, and
  masked session replay.
- Capture all in-scope unexpected API failures without reporting expected business or HTTP outcomes
  as incidents.
- Preserve safe request correlation between Studio-visible failures, API error reports, and existing
  structured logs.
- Establish a durable anonymous-to-identified identity contract for the future landing-page sign-up
  journey without implementing public self-registration.
- Make telemetry failure-isolated, testable, deployable by environment, and operationally useful.

## Non-Goals

- Implement a landing-page sign-up form, public self-registration, new invitation behavior, or a
  site-to-Studio redirect flow.
- Emit product/business analytics events from the API, except the existing site lead event retained
  by initiative 18.
- Instrument Backstage in this version.
- Send email addresses, names, phone numbers, client records, appointment details, financial values,
  form contents, credentials, tokens, cookies, private headers, or raw request/response bodies.
- Treat expected validation, authentication, authorization, not-found, rate-limit, version-conflict,
  or domain-transition outcomes as unexpected errors.
- Add OpenTelemetry, a second analytics provider, persisted analytics tables, or a shared package.
- Implement feature flags, experiments, surveys, alerts, or automatic remediation beyond the
  provider configuration required for this scope.

## Requirements

### Functional

- REQ-001: Studio must initialize PostHog on the login surface in configured non-local deployments,
  without a separate analytics consent interaction and without making authentication depend on it.
- REQ-002: Studio must identify a valid authenticated session by internal user UUID only, attach
  safe person properties, call `reset()` on logout/session loss, and never identify with PII.
- REQ-003: Studio must associate authenticated events with the active tenant UUID through PostHog
  groups and must replace group context when the workspace changes.
- REQ-004: Studio must capture explicit English `snake_case` events for navigation, onboarding,
  scheduling, service desk, checkout/cash, clients, reporting, notifications, and other accepted
  high-value actions through a typed event/property contract.
- REQ-005: The initial activation funnel must distinguish session start, workspace readiness,
  onboarding completion, first scheduling value, first service completion, and first checkout value;
  dashboards must permit refinement of the final activation definition after baseline collection.
- REQ-006: Studio must capture unexpected render, global runtime, unhandled promise, router, query,
  mutation, and explicitly caught workflow failures without duplicating the same failure across
  boundaries.
- REQ-007: Studio session replay must be enabled under a reviewed sampling policy and must mask all
  form inputs and sensitive client, appointment, service, financial, support, and account content.
- REQ-008: API error tracking must capture unexpected failures in CRV-owned Elysia HTTP lifecycles,
  including locally converted `internal_error` paths that a global hook cannot observe.
- REQ-009: API error tracking must cover unexpected failures at the adapted Better Auth boundary,
  report/background/Trigger task boundaries, and process startup/shutdown boundaries where the
  global Elysia hook does not apply.
- REQ-010: Expected framework and domain outcomes must be classified and excluded from PostHog
  issues while remaining visible through their existing public contracts and structured telemetry.
- REQ-011: Frontend and API error reports must use `X-Request-ID` when available and attach only
  allowlisted context including application, normalized route, method/status category, environment,
  release, module, pseudonymous user UUID, and tenant UUID.
- REQ-012: Site, Studio, and API must use the same accepted PostHog project and compatible identity
  semantics so a future consented landing-page sign-up can identify the anonymous visitor with the
  created user UUID before redirect and Studio can continue with the same UUID.
- REQ-013: Logout, session expiry, account changes, tenant switches, preview/dev surfaces, and local
  test runs must have explicit telemetry behavior that prevents identity leakage or polluted
  production analytics.
- REQ-014: Provider dashboards must cover the Studio activation funnel, route/module adoption,
  tenant-level engagement, retention, browser error health, and API error health.

### Non-Functional

- REQ-015: PostHog outages, timeouts, SDK exceptions, and flush failures must be best-effort and must
  never alter application responses, domain transactions, UI recovery, or process exit semantics.
- REQ-016: Telemetry must be privacy-safe by construction through allowlisted properties,
  normalized routes, replay masking, payload prohibition, and tests with sensitive sentinels.
- REQ-017: Error reports must include deploy target and release identifier, and browser source maps
  must be published for deployed Studio releases without making source maps publicly discoverable.
- REQ-018: Event, replay, and error volume must be bounded through explicit-event design,
  deduplication, provider controls, and an initial configurable sampling/retention policy.
- REQ-019: Production must fail its delivery configuration gate when required Studio/API telemetry
  inputs or the source-map publication credential are absent; lower environments may remain
  provider-free where explicitly configured.
- REQ-020: The implementation must preserve the current first-party proxy security contract and
  evaluate its API bandwidth/concurrency impact before routing additional Studio traffic through it.

## Brainstorm

### Problem Framing

- The primary need is not to collect every click or every returned error. It is to understand whether
  users reach recurring product value and to diagnose unexpected failures with enough safe context
  to act.
- Product and engineering are affected because current decisions and incident investigation lack a
  shared journey/release/error view.
- The improved workflow connects an affected user journey to the responsible frontend or backend
  failure without reconstructing the event from sensitive logs.

### Gaps And Unknowns

- Product gap: the definitive activation event is not yet measured. The initial funnel intentionally
  captures several candidate value milestones and requires a baseline review.
- Technical gap: a global Elysia `onError` observes thrown lifecycle failures, but returned status
  values and route-local catches do not necessarily reach it. Existing handlers must be audited.
- Technical gap: provider SDK compatibility with the deployed Bun runtime and Trigger.dev bundle,
  source-map CLI behavior, and proxy asset paths must be verified during implementation against the
  pinned versions.
- Data/model gap: no application persistence is required; PostHog owns analytics retention.
- Operational gap: replay sample rate, data retention, provider access roles, issue notifications,
  and dashboard ownership require provider-side configuration. Conservative defaults are accepted
  for implementation and must be recorded in durable operations docs.

### Counterpoints

- Capturing every `4xx` and every domain exception as an issue would create alert fatigue, inflate
  volume, and hide actual defects. The recommended design observes classifications but reports only
  unexpected failures to Error Tracking.
- Relying only on one Elysia hook is simpler but incomplete because plugins can encapsulate hooks,
  routes already catch failures, Better Auth is adapted, and background work has no request lifecycle.
- Autocapture can accelerate discovery but produces unstable and potentially sensitive event data in
  an authenticated business application. Explicit events are preferred for the durable contract.
- A full OpenTelemetry rollout would provide stronger vendor-neutral traces and metrics but materially
  expands this initiative. It remains a future observability option rather than a prerequisite.
- Doing nothing leaves activation hypotheses unmeasured and makes production regressions depend on
  user reports and fragmented logs.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Frontend autocapture plus one global API error hook | Fastest initial wiring | Privacy risk, unstable taxonomy, incomplete API coverage, noisy issues | Rejected |
| B | Typed explicit Studio events, masked replay, layered frontend/API error boundaries, shared identity contract | Reviewable, correlatable, privacy-bounded, compatible with current architecture | Requires taxonomy, classification audit, tests, and provider operations | Recommended |
| C | PostHog plus full OpenTelemetry traces/metrics/log export | Strong vendor-neutral operational coverage | Larger platform and operational scope | Reconsider when service/SLO needs justify it |

### Recommendation

Choose option B. Reuse the accepted PostHog project and constrained ingestion boundary, add a
Studio-owned analytics module, and centralize common error classification/reporting without assuming
one hook covers every runtime. Use the root Elysia `onError` before route registration for uncaught
CRV REST failures, explicitly instrument local `internal_error` translations and non-HTTP boundaries,
and fingerprint/deduplicate reports. Keep expected failures out of Error Tracking. Prepare the future
site sign-up identity handoff as a documented contract only.

## Architecture And Boundaries

- Site impact: no new registration UI or runtime event in V1; update the analytics contract with the
  future anonymous-to-identified handoff and shared-project rules.
- API impact: add a provider adapter and safe error reporter under the analytics/observability
  boundary, wire it explicitly into REST and non-REST failure boundaries, manage lifecycle flush,
  and preserve safe error responses.
- IDP impact: no identity rule changes. Adapted Better Auth failures may be reported only after safe
  classification; authentication credentials and identity payloads are prohibited.
- Studio impact: add analytics/provider composition, typed events, identity/group synchronization,
  masked replay, error boundaries/listeners, safe request correlation, and tests.
- Data/persistence impact: no schema, migration, backfill, transaction, or application query change.
- External provider impact: reuse the accepted PostHog project and region; configure Error Tracking,
  source maps, dashboards, retention, replay sampling, access, and issue routing.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Defines activation, adoption, retention, identity, and error-investigation journeys | `requirements-analysis`, `posthog-instrumentation` |
| Architecture | Applicable | Crosses site contract, Studio, API, IDP adapter boundary, proxy, and provider | `triad-architecture` |
| API | Applicable | Adds lifecycle hooks/adapters but no new public business route | `triad-api-development`, `elysia`, `docs/api/analytics-proxy.md` |
| Identity and authorization | Applicable | Uses session user UUID and tenant grouping without changing authorization | `triad-idp-development`, `docs/idp/authentication.md` |
| Persistence | Not applicable | No Triad-owned telemetry storage or schema change | Existing PostHog provider persistence |
| Studio UI | Applicable | Instruments existing routes and adds non-visible providers/error boundaries | `triad-studio-development` |
| Site UI | Deferred | Future sign-up continuity is documented; no form exists | Owner: future public sign-up initiative; `docs/site/analytics.md` |
| Accessibility | Applicable | Error boundaries and replay must not alter focus, announcements, or recovery UI | `accessibility`, existing Studio UI contracts |
| Performance and scale | Applicable | SDK bundle, replay/event volume, proxy traffic, and backend flush are bounded | Provider/proxy docs |
| Security and privacy | Applicable | Authenticated product data and replay create substantial exposure risk | Root/app `AGENTS.md`, analytics docs |
| Observability | Applicable | Core purpose includes classification, correlation, issues, dashboards, and release context | `observability-guidelines` |
| Reliability and delivery | Applicable | Requires best-effort behavior, env rollout, source maps, provider setup, and rollback | deployment docs, `env-schema.yaml` |
| Testing and QA | Applicable | Requires unit, integration, production-boundary, browser, privacy, and failure tests | `triad-testing`, app test contracts |
| Documentation | Applicable | Establishes durable analytics, privacy, error, environment, and operational contracts | app READMEs and `docs/{site,studio,api}` |

## Performance And Scalability

- Expected data growth: product events grow with authenticated interactions, replay with sampled
  sessions, and issues with unexpected failures rather than database record count.
- Critical paths: login/session resolution, route navigation, mutations, API response completion,
  worker execution, and process shutdown must not await provider success on user-facing paths.
- Query bounds/pagination: no application query is introduced. Provider dashboards must use bounded
  time windows and environment filters.
- Concurrency risks: routing Studio SDK/replay/error traffic through the API proxy adds bandwidth and
  concurrent upstream requests to the API deployable. Measure before increasing replay coverage.
- External limits: PostHog event, replay, error, source-map, retention, and rate limits must be
  confirmed for the active project; no unsupported numeric capacity is claimed.
- What happens with millions of records/items: telemetry does not enumerate business records.
  High interaction volume is controlled through explicit events, deduplication, sampling, retention,
  and, if needed, migration from the API-hosted proxy to a managed/dedicated proxy.

## Security, Privacy, And Abuse

- Auth/session impact: Studio begins anonymously on login, identifies only after a valid session,
  resets on session loss/logout, and never changes session authorization.
- Roles/access: safe role/category properties may be used only from server-confirmed access data;
  PostHog groups never grant application access.
- PII/secrets: property allowlists exclude names, email, phone, client and appointment data, service
  notes, money values, credentials, tokens, cookies, headers, request/response bodies, SQL, and raw
  upstream/provider errors. Error messages require sanitization or omission when provenance is not
  controlled.
- Replay: all inputs are masked; sensitive text regions and dynamic business surfaces are blocked or
  masked by default. A visual privacy audit is required before production enablement.
- Spam/abuse vectors: the existing proxy source, method, body-size, header, and rate-limit controls
  remain. Additional Studio traffic must not turn it into a generic proxy.
- Rate limiting or throttling needs: use provider/browser deduplication and replay sampling; preserve
  proxy limits and review them only with measured traffic evidence.

## Accessibility And UX

- Keyboard flow: analytics providers and boundaries add no focusable UI. Existing recovery actions
  retain focus behavior.
- Screen reader states: existing loading/error announcements remain authoritative; telemetry must not
  add duplicate live-region output.
- Responsive behavior: no analytics-specific visible layout is introduced.
- Loading/error/empty states: tracking must execute independently of existing states and must not
  replace actionable Portuguese error copy.
- Duplicate submission prevention: analytics capture is not a mutation and cannot trigger or retry a
  product command.

## Logging And Observability

- Useful structured events: retain safe application lifecycle and request events; add stable
  `posthog_error_report_failed`, initialization, flush/shutdown, and configuration-health events
  without exception text or identifiers in logs.
- Metrics: provider dashboards track affected users/tenants, issue occurrences, unique issues,
  frontend/API split, release/environment distribution, and product funnels. Infrastructure request
  latency and error rates remain platform concerns.
- Traces/spans: full distributed tracing is deferred. `X-Request-ID` is the accepted cross-boundary
  correlation key for this initiative.
- Alerts: provider-side notification rules may target new/regressed production issues after baseline
  validation; thresholds must be tuned from observed data rather than invented.
- Sensitive data that must not be logged: all prohibited analytics data plus provider credentials,
  source-map upload credentials, raw errors of unknown provenance, and private URLs.

## Delivery And Rollback

- Compatibility strategy: telemetry adapters default to no-op when optional configuration is absent;
  existing APIs and UI contracts remain unchanged.
- Feature flag/rollout: no product feature flag is required. Enable provider configuration by
  environment, validate in `dev`, then `hml`, then `prd`; replay sampling can be reduced or disabled
  independently from analytics/error tracking.
- Migration/backfill: none. Historical Studio behavior and errors are not reconstructed.
- Rollback: remove/disable environment configuration or revert provider composition while leaving
  product behavior intact. Disable replay first if privacy or volume concerns arise.
- Operational readiness: configure project/region, source maps, release metadata, retention,
  sampling, access, dashboards, issue notifications, and proxy monitoring before production sign-off.

## Success Measures

- Success signals: production Studio sessions populate a complete candidate activation funnel;
  product usage can be segmented by module, role, and tenant group; deliberately injected frontend
  and API exceptions create one sanitized issue each with release and correlation context.
- Baseline or measurement plan: collect an initial production baseline after rollout, then review the
  candidate activation milestones and replay/error volume before selecting alert thresholds or a
  single north-star activation definition.
- Regression guardrails: no PII/sensitive sentinel appears in events, issues, replay, logs, or public
  error responses; telemetry outages do not change behavior; expected failures do not create issues;
  site analytics continues to honor marketing consent.
- Evaluation window: perform provider validation immediately after each environment rollout and a
  product/error taxonomy review after the first meaningful production usage window; record the
  chosen window in the provider operations evidence rather than inventing a duration now.

## Acceptance Criteria

- [ ] AC-001: In a configured deployment, Studio initializes on login, identifies only after a valid
  session with user UUID, binds the active tenant group, updates it on workspace switch, and resets
  identity on logout/session loss.
- [ ] AC-002: A reviewed typed event catalog emits the accepted navigation, activation, and module
  events with safe common properties, while autocapture does not create an unreviewed data surface.
- [ ] AC-003: Session replay is sampled and a browser privacy audit proves that inputs and sensitive
  business/account text are masked or blocked in representative Studio journeys.
- [ ] AC-004: Deliberately injected render, promise, router/query/mutation, and caught workflow defects
  each produce a deduplicated sanitized frontend issue with app, route, environment, release, and safe
  identity/group context.
- [ ] AC-005: Deliberately injected unexpected CRV Elysia failures, including a route-local
  `internal_error`, produce a deduplicated sanitized API issue with normalized route, request ID,
  environment, release, and module context while preserving the safe HTTP response.
- [ ] AC-006: Better Auth adapter, background/report/Trigger work, and process lifecycle failure
  boundaries have explicit tested capture or an evidence-backed documented exclusion; none rely on
  the root Elysia hook implicitly.
- [ ] AC-007: Representative validation, unauthenticated, forbidden, not-found, rate-limited,
  version-conflict, and domain-transition outcomes do not create PostHog Error Tracking issues.
- [ ] AC-008: Sensitive sentinel tests prove that PII, credentials, headers, bodies, SQL, raw provider
  details, and private URLs are absent from browser/API reports, replay, logs, and HTTP responses.
- [ ] AC-009: Provider unavailability and timeout tests prove that login, navigation, mutations, API
  responses, workers, and shutdown retain their existing behavior.
- [ ] AC-010: Deployed Studio issues resolve to reviewed source through private source-map publication
  and contain the matching release identifier.
- [ ] AC-011: Production dashboards expose the candidate activation funnel, module/route adoption,
  tenant engagement, retention, and frontend/API error health with production filters.
- [ ] AC-012: The future site sign-up identity handoff is documented and tested at the contract/helper
  level without adding public registration, and existing consented anonymous site behavior remains
  unchanged.
- [ ] AC-013: `env-schema.yaml`, app env examples, deploy gates, operational docs, and rollback guidance
  cover every new public key, server/provider setting, release, source-map, sampling, and retention
  dependency without committing secrets.
- [ ] AC-014: Focused API/Studio tests, production-boundary checks, builds, workspace checks, and manual
  browser/provider journeys pass with reviewable evidence.

## Verification Plan

- Unit tests: typed Studio event allowlists, identity/group/reset transitions, route normalization,
  expected-error classification, fingerprint/deduplication, property sanitization, no-op/provider
  failure behavior, and API reporter classification.
- Integration/API tests: Elysia `app.handle` tests for thrown global failures, locally converted
  internal failures, expected errors, request ID preservation, Better Auth adapter behavior, provider
  timeouts, and sensitive sentinels.
- UI tests: provider composition, authenticated identity lifecycle, workspace switching, route
  pageviews, module events, Error Boundary recovery, query/mutation errors, logout reset, and preview/
  production boundaries.
- Manual/browser checks: login-to-value journeys at desktop and 320 CSS pixels, two-account logout/
  login isolation, tenant switching, replay masking, network behavior, deliberate frontend/API errors,
  source-map resolution, and PostHog Live Events/Issues/Dashboards.
- Build/check commands: `bun --filter studio check`, `bun --filter studio coverage:check`,
  `bun --filter studio test:e2e:production`, `bun --filter api check`,
  `bun --filter api coverage:check`, focused env/deployment tests, `bun run check`, and
  `git diff --check`.

## Open Questions

### Blocking

- None.

### Non-Blocking

- [ ] Which candidate milestone becomes the canonical activation event? — Product owner reviews the
  initial funnel after meaningful production usage.
- [ ] What replay sampling and retention values fit actual traffic and cost? — Engineering records a
  conservative initial provider configuration and reviews measured usage after rollout.
- [ ] Should Backstage join the same error project later? — A separate initiative must assess its
  internal-operations privacy and authorization boundary.
- [ ] When should full distributed tracing replace request-ID-only correlation? — Reconsider when
  multiple deployables or incident evidence show request IDs are insufficient.

## Assumptions

- The existing accepted PostHog project and US region can host site, Studio, and API data; validate
  provider access and project settings before implementation.
- Studio telemetry is always enabled from the login surface in configured deployments; update legal/
  privacy disclosures before production if the accepted service terms do not already cover it.
- The internal user UUID and tenant UUID are accepted pseudonymous identifiers; validate this in the
  privacy review and never attach direct identifiers.
- The existing `/e/*` proxy can support initial Studio traffic, but its capacity is unmeasured; collect
  traffic/error/latency evidence and move to a managed/dedicated proxy if it competes with API work.
- PostHog SDK and source-map tooling support the pinned Bun, Vite, and Trigger runtimes; prove this in
  a focused adapter/build spike before broad instrumentation.

## Definition of Ready

- [x] All mandatory gates in `planning-gates.md` pass.
- [x] Requirement-to-acceptance-to-task traceability is complete.
- [x] The planning state is `Ready` before requesting approval.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-12 | Awaiting approval |  | Initial product analytics and layered error-tracking contract |
| 2026-09-12 | Approved | Marcus | Approved for end-to-end implementation |
