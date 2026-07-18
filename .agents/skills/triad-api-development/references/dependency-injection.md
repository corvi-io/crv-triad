# API Dependency Injection

The API uses `python-inject` for business wiring.

## Rules

- Do not use FastAPI `Depends()` for business dependencies.
- Configure application wiring from infrastructure/composition code.
- Keep repository protocols under
  `src/modules/{module}/repositories/protocols`.
- Keep concrete implementations under
  `src/modules/{module}/repositories/implementations`.

## Use Case Pattern

Use selective injection for concrete dependencies:

```python
@inject.autoparams("repository")
def execute(
    command: CreateThingCommand,
    repository: ThingRepository | None = None,
) -> CreateThingResult:
    if repository is None:
        raise RuntimeError("ThingRepository dependency is not configured")
```

Keep tests simple by passing fakes directly or by binding test DI explicitly.
Do not keep alternate production in-memory repositories for convenience.
