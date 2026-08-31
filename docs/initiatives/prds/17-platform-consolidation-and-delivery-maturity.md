# 17 Platform Consolidation And Delivery Maturity

## Summary

Consolidate the FastAPI backend and standalone IDP into a Bun/Elysia modular monolith, deliver protected public lead capture through Resend, move deployment values from GitHub Environments to Infisical, and selectively adopt the mature testing, Product QA, preflight, delivery, and UI-quality practices proven in `crv-workspace`.

## Context

- Current state: `apps/api` is a minimal FastAPI service, `apps/idp` is a separate Elysia/Better Auth service, the public site uses a provisional `mailto:` lead flow, and GitHub Environments hold deployment values.
- Problem: the split backend duplicates runtime and delivery boundaries, the lead flow has no reliable delivery or durable abuse protection, and the delivery process lacks the evidence-backed QA model used by the more mature workspace.
- Why now: the public site is ready for real lead capture and the platform direction has changed before business APIs accumulate on the old FastAPI foundation.
- Reference: `/Users/marcusgabrields/workspace/corvi-lab/crv-workspace` is an implementation reference, not a source of product rules or credentials.

## Goals

- Operate exactly three deployable apps: `site`, `studio`, and `api`.
- Make `apps/api` a Bun/Elysia modular monolith with identity isolated in `src/modules/idp`.
- Send public lead notifications through Resend with Turnstile, persistent rate limiting, validation, idempotency, and privacy-safe observability.
- Make Infisical the source of truth for deployment values, authenticated from GitHub Actions through OIDC.
- Adopt testing, Product QA, preflight, delivery, and UI-quality practices that are product-neutral and useful to Triad.

## Non-Goals

- Copy commercial, AI, Trigger.dev, CRM, or Corvi-specific domain behavior.
- Rename `apps/studio` to `apps/web`.
- Add public account registration or move business rules into the `idp` module.
- Provision or mutate Infisical, Fly.io, Cloudflare, Resend, or production values automatically.

## Brainstorm

### Problem Framing

- The platform needs one backend deployment boundary without losing identity isolation.
- Visitors need reliable lead submission and explicit recovery instead of dependence on a local email client.
- Contributors need one evidence-based path from initiative through automated checks and real browser acceptance.

### Gaps And Unknowns

- Product: final lead recipient, sender domain, privacy-policy URL, and operational ownership must be configured outside source control.
- Technical: existing IDP migrations must retain lineage when moved into the API; the Studio auth base URL changes from port 8001 to 8000.
- Data: leads are not persisted; only abuse counters and provider idempotency identifiers need durable state.
- Operational: Infisical project, environments, folders, OIDC identity, and provider resources must be provisioned by an authorized operator.

### Counterpoints

- Keeping FastAPI and the IDP separate would reduce migration risk, but would preserve two deployments and contradict the selected direction.
- In-memory throttling is simpler but fails across restarts and multiple Fly machines; PostgreSQL-backed counters fit the existing required database.
- Copying every reference skill would create stale or misleading rules. Only Triad-adapted, product-neutral workflows should be adopted.
- Infisical eliminates duplicated application values, but GitHub Environments should remain for deployment protection and non-secret OIDC bootstrap identifiers.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Keep FastAPI and standalone IDP | Lowest immediate migration | Two backends, duplicated delivery, rejected direction | Only if migration risk becomes unacceptable |
| B | Bun/Elysia modular monolith with Infisical OIDC | One backend, shared DB/runtime, mature reference | Requires migration and pipeline rewrite | Recommended before domain API growth |
| C | Edge-only lead worker plus unchanged backends | Fast lead delivery | Adds a third backend model and does not solve consolidation | Only for an isolated marketing platform |

### Recommendation

Adopt option B. Move the proven Triad identity implementation into an explicit API module, retain table prefixes and migration history, add a separate `leads` module, and adapt only reusable maturity practices from the reference workspace.

## Architecture And Boundaries

