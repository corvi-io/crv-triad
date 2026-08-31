# API And Persistence Product QA Contract

## Outcomes

- Browser journeys call the real Bun/Elysia API and persist expected outcomes in
  an authorized local PostgreSQL database.
- Better Auth remains mounted at `/api/auth/*`; Google proves identity but does
  not grant public self-registration. Access requires an active user or valid
  invitation.
- Authentication, authorization, validation, conflicts, idempotency, errors,
  and transactions produce stable public contracts without leaking stack traces,
  SQL/provider details, credentials, tokens, PII, or private headers.
- Business-module rules remain outside `idp`, and persistence preserves domain
  invariants across refresh and a new browser session.

## Required Risk States

Exercise missing/invalid input, duplicates, conflicts, unexpected errors,
unauthenticated and forbidden access, inactive users, invalid/expired/reused
invitations, stale versions, concurrent or repeated actions, partial failure,
rollback, and unavailable external dependencies when applicable.

Confirm persistence with browser-observed state and safe aggregate API/database
evidence. Do not approve a mocked frontend path as end-to-end evidence.
