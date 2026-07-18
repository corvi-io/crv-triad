---
name: triad-linear-workflow
description: Manage Triad Linear issues as the source of truth for feature work, including workflow states, blocker comments, GitHub PR links, and evidence-based status transitions. Use when Linear, issues, workflow states, blockers, PR handoff, or task migration are involved.
---

# Triad Linear Workflow

Use this skill when Linear is available through MCP and the task is managed as
a Linear issue. Linear is the durable source of truth for task status and
handoff. GitHub remains the source of truth for PRs, checks, review threads,
and merge state. Maestri notes remain temporary orchestration surfaces.

Write user-facing summaries in Brazilian Portuguese. Keep Linear issue titles,
GitHub PR titles, branch names, file paths, commands, and technical identifiers
in English.

## Workflow States

Use these Linear states for Triad feature work:

- `Backlog`: idea or task is not ready for execution.
- `Ready`: scope, owner, and Definition of Done are clear.
- `In Development`: branch is created from `staging` and implementation is
  active.
- `PR Open`: preflight passed, branch is pushed, and PR is open against
  `staging`.
- `Review Changes`: valid review findings or branch-caused CI failures are
  being fixed.
- `Blocked`: progress depends on user action, credentials, permissions,
  external services, or a product decision.
- `Ready To Merge`: PR review triage is complete, checks are clean or accepted,
  and the reviewed PR URL is linked.
- `Done`: PR is merged to `staging`, or the issue explicitly did not require a
  PR and its non-PR Definition of Done is verified.

## Status Transitions

Move issues only when there is evidence:

- `Ready` -> `In Development`: branch is created or implementation starts.
- `In Development` -> `PR Open`: preflight passed and PR URL exists.
- `PR Open` -> `Review Changes`: valid review item or branch-caused CI failure
  exists.
- `Review Changes` -> `PR Open`: fixes were batched, verified, and pushed.
- Any state -> `Blocked`: a user or external dependency blocks progress.
- `PR Open` or `Review Changes` -> `Ready To Merge`: review triage is complete,
  checks are acceptable, and no actionable blocker remains.
- `Ready To Merge` -> `Done`: merge to `staging` is confirmed.

Do not move an issue based on intent alone. Do not move to `PR Open` without a
PR URL. Do not move to `Ready To Merge` without review triage evidence. Do not
move to `Done` without merge evidence or an explicit no-PR scope.

## Branch Cleanup

After a feature/fix branch is merged into `staging`, keep repository branches
clean before moving related Linear issues to `Done`.

- Confirm the PR was merged.
- Confirm no active Linear issue still depends on the branch.
- Delete the remote branch when it is safe.
- Delete the local branch when it is safe and not currently checked out.
- Run `git fetch --prune` after remote cleanup.
- Record merge and branch cleanup evidence in the Linear issue before moving it
  to `Done`.

Never delete `main`, `staging`, release branches, protected branches, branches
not created for the active work, or branches with unclear ownership. If branch
ownership is unclear, record a Linear follow-up instead of deleting.

## Linear Comments

Use Linear comments for durable handoff events, not execution logs.

Comment when:

- Moving to `Blocked`: state what is needed, why it blocks, and what it
  unblocks.
- Opening a PR: include PR URL and concise scope summary.
- Completing preflight or review triage: summarize result and key evidence.
- Hitting the Codex/GitHub review-cycle limit: summarize remaining risk and why
  no further bot review is being triggered.
- Moving to `Ready To Merge`: include PR URL, checks, review triage outcome, and
  accepted risks.
- Moving to `Done`: include merged PR URL or merge commit.

Do not comment every command, file edit, or intermediate investigation step.
Keep detailed technical discussion in GitHub PR threads when it belongs there.

## Review Loop Limits

Follow Triad PR review limits:

- One initial Codex/GitHub bot review trigger per feature PR.
- One follow-up bot review after batched fixes when necessary.
- Do not trigger another bot review while a previous trigger is pending.
- After two bot review cycles, use local verification, `triad-pr-review-triage`,
  and verifier subagents instead of requesting another bot review unless the
  user explicitly asks or the PR scope materially changes.

## Branch Policy

Follow Triad branch policy for Linear-managed work:

- Use one feature branch per coherent PR/delivery unit, not necessarily one
  branch per Linear issue.
- Name new feature branches with the primary Linear issue when available, for
  example `feature/triad-15-github-environments`.
- Prefer separate branches for separate implementation streams or subagents.
- Do not use worktrees by default.
- Branches alone do not isolate simultaneous file edits in the same checkout.
  Do not let multiple agents edit the same working directory concurrently.
- If true parallel implementation is needed, use isolated Maestri floors or
  separate checkouts provided by the environment. If that isolation is not
  available, run implementation sequentially and merge or rebase explicitly.
- Before assigning implementation work, record each subagent ownership boundary:
  branch, files/modules, Linear issue, and Definition of Done.

## Migration Guidance

When migrating Maestri notes or ad hoc task lists into Linear:

- Create one Linear issue per independently shippable task.
- Use the current evidence to choose the state. Do not mark `Done` without PR
  or explicit non-PR evidence.
- Put human-only blockers in Linear as `Blocked` issues or comments, not only
  in temporary Maestri notes.
- Link existing GitHub PRs in the issue description or a comment.
- Preserve concise context: goal, Definition of Done, current status, blockers,
  and evidence links.
