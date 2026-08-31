# Site Deployment

The site builds as static Astro output and deploys to Cloudflare Pages.

Provision a Triad-owned Cloudflare Pages project before changes reach a deployment branch. Do not reuse a Pages
project, domain, token, or account-specific value from another product.

Infisical `/infrastructure` controls:

- `INFRA__CLOUDFLARE_API_TOKEN`: Cloudflare API token (secret).
- `INFRA__CLOUDFLARE_ACCOUNT_ID`: Cloudflare account identifier.
- `INFRA__CLOUDFLARE_SITE_PROJECT_NAME`: Cloudflare Pages project receiving the deployment.

The canonical `SITE__PUBLIC_SITE_URL` is also used for deployment reporting and
smoke checks, so no separate Pages URL control is needed.

Infisical `/site` sources mapped to required public runtime values:

- `SITE__PUBLIC_SITE_URL` -> `PUBLIC_SITE_URL`

These are browser-visible build values, so they must never contain secrets. Local `.env.example` names remain runtime-shaped.

Deployment is automatic for affected site changes at the `dev`, `hml`, and `prd` pipeline boundaries.
