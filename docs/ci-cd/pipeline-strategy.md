# Pipeline Strategy

The workspace keeps four visible delivery pipelines:

- `Develop Pipeline` for pull requests into `staging`.
- `Homolog Pipeline` for pushes to `staging`.
- `Promotion Pipeline` for pull requests into `main`.
- `Production Pipeline` for pushes to `main`.

See [Release Process](release-process.md) for release automation, first-release bootstrap,
production promotion, publication, and post-release synchronization.

Each pipeline detects affected apps and runs app-specific quality and security gates. The consolidated
API deploys to Fly.io. Site and studio deploy to Cloudflare Pages. Third-party actions are pinned to full
commit SHAs, dependency updates are managed by Dependabot, and repository CI scripts have their own
test suite.

## Environment Categories

`env-schema.yaml` is the metadata-only source of truth. Actual deployment values live in Infisical
environments `dev`, `hml`, and `prd`; GitHub Environments retain protection rules and the non-secret
Infisical OIDC identifiers. Repository-scoped release controls remain in GitHub.

| Category | Purpose | Examples |
| --- | --- | --- |
| `API__*`, `SITE__*`, `STUDIO__*` | App runtime or browser build inputs | `API__DATABASE_URL`, `STUDIO__VITE_AUTH_BASE_URL` |
| `CICD__*` | Release controls | `CICD__RELEASE_ENABLED` |
| `INFRA__*` | Provider credentials, provider identifiers, and deployed-resource locations | `INFRA__FLY_API_TOKEN`, `INFRA__STUDIO_URL` |

The deploy gate translates categorized sources to the standard environment names expected by Fly.io,
Wrangler, Vite, Astro, Elysia, and Better Auth. App-local `.env` files remain runtime-shaped. GitHub's
built-in `GITHUB_*` values are not custom configuration and remain unchanged.

Do not add uncategorized custom variables or secrets to workflows. Update `env-schema.yaml`, its
validation tests, and the relevant deployment documentation together.

## Safe Bootstrap

Repository-scoped configuration:

- Variable `CICD__RELEASE_ENABLED=false` until the complete release path is provisioned.
- Secret `CICD__RELEASE_TOKEN` only when automated release PRs, tags, and `staging` synchronization
  are enabled.

Every deployment environment starts with:

- Required app sources from `env-schema.yaml` populated for the apps that will deploy.
- `INFRA__FLY_API_TOKEN` for Fly.io deployments.
- `INFRA__CLOUDFLARE_API_TOKEN`, `INFRA__CLOUDFLARE_ACCOUNT_ID`, and the appropriate Pages project
  names for Cloudflare deployments.
- `INFRA__STUDIO_URL` for studio deployment reporting and smoke checks.

Provision only Triad-owned applications, databases, Pages projects, tokens, and domains. Deployments
are automatic once changes reach the environment's branch or pull-request boundary; keep required
values complete before merging work into that boundary.

## Branch and Environment Flow

- Feature branches merge into `staging` through a pull request that passes `Develop Pipeline`.
- A push to `staging` runs `Homolog Pipeline` against `hml`.
- Promotion from `staging` to `main` happens through a pull request that passes `Promotion Pipeline`.
  This pull-request validation does not attach to `prd` or read production deployment values;
  production access begins only after the merge into `main`.
- A push to `main` runs `Production Pipeline` against `prd`.
- A successful homologation does not start a release. An operator explicitly
  dispatches `Prepare Production Release` from `main` when staging is accepted.
- Manual release preparation remains unavailable until
  `CICD__RELEASE_ENABLED=true` and `CICD__RELEASE_TOKEN` is provisioned.

Protect `staging` and `main` from force pushes and deletion, require pull requests and resolved review
threads, and require their corresponding pipeline checks. Restrict the `hml` environment to
`staging` and the `prd` environment to `main`; `dev` accepts feature branches used by pull requests.

## Verification

Run these checks after changing workflows or environment contracts:

```bash
bun run test:ci
bun run check
bun run build
bash .github/scripts/run-security-gate.sh
```

Do not store inherited credentials, deployment values, or cleanup instructions from the source
project in this repository.
