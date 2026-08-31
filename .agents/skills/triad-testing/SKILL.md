---
name: triad-testing
description: Design, review, and enforce CRV automated tests across apps, including unit/integration boundaries, behavior-focused test doubles, Vitest coverage gates, Elysia in-process API tests, and pre-commit/CI verification. Use when adding or reviewing tests, changing coverage thresholds, fixing flaky tests, or deciding whether a CRV test is unit or integration.
---

# CRV Triad Testing

Build confidence in behavior and contracts. Treat coverage as a guardrail, never as the reason for a test.

## Workflow

1. Read the nearest `AGENTS.md` and the app development skill.
2. Identify the behavior, failure modes, security boundary, and regression risk.
3. Choose the lowest test level that proves the behavior without duplicating lower-level assertions.
4. Use [references/test-levels.md](references/test-levels.md).
5. Run the app coverage command and inspect uncovered business branches.
6. Run the app `check` command so the same gate used by CI is exercised locally.
7. Update instructions, durable docs, or testing references when conventions change.
8. Hand runnable browser acceptance to `triad-product-qa`; automated Playwright
   specs provide repeatability but do not replace live journey and screenshot
   inspection.

Use `ddia-systems` when tests must prove transaction, consistency, concurrency,
or data-growth behavior. Use `release-it` for dependency failure, recovery,
timeouts, retries, observability, and degraded-mode tests. Use `system-design`
only when a material topology or scale assumption changes the test model.

## Non-negotiable Rules

- Assert observable behavior, contracts, and side effects, not private implementation details.
- Keep tests deterministic and independent. Control time, random data, and external boundaries.
- Prefer in-memory fakes or small stubs. Mock only process boundaries or third-party constructors that cannot be injected.
- Cover success, validation, authorization, conflict, and relevant unexpected-error behavior.
- Do not exclude business logic merely to satisfy coverage.
- Enforce at least 80% statements, branches, functions, and lines for every app that publishes coverage.
- The pre-commit hook and CI quality gate must execute the same threshold-bearing package command.

## Handoff

Report test levels added, coverage totals, commands executed, and intentionally uncovered operational entrypoints. Do not claim success unless the threshold-bearing command exits successfully.
