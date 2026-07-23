# Studio Agent Instructions

- Follow root `AGENTS.md`.
- Keep user-facing UI copy in Brazilian Portuguese.
- Use TanStack Router file routes under `src/routes`.
- Keep private routes under `src/routes/_authenticated`.
- Keep Better Auth browser client code under `src/modules/auth/services`.
- Keep Studio identity integration limited to authentication, session,
  invite-gated account creation, password reset, and sign-out. Do not add
  identity-administration routes or service clients.
- Read `import.meta.env` only in `src/modules/shared/config/env.ts`.
- Keep shadcn/Base UI primitives under `src/modules/shared/components/ui`; group shared composites
  by responsibility under `data-display`, `feedback`, `forms`, `layout`, or `overlays`.
- Before creating a component, check existing Studio components first, then the official shadcn/ui
  catalog, then reviewed shadcn-compatible community registries. Create custom UI only when no
  suitable candidate exists and record the discovery evidence and rationale.
- Inspect registry items before installation using shadcn CLI dry-run/view/diff capabilities. Review
  source, dependencies, license, maintenance, Base UI/Vite compatibility, bundle impact,
  accessibility, responsive behavior, and token integration; popularity is not approval.
- Add accepted shadcn components with Bun-driven CLI commands and adapt the copied source to Studio
  ownership, tokens, folder boundaries, Brazilian Portuguese copy, tests, and textual inventory.
- Do not duplicate a suitable shadcn/Base UI primitive or create a parallel Studio component library.
- Translate designer palettes and theme handoffs into the existing primitive, semantic, and
  component token layers in `src/index.css`; never paste a handoff over the global stylesheet or
  apply a shadcn preset without a separate accepted migration decision.
- Preserve light, dark, and system behavior, validate browser-computed contrast, and keep status
  meaning independent from color. Use brand gradients only through named tokens on explicitly
  accepted bounded surfaces. Follow `docs/studio/theme-system.md` for the TRIAD navy/gold direction.
- Import shared components from their owning file/folder. Do not add a shared mega-barrel.
- Build product-list searches with the shared compact `ListSearchField` and list filters with the
  shared single/multi-select filter compositions. Keep raw `Select` for data-entry selection in
  forms, not list filtering.
- Document every active shared component in the exhaustive textual inventory at
  `docs/studio/component-system.md`, including its public contract or an internal-only rationale.
- Keep component documentation in English Markdown and verify behavior with focused Vitest
  component tests and Playwright flows. Do not add a separate component-catalog runtime.
- Keep generic development memory/scenario mechanics under `src/dev/mock-engine` and sandbox-owned
  contracts/adapters under `src/dev/sandbox`. Production code must not import `src/dev` directly.
- Module presentation consumes a module-owned repository port through TanStack Query; compose memory
  or HTTP adapters at the boundary and invalidate only related query keys.
- Keep the product foundation domain-neutral. Do not restore inherited business
  routes, catalogs, fixtures, placeholder mutations, or navigation entries.
- Add a business domain only from an accepted initiative. Production-capable domain forms and
  mutations require explicit API, authorization, persistence, and product contracts.
- An explicitly accepted initiative may integrate a product-realistic evaluation module into the
  authenticated shell for `local`/`dev` with a deterministic memory source. This exception requires
  explicit source configuration, a fail-closed disabled source in `hml`/`prd`, no persistence,
  HTTP, or IDP behavior, no ordinary preview/debug chrome, and a replaceable module-owned repository
  port with production-boundary tests and durable documentation. It supports product criticism; it
  is not a production contract or permission to add an arbitrary domain.
- Import icon components with the `Icon` suffix, using the library export or an explicit alias.
- Keep drawer shells, bordered collapsible sections, label/icon/control rows, Base UI/shadcn
  controls, footer action slots, masks, and accessibility behavior in `src/modules/shared`.
- Keep the `ModuleLayout` scroll viewport free of implicit vertical spacing and bottom padding.
  Content owners add explicit gaps or inset where their composition requires it; table/list modules
  should end at their own table or pagination boundary.
- Keep field inventories, icon choices, labels, placeholders/copy, RHF/Zod schemas and defaults,
  option catalogs, dependent rules, and submit intents in the owning domain module.
- Compose domain forms explicitly. Do not build a schema-driven universal renderer, multiply boolean
  props where an explicit variant or slot works, or create `packages/*` for Studio-only form reuse.
- Do not expose a creation or edit form in `hml`/`prd` until its mutation and authorization contract
  exists. The governed `local`/`dev` evaluation exception above may exercise memory-backed forms in
  the authenticated shell only within its accepted initiative and source boundary.
- Treat the neutral development sandbox as UX/test tooling, never as a product domain or capacity
  claim. It must not intercept Better Auth and must redirect or be eliminated in production.
- Use the shared `DatePicker` for real date fields. Keep the form value as a canonical
  `YYYY-MM-DD` date-only string assembled and parsed in local time; do not use native date inputs or
  masked date text fields.
- Do not invent catalogs, uploads, filters, or record relationships before the
  owning domain contract is accepted.