- Site: static Astro UX, public Turnstile site key, API base URL, accessible submission states, no provider secrets.
- API: Elysia composition root, `idp` and `leads` modules, Drizzle/PostgreSQL, Resend and Turnstile server integrations.
- IDP: becomes a module inside API; Better Auth remains mounted directly at `/api/auth/*`; access remains invitation-gated.
- Studio: points authentication and business API calls to port 8000; existing UI ownership remains unchanged.
- Persistence: preserve `idp_*` tables and migration lineage; add bounded lead abuse-counter records without storing lead payloads.
- Providers: Resend sends notification email; Turnstile validates single-use browser tokens; Infisical stores runtime/deployment values.

## Performance And Scalability

- Abuse counter growth is bounded by bucket expiry and scheduled/transactional cleanup; indexed hashes avoid raw IP persistence.
- Provider calls use short timeouts and bounded retries with stable idempotency keys.
- Rate-limit updates are atomic to remain correct across API instances.
- No unbounded lead listing or payload persistence is introduced.
- At very large traffic volumes, move abuse counters to a dedicated distributed rate-limit store or Cloudflare edge rules; PostgreSQL is the near-term durable baseline.

## Security, Privacy, And Abuse

- Validate Turnstile server-side, including action and allowed hostname.
- Hash normalized client IP with an application secret before persistence; never log raw IP, token, lead payload, recipient, or provider credential.
- Enforce origin allowlists, JSON content type, request-size and field-size limits, honeypot rejection, duplicate-submit prevention, persistent quotas, and generic error responses.
- Store Resend, Turnstile, Better Auth, database, and hashing secrets only in API runtime configuration.

## Accessibility And UX

- Preserve native dialog focus handling, labels, visible focus, and keyboard close behavior.
- Announce submitting, success, validation, bot-check, throttling, and retry states with an accessible live region.
- Reset Turnstile after failed/retryable submissions and prevent duplicate requests.
- Keep the modal usable on narrow and zoomed viewports.

## Logging And Observability

- Emit structured, low-cardinality events for accepted, rejected, throttled, Turnstile-failed, and provider-failed outcomes.
- Track counts and latency without PII, request bodies, tokens, email addresses, phone numbers, or private headers.
- Return and propagate request IDs; provider failures must not expose upstream bodies.

## Acceptance Criteria

- [ ] `apps/api` runs on Bun/Elysia at port 8000 and contains the IDP as a module.
- [ ] Better Auth, invitations, users, sessions, email/password hardening, health, readiness, migrations, and tests remain functional.
- [ ] The standalone `apps/idp` deployment boundary is removed after migration verification.
- [ ] The site submits leads to the API and handles validation, Turnstile, throttling, success, failure, and retry accessibly.
- [ ] Resend delivery is server-side, idempotent, bounded, and does not expose secrets or PII in logs.
- [ ] Rate limiting remains effective across API instances and restarts.
- [ ] Infisical is the value source of truth and GitHub Actions uses OIDC with only non-secret bootstrap metadata in GitHub Environments.
- [ ] CI affected-app detection, deploy gates, docs, and environment schema cover exactly `api`, `site`, and `studio`.
- [ ] Triad-adapted testing, Product QA, preflight, delivery, and Impeccable guidance is available without Corvi-specific product assumptions.

## Verification Plan

- Unit tests: env parsing, rate-limit decisions, Turnstile/Resend adapters, auth policies, schema and UI scripts.
- Integration/API tests: Elysia `app.handle`, PostgreSQL atomic counters, migration lineage, provider failure injection.
- UI tests: modal validation, duplicate prevention, Turnstile reset, success/error/throttled states.
- Manual/browser: real local Astro + Elysia + isolated PostgreSQL journey with inspected desktop/mobile screenshots.
- Commands: app coverage gates, `bun run check`, `bun run build`, CI script tests, and security gate.

## Open Questions

- [ ] Authorized operators must provision the Infisical project/folders/OIDC identity and populate environment values.
- [ ] Product owners must confirm production sender, recipient, domain verification, and privacy-policy destination before deployment.
