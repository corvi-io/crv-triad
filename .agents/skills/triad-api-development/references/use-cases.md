# API Use Cases

## Shape

Use case files should expose:

- A command dataclass.
- A result dataclass when the use case returns data.
- An `execute()` function.

Keep command and result dataclasses in the same file as the `execute()` function
that owns them.

## Dependency Style

- Prefer use case functions decorated with `@inject.autoparams()`.
- Use selective `@inject.autoparams("dependency_name")` when only some
  parameters are injected.
- Give injected dependencies a `| None = None` default so tests and static
  analyzers can call use cases with command-only arguments.
- Fail clearly if an injected dependency is still `None` at runtime.

## Boundaries

Use cases should:

- Own business flow and application decisions.
- Depend on repository protocols, not concrete implementations.
- Return explicit result dataclasses or raise module/shared errors.

Use cases should not:

- Know FastAPI request or response classes.
- Return SQLModel records.
- Reach into another module's persistence records.
- Read environment variables directly.
