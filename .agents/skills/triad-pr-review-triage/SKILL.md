---
name: triad-pr-review-triage
description: Triage Triad pull request review feedback and optionally fix valid findings. Use when the user asks to inspect PR review comments, address requested changes, resolve review threads, respond to reviewers, handle Codex/GitHub review feedback, or move a feature PR review forward.
---

# Triad PR Review Triage

Triage every pull request review item as a hypothesis, not as automatically
correct. Fix only valid findings with the smallest safe change and preserve Triad
workspace architecture.

Write the final summary in Brazilian Portuguese. When posting GitHub review
comments or replies, write them in Brazilian Portuguese unless quoting code,
commands, file paths, commit messages, PR titles, or user-facing product copy.

## Applicability

- Use only for feature PRs targeting `staging`.
- If the PR is a production release PR from `staging` to `main`, stop and report
  that review triage is intentionally skipped for production promotion.
- If the current PR cannot be inferred, ask for the PR URL or number.

## Safety

- Do not commit, push, amend, force-push, merge, close the PR, dismiss reviews,
  or delete branches unless the user explicitly asks after triage.
- Do not revert user changes.
- Do not modify unrelated files.
- Do not treat a review as valid only because it was written by an AI reviewer.
- Treat findings involving secrets, credentials, PII, user-submitted payloads, tokens,
  auth, analytics leakage, email delivery, permissions, or production deployment
  behavior as high risk.
- Treat performance or scalability findings on critical paths as potentially
  high risk. Validate them with code evidence, measured data, or explicit
  assumptions; do not accept or reject numeric capacity claims without evidence.
- Reply to and resolve GitHub review threads only after classification and after
  either fixing a valid issue or writing a clear false-positive rationale.

## Required Inspection

Collect context before classifying:

- `git status --short`
- current branch and upstream tracking status
- `gh pr view --json number,url,title,state,baseRefName,headRefName,reviewDecision,reviews,comments,latestReviews,statusCheckRollup`
- PR review comments through `gh api repos/{owner}/{repo}/pulls/{number}/comments`
- PR issue comments through `gh api repos/{owner}/{repo}/issues/{number}/comments`
- PR review threads through `gh api graphql` so thread IDs, resolution state,
  and reply targets are available
- current branch diff against the PR base branch

Read relevant `AGENTS.md` files for any files touched by the PR or by fixes.
When a valid review finding or local fix changes durable behavior, also check
whether README files, durable docs, `AGENTS.md`, `triad-*` skills, initiative
docs, or `TODO.md` need updates.

## Classification

Classify each review item as:

- `Valid`: the issue is real and should be fixed.
- `False positive`: the reviewer missed context or the risk does not apply.
- `Already fixed`: the current branch already addresses the issue.
- `Needs clarification`: the comment is ambiguous, underspecified, or depends on
  a product decision.
- `Non-actionable`: the comment is preference-only, duplicate, obsolete, or
  outside this PR scope.

For each item, record the reviewer or source, thread ID and comment ID when
available, file and line reference when available, reasoning, planned action,
and the exact reply text to post.

## Handling Workflow

Batch review handling by cycle. Do not ask Codex/GitHub bot to review again
after every individual fix or commit.

- Treat the current set of review comments and threads as one review cycle.
- Classify all available items before fixing unless a critical security or
  production issue requires immediate action.
- Fix all valid findings from the current cycle with the smallest safe changes.
- Run relevant verification once after the batch when practical.
- Push fixes only when explicitly asked after triage.
- Limit automated Codex/GitHub bot review cycles to two per PR: the initial
  review cycle and one follow-up cycle after batched fixes.
- Before posting or recommending `@codex review`, check whether a prior trigger
  is still pending, such as an eyes reaction without a submitted review. Do not
  duplicate pending triggers.
- After two automated review cycles, do not trigger another bot review unless
  the user explicitly asks or the PR scope materially changed. Use local
  verification, verifier subagents, and this triage process to classify
  remaining items as valid, false positive, non-actionable, external, or
  user-dependent.

Within a review cycle, work one review thread at a time.

For `Valid` items:

- Inspect the affected code and nearby tests.
- Make the smallest correct change.
- Add or update regression tests when behavior changes.
- Check whether the fix introduces scalability risks such as unbounded queries,
  N+1 access patterns, blocking request paths, avoidable bundle growth,
  unnecessary client JavaScript, or uncontrolled background work.
- Add or update documentation only when the fix changes durable behavior,
  contracts, workflows, conventions, operations, or future-agent instructions.
- Run the smallest relevant verification command.
- Reply to the GitHub thread in Brazilian Portuguese with what changed and which
  validation passed.
- Resolve the thread.

For `False positive` items:

- Do not change code.
- Reply in Brazilian Portuguese with concise evidence.
- Resolve the thread when the rationale is unambiguous.

For `Already fixed` or `Non-actionable` items:

- Reply only when the explanation helps reviewers understand the state.
- Resolve the thread when safe and unambiguous.

For `Needs clarification` items:

- Reply with the exact clarification question in Brazilian Portuguese.
- Do not resolve the thread.

Use `gh api` for replies and `gh api graphql` for resolving threads.

## Verification

Run targeted verification first. Use package-level scripts where possible:

- Site changes: `bun --filter site check`, `bun --filter site typecheck`,
  `bun --filter site build`, and E2E checks when the review touches routes,
  navigation, forms, tracking, loading states, or responsive behavior.
- API changes: `bun --filter api check` plus targeted tests.
- IDP changes: `bun --filter idp check`, `bun --filter idp build`, and
  targeted Vitest tests.

If verification fails, fix only failures related to the PR or to a valid review
finding. Report unrelated failures separately.

## Documentation Decision

For every valid finding and every fix, decide whether documentation is required:

- Root `README.md`: workspace overview, quick start, tooling, commands, or
  high-level app capabilities.
- App `README.md`: app commands, env vars, routes, local setup, operational
  behavior, or app scope.
- Durable docs under `docs/{site,api,idp,ci-cd}`: architecture, deployment,
  operations, security, privacy, analytics, SEO, persistence, or release
  behavior.
- Initiative PRDs/tasks: planned work status, acceptance criteria, or execution
  plans affected by the PR.
- `TODO.md`: intentional deferrals or unresolved decisions.
- `AGENTS.md`: durable future-agent rules or project conventions.
- `triad-*` skills: repeated workflows or implementation patterns changed for
  future agent runs.

Do not add docs for purely local refactors, test-only cleanup, or obvious code
changes with no durable contract or workflow impact. If no docs are needed,
state that explicitly.

## Output

Return the final result in Brazilian Portuguese in this order:

1. PR context: number, title, URL, base branch, head branch.
2. Review summary: count of items by classification.
3. Valid findings fixed: what changed, why, which thread was replied to, and
   whether it was resolved.
4. False positives: evidence, reply posted, and whether the thread was resolved.
5. Already fixed or non-actionable items: evidence, reply posted when applicable,
   and whether the thread was resolved.
6. Needs clarification: exact question asked.
7. Verification: commands run and results.
8. Capacity and performance: relevant assumptions, risks, and whether any
   numeric claim is measured, estimated, or unknown.
9. Documentation: required updates, missing updates, or why no documentation
   update is needed.
10. Remaining risk: anything still unsafe or intentionally accepted.
11. Next action: ask whether to commit, push, or handle unresolved clarification
   threads.

Be concise, but include concrete file references and line numbers whenever
possible.
