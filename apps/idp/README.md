# CRV Triad Identity Provider

Elysia + Better Auth identity provider for CRV Triad.

## Auth Model

- Email/password and Google sign-in are mandatory runtime capabilities.
- Public self-registration is not open.
- Access requires an existing active user or a pending invitation.
- Credential access requires email verification.
- Google may link implicitly only to the same normalized, verified local email.
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
