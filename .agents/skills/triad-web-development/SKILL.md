---
name: triad-web-development
description: Build or refactor the Triad authenticated React frontend in apps/web using Vite, TanStack Router, TanStack Query, Better Auth browser client, Orval-generated API clients, Tailwind CSS v4, shadcn/ui Base UI primitives, Vitest, Playwright, and Triad app boundaries. Use for apps/web routes, auth UI, private layouts, generated API client wiring, theme support, tests, docs, or web deployment changes.
---

# Triad Web Development

Use this skill for `apps/web/**`. Follow root `AGENTS.md` and `apps/web/AGENTS.md`.

## Boundaries

- `apps/web` owns authenticated internal browser UI.
- `apps/idp` owns authentication, sessions, invitations, and access policy.
- `apps/api` owns business APIs. Generate API clients from a committed local
  `apps/api` OpenAPI spec; do not generate Better Auth or broad IDP clients.
- Keep UI copy in Brazilian Portuguese. Keep code, routes, filenames, and docs in English.
- Do not add shared packages until reuse across apps is real and stable.

## Implementation

- Use TanStack Router file routes under `src/routes`.
- Use folder-based route leaves: `src/routes/{route}/index.tsx` for route
  screens, `src/routes/{route}/route.tsx` only for layouts with nested
  children, `src/routes/index.tsx` for `/`, and `src/routes/__root.tsx` for the
  TanStack root route.
- Put shared private routes under the pathless `src/routes/_authenticated`
  group. The group route should own `AuthGate` and `WorkspaceShell`; child
  routes should render only their page content.
- Guard private routes with explicit loading states and redirects; avoid
  unauthenticated content flicker.
- Use `/overview` as the default authenticated destination. Keep `/profile` as a
  private account/profile route, not as the workspace home.
- Use the narrow Better Auth React client under `src/modules/auth/services` for
  the configured IDP `/api/auth/*` origin. Support email/password sign-in and
  invite-gated account creation; do not expose public self-registration.
- Administrative identity screens may call Triad-owned IDP management routes
  directly with credentialed requests. Keep these clients narrow and manual
  under the owning feature module; do not generate broad IDP clients or proxy
  identity administration through `apps/api`.
- Read `import.meta.env` only in `src/modules/shared/config/env.ts`.
- Map target-specific deployed Vite URLs from uppercase GitHub Environment
  sources (`WEB__VITE_AUTH_BASE_URL` and `WEB__VITE_API_BASE_URL`) declared in
  root `env-schema.yaml`; keep constants in app defaults and local `.env.example`
  names runtime-shaped.
- Keep local and deployed auth/API routing equivalent: use absolute
  browser-visible `VITE_AUTH_BASE_URL` and `VITE_API_BASE_URL` values; do not
  rely on Vite proxying or Cloudflare Pages Functions.
- Preserve local development ports: web `3000`, site `3001`, API `8000`, and
  IDP `8001`.
- Keep generated Orval output under `src/modules/shared/api/generated/**`; never
  edit generated files manually.
- Keep manual API fetch code under `src/modules/shared/api/mutator/**`.
- Put shadcn/Base UI primitives under `src/modules/shared/components/ui`.
- Import icon components with the `Icon` suffix. Prefer the library's suffixed
  export and use an explicit `as ...Icon` alias only when a suffixed export is
  unavailable.
- Keep CRV Triad Workspace shell, overview, breadcrumbs, notification/search
  placeholders, and the frontend module registry under `src/modules/shared`;
  `workspace` is the authenticated app shell, not a feature module.
- Keep the foundation domain-neutral. Do not restore inherited business routes,
  catalogs, fixtures, placeholder mutations, or navigation entries. Introduce
  a business domain only through an accepted initiative with explicit API,
  authorization, persistence, and product contracts.
- When a component is split into multiple companion files, put the files in a
  dedicated component folder with an `index.tsx` public entrypoint. Prefer
  domain-specific composition names such as `workspace-shell/sidebar-user-menu`
  over generic loose files like `app-sidebar`, `nav-main`, or `nav-user`.
