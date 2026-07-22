# CRV Triad Identity Provider

Elysia + Better Auth identity provider for CRV Triad.

## Auth Model

- Email/password and Google sign-in are mandatory runtime capabilities.
- Public self-registration is not open.
- Access requires an existing active user or a pending invitation.
- Every session requires an active user with a verified local email; credential access remains
  verification-gated.
- A provider-verified Google identity may link implicitly to an existing active user with the exact
  same normalized email even when the local email starts unverified. Better Auth promotes that
  matching local email to verified before the retained session gate runs.
- Unverified Google emails, different-email linking, disabled users, and unknown users without a
  pending invitation remain rejected.
- Invitation, verification, and reset messages use one IDP-owned transactional email sender.
- The bootstrap script creates the first pending admin invitation.

Better Auth stays mounted directly at `/api/auth/*`. See
`docs/idp/authentication.md` for the native capability, access, linking, and cookie contracts.

## Development

```bash
bun --filter idp db:migrate
bun --filter idp bootstrap:admin -- --email admin@example.com --name "Admin"
bun --filter idp dev
bun --filter idp check
```

Runtime env is documented in `docs/idp/deployment.md`.
