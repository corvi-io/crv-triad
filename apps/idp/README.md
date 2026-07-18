# CRV Triad Identity Provider

Elysia + Better Auth identity provider for CRV Triad.

## Auth Model

- Email/password is enabled.
- Public self-registration is not open.
- Access requires an existing active user or a pending invitation.
- The bootstrap script creates the first pending admin invitation.

## Development

```bash
bun --filter idp db:migrate
bun --filter idp bootstrap:admin -- --email admin@example.com --name "Admin"
bun --filter idp dev
bun --filter idp check
```

Runtime env is documented in `docs/idp/deployment.md`.