- Drive workspace navigation, overview shortcuts, breadcrumbs, and future
  command/search metadata from `src/modules/shared/workspace/module-registry.ts`.
  Treat the registry as UI metadata only, never as authorization.
- Reserve notification and command/search shell surfaces without fake unread
  counts, fake data, polling, WebSocket behavior, persistence, or backend
  contracts.
- Use the shared `ModuleLayout` for module pages that need a fixed `head` and
  scrollable body content. It owns the Lina-based `ScrollArea`; avoid adding
  route-local body scroll wrappers for module screens.
- Put page-level create buttons and secondary page commands in
  `PageHeader.actions`. Do not add fake or disabled creation buttons before the
  backing route, mutation, or product flow exists.
- Use `DataTableCell` fallback behavior for missing table values. Table columns
  with no value render `-`, not feature-specific empty phrases.
- Do not add dedicated `Ações` columns to data tables. Row-level contextual
  actions should be exposed through the right-click context menu while primary
  navigation and inline editable values remain visible in their own columns.
  Use shared table action helpers and icons for every menu option. Prefer clear
  verb labels such as `Visualizar` over feature-specific implementation labels.
- Use shared sortable table headers for ordered columns. Sorting should cycle
  through ascending, descending, and no sorting, and paginated lists should send
  sort state to the API instead of sorting only the current browser page.
- Filters, search, and sort controls for paginated or potentially large lists
  must be backed by API query parameters. Keep UI control state locally, but do
  not filter only the currently loaded page in the browser. Persist shareable
  list state such as filters, search, sorting, pagination, and view mode in URL
  query parameters when it is useful for collaboration or handoff.
- Use `DataTablePagination` for offset/page-number pagination in administrative
  tables. It should show the page-size selector on the left as
  `Registros por página`, then the page summary and navigation on the right as
  `Página X de Y`, `Anterior`, numbered page buttons, and `Próxima`. Do not add
  a redundant direct page jump field in the default footer. Numbered buttons
  should show `[1] [2] [3] [4] [5] ... [last]` near the beginning, `[1] ...
  [current-1] [current] [current+1] ... [last]` in the middle, and `[1] ...
  [last-4] [last-3] [last-2] [last-1] [last]` near the end. Keep cursor-based
  pagination as a separate component and API contract instead of hiding it
  behind the numbered table paginator.
- Use `ActionDrawer` for dense filter sets that combine search, multiple
  selectable groups, or future advanced options. Keep the trigger in
  `PageHeader.actions`; do not compress complex filters into dropdown menus.
  If filter changes already update API query parameters, apply them immediately
  and do not add an `Aplicar filtros` button unless the drawer owns unapplied
  draft filter state. When a large list does not yet have a dedicated facets
  endpoint, allow manually typed filter values in addition to visible selectable
  values; do not load unbounded records just to discover filter options.
- Use the shared `ActionDrawer` for right-side page action forms. It owns the
  fixed header, Lina-based scrollable body, and fixed footer action area; keep
  form fields domain-specific instead of creating feature-local drawer shells.
  Pass the main command through `primaryAction` so it renders on the right, and
  pass cancel, clear, remove, or other secondary commands through
  `secondaryActions` so they render on the left.
  Drawer headers must show one contextual line where the location is secondary
  and the action is primary, for example `Itens / Novo item`, so users can
  immediately understand where they are and what action is open.
- Drawers used for record visualization may share the same width as creation or
  edit drawers and should prefer simple tabs for separated concerns such as
  summary, operation, and activity history. If the record can be edited from the
  same surface, keep view and edit as explicit modes in the drawer footer: edit
  or cancel actions on the left and the primary save or qualification action on
  the right.
- For form drawers, keep the shell, bordered/rounded initially-open disclosure
  sections, label/icon/control rows, Base UI/shadcn controls, footer action
  slots, masks, and accessibility behavior in `src/modules/shared`. Reuse
  `FormSection`/`CollapsibleDrawerSection`; do not create feature-local section
  shells. Non-form drawers may use `DrawerTabs*` through `ActionDrawer.tabs`
  and `DrawerSection`/`DrawerItem` for simpler content structure.
