# IDP Deployment

The IDP deploys to Fly.io with `apps/idp/Dockerfile` and generated Drizzle migrations.

Fly apps:

- `crv-triad-idp-dev`
- `crv-triad-idp-hml`
- `crv-triad-idp-prd`

These resources must not alias applications, databases, secrets, or credentials from another
project. Deployment remains separately controlled by `CICD__DEPLOY_ENABLED`; ENG-38 does not
enable or execute deployment.

## Required deployment mappings

`env-schema.yaml` translates these GitHub Environment sources to IDP runtime names:

| GitHub Environment source | IDP runtime | Kind |
| --- | --- | --- |
| `IDP__DATABASE_URL` | `DATABASE_URL` | secret |
| `IDP__BETTER_AUTH_SECRET` | `BETTER_AUTH_SECRET` | secret |
| `IDP__APP_ENV` | `APP_ENV` | variable |
| `IDP__BETTER_AUTH_URL` | `BETTER_AUTH_URL` | variable |
| `IDP__AUTH_TRUSTED_ORIGINS` | `AUTH_TRUSTED_ORIGINS` | variable |
| `INFRA__GOOGLE_OAUTH_CLIENT_ID` | `AUTH_GOOGLE_CLIENT_ID` | variable |
| `INFRA__GOOGLE_OAUTH_CLIENT_SECRET` | `AUTH_GOOGLE_CLIENT_SECRET` | secret |
| `IDP__EMAIL_FROM` | `IDP_EMAIL_FROM` | variable |
| `IDP__STUDIO_URL` | `IDP_STUDIO_URL` | variable |
| `INFRA__RESEND_API_KEY` | `IDP_RESEND_API_KEY` | secret |

`IDP_RESEND_API_URL` defaults safely to `https://api.resend.com` and is not target-specific.
Google and transactional auth email have no runtime feature flags. Missing required values fail
environment validation or IDP startup. Provider secrets remain server-only and must never be added
to Studio/Vite variables.

The exact Google callback derives from `BETTER_AUTH_URL` and ends in
`/api/auth/callback/google`; do not add a separate callback env value. `IDP_STUDIO_URL` must be a
trusted HTTP(S) origin and is normalized to its origin before links are built. Startup rejects the
configuration unless that normalized origin is also present in the normalized
`AUTH_TRUSTED_ORIGINS` allowlist.

The Google clients and exact callbacks exist for `dev`, `hml`, and `prd`. Resend values are still
absent from GitHub Environments, so deployed auth-email verification remains blocked. Approved
public privacy/terms content is also absent; production consent publication cannot be completed
until that separate site/legal prerequisite is delivered.

## Cookie topology

Local and standard HTTPS topologies use `triad-auth`. Only the accepted cross-site HTTPS
development topology uses `triad-auth-partitioned` plus the `Partitioned` attribute. See
`authentication.md` for exact names and attributes.

The exact Studio origin must remain in `AUTH_TRUSTED_ORIGINS`. That allowlist feeds Better Auth
origin/CSRF validation and credentialed IDP CORS. Cookies remain host-only; do not broaden their
domain without a separate trust review.

Partitioned cookies depend on browser and enterprise-policy support. The durable topology remains
sibling HTTPS hosts under the same registrable domain. A topology change requires browser
verification before removing `Partitioned` behavior.
