# Multi-Tenant Access Runbook

## Purpose

This runbook operates Initiative 19 tenancy, commercial access, principal ownership, and bounded
platform support. Browser state is never authorization authority. Every business request is resolved
from the Better Auth session, persisted active organization, active membership, organization status,
role capability, current subscription, entitlement, and quota.

## Initial provisioning

1. Create or invite the identity through the IDP workflow.
2. Create the first tenant and platform assignment explicitly:

   ```sh
   bun --cwd apps/api bootstrap:tenant --user-id <id> --name "Barbearia" --slug barbearia
   ```

3. Assign the immutable test-tier plan version and current manual subscription:

   ```sh
   bun --cwd apps/api configure:tenant-access --actor-user-id <operator-user-id> \
     --organization-id <id> --plan-key test-tier --state active --active-client-limit 100
   ```

Both commands are idempotent for the same inputs. A different quota requires a new plan version;
the command deliberately refuses to mutate version 1.

## Ownership

The tenant API permits an active owner to transfer ownership to another active membership. The
transaction serializes by organization, demotes the former owner, promotes the target, and writes an
audit event. The database permits at most one active owner.

Exceptional recovery is available only when no active owner exists and the actor is an active
platform operator:

```sh
bun --cwd apps/api recover:tenant-owner --actor-user-id <operator-user-id> \
  --organization-id <organization-id> --target-membership-id <membership-id>
```

Never use recovery as a routine transfer mechanism. Preserve its output with the incident record.

## Platform support

- Platform authority comes only from `platform_operators`; IDP or tenant admin roles do not imply it.
- Inventory returns tenant metadata and aggregate membership counts, never client payloads.
- A support context requires an active tenant, a 10–500 character reason, and a 1–60 minute duration.
- The plaintext credential is returned once. Only its SHA-256 digest is persisted.
- The Studio keeps the credential only in memory, pins the target tenant and expiry across support
  surfaces, and enters read-only tenant summary/client views without impersonation.
- Exit revokes server-side before clearing browser state. A failed revoke preserves the credential
  for retry; the old credential is rejected immediately after success.
- Revocation and expiration are fail-closed. Creation and revocation are high-severity audit events.
- Audit tables must not receive credentials, headers, client notes, contact data, or business payloads.

## Rollout and rollback

Apply migrations before deploying API and Studio. Migrations `0005`–`0009` are additive. Validate
context discovery and access summary before enabling the Studio HTTP client source. Deployment must
set `STUDIO__VITE_CLIENT_MANAGEMENT_SOURCE=http`.

If application rollback is required, deploy the prior API/Studio artifacts and leave additive tables
in place. Do not execute destructive down migrations. Suspend a tenant subscription to block
commercial access without deleting data. Disable a membership or platform assignment to revoke
authority immediately.

## Verification and incidents

- Run `bun run check` in `apps/api` and `apps/studio`.
- Run PostgreSQL integration tests only against the guarded isolated `TEST_DATABASE_URL`.
- Verify two-tenant foreign-ID attempts return safe denial/not-found responses.
- Verify production assets contain no memory repository or scenario markers.
- Investigate with request IDs and privacy-safe audit records. Never add payload logging to diagnose
  an incident.
