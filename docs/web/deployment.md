# Web Deployment

The web app builds as a static Vite app and deploys to Cloudflare Pages.

GitHub Environment infrastructure controls:

- `INFRA__CLOUDFLARE_API_TOKEN`: Cloudflare API token (secret).
- `INFRA__CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier.
- `INFRA__CLOUDFLARE_WEB_PROJECT_NAME`: Cloudflare Pages project receiving the deployment.
- `INFRA__WEB_URL`: target URL used in deployment reporting and smoke checks.

These inputs configure infrastructure rather than browser runtime.

GitHub Environment sources mapped to required public runtime values:

- `WEB__VITE_AUTH_BASE_URL` -> `VITE_AUTH_BASE_URL`
- `WEB__VITE_API_BASE_URL` -> `VITE_API_BASE_URL`

`VITE_APP_NAME` keeps its application default and is not a deployment source. All Vite values are browser-visible; do not place secrets in them. Local `.env.example` names remain runtime-shaped.

Deployment runs only when the environment variable `CICD__DEPLOY_ENABLED` is `true`.
