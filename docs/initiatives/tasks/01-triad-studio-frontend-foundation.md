# 01 TRIAD Studio Frontend Foundation - Execution Plan

## Source

- PRD: `docs/initiatives/prds/01-triad-studio-frontend-foundation.md`
- Related issue: [ENG-32](https://linear.app/corvi-io/issue/ENG-32/establish-the-triad-studio-frontend-foundation)
- Related PR: not created

## Implementation Principles

- Follow the accepted recommendation from the PRD.
- Keep scope bounded to the Studio frontend foundation and its existing login,
  session, and sign-out integration.
- Do not implement scheduling, business modules, API behavior, persistence,
  identity administration, or other product integrations.
- Reuse the working React foundation rather than rebuilding it.
- Treat deployment-name migration as a coordinated cutover with an explicit
  rollback path.
- Prefer React composition and event-driven state updates; use `useEffect` only
  for genuine external synchronization.
- Keep user-facing UI copy in Brazilian Portuguese and technical artifacts in
  English.

## Tasks

- [x] Confirm implementation readiness:
  - [x] Inspect the current provider state; Studio values are not provisioned and
        deployments remain disabled.
  - [x] Document required `STUDIO__*` and `INFRA__STUDIO_*` GitHub Environment
        values for `dev`, `hml`, and `prd` before an enabled deployment cutover.
  - [x] Record a rollback approach for the last working frontend deployment.
- [x] Capture a clean baseline:
  - [x] Run current `apps/web` focused tests, build, and quality checks.
  - [x] Inventory all `apps/web`, `web`, `WEB__*`, and `INFRA__WEB_*` references,
        including hidden CI files and monorepo Docker build inputs.
- [x] Migrate the application boundary:
  - [x] Move `apps/web` to `apps/studio`.
  - [x] Rename the Bun package and root/package commands to `studio`.
  - [x] Update Vite, Playwright, Orval, TypeScript, Biome, CODEOWNERS, lockfile,
        and monorepo package-path references.
  - [x] Preserve local port `3000` for Studio.
- [x] Specialize the frontend as TRIAD Studio:
  - [x] Replace generic workspace product branding and browser metadata with
        TRIAD Studio.
  - [x] Keep a minimal authenticated Studio home without future business-module
        navigation, mock data, or fake actions.
  - [x] Remove identity-administration routes, navigation, frontend services,
        and unreachable production code from the Studio surface.
  - [x] Keep profile/session-derived account display and local preferences only
        when they require no integration beyond authentication/session.
  - [x] Rename app-local storage keys where necessary and test the intended
        early-stage migration behavior.
- [x] Preserve the login-only integration:
  - [x] Keep email/password sign-in, session loading, authenticated redirects,
        and sign-out through the existing Better Auth client.
  - [x] Preserve invite-gated access and first-admin provisioning through the
        existing IDP bootstrap script.
  - [x] Remove the unused Studio API base URL/client wiring if no accepted
        runtime code consumes it.
  - [x] Do not modify IDP runtime behavior; allow only mechanical app-path build
        references required by the monorepo rename.
- [x] Apply frontend engineering rules:
  - [x] Use explicit component composition instead of boolean product modes.
  - [x] Keep derived values in render, user actions in handlers, shared state at
        the nearest common owner, and Effects limited to external synchronization.
  - [x] Avoid new shared packages, polling, background refresh, and speculative
        data abstractions.
- [x] Complete accessibility and responsive checks:
  - [x] Verify skip navigation, landmarks, heading structure, accessible names,
        current-route state, focus order, visible focus, and no keyboard traps.
  - [x] Verify login labels/errors, busy state, autofill/paste support, and first
        invalid-field behavior.
  - [x] Verify desktop layout, small viewport, 200% zoom, contrast, minimum target
        sizes, reduced motion, and dark/light themes.
- [x] Migrate operational wiring:
  - [x] Replace affected-app output and quality/deployment gate names with
        `studio`.
  - [x] Migrate environment schema sources from `WEB__*` to `STUDIO__*` and
        infrastructure ownership from `INFRA__WEB_*` to `INFRA__STUDIO_*`.
  - [x] Update Cloudflare Pages build/deploy paths and smoke-check reporting.
  - [x] Update CI script tests and all develop/homolog/promotion/production
        workflow conditions.
- [x] Update durable guidance:
  - [x] Update root `README.md` and `AGENTS.md`.
  - [x] Move/update `docs/web/**` to `docs/studio/**`.
  - [x] Update app `README.md` and `AGENTS.md` under `apps/studio`.
  - [x] Update `docs/initiatives/README.md` and initiative templates where their
        frontend skill or boundary examples still say `web`.
  - [x] Replace `triad-web-development` with a Studio-owned Triad skill and
        update initiative/architecture skill routing and references.
  - [x] Update CI/CD and IDP operational docs where their frontend references
        changed.
- [x] Verify the migration:
  - [x] Generate Studio routes.
  - [x] Run Studio format, lint, typecheck, unit/component tests, build, and
        aggregate check.
  - [x] Run relevant CI script tests and repository-wide checks.
  - [x] Run focused Playwright authentication/preview checks.
  - [x] Search for stale active `apps/web`, `--filter web`, `WEB__*`, and
        `INFRA__WEB_*` references; retain only explicitly historical text.
  - [x] Record every command and result below before checking this task complete.

## Verification Evidence

- Baseline: `bun --filter web test`, `bun --filter web build`, and
  `bun --filter web check` passed with 55 tests before the migration.
- Studio: route generation, typecheck, format, check, and build passed with 55
  tests. The main production chunk decreased from 438.82 kB (135.52 kB gzip) to
  405.98 kB (126.45 kB gzip).
- CI scripts: `bun run test:ci` passed 15 tests, including behavioral coverage
  for Studio-only and lockfile-wide affected-app detection.
- Browser checks: focused Playwright development checks passed 2 tests and the
  production preview redirect check passed 1 test.
- Repository: `bun run check` and `bun run build` passed across all four apps.
- Accessibility: Lighthouse reported an accessibility score of 1.00 with no
  failed audits; focused keyboard, focus restoration, responsive, theme, and
  authentication checks passed in Playwright/component coverage.
- Skill validation: the Studio development skill passed the Codex quick
  validator under `uv run --with pyyaml`.
- Provider inspection: `dev`, `hml`, and `prd` have deployment disabled and do
  not yet contain Studio runtime/project values. No provider values were changed.
- Stale-reference scan: remaining legacy Web references are explicitly
  historical migration or rollback context.

## Risks And Follow-Ups

- [ ] Environment values not provisioned before cutover can break enabled Studio
      deployments even when repository checks pass.
- [ ] Removing current identity-administration UI must not remove the IDP bootstrap
      or login/session behavior used by the initial administrator.
- [ ] The later scheduling initiative must define the first business navigation,
      UI states, fixture/prototype policy, and eventual API contracts separately.
- [ ] Do not create `apps/barber`, `apps/customer`, or a shared frontend package
      until their own accepted initiatives justify those boundaries.
