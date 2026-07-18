---
description: Review, validate, and prepare changes before forwarding
agent: build
---

Perform a critical preflight review of the current changes before this branch is sent forward for review, QA, staging, or release.

Treat this as a senior engineer final pass. Be pragmatic, factual, and risk-focused.

## Goals

- Understand the full diff and the user-visible intent of the changes.
- Identify correctness, security, privacy, accessibility, SEO, performance, maintainability, analytics, and testing gaps.
- Verify that the changes are ready to move forward.
- Prepare a clear commit and PR recommendation if the changes are ready.

## Safety Rules

- Do not commit, push, amend, force-push, open a PR, merge, delete branches, or modify unrelated files unless the user explicitly asks after this preflight.
- Do not revert user changes.
- Do not stage files automatically unless the user explicitly asks to continue into commit/PR mode.
- Treat untracked local config, secrets, credentials, tokens, `.env` files, `.dev.vars` files, and generated private artifacts as suspicious until reviewed.
- If you find credential, token, PII, user-submitted payload, or password logging, call it out clearly as a security/privacy risk.

## Required Inspection

Start by inspecting:

- `git status --short`
- current branch and tracking status
- staged and unstaged diffs
- commits ahead of the base branch, when available
- recent commit style

If the base branch is clear, compare against it. For this workspace, feature branches should normally target `staging` once branch protection exists.

## Review Checklist

Check for:

- Correct behavior and edge cases.
- Regressions in existing routes, tests, workflows, and docs.
- Security and privacy issues, especially leaked secrets, credential logs, unsafe token storage, exposed private config, or PII in analytics.
- Accessibility issues, including keyboard navigation, focus states, labels, disabled states, loading states, and screen-reader semantics.
- UI/UX quality issues such as layout shift, duplicate form submissions, broken loading states, mobile breakpoints, and inconsistent cursor behavior.
- SEO and metadata issues for public or indexable pages.
- Analytics integrity issues, including missing events, unsafe event properties, duplicate event firing, or raw user-submitted messages sent to analytics.
- Performance issues such as oversized assets, unnecessary client JavaScript, excessive third-party scripts, and avoidable bundle growth.
- Architecture drift from local `AGENTS.md` rules and project docs.
- Missing, weak, or stale tests.
- Stale documentation, misleading task checklists, and outdated file references.

## Verification

Run the smallest relevant verification commands first. If the change touches `apps/site`, prefer:

- `bun --filter site check`
- `bun --filter site typecheck`
- `bun --filter site test`
- `bun --filter site build`

If only root documentation changed before package files exist, state that no package-level verification is available yet and validate by inspection.

Run E2E tests when routes, navigation, forms, tracking, or responsive UI behavior changed and an E2E setup exists.

If a command fails, stop and diagnose the root cause. Propose the smallest safe fix. Only modify files if the user asked this command to continue beyond review into fix mode.

## Pull Request Preparation

When recommending or creating a PR:

- Use `.github/pull_request_template.md` as the source of truth when it exists.
- For feature PRs targeting `staging`, include the Codex review trigger required by `AGENTS.md`.
- For production release PRs from `staging` to `main`, omit Codex review, keep the PR description minimal, and focus on release readiness.
- Include verification results and known risks.
- Mention any intentionally deferred docs or backlog items.

## Output Format

Respond in Brazilian Portuguese unless quoting code, commands, file paths, commit messages, PR titles, or user-facing product copy that must stay in its original language.

Return the result in this order:

1. Readiness: `Ready`, `Ready with known risks`, or `Not ready`.
2. Blocking findings: high-impact issues that should be fixed before moving forward.
3. Non-blocking risks: known tradeoffs or follow-ups that can be accepted intentionally.
4. Verification: commands run and results.
5. Commit recommendation: suggested Conventional Commit message.
6. PR recommendation: suggested PR title, target branch, and concise PR body bullets.
7. Next action: ask whether to proceed with fixes, commit, push, or PR creation.

Be concise, but include file references and line numbers for concrete findings whenever possible.
