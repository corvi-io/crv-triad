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
- `/workspace-preview/forms` (redirects to the development company form catalog)
- `/workspace-preview/forms/companies` (development-only; no login required)
- `/workspace-preview/forms/customers` (development-only; no login required)
- `/workspace-preview/forms/products` (development-only; no login required)
- `/workspace-preview/forms/warehouses` (development-only; no login required)
- `/workspace-preview/forms/trucks` (development-only; no login required)
- `/workspace-preview/forms/drivers` (development-only; no login required)
- `/workspace-preview/forms/collaborators` (development-only; no login required)
- `/workspace-preview/forms/permission-profiles` (development-only; no login required)
- `/overview`
- `/companies`
- `/customers`
- `/inventory/products`
- `/inventory/warehouses`
- `/fleet/trucks`
- `/drivers`
- `/users`
- `/users/collaborators`
- `/users/permission-profiles`
- `/profile`
- `/preferences`

The eight reference CRUD routes provide authenticated, route-level-loaded form drawers with local
validation only. Their domain chunks are imported only after the authentication gate renders the
child route. They do not create records or issue business/identity writes. See
[`docs/web/forms-and-drawers.md`](../../docs/web/forms-and-drawers.md) for the component and testing
contract.

All `/workspace-preview/forms/**` routes redirect to `/login` in production before any domain form
chunk is requested. Verify both the redirect and request boundary with
`bun --filter web test:e2e:production` after a production build.

Runtime env:

- `VITE_APP_NAME`
- `VITE_AUTH_BASE_URL`
- `VITE_API_BASE_URL`
