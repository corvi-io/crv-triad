# Web Deployment

The web app builds as a static Vite app and deploys to Cloudflare Pages.

GitHub Environment provider controls:

- `WEB__CLOUDFLARE_PAGES_PROJECT_NAME`: Cloudflare Pages project receiving the deployment.
- `WEB__CLOUDFLARE_PAGES_URL`: target URL used in deployment reporting and smoke checks.

These controls follow the `WEB__*` source-name convention but remain outside
`env-schema.yaml` because they configure the deployment provider rather than the
browser runtime.

GitHub Environment sources mapped to required public runtime values:

- `WEB__VITE_AUTH_BASE_URL` -> `VITE_AUTH_BASE_URL`
- `WEB__VITE_API_BASE_URL` -> `VITE_API_BASE_URL`

`VITE_APP_NAME` keeps its application default and is not a deployment source. All Vite values are browser-visible; do not place secrets in them. Local `.env.example` names remain runtime-shaped.
