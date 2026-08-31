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
