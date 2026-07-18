# IDP Agent Instructions

- Follow root `AGENTS.md`.
- Do not use `src/modules/{module}` in `apps/idp`; the app is a single identity bounded context.
- Mount Better Auth directly at `/api/auth/*`.
- Keep email/password invite-gated; do not open public self-registration.
- Keep business-domain rules out of the IDP.
- Keep tables prefixed with `idp_`.
- Use UUIDv7 through `src/infra/ids.ts`.
