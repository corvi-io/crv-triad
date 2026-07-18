# Site Deployment

The site builds as static Astro output and deploys to Cloudflare Pages.

Provision a Triad-owned Cloudflare Pages project before enabling deploy jobs. Do not reuse a Pages
project, domain, token, or account-specific value from another product.

GitHub Environment provider control:

- `SITE__CLOUDFLARE_PAGES_PROJECT_NAME`: Cloudflare Pages project receiving the deployment.

This control follows the `SITE__*` source-name convention but remains outside
`env-schema.yaml` because it configures the deployment provider rather than the
browser runtime. The canonical `SITE__PUBLIC_SITE_URL` is also used for deployment
reporting and smoke checks, so no separate Pages URL control is needed.

GitHub Environment sources mapped to required public runtime values:

- `SITE__PUBLIC_SITE_URL` -> `PUBLIC_SITE_URL`

These are browser-visible build values, so they must never contain secrets. Local `.env.example` names remain runtime-shaped.
