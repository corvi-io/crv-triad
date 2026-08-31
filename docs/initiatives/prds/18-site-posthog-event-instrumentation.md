# 18 Site PostHog Event Instrumentation

## Summary

Add privacy-safe, consent-gated PostHog instrumentation to the public Astro site so acquisition,
solution interest, lead-form progression, and accepted lead submissions can be measured without
capturing visitor PII or weakening the static-first experience. Route opted-in SDK traffic through
a constrained first-party API proxy before production rollout.

## Context

- Current state: the site has three public routes and API-backed lead intake but no production analytics runtime.
- Problem: product and acquisition decisions cannot be grounded in a stable event funnel.
- Why now: the public launch is available and the event draft can be converted into a durable contract.
- Related docs: `docs/site/analytics.md` and initiative 17 lead-delivery contracts.

## Goals

- Instrument the accepted site funnel with stable English `snake_case` events.
- Require explicit analytics consent and keep all lead PII outside event and replay payloads.
- Provide deployment and PostHog operator guidance without storing provider credentials.
- Route PostHog ingestion, configuration, and lazy-loaded SDK assets through a named API boundary.

## Non-Goals

- Identify anonymous visitors with email, phone, name, or another lead field.
- Provision a PostHog project, dashboard, or funnel without authorized provider access.
- Add Studio product analytics, feature flags, experimentation, or server-side event capture.

## Brainstorm

### Problem Framing

The product owner needs to understand which pages and product messages lead visitors to open,
start, and successfully submit the lead form. The useful workflow is aggregate funnel analysis,
not individual lead surveillance.

### Gaps And Unknowns

- Product: the production PostHog project, region, retention policy, and dashboard owners are external configuration.
- Technical: the draft referenced Next.js and `mailto:`, while the live site is static Astro with API intake.
- Data: no stable authenticated visitor ID exists, so anonymous capture is the honest model.
- Operational: Live Events, replay masking, funnel, and dashboard need authorized provider-side validation.

### Counterpoints

- Autocapture is simpler but expands the payload surface and makes event stability harder to review.
- Initializing before consent would improve apparent coverage but violate the accepted privacy boundary.
- A server proxy improves blocker resilience but moves provider bandwidth and request concurrency
  onto the API. This is accepted for the initial public-site traffic profile; measured growth or
  provider cost should trigger evaluation of PostHog's managed proxy or a dedicated edge proxy.
- Section observation is useful but lower priority than conversion events; it must remain bounded and once-per-page.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Full autocapture before consent | Minimal code | Privacy and taxonomy risk | Rejected |
| B | Consent-gated explicit browser events | Reviewable, static-first, privacy-safe | Blockers may reduce coverage | Recommended |
| C | Constrained first-party API proxy | Better delivery control and first-party ingestion | API bandwidth and operational cost | Accepted for production rollout |

### Recommendation

Use options B and C. Bundle `posthog-js` through Astro, initialize only after explicit opt-in,
disable autocapture, keep visitors anonymous, and route SDK traffic through a constrained `/e/*`
API module. The proxy uses fixed region-matched PostHog origins, strips credentials and cookies,
sanitizes upstream failures, and never becomes a caller-selected generic proxy.

## Architecture And Boundaries

- Site impact: consent UI, analytics helper, interaction hooks, public env configuration, and durable docs.
- API impact: a public `/e/*` analytics proxy; API lead success remains the source for
  `lead_submission_succeeded`.
- IDP impact: none.
- Studio impact: none.
- Data/persistence impact: consent choice stays in browser storage; PostHog owns opted-in event retention.
- External provider impact: public project key, fixed API upstream region, and operator-created
  funnel and dashboard.

## Performance And Scalability

- The provider loads only after consent; the static HTML remains crawlable and usable without JavaScript analytics.
- Scroll and intersection observers emit bounded milestones and named sections once per page load.
- Event volume grows with opted-in traffic, not lead-record count; no repository query or pagination is added.
- Proxy work grows with opted-in SDK traffic and lazy-loaded asset requests. The initial public-site
  traffic assumption is low volume and unmeasured; no numeric capacity claim is made.
- At materially higher traffic, provider quotas, Fly bandwidth/concurrency, sampling, retention,
  and migration to a managed or dedicated edge proxy must be reviewed rather than adding queues.

## Security, Privacy, And Abuse

- No auth or session behavior changes.
- The public project key is not a secret; provider administration keys remain outside frontend configuration.
- The proxy accepts only the fixed PostHog path prefix and region origins, never a caller-provided URL.
- Incoming authorization, cookie, connection, and private forwarding headers are not sent upstream.
- Non-successful upstream bodies are replaced by stable safe errors with a request identifier.
- Names, barbershop names, phone, email, form text, tokens, credentials, and private headers are prohibited.
- Replay masks every input and lead-dialog text; analytics failure never blocks lead submission.

## Accessibility And UX

- Consent choices are native buttons with visible focus and clear Brazilian Portuguese labels.
- The banner remains usable at 320 CSS pixels and does not change dialog keyboard behavior.
- Analytics adds no loading requirement, empty state, or duplicate form submission path.

## Logging And Observability

- Useful events are defined in `docs/site/analytics.md`.
- Provider dashboards own aggregate metrics; no event payload is duplicated into application logs.
- Provider/network failures are deliberately silent in the visitor journey.
- No sensitive data may enter events, replay, console output, or error details.

## Acceptance Criteria

- [x] PostHog initializes only in the browser after explicit opt-in and remains disabled locally.
- [x] Page, CTA, solution, lead, pill, FAQ, scroll, and bounded section events use the durable contract.
- [x] API success/failure events contain no lead payload or PII.
- [x] Autocapture is disabled and replay masks every form input and lead-dialog text.
- [x] Missing configuration or provider failure cannot block navigation or lead intake.
- [x] Public environment mappings and durable site documentation are updated.
- [ ] PostHog SDK traffic uses the constrained first-party API proxy with fixed upstream origins.
- [ ] Proxy tests cover ingestion, assets, query preservation, header stripping, IP forwarding,
      unsupported methods, and sanitized upstream failures.
- [ ] An authorized operator validates production Live Events and event payloads after deployment.
- [x] The production dashboard and funnel artifacts are created, linked, and structurally validated.

## Verification Plan

- Unit tests: static contract inspection and TypeScript checks for the analytics helper.
- Integration/API tests: existing lead API tests remain the success-boundary evidence.
- UI tests: browser network inspection before consent, after denial, and after opt-in.
- Manual/browser checks: CTA uniqueness, pill auto-rotation exclusion, form start once per opening, invalid field names, responsive consent UI, and replay masking.
- Build/check commands: `bun --filter site typecheck`, `bun --filter site build`, `bun run check`, and `git diff --check`.

## Provider Artifacts

- Project: `Triad` (`587522`), US region.
- Dashboard: `https://us.posthog.com/project/587522/dashboard/2052101`
- Funnel: `https://us.posthog.com/project/587522/insights/sRIKNjbS`
- Current data state: no site events were recorded in the preceding 30 days when the artifacts were created.
