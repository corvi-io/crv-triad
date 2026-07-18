# IDP Auth And Access

## Model

- Better Auth email/password is enabled.
- Access is granted only when:
  - the user already exists with active status; or
  - the email matches a pending, valid invitation.
- Reject disabled users and unknown emails without a valid pending invitation.
- Keep public self-registration closed. Subsequent users enter through
  invitations.

## Login Methods

- Keep Better Auth email/password as the active login method.
- Keep account creation invite-gated; invited users choose their password
  through the web login flow.
- Do not expose public self-registration or add other login methods without
  explicit product approval.
- Do not weaken the invitation gate as a shortcut for local testing.

## Admin Bootstrap

- Create the first pending admin invitation through:
  `bun --filter idp bootstrap:admin -- --email ... --name ...`
- The script creates a pending admin invitation; it does not create an active
  admin user directly.
- Keep the script explicit and idempotent for the same pending invitation or
  active admin.
- Do not create admins automatically at app startup.
