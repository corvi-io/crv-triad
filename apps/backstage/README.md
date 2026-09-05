# TRIAD Backstage

Internal operations frontend for CRV Triad. Backstage gives authorized system operators a bounded
view of tenants, subscription and quota state, basic operational statistics, tenant provisioning,
lifecycle controls, and explicit read-only support sessions.

## Development

```bash
bun --filter backstage dev
bun --filter backstage check
bun --filter backstage build
```

The local server runs at `http://localhost:3003` and calls the API configured by
`VITE_AUTH_BASE_URL` (defaults to `http://localhost:8000`). The current routes are `/login`,
`/tenants`, `/tenants/$tenantId`, and `/support/$contextId`.

Tenant creation requires an existing active TRIAD user as owner. The API is authoritative for
operator roles, tenant status, subscription state, quotas, statistics, and support-session expiry.
Backstage never impersonates a tenant user and never moves administrative authority into Studio.

Promote an existing active user to the initial local system owner with:

```bash
bun --filter api bootstrap:backstage-owner -- --email owner@example.com
```

See [`docs/backstage/operations.md`](../../docs/backstage/operations.md) for the runtime and safety
contract.
