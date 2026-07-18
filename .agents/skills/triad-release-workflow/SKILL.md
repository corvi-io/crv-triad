---
name: triad-release-workflow
description: Prepare, validate, bootstrap, promote, publish, or troubleshoot CRV Triad releases across staging and main. Use for first releases, Release Please artifacts, production promotion PRs, release tags, GitHub Releases, release-only environment provisioning, staging synchronization, or deciding whether a release may include deployment.
---

# Triad Release Workflow

Keep user-facing analysis in Brazilian Portuguese. Keep code, commands, file
paths, commit messages, PR titles, and documentation in English.

## Sources Of Truth

Read these files before acting:

- `AGENTS.md`
- `docs/ci-cd/release-process.md`
- `docs/ci-cd/pipeline-strategy.md`
- `env-schema.yaml`
- `.github/workflows/prepare-production-release.yml`
- `.github/workflows/promotion-pipeline.yml`
- `.github/workflows/production-pipeline.yml`
- `.github/workflows/publish-release.yml`
- `.github/workflows/sync-staging-with-main.yml`
- `release-please-config.json`
- `.release-please-manifest.json`
- `package.json`
- `CHANGELOG.md`, when present

Use `triad-preflight-review` before any release mutation.

## Preflight

1. Confirm a clean working tree, the current branch, upstream state, and the
   exact `main...staging` diff.
2. Confirm the latest `Homolog Pipeline` on `staging` succeeded.
3. Inspect open PRs, tags, GitHub Releases, branch protection, repository
   variables, repository secret names, and the `prd` environment. Never print
   or retrieve secret values.
4. Classify the request as release-only or release-with-deploy. Do not enable
   deployment merely because a release was requested.
5. Confirm the intended SemVer version and that the Release Please `node`
   strategy keeps root `package.json`, `.release-please-manifest.json`, and
   `CHANGELOG.md` aligned.
6. Detect first-release bootstrap: `workflow_run` loads its workflow from the
   default branch, so automation added only to `staging` cannot bootstrap
   itself before the first promotion to `main`.

## Configuration Gates

For a release without deployment, require only:

- Repository variable `CICD__RELEASE_ENABLED=true`.
- Repository secret `CICD__RELEASE_TOKEN`.
- Environment variable `prd.CICD__DEPLOY_ENABLED=false`.

The release token must belong to a dedicated identity that can write contents,
pull requests, issues/labels, and perform the protected branch operations used
by the workflows. Prefer a GitHub App design when available; the current
workflow contract accepts a repository secret token. Never copy the active
local `gh` credential into the repository without explicit user authorization.

For a release with deployment, additionally require every `prd` input used by
the affected apps and providers in `env-schema.yaml`. Stop if any required
value or owned infrastructure resource is missing. Never reuse source-project
credentials or resources.

Do not create compatibility aliases such as `RELEASE_PLEASE_TOKEN`. Fix or
bootstrap the categorized `CICD__*` contract instead.

## Execution Rules

### First Release

1. Resolve the initial version. Use `v0.1.0` for the foundation bootstrap unless
   an explicit product decision supersedes it.
2. Prepare `CHANGELOG.md`, `.release-please-manifest.json`, and root
   `package.json` through a feature PR into `staging`.
3. Re-run and require `Homolog Pipeline` success.
4. Open the production promotion PR from `staging` to `main`. Omit Codex review.
5. Require `Promotion Pipeline` success and use a merge commit.
6. Wait for `Production Pipeline`, `Publish Release`, and
   `Sync Staging With Main` to complete.
7. Verify the tag targets the production merge commit, the GitHub Release notes
   match the changelog, and local `staging` matches `origin/staging`.

### Subsequent Releases

1. Let `Prepare Production Release` generate and merge the Release Please
   artifact PR after a successful homologation.
2. Inspect the generated version and changelog before promoting.
3. Require the same promotion, production, publication, and synchronization
   checks as the first release.

## Safety

- Never set `CICD__RELEASE_ENABLED` or `CICD__DEPLOY_ENABLED`, create or replace
  tokens, merge into `main`, create tags, or publish a GitHub Release without
  explicit authorization for that mutation.
- Never bypass a failed Promotion or Production Pipeline.
- Do not delete or move published tags to repair a release. Stop and propose a
  forward fix unless the user explicitly authorizes destructive recovery.
- Preserve release-only operation when deployment inputs are absent.

## Handoff

Report:

- readiness and blockers;
- chosen version and version source;
- release-only or release-with-deploy mode;
- configuration present or missing, using names only;
- PRs, merge commits, workflow runs, tag, and release links;
- whether `staging` and `main` finished synchronized.
