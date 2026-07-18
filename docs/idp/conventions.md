# IDP Conventions

`apps/idp` owns authentication, sessions, invitations, and identity contracts.

- Better Auth is mounted directly at `/api/auth/*`.
- Email/password is the active login method.
- Public self-registration is not open.
- Account creation requires an existing active user or a pending invitation.
- The bootstrap script creates the first pending admin invitation.
- IDP tables use the `idp_` prefix.
- Generate IDs with UUIDv7 through `src/infra/ids.ts`.
- Keep business rules out of the IDP.
