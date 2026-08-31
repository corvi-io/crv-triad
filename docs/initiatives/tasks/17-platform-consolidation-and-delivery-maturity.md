# 17 Platform Consolidation And Delivery Maturity - Execution Plan

## Source

- PRD: `docs/initiatives/prds/17-platform-consolidation-and-delivery-maturity.md`
- Reference workspace: `/Users/marcusgabrields/workspace/corvi-lab/crv-workspace`

## Implementation Principles

- Preserve Triad product rules and existing user changes.
- Use the reference workspace for proven structure, not credentials or unrelated domain code.
- Keep identity and business modules isolated even though they share one API process.
- Do not mark infrastructure-dependent deployment checks complete without real evidence.

## Tasks

- [x] Compare current Triad architecture, CI/CD, docs, skills, and QA with the reference workspace.
- [x] Record recommendation, alternatives, security, scalability, accessibility, observability, and verification requirements.
- [x] Convert `apps/api` to Bun/Elysia/Drizzle/Vitest.
- [x] Move the existing IDP implementation and migration lineage into `apps/api/src/modules/idp`.
- [x] Compose Better Auth and Triad routes from the API REST composition root.
- [x] Add the public leads module, persistent abuse counters, Turnstile validation, and Resend delivery.
- [x] Integrate the Astro lead dialog with accessible API-backed states.
- [x] Update Studio authentication configuration for the consolidated API.
- [x] Move environment delivery to Infisical OIDC and adapt affected-app/deploy workflows to three apps.
- [x] Adapt testing coverage, Product QA, and relevant Impeccable assets/skills.
- [x] Update AGENTS, READMEs, durable API/IDP/site docs, environment schema, and initiative evidence.
- [x] Run unit, coverage, build, security, and CI configuration gates.
- [ ] Run the PostgreSQL integration suite and real browser Product QA with provisioned local provider configuration.
- [x] Remove the standalone `apps/idp` only after unit behavior, build, and migration-lineage verification passed.

## Verification Evidence

- Architecture/reference inventory: completed on 2026-08-31; no source credentials were read or copied.
- `bun --filter api coverage:check`: 107 tests passed; 90.32% statements, 82.27% branches,
  94.56% functions, and 92.13% lines.
- `bun run build`: API, site, and studio builds passed.
- `bun run test:ci`: 12 CI configuration tests passed.
- `bash .github/scripts/run-security-gate.sh`: passed with no high-severity audit findings.
- `bun run check`: API, site, and studio passed after aligning cross-workspace Zod,
  TypeScript, and Vitest versions; Studio completed 355 tests and its production-boundary build.

## Risks And Follow-Ups

- [ ] Infisical and provider provisioning require authorized external configuration.
- [ ] Production delivery remains disabled until sender/domain, recipient, Turnstile hostnames, and environment paths are verified.
- [ ] A future dedicated distributed limiter may replace PostgreSQL if measured traffic justifies it.
