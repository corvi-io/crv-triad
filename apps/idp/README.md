# CRV Triad Identity Provider

Elysia + Better Auth identity provider for CRV Triad.

## Auth Model

- Email/password and Google sign-in are mandatory runtime capabilities.
- Public self-registration is not open.
- Email/password first access requires the one-time proof from a valid pending invitation. A
  provider-verified Google identity retains the separate ENG-38 invitation path.
- Every session requires an active user with a verified local email; credential access remains
  verification-gated.
- A provider-verified Google identity may link implicitly to an existing active user with the exact
  same normalized email even when the local email starts unverified. Better Auth promotes that
  matching local email to verified before the retained session gate runs.
- Unverified Google emails, different-email linking, disabled users, and unknown users without a
  pending invitation remain rejected.
- Invitation, verification, and reset messages use IDP-owned React Email templates over the
  existing bounded Resend REST sender.
- The bootstrap script creates and sends the first secure pending admin invitation without
  printing its proof.

Better Auth stays mounted directly at `/api/auth/*`. See
`docs/idp/authentication.md` for the native capability, access, linking, and cookie contracts.

## Development

```bash
bun --filter idp db:migrate
bun --filter idp bootstrap:admin -- --email admin@example.com --name "Admin"
bun --filter idp email:preview
bun --filter idp dev
bun --filter idp check
```

The PostgreSQL transaction proof is opt-in and refuses to run without an explicitly isolated test
database. After starting a disposable local cluster on a non-default port, run:

```bash
TEST_DATABASE_URL="$TEST_DATABASE_URL" bun --filter idp test:integration:postgres
```

The integration suite applies the checked-in IDP migrations only to that database. It never reads
`apps/idp/.env`; it rejects non-loopback hosts, the default PostgreSQL port, and database names that
do not end in `_test`. Do not point it at a shared or deployed database.

The synthetic-only email preview runs on port `3002` and does not send messages. Invitation
resolution is exposed as `POST /invitations/resolve`; administrative creation, resend rotation, and
revocation remain IDP-owned routes. Schema changes are generated with `bun --filter idp db:generate`;
do not apply migrations without explicit environment authorization.

Runtime env is documented in `docs/idp/deployment.md`.
