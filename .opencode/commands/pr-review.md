---
description: Triage current PR review comments and fix valid findings
agent: build
---

Analyze the current pull request review feedback and triage every review item before moving the branch forward.

Treat each review comment as a hypothesis, not as automatically correct. For every point raised, determine whether it is valid, a false positive, already fixed, non-actionable, or needs clarification.

## Goals

- Find the current PR for this branch, or ask for a PR URL/number if it cannot be inferred.
- Read all relevant PR review feedback, including review comments, issue comments, automated reviews, maintainer reviews, and failing check summaries when available.
- Classify each review item with evidence.
- Fix valid findings with the smallest safe change, one review thread at a time.
- Reply to each handled GitHub review thread with the resolution or rationale, then resolve the thread.

## Applicability

- Run this command only for feature PRs targeting `staging`.
- If the current PR is a production release PR from `staging` to `main`, stop and report that PR review triage is intentionally skipped for production promotion.

## Safety Rules

- Do not commit, push, amend, force-push, merge, close the PR, or dismiss reviews unless the user explicitly asks after this triage.
- You may reply to and resolve review threads as part of this command, but only after classifying the thread and either fixing the valid issue or writing a clear false-positive rationale.
- Do not revert user changes.
- Do not modify unrelated files.
- Do not treat a review as valid only because it was written by an AI reviewer.
- If a finding involves secrets, credentials, PII, user-submitted payloads, tokens, auth, analytics leakage, email delivery, permissions, or production deployment behavior, treat it as high risk.
- Use the GitHub CLI (`gh`) for all GitHub operations, including reading comments, replying to review threads, and resolving review threads.

## Required Inspection

Start by collecting context:

- `git status --short`
- current branch and tracking status
- `gh pr view --json number,url,title,state,baseRefName,headRefName,reviewDecision,reviews,comments,latestReviews,statusCheckRollup`
- PR review comments via `gh api repos/{owner}/{repo}/pulls/{number}/comments`
- PR issue comments via `gh api repos/{owner}/{repo}/issues/{number}/comments`
- PR review threads via `gh api graphql` so each thread can be replied to and resolved by thread ID.
- current branch diff against the PR base branch

If `gh pr view` cannot infer the PR, ask the user for the PR URL or number.

## Triage Rules

For each review item, classify it as one of:

- `Valid`: The issue is real and should be fixed.
- `False positive`: The reviewer misunderstood the code, missed context, or the risk does not apply.
- `Already fixed`: The current branch already addresses the issue.
- `Needs clarification`: The comment is ambiguous, lacks enough detail, or depends on a product decision.
- `Non-actionable`: The comment is preference-only, duplicate, obsolete, or outside this PR scope.

For each classification, include:

- reviewer/comment source
- GitHub review thread ID and comment ID when available
- file and line reference when available
- short reasoning
- planned action and final thread reply text

## Thread Handling Workflow

Work through each review thread individually.

For each `Valid` thread:

- Inspect the affected code and nearby tests.
- Make the smallest correct change.
- Add or update regression tests when the issue affects behavior.
- Run the smallest relevant verification command for that change.
- Reply to the GitHub thread with what was changed and which validation passed.
- Resolve the GitHub review thread.

For each `False positive` thread:

- Do not change code.
- Reply to the GitHub thread with concise evidence explaining why the finding does not apply.
- Resolve the GitHub review thread.

For `Already fixed` or `Non-actionable` threads:

- Reply only when the explanation helps reviewers understand the state.
- Resolve the thread when it is safe and unambiguous to do so.

For `Needs clarification` threads:

- Reply with the exact clarification question.
- Do not resolve the thread.

Use `gh api` for replies, for example:

```bash
gh api -X POST repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies -f body='Resolved in <commit-or-local-change>: <short explanation>. Validation: <command> passed.'
```

Use `gh api graphql` to resolve review threads, for example:

```bash
gh api graphql -f query='mutation($threadId:ID!){resolveReviewThread(input:{threadId:$threadId}){thread{id isResolved}}}' -F threadId='{thread_id}'
```

## Fix Valid Findings

For every `Valid` finding:

- Inspect the affected code and nearby tests.
- Make the smallest correct change.
- Preserve existing architecture and local `AGENTS.md` rules.
- Add or update regression tests when the issue affects behavior.
- Run the smallest relevant verification command after the fix.

If multiple valid findings are independent, fix them in a logical order and validate incrementally when practical.

## Verification

Run targeted verification first. If the PR touches `apps/site`, use these as defaults when relevant:

- `bun --filter site check`
- `bun --filter site typecheck`
- `bun --filter site test`
- `bun --filter site build`

Run E2E tests when the review touches routes, navigation, forms, tracking, loading states, or responsive behavior and an E2E setup exists.

If a verification command fails, diagnose and fix only if the failure is related to this PR or to a valid review finding. Otherwise, report it separately.

## Output Format

Respond in Brazilian Portuguese unless quoting code, commands, file paths, commit messages, PR titles, GitHub comments, or user-facing product copy that must stay in its original language.

Return the result in this order:

1. PR context: number, title, URL, base branch, head branch.
2. Review summary: count of items by classification.
3. Valid findings fixed: what changed, why, which thread was replied to, and whether it was resolved.
4. False positives: evidence, reply posted, and whether the thread was resolved.
5. Already fixed or non-actionable items: evidence, reply posted when applicable, and whether the thread was resolved.
6. Needs clarification: exact question to ask.
7. Verification: commands run and results.
8. Remaining risk: anything still unsafe or intentionally accepted.
9. Next action: ask whether to commit, push, or handle any unresolved clarification threads.

Be concise, but include concrete file references and line numbers whenever possible.
