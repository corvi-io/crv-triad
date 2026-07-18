# Site Routing, Assets, And Environment

## Routes

- `apps/site` owns the public landing page.
- Campaign-link redirect UI may use the static `/c` splash page and call the
  central API for resolution.
- In local development, preserve the `/c/*` fallback behavior when campaign
  links are touched.

## Assets

- Optimize images before adding them to production pages.
- Use Astro assets and `sharp` where appropriate.
- Keep page-specific assets under `src/assets/pages/**`.
- Avoid adding large or unused media.

## Environment

- Use only browser-safe `PUBLIC_*` values in the site.
- Keep local `apps/site/.env` and `.env.example` runtime-shaped with `PUBLIC_*`
  names.
- Preserve the local site dev server on port `3001`.
- Deployment workflows read uppercase app-prefixed GitHub Environment variables
  such as `SITE__PUBLIC_SITE_URL` and export runtime `PUBLIC_*` names before the Astro
  build through root `env-schema.yaml`.
- Do not add server-only values to `SITE__*` GitHub Environment variables; every
  mapped site value becomes browser-visible after build.
- Keep server-only values out of the site:
  - `TURNSTILE_SECRET_KEY`
  - `RESEND_API_KEY`
  - email sender/recipient secrets
  - provider auth tokens
  - private request headers

Update `.env.example`, `apps/site/README.md`, or `docs/site/*` when config
behavior changes.
