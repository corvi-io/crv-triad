---
name: triad-testing
description: Orchestrate CRV test design, quality review, coverage enforcement, property-based testing, flaky-test diagnosis, and pre-commit/CI verification across every app. Use when adding or reviewing tests, changing coverage thresholds, fixing flaky tests, auditing project-wide test adherence, or deciding the correct test level.
---

# CRV Triad Testing

Build confidence in behavior and contracts. Treat coverage as a guardrail, never as the reason for a test.

## Workflow

1. Read the nearest `AGENTS.md` and the app development skill.
2. Identify the behavior, failure modes, security boundary, and regression risk.
3. Choose the lowest test level that proves the behavior without duplicating lower-level assertions.
4. Use [references/test-levels.md](references/test-levels.md).
5. Route specialized work through the complementary skills below.
6. Run the app coverage command and inspect uncovered business branches.
7. Review test quality as well as the numeric result. Replace tautological,
   implementation-coupled, duplicated, or nondeterministic tests with tests that
   can fail for a realistic regression.
8. Run the app `check` command so the same gate used by CI is exercised locally.
9. Update instructions, durable docs, or testing references when conventions change.
10. Hand runnable browser acceptance to `triad-product-qa`; automated Playwright
   specs provide repeatability but do not replace live journey and screenshot
   inspection.

## Complementary Skills

`triad-testing` owns the decision about what confidence is required and delegates
only the specialized technique:

- Use `fixing-flaky-tests` after a failure has evidence of intermittency. Apply its
  reproduce/root-cause/N-run discipline, but translate PostHog-specific commands,
  paths, services, and tooling to the Triad Bun, Vitest, Playwright, and GitHub
  Actions equivalents. Never introduce PostHog dependencies or conventions.
- Use `property-based-testing` only for code with a strong property such as a
  roundtrip, invariant, idempotence, oracle, ordering rule, or identity. Read only
  the reference matching the task. Do not add a property-testing dependency merely
  to raise coverage; dependency installation requires an explicit project decision.
- Use the app development skill for framework-specific test composition: Elysia/API,
  Studio, Backstage, Site, or IDP.
- Use `triad-product-qa` for real browser acceptance and `triad-preflight-review`
  before sending changes to staging or review.

When a complementary skill conflicts with this repository's `AGENTS.md`, package
scripts, architecture, or test levels, the Triad rule wins.

## Non-negotiable Rules

- Assert observable behavior, contracts, and side effects, not private implementation details.
- Keep tests deterministic and independent. Control time, random data, and external boundaries.
- Prefer in-memory fakes or small stubs. Mock only process boundaries or third-party constructors that cannot be injected.
- Cover success, validation, authorization, conflict, and relevant unexpected-error behavior.
- Do not exclude business logic merely to satisfy coverage.
- Enforce at least 80% statements, branches, functions, and lines for every app that publishes coverage.
- Do not claim project-wide 80% when an executable app lacks a threshold-bearing
  coverage command. Add an appropriate gate or document why coverage is not
  meaningful for that package.
- The pre-commit hook and CI quality gate must execute the same threshold-bearing package command.

## Handoff

Report the specialized skills used, adherence findings, test levels added, exact
coverage totals, commands executed, and intentionally uncovered operational
entrypoints. Do not claim success unless every applicable threshold-bearing command
exits successfully.
