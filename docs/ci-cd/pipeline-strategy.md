# Pipeline Strategy

The workspace keeps four visible delivery pipelines:

- `Develop Pipeline` for pull requests into `staging`.
- `Homolog Pipeline` for pushes to `staging`.
- `Promotion Pipeline` for pull requests into `main`.
- `Production Pipeline` for pushes to `main`.

Each pipeline detects affected apps and runs app-specific quality and security gates. API and IDP
deploy to Fly.io. Site and web deploy to Cloudflare Pages. Third-party actions are pinned to full
commit SHAs, dependency updates are managed by Dependabot, and repository CI scripts have their own
test suite.

## Environment Categories

`env-schema.yaml` is the metadata-only source of truth. Actual values live in the GitHub Environments
`dev`, `hml`, and `prd`, except repository-scoped release controls.

| Category | Purpose | Examples |
| --- | --- | --- |
| `API__*`, `IDP__*`, `SITE__*`, `WEB__*` | App runtime or browser build inputs | `API__DATABASE_URL`, `WEB__VITE_API_BASE_URL` |
| `CICD__*` | Pipeline and release controls | `CICD__DEPLOY_ENABLED`, `CICD__RELEASE_ENABLED` |
| `INFRA__*` | Provider credentials, provider identifiers, and deployed-resource locations | `INFRA__FLY_API_TOKEN`, `INFRA__WEB_URL` |

The deploy gate translates categorized sources to the standard environment names expected by Fly.io,
Wrangler, Vite, Astro, FastAPI, and the IDP. App-local `.env` files remain runtime-shaped. GitHub's
built-in `GITHUB_*` values are not custom configuration and remain unchanged.

Do not add uncategorized custom variables or secrets to workflows. Update `env-schema.yaml`, its
validation tests, and the relevant deployment documentation together.

## Safe Bootstrap

Repository-scoped configuration:

- Variable `CICD__RELEASE_ENABLED=false` until the complete release path is provisioned.
- Secret `CICD__RELEASE_TOKEN` only when automated release PRs, tags, and `staging` synchronization
  are enabled.

Every deployment environment starts with:

- Variable `CICD__DEPLOY_ENABLED=false`.
- Required app sources from `env-schema.yaml` populated for the apps that will deploy.
- `INFRA__FLY_API_TOKEN` for Fly.io deployments.
- `INFRA__CLOUDFLARE_API_TOKEN`, `INFRA__CLOUDFLARE_ACCOUNT_ID`, and the appropriate Pages project
  names for Cloudflare deployments.
- `INFRA__WEB_URL` for web deployment reporting and smoke checks.

Provision only Triad-owned applications, databases, Pages projects, tokens, and domains. After a
target's resources and required values are verified, set that environment's
`CICD__DEPLOY_ENABLED=true`. Quality and security gates still run while deployment is disabled.

## Branch and Environment Flow

- Feature branches merge into `staging` through a pull request that passes `Develop Pipeline`.
- A push to `staging` runs `Homolog Pipeline` against `hml`.
- Promotion from `staging` to `main` happens through a pull request that passes `Promotion Pipeline`.
  This pull-request validation does not attach to `prd` or read production deployment values;
  production access begins only after the merge into `main`.
- A push to `main` runs `Production Pipeline` against `prd`.
- Release automation remains disabled until `CICD__RELEASE_ENABLED=true` and
  `CICD__RELEASE_TOKEN` is provisioned.

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
