# Backstage Deployment

Backstage builds as a static Vite application and deploys to a dedicated Cloudflare Pages project.
Deployment is automatic for affected Backstage changes at the `dev`, `hml`, and `prd` pipeline
boundaries. When API and Backstage changes are detected together, API delivery must succeed before
Backstage delivery starts.

## Configuration

Infisical `/infrastructure` controls:

- `INFRA__CLOUDFLARE_API_TOKEN`: Cloudflare API token with access to the Backstage Pages project.
- `INFRA__CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier.
- `INFRA__CLOUDFLARE_BACKSTAGE_PROJECT_NAME`: dedicated Cloudflare Pages project receiving the build.
- `INFRA__BACKSTAGE_URL`: canonical target URL used for deployment reporting and smoke checks.

Infisical `/backstage` provides browser-visible build values:

- `BACKSTAGE__VITE_AUTH_BASE_URL` -> `VITE_AUTH_BASE_URL`
- `BACKSTAGE__VITE_DEPLOY_TARGET` -> `VITE_DEPLOY_TARGET` (optional target guard)

`BACKSTAGE__VITE_AUTH_BASE_URL` must reference the environment API `/api/auth` endpoint. Never place
credentials, tokens, session material, or other secrets in a `VITE_*` value.

The exact `INFRA__BACKSTAGE_URL` origin must also be present in the API
`API__AUTH_TRUSTED_ORIGINS` value for the same environment. Redeploy the API after changing the
allowlist and before validating Backstage authentication.

## Environment Cutover

Before Backstage changes reach an environment deployment boundary:

1. Provision a Triad-owned Cloudflare Pages project without reusing another product's project or
   domain.
2. Populate the `/backstage` and `/infrastructure` values listed above in Infisical.
3. Add the Backstage origin to `API__AUTH_TRUSTED_ORIGINS` and redeploy the API.
4. Deploy Backstage and verify its smoke URL, direct-route loading, login, session refresh, sign-out,
   and denial for an authenticated non-operator.
5. Promote an existing active identity only after the application and API are healthy:

   ```bash
   bun --filter api bootstrap:backstage-owner -- --email <email>
   ```

   Run the command with the target API environment loaded. Do not log or commit the operator email.

Complete and verify `hml` before provisioning or promoting the same contract to `prd`.

## Rollback

If deployment or authentication validation fails, stop promotion and keep the last verified Pages
deployment available. Disable Backstage delivery or restore the previous Pages alias while retaining
the additive platform schema and audit history. Apply a forward fix and repeat verification in
`dev`, then `hml`, then `prd`.
