# API Deployment

The API deploys to Fly.io with `apps/api/Dockerfile` and environment metadata from `env-schema.yaml`.

Fly apps:

- `crv-triad-api-dev`
- `crv-triad-api-hml`
- `crv-triad-api-prd`

These names are the desired Triad resources. Provision them before changes reach a deployment
boundary; they must not alias or reuse applications from another project.

All API deployment sources use `API__*` names in Infisical `/api`. The pipeline loads that path,
maps the sources declared in `env-schema.yaml` to runtime names, and synchronizes them to Fly
secrets without printing values. Provider and deployment credentials live in `/infrastructure`.

Do not store API runtime values in `fly.*.toml`. Each Fly configuration runs the compiled Drizzle
migration entrypoint as its release command before replacing application machines. A failed
migration blocks the release and leaves the previous application version serving traffic.

Deployment is automatic for affected apps: pull requests into `staging` deploy to `dev`, pushes to
`staging` deploy to `hml`, and pushes to `main` deploy to `prd`. Pull requests into `main` validate
without deploying. Local `.env.example` names remain runtime-shaped.

Before starting the Fly release, the same API delivery job deploys the Trigger.dev task bundle.
Triad `dev` maps to the stable Preview branch `dev`, `hml` maps to Trigger.dev Staging, and `prd`
maps to Trigger.dev Production. The CLI is pinned to the same `4.5.16` version as
the SDK/build packages and tags deployments with `GITHUB_SHA` for idempotent retries. The Trigger
command waits for the bundle to build and promotes it before the Fly release starts, so the API
does not begin dispatching until the matching task code is available.

The deploy job reads `INFRA__TRIGGER_ACCESS_TOKEN` from Infisical `/infrastructure`; this credential
must be valid for the matching Trigger.dev target environment. While only full-access keys are
available, it is an Infisical reference to the environment's canonical
`/api/API__TRIGGER_SECRET_KEY`, so rotation has one source of truth. Split it into a dedicated
deploy-only credential when scoped keys become available. Runtime task variables are synced from
the already loaded `/api` values by `trigger.config.ts`, with database, R2, and Resend credentials
marked secret. The API receives its environment-specific `TRIGGER_SECRET_KEY`; only `dev` also
receives `TRIGGER_PREVIEW_BRANCH=dev`. Infisical `dev:/api` also keeps the separate local-only
`API__TRIGGER_DEVELOPMENT_SECRET_KEY`; `bun dev` maps it to the runtime key and removes Preview
targeting so API requests reach the local Development worker.
