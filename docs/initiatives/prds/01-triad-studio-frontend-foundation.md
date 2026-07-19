# 01 TRIAD Studio Frontend Foundation

## Summary

Establish TRIAD Studio as the dedicated authenticated frontend for barbershop
management by migrating the current `apps/web` foundation to `apps/studio`.
The initiative preserves the existing email/password login and authenticated
session boundary while keeping every other capability frontend-only. It does
not introduce scheduling, business APIs, persistence, or new IDP behavior.

## Context

- Current state: `apps/web` is a neutral authenticated React shell with login,
  identity administration, profile/preferences, reusable UI foundations, tests,
  and Cloudflare Pages deployment wiring.
- Problem: the generic `web` boundary does not express the product decision to
  provide separate experiences for barbershop managers, barbers, and customers.
- Why now: no barbershop business workflow has been implemented, so establishing
  the Studio boundary now avoids moving mature business UI later.
- Related docs/issues:
  - `AGENTS.md`
  - `apps/web/README.md`
  - `docs/web/conventions.md`
  - `docs/web/deployment.md`
  - `docs/web/testing.md`
  - Linear issue: [ENG-32](https://linear.app/corvi-io/issue/ENG-32/establish-the-triad-studio-frontend-foundation)
  - Linear project: `CRV Triad`

## Goals

- Rename `apps/web` to `apps/studio` and rename the Bun package from `web` to
  `studio` without recreating the existing React foundation.
- Make TRIAD Studio the explicit product and technical owner of the authenticated
  barbershop-management frontend.
- Preserve email/password login, session loading, authenticated routing, and
  sign-out through the existing IDP contract.
- Keep first-admin provisioning in the existing IDP bootstrap script rather than
  exposing public registration or an admin-creation UI.
- Replace generic or inherited workspace branding with TRIAD Studio branding and
  Brazilian Portuguese UI copy.
- Keep the frontend ready for future product initiatives without introducing
  placeholder business routes or fake integrations.
- Migrate CI/CD, deployment metadata, documentation, agent instructions, and the
  Triad frontend skill to the new Studio boundary.

## Non-Goals

- Barbershop scheduling, appointments, services, clients, professionals,
  commissions, cash flow, CRM, reports, or other business modules.
- A barber-facing application or a customer-facing application.
- New API routes, API clients, database tables, persistence, or business-domain
  implementation in `apps/api`.
- New IDP routes, access rules, invitation behavior, or persistence changes.
- Frontend user/invitation administration. The only active IDP integration in
  Studio is the authentication/session flow required to access and leave the app.
- Public self-registration or first-admin creation from the browser.
- Mock business data, fake save actions, fake metrics, or production routes that
  imply unsupported business behavior.
- Native mobile or PWA packaging.

## Brainstorm

### Problem Framing

- The initiative solves an ownership problem before it becomes a migration
  problem: the manager-facing SaaS needs a durable app boundary and identity.
- The first affected user is the barbershop administrator who signs in to a
  dedicated management product.
- The improved workflow is intentionally small: bootstrap an admin through the
  existing script, sign in to TRIAD Studio, enter an authenticated shell, change
  local preferences, and sign out.
- Business value comes from creating a trustworthy base for later Studio
  initiatives without coupling them to future barber or customer experiences.

### Gaps And Unknowns

- Product gaps:
  - Final Studio visual direction beyond the TRIAD brand is not yet defined.
  - The first business navigation and default post-login destination will be
    decided by a later product initiative.
  - Roles beyond the initial administrator are intentionally deferred.
- Technical gaps:
  - The final Cloudflare Pages project names and deployed Studio URLs must be
    provisioned or confirmed before environment-key cutover.
  - Existing references to `web` span the app path, package filters, CI scripts,
    workflows, environment schema, deployment docs, CODEOWNERS, and an IDP
    Dockerfile monorepo-copy step.
  - The current Studio candidate includes narrow IDP administration code that is
    outside the accepted login-only integration scope.
- Data/model gaps:
  - No barbershop entities or frontend contracts are accepted in this initiative.
  - No fixture model should be treated as a future API contract.
- Operational gaps:
  - GitHub Environment values using `WEB__*` and `INFRA__WEB_*` need a coordinated
    migration to Studio-owned names if deployment remains enabled.
  - A rollback path is required so a naming cutover cannot silently break the
    existing frontend deployment.

### Counterpoints

- Keeping `apps/web` would be simpler today, but it would preserve an intentionally
  generic owner after the product has chosen separate applications.
- Creating a new empty `apps/studio` and discarding `apps/web` would maximize
  separation, but it would waste the working login, shell, tokens, components,
  accessibility behavior, and tests.
- Renaming deployment variables immediately can break enabled environments if
  repository and GitHub Environment changes are not coordinated.
- Adding the future Studio navigation now would make the product direction
  visible, but disabled or non-functional modules would create misleading UI.
- Keeping identity-administration screens would preserve more current behavior,
  but it would violate the explicit login-only integration scope.
- A future shared frontend package might reduce duplication with barber or
  customer apps, but reuse is not real or stable yet and should not be guessed.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Keep `apps/web` and apply Studio branding only | Smallest immediate change | Product boundary remains generic and creates a later migration | Only if separate apps are no longer a product decision |
| B | Rename the current foundation to `apps/studio` and specialize its boundary | Reuses proven frontend work while establishing clear ownership now | Requires coordinated path, CI, env, docs, and deployment migration | Recommended for the current early product stage |
| C | Create an empty `apps/studio` and remove `apps/web` | Clean slate | Repeats foundation work and increases regression risk | Only if the current React foundation is rejected |

### Recommendation

Choose Option B. Migrate the existing frontend foundation in place, preserve only
the required authentication/session integration, and make TRIAD Studio explicit
across source paths, package names, environment ownership, deployment, docs, and
agent guidance. Keep the product surface small until the scheduling initiative
defines the first business workflow.

## Architecture And Boundaries

- Site impact: none. `apps/site` remains the public static surface.
- API impact: none. `apps/api` receives no routes, modules, contracts, clients, or
  persistence for this initiative. The Studio runtime should not require an API
  base URL while no API integration exists.
- IDP impact: no runtime behavior changes. Studio continues to use the existing
  Better Auth email/password login, session, and sign-out contract. Mechanical
  monorepo build-path updates are allowed when required by the app rename. The
  existing bootstrap script remains the first-admin provisioning mechanism.
- Studio impact:
  - `apps/web` becomes `apps/studio`.
  - The package name and Bun filters become `studio`.
  - The visible product name becomes `TRIAD Studio`.
  - Generic shell internals may be renamed when doing so clarifies Studio
    ownership; reusable UI primitives remain app-local.
  - Identity-administration routes, navigation, and frontend service calls are
    removed from the active Studio surface.
  - No future business navigation is exposed without a working route and an
    accepted initiative.
- Data/persistence impact: none. Local theme preference may remain browser-local;
  no business records or durable product state are introduced.
- External provider impact: Cloudflare Pages and GitHub Environment metadata must
  move from generic `WEB` ownership to `STUDIO` ownership through a coordinated
  cutover. Browser-visible variables contain no secrets.
- Future app impact: no `apps/barber`, `apps/customer`, or shared package is
  created in this initiative.

## Frontend Engineering Principles

- Use React composition and explicit component variants instead of accumulating
  boolean props for product modes.
- Keep state near its owner and lift it only when multiple composed components
  genuinely need the same state.
- Do not use `useEffect` for derived values, user-event handling, state resets,
  or parent notification. Calculate during render, handle events directly, use a
  component `key` for identity resets, and use an Effect only to synchronize
  with an external system with cleanup where applicable.
- Preserve TanStack Router file-route conventions and the authenticated route
  boundary.
- Keep primitives under the Studio shared UI area; do not create `packages/*`
  until stable reuse exists across real applications.
- Do not add TanStack Query behavior, polling, background refresh, API mocks, or
  generated clients when authentication is the only network integration.

## Performance And Scalability

- Expected data growth: none in this initiative because no business collection
  is loaded or persisted.
- Critical paths: initial JavaScript load, authentication/session resolution,
  redirect into the authenticated shell, theme initialization, and sign-out.
- Query bounds/pagination: not applicable; no product lists or API queries are
  introduced.
- Concurrency risks: duplicate session requests and repeated authentication side
  effects during React development rendering must be avoided.
- External limits: existing IDP and Cloudflare limits remain unchanged; no new
  external service is added.
- What happens with millions of records/items: not applicable to this foundation.
  Later business initiatives must define bounded API contracts before adding
  data-heavy UI.
- Bundle review should check that the migration does not retain unreachable CRM
  or identity-administration code in the production Studio graph.

## Security, Privacy, And Abuse

- Auth/session impact: preserve credentialed Better Auth calls, explicit loading
  states, redirects, and protection against unauthenticated content flicker.
- Roles/access: the bootstrapped administrator can access Studio. No new role
  model or client-side authorization claim is introduced.
- PII/secrets: credentials, session tokens, private headers, and user identity
  data must not be logged. All Vite environment variables are public and must not
  contain secrets.
- Spam/abuse vectors: no public registration, invitation UI, form submission, or
  public mutation is added.
- Rate limiting or throttling: no new requirement; authentication protections
  remain owned by the IDP.
- Admin provisioning: document and preserve the explicit bootstrap script; do
  not add a hidden browser path that bypasses the invite-gated access model.

## Accessibility And UX

- Target WCAG 2.2 AA for the Studio shell and login flow.
- Keyboard flow: provide a skip link, logical focus order, visible focus, native
  controls, keyboard-operable navigation, and no focus traps.
- Screen reader states: retain programmatic names for icon buttons, landmarks,
  headings, authentication errors, loading state, and current navigation state.
- Responsive behavior: Studio is desktop-first but the login and shell must
  remain usable on small screens and at 200% zoom without losing access to
  navigation or account actions.
- Loading/error/empty states: authentication loading and failure states are real;
  do not invent business empty states before business routes exist.
- Duplicate submission prevention: keep the login submit control busy and
  stable-labelled while a request is active.
- Respect reduced-motion preferences and meet minimum target-size and contrast
  requirements.
- UI labels, feedback, form errors, and validation remain in Brazilian Portuguese.

## Logging And Observability

- Useful structured events: no new product analytics or telemetry is introduced.
  Existing infrastructure may observe page availability and authentication
  endpoint health without capturing credentials or session data.
- Metrics: build/deployment success, frontend smoke-check success, and existing
  IDP health remain sufficient for this foundation.
- Traces/spans: none added.
- Alerts: preserve existing pipeline/deployment failure signals.
- Sensitive data that must not be logged: email/password values, tokens, cookies,
  private request headers, complete session payloads, and browser storage values.

## Acceptance Criteria

- [ ] `apps/web` is migrated to `apps/studio`, the Bun package is named `studio`,
      and root commands use the new filter.
- [ ] The authenticated product is visibly named TRIAD Studio and its documented
      owner is the barbershop-management frontend.
- [ ] Existing email/password login, session guard, authenticated redirect, and
      sign-out behavior continue to work against the IDP.
- [ ] First-admin creation remains available through the existing IDP bootstrap
      script and no public registration/admin-creation UI is introduced.
- [ ] Identity-administration routes, navigation, and service integration are not
      part of the active Studio product surface.
- [ ] No scheduling or other barbershop business module, mock record set, fake
      mutation, business API client, API route, or persistence is introduced.
- [ ] Studio runtime/deployment inputs include only values used by the accepted
      frontend scope; environment and infrastructure ownership names are migrated
      through a documented, rollback-safe cutover.
- [ ] CI affected-app detection, quality gates, deployment gates, CODEOWNERS, and
      monorepo build references recognize `apps/studio` and no longer require the
      removed `apps/web` package.
- [ ] Root/app docs, durable frontend docs, `AGENTS.md`, and relevant `triad-*`
      skills describe the Studio boundary and current commands accurately.
- [ ] React implementation follows composition-first state ownership and avoids
      unnecessary Effects.
- [ ] Login and shell pass keyboard, focus, screen-reader naming, responsive,
      zoom, contrast, target-size, and reduced-motion checks relevant to the
      changed UI.
- [ ] Focused unit/component tests, authentication route tests, CI script tests,
      production-preview tests, type checking, linting, build, and Studio quality
      checks pass.

## Verification Plan

- Unit tests:
  - Studio environment parsing and theme-storage behavior.
  - Module registry, branding, route inventory, auth client, login screen, and
    authenticated shell behavior.
  - CI environment-management and affected-app detection tests.
- Integration/API tests:
  - No API tests are required because `apps/api` is out of scope.
  - Preserve the existing browser-to-IDP login/session contract without changing
    IDP runtime behavior.
- UI tests:
  - Vitest component tests for login, authentication gating, Studio shell, and
    account actions.
  - Playwright checks for development-only preview boundaries and production
    redirects where those routes remain.
- Manual/browser checks:
  - Successful admin login created through the bootstrap flow.
  - Failed login feedback without credential leakage.
  - Sign-out and unauthenticated redirect.
  - Keyboard-only navigation, visible focus, 200% zoom, small viewport, dark/light
    themes, reduced motion, and basic VoiceOver inspection.
- Build/check commands:
  - `bun install`
  - `bun --filter studio routes:generate`
  - `bun --filter studio format`
  - `bun --filter studio lint`
  - `bun --filter studio typecheck`
  - `bun --filter studio test`
  - `bun --filter studio build`
  - `bun --filter studio check`
  - Relevant `.github/scripts` tests and repository-wide checks.

## Open Questions

- [ ] Confirm the target Cloudflare Pages project names and deployed URLs before
      switching enabled environments from `WEB` to `STUDIO` keys.
- [ ] Decide the first real post-login destination in the later scheduling
      initiative; keep a minimal Studio home for this foundation.
