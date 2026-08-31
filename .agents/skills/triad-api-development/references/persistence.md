# API Persistence

## Placement

- Domain entities and value objects live under
  `src/modules/{module}/domain` when real invariants justify them.
- Module Drizzle tables, queries, records, and domain mappings live under
  `src/modules/{module}/persistence`.
- The initial IDP schema and database factory live inside `modules/idp`.
  Extract cross-cutting connection primitives to `src/infrastructure/database`
  only when a second module creates real reuse.

## Rules

- Drizzle records are persistence records only. Do not use them as domain
  entities or REST DTOs.
- Drizzle migrations are the schema source of truth. Use `db:generate` to
  produce reviewed SQL and `db:migrate` to apply it.
- Generate IDP IDs with its UUIDv7 helper. Future modules may use a shared
  UUIDv7 helper after reuse exists.
- Store datetimes as timezone-aware UTC values and map them to Postgres
  `timestamptz`.
- Use `deleted_at` for soft delete semantics. Repositories should hide deleted
  records unless a use case explicitly needs them.
- Add indexes for measured or clearly critical query paths, not for every
  filterable or sortable column by default. Each index should justify its write
  cost, storage cost, and expected use on large tables.
- Table names must be globally unique and should include module namespace when
  needed.
- Avoid cross-context Drizzle relation graphs by default; reference other
  aggregates by ID and coordinate through application use cases.

## PostgreSQL Validation

Typechecking and mocked repositories do not validate generated SQL. When a
change adds or materially rewrites a Drizzle query, raw SQL fragment, join,
subquery, CTE, window function, transaction, or index-dependent critical path:

1. Keep the normal unit and HTTP contract tests, but also execute the exact
   persistence path against a real local or disposable PostgreSQL database.
2. Exercise reads normally. Exercise writes inside a transaction that is
   deliberately rolled back, unless persisting test data is explicitly part of
   the authorized task.
3. Report only safe measurements and aggregate results such as elapsed time,
   row count, or query count. Never print connection strings, SQL parameters,
   lead payloads, PII, credentials, or private headers.
4. Separate connection establishment from warm-query samples when discussing
   latency. Treat small local datasets as correctness and regression evidence,
   not production capacity evidence.
5. For a critical query or a new index, inspect the generated SQL and use
   `EXPLAIN (ANALYZE, BUFFERS)` when representative safe data is available.
   Record assumptions; do not claim index use or throughput that was not
   observed.

Resolve the environment explicitly before connecting. Never point an ad hoc
validation command at staging or production, reset data, apply a migration, or
commit a write merely because implementation work was authorized. If no safe
PostgreSQL target is available, keep the change blocked or report the missing
runtime validation as a concrete risk instead of treating mocks as sufficient.
