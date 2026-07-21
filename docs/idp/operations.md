# IDP Operations

Create the first admin invitation:

```bash
bun --filter idp bootstrap:admin -- --email admin@example.com --name "Admin"
```

Invited users start from the Studio login screen with the invited email. Credential-created access
requires email verification; verified Google first access is subject to the same invitation/status
policy.

## Database migration

Phase A generates `0001_blushing_lily_hollister.sql`, which adds the unique
`idp_accounts_provider_account_unique` index on `(provider_id, account_id)`. It preserves existing
tables, rows, foreign keys, `idp_` names, and UUIDv7 ID generation.

Before applying it, inspect only the aggregate number of duplicate provider-account groups:

```sql
SELECT count(*) AS duplicate_group_count
FROM (
  SELECT 1
  FROM idp_accounts
  GROUP BY provider_id, account_id
  HAVING count(*) > 1
) AS duplicate_groups;
```

Do not export account rows or token columns. A non-zero count blocks the migration and requires an
approved identity-reconciliation plan. With a zero count, apply through the normal migration job:

```bash
bun --filter idp db:migrate
```

Forward behavior rejects a racing duplicate provider-account insert. The database transaction
rolls back a failed OAuth user/account creation. Schema rollback is
`DROP INDEX "idp_accounts_provider_account_unique"`; use it only as part of a full release rollback
because removing the constraint reopens the duplicate-link race. No migration was applied in Phase
A.

## Transactional email

Invitation, verification, and reset messages share the Resend transport. The sender uses a bounded
five-second request, one retry for network/429/5xx failures, and one idempotency key per delivery
attempt group. It never logs recipient, message, provider response, or token-bearing URL.

- Invitation administration returns an explicit `sent` or `failed` delivery result.
- Better Auth owns background dispatch for automatic verification/reset messages. In installed
  `1.6.23`, manual `/send-verification-email` still awaits the configured provider callback and can
  vary by provider latency or failure. ENG-38 explicitly accepts this behavior and does not detach
  delivery in process.
- Backlog follow-up ENG-39, `Add durable queue for IDP transactional authentication emails`, owns
  durable enqueueing, workers, retries, shutdown safety, idempotent delivery, provider-independent
  response timing, and operational visibility for invitation, verification, and reset email.
- On sustained failure, verify provider status and target configuration without printing values,
  rotate `INFRA__RESEND_API_KEY` if authorized, redeploy the full IDP configuration, and retry the
  user journey. Do not disable email at runtime.

## Google provider incidents and rotation

During a Google outage, keep email/password recovery available and present a safe provider error in
Studio. Do not delete linked accounts or introduce a Google-disabled mode. Rotate the client secret
only through the authorized GitHub Environment workflow, preserve the exact callback, redeploy the
full IDP configuration, and verify OAuth in `dev`, `hml`, then `prd` without capturing codes, state,
tokens, cookies, or user identifiers.

## Cookie cutover and rollback

The namespace change forces fresh authentication. Before deploying it, an authorized operator must:

1. Record aggregate active-session counts only.
2. Revoke affected database sessions without exporting session tokens.
3. Expire exactly `better-auth` and `triad-dev-partitioned` cookie-family names for the matching IDP
   origin/path where browser policy permits.
4. Deploy the accepted `triad-auth`/`triad-auth-partitioned` configuration and require sign-in.

Application code deliberately does not read or copy legacy cookie values and does not automate
session revocation. Rollback is another coordinated full-release operation: revoke sessions again,
expire the exact old/new names, restore the previous release, and require fresh sign-in. No cutover,
cleanup, or revocation was executed in Phase A.
