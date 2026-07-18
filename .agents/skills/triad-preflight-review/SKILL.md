---
name: triad-preflight-review
description: Perform a Triad workspace preflight review before a branch is sent to review, QA, staging, release, commit, push, or PR creation. Use when the user asks for preflight, final pass, readiness review, branch review, PR preparation, release readiness, or whether local changes are safe to move forward.
---

# Triad Preflight Review

Run a senior-engineer final pass over the current local changes. Be pragmatic,
factual, risk-focused, and aligned with the Triad workspace architecture.

Write the final analysis in Brazilian Portuguese. Keep code, commands, file
paths, commit messages, PR titles, and quoted source text in their original
language.

## Safety

- Do not commit, push, amend, force-push, open a PR, merge, delete branches, or
  stage files unless the user explicitly asks after the preflight.
- Do not modify files unless the user explicitly asks to continue into fix mode.
- Do not revert user changes.
- Treat untracked local config, secrets, credentials, tokens, `.env`,
  `.dev.vars`, and generated private artifacts as suspicious until inspected.
- Call out credential, token, PII, user-submitted payload, password, private header, or
  analytics leakage as security or privacy risk.

## Required Inspection

Start by collecting local context:

- `git status --short`
- current branch and upstream tracking status
- staged and unstaged diffs
- commits ahead of the base branch, when a base is clear
- recent commit style

Prefer comparing feature work against `staging` unless repository state clearly
points to a different base. Read relevant `AGENTS.md` files for changed paths.

## Review Focus

Check the diff for:

- Correctness, edge cases, regressions, and route or workflow breakage.
- Security and privacy issues, especially secrets, tokens, unsafe storage,
  exposed private config, auth bypasses, or PII in logs/analytics.
- Accessibility regressions: keyboard use, visible focus, labels, loading and
  disabled states, screen-reader semantics.
- SEO regressions for public or indexable pages.
- Analytics integrity: consent, duplicate events, unsafe event properties, or
  raw user-submitted data sent to analytics.
- UI quality: mobile layout, layout shift, duplicate submissions, broken loading
  or error states, and inconsistent cursor behavior.
- Performance and scalability: unnecessary client JavaScript, large assets,
  third-party scripts, avoidable bundle growth, slow critical paths, unbounded
  queries, N+1 access patterns, blocking request paths, uncontrolled background
  work, and external service limits.
- Capacity reasoning: identify the expected usage assumption for the changed
  feature when relevant, such as requests per minute, concurrent users, data
  volume, or peak browser workload. Do not invent capacity numbers; state
  whether each number is measured, estimated with assumptions, or unknown.
- Architecture drift from Triad boundaries: `apps/site` owns the landing page,
  `apps/api` owns FastAPI business APIs, and `apps/idp` owns authentication.
- Missing or weak tests, stale docs, misleading task checklists, and outdated
  file references.
- Documentation impact across README files, durable docs, `AGENTS.md`, `triad-*`
  skills, initiative docs, and backlog. Be critical: require documentation only
  when the change creates or changes durable behavior, contracts, workflows,
  conventions, operations, or future-agent instructions.

## Documentation Decision

Check whether the branch should update:

- Root `README.md`: workspace overview, quick start, tooling, common commands,
  or high-level app capability changes.
- App `README.md`: app commands, env vars, routes, operational behavior, local
  setup, or app-owned scope.
- Durable docs under `docs/{site,api,idp,ci-cd}`: architecture, deployment,
  operations, security, privacy, analytics, SEO, persistence, or release
  behavior expected to outlive one PR.
- Initiative PRDs/tasks: planned work status, acceptance criteria, or execution
  plans changed by the branch.
- `TODO.md`: intentionally deferred follow-up or unresolved product/engineering
  decision.
- `AGENTS.md`: durable future-agent rules or project conventions changed.
- `triad-*` skills: repeated workflows or implementation patterns changed in a
  way future agent runs should follow.

Do not request documentation when the change is a local refactor, test-only
cleanup, or self-explanatory code change with no durable contract or workflow
impact. If no docs are needed, say that explicitly and why.

## Verification

Run the smallest relevant checks first, based on changed files and risk. Prefer
package-level scripts so Turborepo can orchestrate the workspace.

- Site changes: `bun --filter site check`, `bun --filter site typecheck`,
  `bun --filter site build`, and E2E checks when routes, forms, tracking, or
  responsive behavior changed and an E2E setup exists.
- API changes: `bun --filter api check`, targeted tests, and coverage checks
  when behavior changed.
- IDP changes: `bun --filter idp check`, `bun --filter idp build`, and
  targeted Vitest tests.
- CI/CD changes: inspect workflow syntax and run local validation only when
  available.
- Documentation-only changes: validate by inspection when no package-level
  verification applies.

If a command fails, diagnose whether it is caused by this branch. Do not fix it
unless the user asked for fix mode.

## PR Review Trigger Policy

For feature PRs targeting `staging`, recommend one initial Codex review trigger:
`@codex review in Brazilian Portuguese`.

Do not recommend repeated Codex review triggers during preflight. Follow-up
review cycles are handled by `triad-pr-review-triage`, which batches fixes and
limits automated review loops.

## Output

Return the final result in Brazilian Portuguese in this order:

1. Readiness: `Ready`, `Ready with known risks`, or `Not ready`.
2. Blocking findings: high-impact issues to fix before moving forward.
3. Non-blocking risks: tradeoffs or follow-ups that can be accepted
   intentionally.
4. Verification: commands run and results.
5. Capacity and performance: expected usage assumptions, risks found, evidence,
   and whether any numeric claim is measured, estimated, or unknown.
6. Documentation: required updates, missing updates, or why no documentation
   update is needed.
7. Commit recommendation: suggested Conventional Commit message.
8. PR recommendation: suggested PR title, target branch, and concise body
   bullets. For feature PRs targeting `staging`, include the required initial
   Codex review trigger exactly once: `@codex review in Brazilian Portuguese`.
9. Next action: ask whether to proceed with fixes, commit, push, or PR creation.

Be concise, but include concrete file references and line numbers for findings.
