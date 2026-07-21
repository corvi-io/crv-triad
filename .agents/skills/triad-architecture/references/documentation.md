# Triad Documentation Decisions

Do not document every edit. Document durable changes that future humans or
agents need to understand, operate, extend, or review correctly.

## Update Targets

Update `README.md` when the change affects:

- Workspace overview, quick start, required tooling, or common commands.
- App-level capabilities listed for a broad audience.
- Environment setup that a new contributor needs.
- High-level deployment or release workflow summaries.

Update app `README.md` when the change affects:

- How to run, configure, test, or deploy that app.
- Public routes, custom operational endpoints, environment variables, or local
  workflows.
- App-owned scope boundaries that contributors must know.

Update durable docs under `docs/{site,api,idp,studio,ci-cd}` when the change affects:

- Architecture conventions or runtime behavior expected to outlive one PR.
- Deployment, operations, security, privacy, analytics, SEO, persistence, or
  release process.
- A decision that reviewers should not have to infer from code.

Update initiative PRDs or task docs under `docs/initiatives` when:

- The change completes, changes, defers, or invalidates planned initiative work.
- Acceptance criteria, execution plans, or status checklists become misleading.

Update `TODO.md` when:

- A known follow-up is intentionally deferred.
- A product or engineering decision is pending and should not be hidden in a PR
  comment.

Update `AGENTS.md` when:

- A new durable convention should govern future agent behavior.
- Existing architecture, safety, testing, branch, review, or documentation rules
  are no longer accurate.
- The rule applies broadly enough that every future agent needs it before
  selecting a skill.

Update a `triad-*` skill when:

- A repeated workflow or implementation pattern changes.
- The agent should perform a task differently in future turns.
- A new reference guide would prevent recurring review comments.
- The update is Triad-specific. Do not patch downloaded/vendor skills for local
  policy; wrap or override with a `triad-*` skill instead.

## When Not To Document

Do not add documentation when:

- The change is an internal refactor with no durable workflow or contract change.
- Tests and code names already make the behavior clear.
- The detail is temporary, speculative, or belongs in the PR discussion only.
- The documentation would repeat implementation mechanics without helping future
  operation or extension.

In review output, state "No documentation update needed" only when that judgment
has been considered against README, durable docs, AGENTS, skills, initiative
docs, and backlog.
