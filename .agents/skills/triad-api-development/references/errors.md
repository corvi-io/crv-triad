# API Errors

## Placement

- Module-specific domain errors live under
  `src/modules/{module}/domain/errors.ts`.
- General application errors live under
  `src/modules/shared/domain/errors.ts`.
- Cross-cutting auth errors such as `UnauthorizedError` belong in shared errors
  unless they are truly module-specific.
- REST mappings live under `src/entrypoints/rest/{module}`.
- REST-wide error handling lives under `src/entrypoints/rest/app.ts`.

## Naming

Prefix module-specific errors with the module concept:

- Good: `CampaignLinkDuplicateSlugError`.
- Avoid: `DuplicateSlugError`.

## HTTP Mapping

- Register module error mappings from the REST composition root.
- Return shared error envelopes from REST handlers.
- Do not add route-level `try/except` for expected module errors unless a
  streaming or cleanup requirement makes it necessary.

## Public Error Boundary

- CRV-owned endpoints return a shared code-only envelope. UI copy is selected
  by the consuming client; it is not derived from exception text.
- Adapted upstream handlers, including Better Auth, must replace unsuccessful
  bodies with a stable safe code and generic message while preserving the HTTP
  status and safe correlation headers.
- A public response must never contain stack traces, exception names/messages,
  SQL, database or provider details, private URLs, credentials, tokens,
  invitation/reset proofs, cookies, private headers, or PII.
- Unexpected framework errors map to `internal_error`. Validation maps to
  `invalid_request`. Do not let framework defaults serialize internals.
- Preserve `X-Request-ID` as a response header for support correlation; do not
  expose private logs or diagnostics to the browser.
- Regression tests should inject a recognizable sensitive sentinel into an
  upstream error and assert that it is absent from serialized HTTP and client
  errors.
