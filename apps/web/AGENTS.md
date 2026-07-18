# Web Agent Instructions

- Follow root `AGENTS.md`.
- Keep user-facing UI copy in Brazilian Portuguese.
- Use TanStack Router file routes under `src/routes`.
- Keep private routes under `src/routes/_authenticated`.
- Keep Better Auth browser client code under `src/modules/auth/services`.
- Read `import.meta.env` only in `src/modules/shared/config/env.ts`.
- Keep shared UI primitives under `src/modules/shared/components`.
- Import icon components with the `Icon` suffix, using the library export or an explicit alias.
- Keep drawer shells, bordered collapsible sections, label/icon/control rows, Base UI/shadcn
  controls, footer action slots, masks, and accessibility behavior in `src/modules/shared`.
- Keep field inventories, icon choices, labels, placeholders/copy, RHF/Zod schemas and defaults,
  option catalogs, dependent rules, and submit intents in the owning domain module.
- Compose domain forms explicitly. Do not build a schema-driven universal renderer, multiply boolean
  props where an explicit variant or slot works, or create `packages/*` for web-only form reuse.
- A form without a real mutation may validate/review locally, but must not claim create/save success,
  persist drafts, emit API/IDP writes, or advertise those implementation limitations in visible or
  accessibility-only copy. Prove the no-write boundary with request and storage tests.
- Use the shared `DatePicker` for real date fields. Keep the form value as a canonical
  `YYYY-MM-DD` date-only string assembled and parsed in local time; do not use native date inputs or
  masked date text fields.
- Keep selector-looking fields visually final and locally editable when their catalog contract is
  unresolved; do not invent catalogs, uploads, mutations, or disabled/deferred technical copy.
