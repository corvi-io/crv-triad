## Summary

-

## PR Type

- [ ] Feature PR: `feature/* -> staging`.
- [ ] Production release PR: `staging -> main`.

## Commit And Merge

- [ ] PR title follows Conventional Commits.
- [ ] Intended merge method is clear: squash for `feature/* -> staging`, merge commit for `staging -> main`.

## Validation

- [ ] `bun run check`
- [ ] `bun run typecheck`
- [ ] `bun run build`
- [ ] Other:

## Risks And Follow-ups

-

## Codex Review

Feature PRs targeting `staging` must include the Codex review trigger required by `AGENTS.md`.

Production release PRs from `staging` to `main` must omit Codex review.
