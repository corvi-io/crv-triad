# Web Agent Instructions

- Follow root `AGENTS.md`.
- Keep user-facing UI copy in Brazilian Portuguese.
- Use TanStack Router file routes under `src/routes`.
- Keep private routes under `src/routes/_authenticated`.
- Keep Better Auth browser client code under `src/modules/auth/services`.
- Read `import.meta.env` only in `src/modules/shared/config/env.ts`.
- Keep shared UI primitives under `src/modules/shared/components`.
- Keep the product foundation domain-neutral. Do not restore inherited business
  routes, catalogs, fixtures, placeholder mutations, or navigation entries.
- Add a business domain only from an accepted initiative with explicit API,
  authorization, persistence, and product contracts.
- Import icon components with the `Icon` suffix, using the library export or an explicit alias.
- Keep drawer shells, bordered collapsible sections, label/icon/control rows, Base UI/shadcn
  controls, footer action slots, masks, and accessibility behavior in `src/modules/shared`.
- Keep field inventories, icon choices, labels, placeholders/copy, RHF/Zod schemas and defaults,
  option catalogs, dependent rules, and submit intents in the owning domain module.
- Compose domain forms explicitly. Do not build a schema-driven universal renderer, multiply boolean
  props where an explicit variant or slot works, or create `packages/*` for web-only form reuse.
- Do not expose a creation or edit form until its mutation and authorization
  contract exists. Demonstrations belong in initiative-specific prototypes,
  not authenticated production routes.
- Use the shared `DatePicker` for real date fields. Keep the form value as a canonical
  `YYYY-MM-DD` date-only string assembled and parsed in local time; do not use native date inputs or
  masked date text fields.
- Do not invent catalogs, uploads, filters, or record relationships before the
  owning domain contract is accepted.
