# CRV Triad Web

Authenticated React frontend for CRV Triad.

## Development

```bash
bun --filter web dev
bun --filter web check
bun --filter web build
```

Routes:

- `/login`
- `/workspace-preview` (development-only visual shell preview; no login required)
- `/overview`
- `/users`
- `/users/list`
- `/users/invitations`
- `/profile`
- `/preferences`

The workspace intentionally exposes only the neutral shell and identity administration. New business
domains require an accepted initiative and their own API contracts; inherited business catalogs and
placeholder mutations are not part of the foundation.

`/workspace-preview` redirects to `/login` in production. Verify the development preview and the
production boundary with `bun --filter web test:e2e` and
`bun --filter web test:e2e:production`.

Runtime env:

- `VITE_APP_NAME`
- `VITE_AUTH_BASE_URL`
- `VITE_API_BASE_URL`
