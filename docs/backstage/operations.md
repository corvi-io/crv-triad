# Backstage Operations

`apps/backstage` is the internal administrative plane for CRV Triad. It is separate from Studio so
tenant operators cannot reach system-wide inventory or lifecycle controls through their daily
barbershop workspace.

## Authority and capabilities

- Authentication is provided by Better Auth, while `/api/backstage/me` independently confirms an
  active Backstage operator.
- `system_owner` and `operations` may create barbershops and change their lifecycle state.
- `support` and `billing` are recognized operator roles but receive only their server-authorized
  capabilities; the UI never upgrades authority locally.
- Barbershop creation generates its slug server-side from the normalized name plus a five-character
  random suffix. An existing active user is bound immediately as owner; otherwise the transaction
  creates a pending owner invitation and the API sends the invite after commit. Plan entitlements,
  subscription, ownership intent, and audit state are created atomically.
- Barbershop detail exposes bounded counts, owner identity, plan, subscription state, client quota,
  organization status, and version. It does not expose tenant business payloads.
- Support access is explicit, reason-bound, time-limited, revocable, audited, and read-only.

## Local workflow

Run the API on `8000` and Backstage on `3003`. The API trusted-origin list must contain
`http://localhost:3003`. After migrations, promote an already active identity with
`bun --filter api bootstrap:backstage-owner -- --email <email>`.

If a tenant is suspended, Studio access fails closed for that tenant. Reactivation uses the latest
organization version to prevent stale administrative writes. Generated slug collisions are retried
with bounded attempts. A pre-existing pending identity invitation returns a safe conflict code.

## Verification

Run `bun --filter api check`, `bun --filter backstage check`, and `bun --filter studio check`.
Database migrations remain forward-only. Rollback of the Backstage UI means disabling its delivery
while retaining the additive platform schema and audit history.