- Use shared input masks from `src/modules/shared/components/masked-input.tsx`
  and `src/modules/shared/lib/input-masks.ts`. Do not implement feature-local
  phone, document, currency, or registration mask logic inside individual forms.
- Use the shared shadcn `DatePicker` composition for every real date field. Keep
  its canonical form value as `YYYY-MM-DD`, parse and format it in local time to
  avoid timezone drift, and do not substitute a native date input or masked text
  input. Year/model values are not dates.
- Use shared combobox-style inputs when a form field can select an existing
  record or create a new one by typing. Keep the free-text value as the form
  value unless the API contract explicitly requires an ID.
- Build domain forms with React Hook Form and Zod in the owning module. Export a
  fresh default-value factory, typed values, and a schema with Brazilian
  Portuguese messages. Keep field inventory, icon choices, labels,
  placeholders/copy, option catalogs, dependent-field clearing rules, and
  submit intents out of shared controls.
- Compose domain forms explicitly instead of building a schema/JSON-driven
  universal renderer. Prefer explicit variants and slots over boolean-prop
  proliferation, and do not create `packages/*` for web-only form reuse.
- Do not expose creation or edit forms without real mutation and authorization
  contracts. Keep initiative-specific prototypes outside authenticated
  production routes and do not invent catalogs, uploads, or persistence.
- Treat shared mask values as canonical strings and display formatting as a
  separate concern. Keep completeness, impossible-date, range, checksum, and
  business validation in Zod/domain helpers, and wait for accepted API contracts
  before adding payload adapters.
- For non-auth forms, use application-controlled validation instead of native
  HTML validation: add `noValidate`, store validation errors in state, render
  field-level `FieldError` reasons, set `aria-invalid`/`aria-describedby`, focus
  the first invalid field after submission, and mark required labels with
  `FieldLabel required`. Authentication forms are exempt from the required-label
  marker rule.
- Keep default system inputs and buttons at 40px height (`h-10`). When an
  accepted dense form specification requires it, use an explicit compact form
  composition/variant (for example 32px fields and 36px footer actions) without
  shrinking the global defaults.
- Ensure clickable controls and interactive role-based primitives show
  `cursor: pointer` by default. Disabled and `aria-disabled` controls should not
  use the pointer affordance because they are not actionable.
- Use the shared Sonner `Toaster` mounted at the root route for transient
  feedback. Show toasts for completed or failed user-triggered actions such as
  saving, copying contact data, claiming/releasing records, or changing
  qualification. Keep toast copy short and in Brazilian Portuguese.
- Prefer composition over boolean prop proliferation. Use explicit variants or
  provider-backed composition when behavior diverges.
- Keep button labels stable while loading. Do not change labels to gerund copy
  such as `Enviando...`, `Salvando...`, or `Abrindo...`; use the shared
  `Button` `isLoading` state for spinner and `aria-busy`.

## Performance And Scalability

- Check client bundle impact, route-level loading behavior, TanStack Query cache
  behavior, duplicate network calls, unnecessary rerenders, and auth/session
  gating on critical routes.
- Do not add polling, WebSocket behavior, persistence, or background refreshes
  without an explicit product need and a bounded load model.
- Do not claim supported concurrent users or browser workload capacity unless
  measured or clearly estimated with explicit assumptions.

## Validation

Prefer these focused checks before handoff:

```bash
bun --filter web clients:generate
bun --filter web routes:generate
bun --filter web format
bun --filter web lint
bun --filter web typecheck
bun --filter web test
bun --filter web build
bun --filter web check
```

Run `bun --filter web test:e2e` when Playwright browser setup is available or
the change touches critical route/auth behavior.

## Documentation

Update `apps/web/README.md`, `apps/web/AGENTS.md`, and `docs/web/**` when
runtime behavior, app structure, env, testing, deployment, or conventions change.
Update root CI/CD docs and `env-schema.yaml` when deployment wiring changes.
