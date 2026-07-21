# IDP Deployment

The IDP deploys to Fly.io with `apps/idp/Dockerfile` and Drizzle migrations.

Fly apps:

- `crv-triad-idp-dev`
- `crv-triad-idp-hml`
- `crv-triad-idp-prd`

These names are the desired Triad resources. Provision them before enabling deploy jobs; they must
not alias or reuse applications, databases, secrets, or credentials from another project.

GitHub Environment sources mapped to required runtime values:

- `IDP__DATABASE_URL` -> `DATABASE_URL` (secret)
- `IDP__BETTER_AUTH_SECRET` -> `BETTER_AUTH_SECRET` (secret)
- `IDP__APP_ENV` -> `APP_ENV` (variable)
- `IDP__BETTER_AUTH_URL` -> `BETTER_AUTH_URL` (variable)
- `IDP__AUTH_TRUSTED_ORIGINS` -> `AUTH_TRUSTED_ORIGINS` (variable)

Session/password policy and invitation-email settings keep their safe runtime defaults. They are not GitHub Environment sources unless a future feature needs a target-specific override. In particular, email delivery values remain out of the schema while invitation emails are disabled.

App-local `.env.example` names remain runtime-shaped.

The GitHub Environment secret `INFRA__FLY_API_TOKEN` authenticates Fly.io. Deployment runs only
when the environment variable `CICD__DEPLOY_ENABLED` is `true`.

## Browser session cookie topology

Local HTTP development keeps Better Auth's default cookie attributes so localhost remains usable
without HTTPS. When `APP_ENV=development` and `BETTER_AUTH_URL` uses HTTPS, the IDP emits its
HttpOnly session cookie as `__Secure-triad-dev-partitioned.session_token`, with `Secure`,
`SameSite=None`, and `Partitioned`. The dedicated `triad-dev-partitioned` namespace ensures the
server ignores any legacy, non-partitioned `__Secure-better-auth.session_token` that may still be
stored or sent by the browser. The partition is scoped by the browser to the top-level Studio site,
allowing supported browsers to retain the cookie while Studio and IDP use different sites in the
deployed `dev` environment.

After deploying this namespace migration, clear exactly the legacy
`__Secure-better-auth.session_token` cookie for the deployed dev IDP origin in browser developer
tools, then sign in again. Do not clear unrelated cookies or broaden server-side expiration to
unknown cookie names. New sign-out requests expire only the active partitioned namespace; the
legacy cookie is inert but should be removed explicitly to complete cleanup.

Rolling back deployed dev to Better Auth's default namespace is not a transparent configuration
reversal: still-valid legacy server sessions can become recognizable again, while sessions created
under `__Secure-triad-dev-partitioned.session_token` stop authenticating. Before reverting and
redeploying dev, revoke or expire the affected dev sessions server-side, clear exactly
`__Secure-better-auth.session_token` and `__Secure-triad-dev-partitioned.session_token` for the dev
IDP origin, then require users to sign in again. Do not delete other cookies or apply this rollback
procedure to staging or production.

The cross-site dev flow also requires the exact Studio origin in `AUTH_TRUSTED_ORIGINS`. That
allowlist feeds Better Auth origin/CSRF validation and the IDP CORS middleware; credentialed CORS
remains enabled only for listed origins.

Partitioned cookies depend on browser support and can still be rejected by browser settings or
enterprise policies that block this storage mode. The durable topology is to give Studio and IDP
sibling HTTPS hosts under the same registrable custom domain. Keep the IDP cookie host-only unless
an explicit cross-subdomain sharing contract is required; if sharing is introduced, scope the
cookie domain as narrowly as possible and treat every included subdomain as trusted. Configure the
resulting IDP URL and exact Studio origin through `IDP__BETTER_AUTH_URL` and
`IDP__AUTH_TRUSTED_ORIGINS`.

Staging and production retain their existing HTTPS behavior: HttpOnly, `Secure`, and
`SameSite=None`, under the default `__Secure-better-auth` namespace and without enabling
`Partitioned` implicitly. Local HTTP also retains the default `better-auth` namespace.
