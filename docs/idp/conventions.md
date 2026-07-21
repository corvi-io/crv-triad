# IDP Conventions

`apps/idp` owns authentication, sessions, invitations, and identity contracts.

- Better Auth is mounted directly at `/api/auth/*`.
- Email/password and Google are the configured login methods.
- Public self-registration is not open.
- Account creation requires an existing active user or a pending invitation.
- Credential-created users must verify their email before a session is created.
- Only verified same-email Google linking is implicit; different-email and last-method unlinking are
  disabled.
- Better Auth owns password, verification, OAuth, account-linking, cookie, and session primitives.
- Transactional auth email is consolidated behind `src/identity/transactional-email.ts`.
- The bootstrap script creates the first pending admin invitation.
- IDP tables use the `idp_` prefix.
- Generate IDs with UUIDv7 through `src/infra/ids.ts`.
- Keep business rules out of the IDP.

See `authentication.md` for the Better Auth native-capability map and durable security contract.
