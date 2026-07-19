# TRIAD Studio

Authenticated barbershop-management frontend for CRV Triad.

## Development

```bash
bun --filter studio dev
bun --filter studio check
bun --filter studio build
```

Routes:

- `/login`
- `/workspace-preview` (development-only visual shell preview; no login required)
- `/overview`
- `/profile`
- `/preferences`

TRIAD Studio intentionally exposes only the authenticated shell and account-local preferences.
Identity administration remains outside the Studio surface. New business domains require an
accepted initiative and explicit authorization, API, and persistence contracts.

`/workspace-preview` redirects to `/login` in production. Verify the development preview and the
production boundary with `bun --filter studio test:e2e` and
`bun --filter studio test:e2e:production`.

Runtime env:

- `VITE_APP_NAME`
- `VITE_AUTH_BASE_URL`
