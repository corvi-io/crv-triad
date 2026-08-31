# CRV Test Levels

## Unit

- Place API unit tests under `apps/api/tests/unit` and mirror `src` when practical.
- Exercise one policy, use case, parser, mapper, or factory in isolation.
- Do not use a network listener, real database, filesystem, or third-party service.
- Pass fakes through explicit dependencies. Use `vi.mock` only for unavoidable external module boundaries.

## Integration

- Place API integration tests under `apps/api/tests/integration`.
- Exercise composed module boundaries and real HTTP serialization in process.
- For Elysia, call `app.handle(new Request(...))`; do not open a TCP port.
- Assert status, response body, relevant headers, authentication, authorization, validation, and error mapping.
- Use an owned test database only when SQL or migrations are the subject. Otherwise use a persistence fake behind the real HTTP and domain composition.

## End-to-end

- Reserve end-to-end tests for critical browser or deployed-system journeys.
- Keep them few, user-centered, and free of assertions already proven below.

## Coverage

- Vitest thresholds live in the app `vitest.config.ts`.
- Count application and business code. Exclude generated declarations and one-shot runtime entrypoints only when they contain no reusable behavior.
- A covered line is insufficient: assertions must fail when behavior regresses.
