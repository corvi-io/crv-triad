# API Deployment

The API deploys to Fly.io with `apps/api/Dockerfile` and environment metadata from `env-schema.yaml`.

Fly apps:

- `crv-triad-api-dev`
- `crv-triad-api-hml`
- `crv-triad-api-prd`

These names are the desired Triad resources. Provision them before enabling deploy jobs; they must
not alias or reuse applications from another project.

GitHub Environment sources mapped to required runtime values:

- `API__DATABASE_URL` -> `DATABASE_URL` (secret)
- `API__IDP_BASE_URL` -> `IDP_BASE_URL` (variable)

Do not store API runtime values in `fly.*.toml`; GitHub Actions syncs them to Fly secrets before deploy.

`IDP_AUTH_TIMEOUT_SECONDS` keeps its safe application default and is not a deployment source. Local `.env.example` names remain runtime-shaped.
