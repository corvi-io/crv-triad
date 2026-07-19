# Triad Boundaries

## App Ownership

`apps/site` owns:

- Static public placeholder until the CRV Triad public site scope is defined.
- Future static, crawlable public pages when explicitly scoped.
- Browser-safe environment variables using framework public prefixes.
- Public marketing copy only after a dedicated initiative defines it.

`apps/api` owns:

- FastAPI business APIs for Triad product capabilities.
- Domain modules, use cases, persistence, and REST contracts.
- Domain modules under `src/modules/{module}`.
- REST entrypoints under `src/entrypoints/rest/{module}`.
- Server-side tokens, upstream provider secrets, and private integrations.

`apps/idp` owns:

- Authentication, sessions, email/password, invitations, and identity state.
- Better Auth mounted directly at `/api/auth/*`.
- Server-to-server session context for internal apps.
- Broad identity roles and access contracts.

`apps/studio` owns:

- The authenticated barbershop-management browser interface.
- Login, session gating, invite-gated account creation, password reset, and
  sign-out through the IDP browser contract.
- Account-local preferences and future business routes accepted through
  dedicated initiatives.
- Browser-safe Vite environment variables using public prefixes.

`packages/*` should appear only when:

- Two or more apps already duplicate the same stable code.
- The shared behavior has a clear owner and versioning expectation.
- Extracting it reduces coupling instead of hiding product boundaries.

## Placement Rules

- Put authentication and session ownership in `apps/idp`, not `apps/api`.
- Put business-domain APIs in `apps/api`, not `apps/idp`.
- Put public marketing UI in `apps/site`, not internal apps.
- Put barbershop-management UI in `apps/studio`, not `apps/site` or `apps/idp`.
- Keep identity administration out of Studio production routes.
- Do not put product workflows, business lifecycles, quotes, or proposal logic
  in the IDP.
- Do not create generic utility endpoints when a named module or app boundary is
  more honest.
- Do not add `/v1` unless a versioned external contract is explicitly required.

## New Module Decision

Create a new `apps/api/src/modules/{module}` when:

- The behavior has its own vocabulary, lifecycle, invariants, or persistence.
- It is not merely helper code for an existing module.
- It has REST contracts or use cases that will evolve independently.

Keep behavior inside an existing module when:

- It only extends an existing aggregate or workflow.
- It shares the same persistence lifecycle and error vocabulary.
- A new module would exist only to mirror one endpoint or one function.
