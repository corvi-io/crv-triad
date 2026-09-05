# 18 Site PostHog Event Instrumentation - Execution Plan

## Source

- PRD: `docs/initiatives/prds/18-site-posthog-event-instrumentation.md`
- Durable contract: `docs/site/analytics.md`

## Implementation Principles

- Keep the site static-first and analytics optional.
- Keep every lead field value and visitor PII outside PostHog.
- Use explicit stable events instead of broad autocapture.
- Treat provider-side project, funnel, dashboard, and Live Events evidence as authorized operations.

## Tasks

- [x] Confirm scope, app boundary, current API lead flow, and obsolete draft assumptions.
- [x] Review the official PostHog instrumentation skill and current Astro/PostHog documentation.
- [x] Install `posthog-js` with Bun and add a typed browser helper.
- [x] Add explicit consent with no provider initialization before opt-in.
- [x] Instrument pageviews, CTAs, solution selection, lead progression, API outcomes, pills, FAQ, scroll, and sections.
- [x] Mask replay inputs and lead-dialog text, disable autocapture, and keep visitors anonymous.
- [x] Add public runtime env mappings and update site operations/documentation.
- [x] Replace the temporary event draft with the PRD and durable analytics contract.
- [x] Run site and workspace verification, focused browser checks, and proxy payload inspection.
- [x] Create and structurally validate the production funnel and categorized analytics dashboard.
- [x] Add the named analytics proxy module under `apps/api` with fixed region-matched upstreams.
- [x] Point the site SDK at `PUBLIC_API_BASE_URL/e` and preserve the official PostHog UI host.
- [x] Cover proxy routing, security headers, client IP handling, safe failures, and unsupported methods.
- [x] Update API/site environment contracts and durable operational documentation.
- [ ] Validate production Live Events and payloads after deployment begins sending consented events.
- [x] Move the accepted-lead conversion event to the API boundary after successful provider delivery.
- [x] Pass only a consented, validated anonymous analytics ID with lead submissions.
- [x] Add API and site regression coverage for consent correlation, honeypot exclusion, and
      non-blocking analytics failures.
- [x] Correct dashboard environment filters, visitor aggregation, metric naming, and the primary funnel.
- [ ] Revalidate production ingestion and dashboard results through the PostHog MCP.

## Verification Evidence

- Official references reviewed on 2026-08-31: Astro client scripts and PostHog JavaScript/privacy controls.
- `bun --filter site typecheck`: passed with 19 files and zero diagnostics.
- `bun --filter site check`: passed with zero errors and 31 pre-existing CSS warnings.
- `bun --filter site build`: passed with four static pages and sitemap output.
- PostHog dashboard `2052101`: 12 saved insights and six categorized text tiles in Brazilian Portuguese.
- PostHog funnel `sRIKNjbS`: five ordered steps from page view to accepted lead submission.
- Dashboard `2052101` now applies `environment = production` globally; lead metrics and the primary
  funnel use the server-confirmed `lead_submission_accepted` event and consent-aware wording.
- Provider queries execute successfully and currently return zero because the project has not received site events.
- `bun --filter api check`: passed with 20 files and 136 tests, including server-confirmed lead capture.
- `bun --filter api coverage:check`: passed at 91.28% statements, 83.38% branches, 95.04%
  functions, and 93.41% lines.
- `bun test ./.github/scripts/env-management.test.ts`: seven tests passed.
- `bun run check`: API, site, and studio passed.
- Feature Product QA: approved at 9.5/10 with inspected desktop and mobile screenshots; report under
  `docs/product-qa/reports/features/initiative-18/2026-08-31-4002b2ce6e46-proxy.md`.
- Remaining production Live Events and replay evidence will be recorded after protected deployment.
- Analytics deployment inputs remain optional by design: provider-free development deploys succeed,
  while production configuration and ingestion are explicit release gates.

## Risks And Follow-Ups

- [ ] Ad blockers and browser privacy controls can reduce analytics coverage without affecting the product journey.
- [x] Provider project/region, dashboard ownership, and URLs were confirmed through the authorized project.
- [ ] API-proxy bandwidth and concurrency are unmeasured; reevaluate a managed or dedicated edge
      proxy if traffic or cost becomes material.
- [ ] PostHog remains a consented analytics subset; the lead delivery provider or future CRM is the
      source of truth for total commercial leads.
