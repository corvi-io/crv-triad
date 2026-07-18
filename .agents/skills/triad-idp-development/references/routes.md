# IDP Routes

## Better Auth

- Better Auth owns `GET /api/auth/*` and `POST /api/auth/*`.
- Mount Better Auth directly. Do not wrap each endpoint manually.

## Triad-Owned Routes

Custom Elysia routes should be limited to Triad-owned contracts such as:

- `GET /health`
- `GET /ready`
- `GET /internal/session-context`
- admin-only user and invitation management routes
- invitation/admin automation routes
- `GET /openapi.json` outside production
- `GET /docs` outside production

Custom routes must be represented in the OpenAPI document exposed outside
production.

Administrative list routes should use bounded pagination plus server-side
filters and sorting. Do not expose unbounded user or invitation lists for
browser screens.

Use `APP_ENV`, not `NODE_ENV`, to decide whether OpenAPI routes are exposed.
Fly containers set `NODE_ENV=production` in every remote environment, while
`APP_ENV` carries the Triad runtime stage.

## Boundaries

- `apps/api` should not proxy Better Auth.
- `apps/api` may call `apps/idp` server-to-server for session context.
- Do not put business-domain APIs in the IDP.
