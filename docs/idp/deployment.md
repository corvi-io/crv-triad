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
