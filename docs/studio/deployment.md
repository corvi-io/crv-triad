# Studio Deployment

The studio app builds as a static Vite app and deploys to Cloudflare Pages.

GitHub Environment infrastructure controls:

- `INFRA__CLOUDFLARE_API_TOKEN`: Cloudflare API token (secret).
- `INFRA__CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier.
- `INFRA__CLOUDFLARE_STUDIO_PROJECT_NAME`: Cloudflare Pages project receiving the deployment.
- `INFRA__STUDIO_URL`: target URL used in deployment reporting and smoke checks.

These inputs configure infrastructure rather than browser runtime.

GitHub Environment sources mapped to required public runtime values:

- `STUDIO__VITE_AUTH_BASE_URL` -> `VITE_AUTH_BASE_URL`

`VITE_APP_NAME` keeps its application default and is not a deployment source. All Vite values are browser-visible; do not place secrets in them. Local `.env.example` names remain runtime-shaped.

Deployment runs only when the environment variable `CICD__DEPLOY_ENABLED` is `true`.

## Studio Cutover

Keep deployment disabled while the Studio-owned resources are incomplete. Before enabling any
environment, provision and verify all of the following in that GitHub Environment:

- `STUDIO__VITE_AUTH_BASE_URL`
- `INFRA__CLOUDFLARE_STUDIO_PROJECT_NAME`
- `INFRA__STUDIO_URL`
- `INFRA__CLOUDFLARE_ACCOUNT_ID`
- `INFRA__CLOUDFLARE_API_TOKEN`

Deploy the Studio build to the new Cloudflare Pages project and verify login, session redirect,
sign-out, and the configured smoke URL before changing a public alias. Keep the last working Web
project and alias target intact until the Studio smoke checks pass.

## Rollback

If the Studio deployment or authentication checks fail, set `CICD__DEPLOY_ENABLED=false`, point the
public alias back to the last verified Web project, and leave the failed Studio project available
for diagnosis. Re-enable deployment only after the Studio keys and smoke checks succeed in `dev`,
then `hml`, then `prd`.
