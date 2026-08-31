# API REST Routes

## File Placement

- REST entrypoints live under `apps/api/src/entrypoints/rest/{module}`.
- Keep runtime request/response schemas in `schemas.ts`, response mapping in
  `presenters.ts` when needed, and OpenAPI metadata beside the route.
- Keep module HTTP error mappings in the REST entrypoint.
- Keep `src/entrypoints/rest/app.ts` as the REST composition root only.

## Route Shape

- Route plugins should include the module path in the prefix and use a stable
  named Elysia instance.
- Public short routes can sit outside management prefixes when the URL is the
  product contract, for example `/r/{slug}`.
- Map expected application/domain errors through entrypoint-level Elysia error
  handling rather than leaking them as raw responses.
- Define runtime schemas for inputs and every expected response status.
- Document stable `operationId`, summary, description, tags, and error responses
  with `@elysiajs/openapi`.

## Handler Responsibilities

Route handlers should:

- Parse HTTP request data.
- Build plain use-case inputs.
- Call focused use-case functions.
- Map successful results to REST response DTOs.

Route handlers should not:

- Own business rules.
- Instantiate concrete repositories.
- Read runtime config directly unless it is an HTTP-only concern.
- Contain broad `try/catch` blocks for expected domain errors.
