# API Persistence

## Placement

- Domain entities live under `src/modules/{module}/entities/{entity}.py`.
- SQLModel table records live under
  `src/modules/{module}/persistence/records.py`.
- Record/entity conversion lives under
  `src/modules/{module}/persistence/mappers.py`.
- Concrete SQLModel repositories live under
  `src/modules/{module}/repositories/implementations`.
- Cross-cutting database primitives live under `src/infra`.

## Rules

- SQLModel records are persistence records only. Do not use them as domain
  entities or REST DTOs.
- Migrations are the schema source of truth. Do not rely on
  `SQLModel.metadata.create_all()` for application schema management outside
  narrow tests or local experiments.
- Generate persisted application IDs with UUIDv7 through
  `src/modules/shared/ids.py`.
- Store datetimes as timezone-aware UTC values and map them to Postgres
  `timestamptz`.
- Use `deleted_at` for soft delete semantics. Repositories should hide deleted
  records unless a use case explicitly needs them.
- Add indexes for measured or clearly critical query paths, not for every
  filterable or sortable column by default. Each index should justify its write
  cost, storage cost, and expected use on large tables.
- Table names must be globally unique and should include module namespace when
  needed.
- Avoid cross-module SQLModel `Relationship()` objects by default.
