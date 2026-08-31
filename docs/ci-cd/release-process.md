# Release Process

CRV Triad uses a staged release flow. Product changes enter `staging`, pass
homologation, are promoted to `main` through a pull request, and are published
as a GitHub Release only after the production pipeline succeeds.

Application deployment follows the environment branch boundaries automatically. Publishing a
version, tag, changelog, and GitHub Release remains an explicit release decision.

## Flow

1. Feature pull requests merge into `staging`.
2. `Homolog Pipeline` validates `staging` against the `hml` environment.
3. An operator explicitly runs `Prepare Production Release`. It generates
   Release Please artifacts when release-worthy Conventional Commits exist,
   merges that artifact PR into `staging`, and opens or updates a promotion PR
   from `staging` to `main`.
4. `Promotion Pipeline` validates the promotion PR without attaching to `prd`.
5. The promotion PR is merged with a merge commit.
6. `Production Pipeline` validates `main` and deploys affected applications to `prd`.
7. `Publish Release` creates the version tag and GitHub Release from the
   generated changelog.
8. `Sync Staging With Main` fast-forwards `staging` to the production merge
   commit.

Production promotion PRs must not contain a Codex review trigger. Feature PRs
into `staging` keep the normal project review policy.

## Manual Release Initiation

A successful `Homolog Pipeline` never starts a release automatically. After
homologation is accepted, an operator starts release preparation from the
default branch with:

```bash
gh workflow run prepare-production-release.yml --ref main
```

GitHub requires a manually dispatched workflow to exist on the default branch.
The workflow itself checks out and evaluates `staging`, so the command does not
skip homologation or promote an arbitrary ref. Repository variable
`CICD__RELEASE_ENABLED` must remain `true` for the job to run. Starting release
preparation does not enable application deployment.

## Release Automation Configuration

The configuration for publishing a release is:

| Location | Kind | Name | Required value or purpose |
| --- | --- | --- | --- |
| Repository | Variable | `CICD__RELEASE_ENABLED` | `true` while release automation is enabled |
| Repository | Secret | `CICD__RELEASE_TOKEN` | Authenticates automated PR, branch, tag, release, and label operations |

`CICD__RELEASE_TOKEN` is conditionally required whenever
`CICD__RELEASE_ENABLED=true`. The current workflow contract expects a token for
a dedicated identity with repository contents, pull request, issue/label, and
protected-branch capabilities. A GitHub App is preferable for long-term
automation, but adopting one requires changing the workflow to mint short-lived
installation tokens. Do not silently reuse a developer's local `gh` token.

GitHub does not recursively trigger most workflows for changes made with the
repository `GITHUB_TOKEN`. The dedicated token ensures automated PRs and pushes
continue through the required pipelines. See GitHub's documentation on
[triggering workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
and [`GITHUB_TOKEN`](https://docs.github.com/en/actions/concepts/security/github_token).

## Deployment Configuration

Before promoting changes to production, provision the Triad-owned resources and populate the
following `prd` Infisical inputs.

| Category | Secrets | Variables |
| --- | --- | --- |
| Fly.io | `INFRA__FLY_API_TOKEN` | — |
| Cloudflare | `INFRA__CLOUDFLARE_API_TOKEN` | `INFRA__CLOUDFLARE_ACCOUNT_ID`, `INFRA__CLOUDFLARE_SITE_PROJECT_NAME`, `INFRA__CLOUDFLARE_STUDIO_PROJECT_NAME`, `INFRA__STUDIO_URL` |
| API | `API__DATABASE_URL`, `API__BETTER_AUTH_SECRET`, provider secrets | Runtime URLs, origins, and provider identifiers declared in `env-schema.yaml` |
| Site | — | `SITE__PUBLIC_SITE_URL` |
| Studio | — | `STUDIO__VITE_AUTH_BASE_URL` |

The exact ownership, runtime mapping, and target metadata remain authoritative
in `env-schema.yaml`. Environment secrets and variables are available only to
jobs that reference that environment; deployment branch policies restrict
`prd` to `main`. See GitHub's documentation on
[deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## First-Release Bootstrap

The first release needs an explicit bootstrap because GitHub accepts
`workflow_dispatch` only when the workflow file exists on the default branch.
Until the release workflows reach `main`, the manual preparation command is not
available. This is documented GitHub behavior for
[manually running workflows](https://docs.github.com/en/actions/how-tos/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow).

Do not provision legacy names such as `RELEASE_PLEASE_TOKEN` to make the old
workflow pass. Use this bootstrap instead:

1. Use `v0.1.0` for the initial foundation release.
2. Use the Release Please `node` strategy. Root `package.json` is the
   human-visible version source, `.release-please-manifest.json` tracks release
   state, and `CHANGELOG.md` supplies release notes. The strategy name does not
   change the Bun package manager or publish the private workspace to npm.
3. Through a feature PR into `staging`, create the initial changelog section,
   update `.release-please-manifest.json`, and update the selected version file.
4. Require a successful `Homolog Pipeline` for that PR merge.
5. Set the categorized release configuration listed above.
6. Open the promotion PR from `staging` to `main`, wait for
   `Promotion Pipeline`, and merge it with a merge commit.
7. Verify `Production Pipeline`, `Publish Release`, and
   `Sync Staging With Main` in that order.

Release Please documents both the initial-version manifest and `bootstrap-sha`
options in its
[manifest releaser guide](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md#bootstrapping).

After the first promotion, releases use the same explicit manual command because
the release workflow exists on `main`.

## Versioning Policy

CRV Triad currently publishes one product-level version from the repository
root. Release Please uses the `node` strategy to keep the root `package.json`,
`.release-please-manifest.json`, and `CHANGELOG.md` aligned. App-local package
versions are not independent release streams.

The root workspace remains private. Creating a GitHub Release does not publish
packages to npm or another package registry.

## Preflight Checklist

- The working tree is clean and `staging` matches `origin/staging`.
- The latest `Homolog Pipeline` succeeded for the current staging SHA.
- `main` and `staging` have the expected ancestry and no unrelated promotion PR
  is open.
- The target version does not already exist as a tag or GitHub Release.
- Release artifacts match the intended SemVer version.
- `CICD__RELEASE_TOKEN` exists by name; its value is never printed.
- `CICD__RELEASE_ENABLED` is `true` only when the flow is ready to run.
- Every affected app and provider input exists in `prd`, and all resources are Triad-owned before
  production promotion.
- `Promotion Pipeline` passes before merging into `main`.

Useful read-only checks:

```bash
git status --short --branch
git fetch origin --prune --tags
git log --oneline origin/main..origin/staging
gh pr list --state open
gh release list
gh run list --branch staging --limit 10
gh api repos/corvi-io/crv-triad/actions/variables
gh api repos/corvi-io/crv-triad/actions/secrets
```

Do not print secret values, create compatibility aliases, bypass failed checks,
or move an existing release tag. Prefer a forward fix when publication fails.

## Verification

After changing release workflows or contracts, run:

```bash
bun run test:ci
bun run check
bun run build
bash .github/scripts/run-security-gate.sh
```

After publication, confirm that the tag targets the production merge commit,
the GitHub Release notes match the corresponding `CHANGELOG.md` section, all
release workflows succeeded, and `staging` was synchronized to `main`.
