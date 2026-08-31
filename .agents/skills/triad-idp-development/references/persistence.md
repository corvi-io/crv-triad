# IDP Persistence

## Stack

- Use Drizzle ORM and Drizzle Kit with PostgreSQL.
- Use migrations for schema changes.
- Keep IDP-owned tables prefixed with `idp_`.
- Generate identity entity IDs with UUIDv7 through `src/modules/idp/infra/ids.ts`.

## Rules

- Better Auth database IDs should use the same UUIDv7 generator when configured.
- Keep identity history soft. Do not hard-delete users or invitations without a
  specific deletion design.
- Do not add audit/event tables for the MVP unless the product scope changes.
- Use package scripts:
  - `bun --filter api db:generate`
  - `bun --filter api db:migrate`

## Migration Handoff

When schema changes:

- Generate migrations.
- Confirm `.env.example` remains safe and accurate when config changes.
- Add or update tests around repository behavior or access invariants.
