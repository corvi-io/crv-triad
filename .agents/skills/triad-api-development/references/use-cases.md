# API Use Cases

## Shape

Each file under `application/use-cases` should represent one business action and
export its plain input/result types with a factory or function that executes the
action. Prefer domain verbs such as `createLead` or `moveLead`.

## Dependency Style

- Inject dependencies explicitly through factory arguments.
- Prefer narrow structural function contracts for the operations a use case
  actually needs.
- Promote those contracts to a shared module contract only after multiple use
  cases need a stable cohesive boundary.
- Do not introduce a DI container or pass-through class solely for convention.

## Boundaries

Use cases should:

- Own business flow and application decisions.
- Depend on plain structural contracts rather than Drizzle clients.
- Return plain results or domain objects and throw module/shared errors.

Use cases should not:

- Know Elysia context, status helpers, or HTTP schemas.
- Return Drizzle records as public application results.
- Reach into another module's persistence records.
- Read environment variables directly.
