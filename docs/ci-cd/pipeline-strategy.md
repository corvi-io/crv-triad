# Pipeline Strategy

The workspace keeps four visible delivery pipelines:

- `Develop Pipeline` for PRs into `staging`.
- `Homolog Pipeline` for pushes to `staging`.
- `Promotion Pipeline` for PRs into `main`.
- `Production Pipeline` for pushes to `main`.

Each pipeline detects affected apps and runs app-specific quality, security, and deploy gates. API and IDP deploy to Fly.io. Site and web deploy to Cloudflare Pages.

Deployment environment metadata lives in `env-schema.yaml`; actual app values live in GitHub Environments. Runtime sources use uppercase app prefixes (`API__*`, `IDP__*`, `SITE__*`, `WEB__*`) and are translated before build or deploy. The schema lists only secrets and values that differ by target; app defaults stay in code or app-local env files. Provider credentials and Cloudflare Pages controls are not app runtime sources. Cloudflare deploys use `SITE__CLOUDFLARE_PAGES_PROJECT_NAME`, `WEB__CLOUDFLARE_PAGES_PROJECT_NAME`, and `WEB__CLOUDFLARE_PAGES_URL` as separate provider controls. App-specific controls use the same `APP__*` prefix convention as runtime sources, while remaining outside `env-schema.yaml`. The web URL control feeds preview comments and post-deploy smoke checks for the matching GitHub Environment; the site reuses its canonical `SITE__PUBLIC_SITE_URL` for those purposes.

## Manual Legacy Fly Secret Cleanup

`flyctl secrets import --stage` updates supplied values but does not remove older
Fly secret overrides. This migration may therefore require a human-only cleanup
per app and per `dev`, `hml`, or `prd` target.

1. An approved operator with the target Fly credentials must inspect the current
   secret names and confirm that the value is no longer required by the app.
2. After approval, the operator may manually unset these omitted API runtime
   secrets: `IDP_AUTH_TIMEOUT_SECONDS`.
3. After approval, the operator may manually unset these omitted IDP runtime
   secrets: `AUTH_SESSION_EXPIRES_IN_SECONDS`, `AUTH_PASSWORD_MIN_LENGTH`,
   `AUTH_PASSWORD_MAX_LENGTH`, `AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS`,
   `IDP_INVITATION_EMAILS_ENABLED`, `IDP_INVITATION_EMAIL_FROM`,
   `IDP_INVITATION_APP_URL`, `IDP_RESEND_API_KEY`, and `IDP_RESEND_API_URL`.
4. Record the target and approval outside this repository without including any
   secret values.

Unsetting a Fly secret is destructive and environment-specific. Do not automate
it or execute it in CI; require an explicit, environment-specific operation.
