# Identity Deployment

Identity ships as the `apps/api/src/modules/idp` bounded context inside the consolidated API image.
There is no separate identity application or deployment.

Fly apps:

- `crv-triad-api-dev`
- `crv-triad-api-hml`
- `crv-triad-api-prd`

These resources must not alias applications, databases, secrets, or credentials from another
project. The API release command applies generated Drizzle migrations before the new version starts.

## Required deployment mappings

`env-schema.yaml` translates these Infisical `/api` sources to identity runtime names:

| Infisical source | API runtime | Kind |
| --- | --- | --- |
| `API__DATABASE_URL` | `DATABASE_URL` | secret |
| `API__BETTER_AUTH_SECRET` | `BETTER_AUTH_SECRET` | secret |
| `API__APP_ENV` | `APP_ENV` | variable |
| `API__BETTER_AUTH_URL` | `BETTER_AUTH_URL` | variable |
| `API__AUTH_TRUSTED_ORIGINS` | `AUTH_TRUSTED_ORIGINS` | variable |
| `API__AUTH_GOOGLE_CLIENT_ID` | `AUTH_GOOGLE_CLIENT_ID` | variable |
| `API__AUTH_GOOGLE_CLIENT_SECRET` | `AUTH_GOOGLE_CLIENT_SECRET` | secret |
| `API__IDP_EMAIL_FROM` | `IDP_EMAIL_FROM` | variable |
| `API__IDP_STUDIO_URL` | `IDP_STUDIO_URL` | variable |
| `API__IDP_RESEND_API_KEY` | `IDP_RESEND_API_KEY` | secret |

`IDP_RESEND_API_URL` defaults safely to `https://api.resend.com` and is not target-specific.
Google and transactional auth email have no runtime feature flags. Missing required values fail
environment validation or IDP startup. Provider secrets remain server-only and must never be added
to Studio/Vite variables.

The exact Google callback derives from `BETTER_AUTH_URL` and ends in
`/api/auth/callback/google`; do not add a separate callback env value. `IDP_STUDIO_URL` must be a
trusted HTTP(S) origin and is normalized to its origin before links are built. Startup rejects the
configuration unless that normalized origin is also present in the normalized
`AUTH_TRUSTED_ORIGINS` allowlist.

Provider values are managed per environment in Infisical. Missing required values fail environment
validation before the API starts. Approved public privacy/terms content remains a separate
site/legal prerequisite for production consent publication.

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
