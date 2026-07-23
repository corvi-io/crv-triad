# Studio Component System And Development Runtime

## Ownership And Dependency Model

Studio uses responsibility-based folders and direct imports. There is no workspace-wide component
barrel.

```text
src/routes/**                         route composition and guards
src/modules/{module}/**              module UI, contracts, query keys, repositories, adapters
src/modules/shared/components/ui/**  shadcn/Base UI primitives
src/modules/shared/components/
  data-display/**                    tables, metrics, structured read-only data
  feedback/**                        loading, empty, status, and failure communication
  forms/**                           domain-neutral form controls and composition shells
  layout/**                          page and module layout
  overlays/**                        drawers, dialogs, and overlay sections
src/modules/shared/design-system/**  component metadata and token guidance
src/dev/mock-engine/**               generic development-only memory/scenario mechanics
src/dev/sandbox/**                   neutral sandbox module, adapter, queries, and UI
src/dev/barbershop-setup/**          ENG-41 development-only related scenario adapter and seeds
```

Routes may import modules and shared code. Modules may import shared code. Shared code must not
import a product module or `src/dev`; the shell may use the existing narrow auth/session adapter. A
module must not import another module's internals. A module owns its repository/query/page
vocabulary; an adapter implements that port at the composition boundary. Multi-file components
expose their folder root. Direct folder imports preserve ownership and avoid hidden cycles.
`tests/unit/component-architecture.test.ts` enforces these rules.

Promote a component to shared only after at least two concrete Studio compositions need the same
domain-neutral behavior. Do not create `packages/ui` until another application proves stable reuse.

## Component Source Selection

Use this order before implementing any new component or primitive:

1. Reuse an existing Studio component when its documented contract fits.
2. Inspect and add an official shadcn/ui component through the CLI.
3. Evaluate a shadcn-compatible community registry item when the official catalog does not meet the
   accepted product need.
4. Create a custom component only when no suitable candidate exists and record the discovery
   evidence and rationale in the initiative or PR.

Use Bun-driven shadcn CLI commands and inspect candidates with `--dry-run`, `--view`, or `--diff`
before accepting source. For third-party registries, review source, dependencies, license,
maintenance, Base UI/Vite compatibility, bundle impact, keyboard and focus behavior, responsive
behavior, and token integration. Registry popularity does not replace review. The official shadcn
directory explicitly treats community registries as third-party source that consumers must inspect.

shadcn installs source into the repository. Accepted source therefore becomes Studio-owned code and
must follow the responsibility folders, token layers, accessibility requirements, tests, and
textual inventory in this document. Do not wrap or rename a suitable shadcn/Base UI primitive merely
to create a parallel local library. Do not publish a Triad registry until repeated cross-app reuse
creates a real distribution requirement.

Primary references:

- [shadcn CLI](https://ui.shadcn.com/docs/cli)
- [shadcn Registry Directory](https://ui.shadcn.com/docs/directory)
- [shadcn Registry documentation](https://ui.shadcn.com/docs/registry)

## Component Contribution Contract

Each shared component change must define its purpose, responsibility folder, smallest typed public
API, explicit variants or composition slots, visual/interaction states, token usage, keyboard and
focus behavior, responsive behavior, a textual inventory entry, and focused tests. Prefer children
and compound composition over render props or product-mode booleans. Keep one owner for each state
value and calculate derived values during render; Effects are reserved for external synchronization.

`docs/studio/component-system.md` is the canonical component catalog. Each active shared component
must have an exhaustive inventory entry that either documents its public contract or records why it
is internal-only. Public entries describe anatomy, slots, controlled state, tokens, accessibility,
supported states, good usage, bad usage, related components, and focused test coverage when those
details apply. The inventory test fails when a component source is missing from this document.

## Three-Layer Tokens

`src/index.css` is the token source of truth:

1. Primitive tokens (`--primitive-*`) hold raw color, spacing, type, radius, shadow, and duration
   anchors. They change rarely.
2. Semantic tokens (`--background`, `--primary`, `--muted`, `--ring`, and peers) assign meaning and
   are overridden by `.dark`.
3. Component tokens (`--workspace-*`, `--schedule-*`, and future responsibility-specific names)
   define component geometry and state using semantic or primitive references.

Tailwind CSS v4 consumes the semantic and component layers through `@theme inline`. Components use
Tailwind utilities backed by those variables. Add a raw value only when no suitable token exists;
record the new primitive and map it through meaning before component use.

`docs/studio/theme-system.md` preserves the accepted TRIAD navy/gold brand direction, contrast
requirements, effect boundaries, and migration rules. Treat visual handoffs as inputs to this token
architecture, not as drop-in global CSS or permission to apply a shadcn preset. Preserve explicit
light, dark, and system behavior unless an accepted initiative changes that contract.

## Documentation And Accessibility

Studio does not maintain a separate visual component catalog. Durable English text in this document
and `apps/studio/AGENTS.md` defines the contract; Brazilian Portuguese examples remain in tests and
the development-only sandbox. Component behavior is verified with focused Vitest component tests
and Playwright flows instead of an additional documentation runtime. The sandbox flow runs axe
against WCAG 2.0, 2.1, and 2.2 Level A/AA tags.

Automated axe checks cannot cover every WCAG 2.2 AA requirement. Before promoting a complex
component, manually check keyboard-only operation and focus return, VoiceOver basics, 200% zoom,
320 CSS-pixel reflow, reduced motion, visible/unobscured focus, target size, and light/dark contrast.
Record skipped checks and residual risk in the PR.

## Active Shared-Component Inventory

The inventory is exhaustive for `.tsx` files under `shared/components` on ENG-33. "Internal" means
intentionally unavailable as a standalone public component contract; it may still be a typed
building block of a documented composition.

| File | Classification | Catalog decision and rationale |
| --- | --- | --- |
| `data-display/filter-trigger.tsx` | Data display control | Documented public contract: compact icon-and-label trigger for bounded dropdown/popover filters, with optional active treatment and result/selection count; shared by Agenda and barbershop setup while the owning surface controls menu semantics. |
| `data-display/data-table/index.tsx` | Data display | Documented public contract: semantic table with controlled sort, body-only vertical/horizontal scrolling, overflow-aware scrollbar visibility, fixed sticky header/external pagination, and contextual row actions available by right-click or `Shift+F10`; covered by unit and browser table tests. |
| `data-display/metric-card.tsx` | Data display | Internal: inherited specialized composition using theme-aware feedback signal roles; promote to catalog when an accepted module supplies a real metric contract. |
| `deferred-route-screen.tsx` | Routing helper | Internal: lazy-route implementation detail, not a visual assembly API. |
| `feedback/empty-state.tsx` | Feedback | Documented public contract: default, optional action, long-content, and compact viewport states; heading and description remain semantic. |
| `feedback/page-status.tsx` | Feedback | Internal: full-route auth/loading implementation; exercised by route tests rather than isolated composition. |
| `feedback/status-badge.tsx` | Feedback | Documented public contract: neutral plus success, warning, info, and destructive semantic tones with explicit theme-aware backgrounds, foregrounds, and borders; accepts a final `className` override so an owning module can map a narrower accepted semantic role without forking the badge. Text remains required and carries meaning independently of color. |
| `forms/combobox-input.tsx` | Form control | Internal: inherited composite pending a real module option/free-text contract. |
| `forms/date-picker.tsx` | Form control | Internal: canonical date-only helper covered by form foundation tests; catalog when a real field consumes it. |
| `forms/date-range-selector.tsx` | Form control | Internal: inherited high-complexity selector without an accepted active module contract. |
| `forms/filter-bar.tsx` | Form layout | Internal: structural wrapper documented through future composed filter flows. |
| `forms/form-controls.tsx` | Form controls | Internal: low-level select/switch/file/suffix building blocks documented through consuming forms. |
| `forms/form-layout.tsx` | Form layout | Internal: section and field anatomy used through explicit module forms. |
| `forms/masked-input.tsx` | Form control | Internal: display/canonical adapter covered by focused mask tests. |
| `forms/permission-group.tsx` | Form composition | Internal: no accepted active authorization editor in Studio. |
| `forms/quantity-unit-control.tsx` | Form composition | Internal: inherited composition without an active module-owned quantity contract. |
| `forms/rhf-form-fields.tsx` | Form adapters | Internal: React Hook Form adapters; discover through owning module forms, not as standalone UI. |
| `kibo-ui/kanban/index.tsx` | Vendor-derived composite | Internal legacy composite: retained for migration compatibility but no longer consumed by the accepted Agenda board. A future workflow must revalidate its DnD and accessibility contract before reuse. |
| `layout/module-layout.tsx` | Layout | Internal: structural fixed-head/scroll-body shell exercised through composed pages. |
| `layout/module-tabs.tsx` | Layout/navigation | Internal: requires router context and module-owned tab metadata. |
| `layout/page-header.tsx` | Layout | Internal: composed by module pages; actions remain module owned. |
| `layout/section-header.tsx` | Layout | Internal: small structural helper documented through page compositions. |
| `overlays/action-drawer.tsx` | Overlay | Documented public contract: focus-managed form composition with explicit primary and secondary action slots plus Base UI open-change completion notification for consumers that retain content through full-width entry/exit slide transitions; reduced motion removes the transition. |
| `overlays/confirmation-dialog.tsx` | Overlay | Documented public contract: Base UI focus-managed confirmation with explicit title/description, configurable Portuguese action labels, and default or destructive confirmation treatment; covered by consuming form and prototype flows. |
| `overlays/drawer-section.tsx` | Overlay anatomy | Internal: companion anatomy for `ActionDrawer`, not a standalone surface. |
| `overlays/drawer-tabs.tsx` | Overlay anatomy | Internal: companion tab anatomy requiring a composed drawer. |
| `reference-creation-page.tsx` | Legacy page helper | Internal: retained only for migration compatibility; do not use for new generic CRUD pages. |
| `workspace-overview/index.tsx` | Shell content | Internal: authenticated shell overview composition, covered by route/shell tests. |
| `workspace-shell/breadcrumbs.tsx` | Shell companion | Internal: route-aware breadcrumb implementation private to the shell folder. |
| `workspace-shell/content.tsx` | Shell companion | Internal: content inset implementation private to the shell folder. |
| `workspace-shell/header.tsx` | Shell companion | Internal: header/sidebar trigger implementation private to the shell folder. |
| `workspace-shell/index.tsx` | Shell layout | Internal catalog: folder-root `WorkspaceShell` and `WorkspacePreviewShell` are exercised by route, shell, and sandbox tests. |
| `workspace-shell/sidebar-primary-navigation.tsx` | Shell companion | Internal: registry-driven primary navigation private to the shell folder; active state uses shared selected surface/text plus a 2px logical leading indicator instead of a complete outline, preserving collapse/mobile geometry and semantic focus. |
| `workspace-shell/sidebar-secondary-navigation.tsx` | Shell companion | Internal: registry-driven secondary navigation private to the shell folder. |
| `workspace-shell/sidebar-user-menu.tsx` | Shell companion | Internal: session/sign-out composition private to the shell folder. |
| `workspace-shell/sidebar.tsx` | Shell companion | Internal: sidebar assembly private to the shell folder. |
| `workspace-shell/workspace-brand.tsx` | Shell companion | Internal: Studio brand composition private to the shell folder. |
| `ui/avatar.tsx` | Primitive | Internal: Base UI/shadcn building block, documented through shell composition. |
| `ui/breadcrumb.tsx` | Primitive | Internal: building block documented through workspace breadcrumbs. |
| `ui/button.tsx` | Primitive | Documented public contract: explicit variants, disabled/loading states, stable long labels, and keyboard activation. Agenda adds quiet `filter` and brand-selected `filter-active` variants for menu/popover triggers; state remains textual and exposed through the owning primitive. |
| `ui/calendar.tsx` | Primitive | Internal: implementation detail of the shared date picker. |
| `ui/card.tsx` | Primitive | Internal: structural primitive documented through consuming composites. |
| `ui/collapsible.tsx` | Primitive | Internal: implementation detail of drawer/form sections. |
| `ui/dropdown-menu.tsx` | Primitive | Internal: implementation detail of menus and table controls. |
| `ui/field.tsx` | Primitive | Internal: form anatomy documented through explicit module forms. |
| `ui/input.tsx` | Primitive | Internal: cataloged through drawer/form compositions. |
| `ui/input-group.tsx` | Primitive composition | Documented public contract: official shadcn-style grouped input with leading/trailing addons and a single focus boundary; Agenda uses it for global and in-menu search. |
| `ui/label.tsx` | Primitive | Internal: cataloged with its associated form controls. |
| `ui/pagination.tsx` | Primitive | Internal: lower-level anatomy cataloged through `DataTable`. |
| `ui/popover.tsx` | Primitive | Internal: implementation detail of date/combobox controls. |
| `ui/scroll-area.tsx` | Primitive | Internal: scroll wrapper documented through table, drawer, and module layouts; consumers may request overflow-measured scrollbar mounting when an idle painted track would misrepresent scrollability. |
| `ui/select.tsx` | Primitive | Internal: cataloged through composed sandbox/filter forms. |
| `ui/separator.tsx` | Primitive | Internal: non-interactive structural primitive. |
| `ui/sheet.tsx` | Primitive | Internal: implementation detail of `ActionDrawer` and mobile sidebar. |
| `ui/sidebar.tsx` | Primitive | Internal: shell-specific primitive; consume only through `workspace-shell`. |
| `ui/skeleton.tsx` | Primitive | Internal: loading anatomy documented through consuming states. |
| `ui/sonner.tsx` | Feedback primitive | Internal: root-mounted provider, not a standalone component contract. |
| `ui/switch.tsx` | Primitive | Internal: catalog through accepted explicit forms. |
| `ui/textarea.tsx` | Primitive | Internal: cataloged through drawer/form compositions. |
| `ui/tooltip.tsx` | Primitive | Internal: accessible-description helper used by shell/action controls. |
| `ui/toggle-group.tsx` | Primitive composition | Documented public contract: Base UI controlled single/multiple selection composition; Agenda uses one controlled selection for the `Lista`/`Quadro` icon toggle. |
| `ui/toggle.tsx` | Primitive | Internal companion to `ToggleGroup`; the `brand` variant exposes selected state with semantic brand tokens and visible `aria-pressed` state. |
| `ui/tri-state-toggle.tsx` | Primitive | Internal: only for an accepted tri-state group composition. |

## Development Runtime And Replaceable Adapter

`MemoryScenarioEngine<T>` supplies cloned typed collections, deterministic IDs, scenario selection,
reset, bounded 0–2000 ms latency, and one-shot/persistent failure control. It knows only that records
have IDs. The sandbox owns `SandboxRecord`, bounded query/page types, query keys, its repository port,
and `SandboxMemoryRepository`. Presentation uses repository context and TanStack Query; it never
imports the adapter or engine.

A future module must define its own port and may compose an Orval/HTTP adapter that implements it.
Queries and presentation remain unchanged while network vocabulary, authorization, and validation
stay with that accepted module. The local larger scenario validates UX only, not production capacity.

The sandbox is `/workspace-preview/sandbox` in a development server. A Vite build-time alias resolves
to the sandbox loader only while serving development; production resolves the same virtual module to
a null shim. The route graph therefore has no direct `src/dev` import and redirects to `/login` when
the loader is unavailable. Production-boundary checks scan output for mock engine, seed, Faker,
obsolete catalog source, and control markers. The runtime contains no fetch, MSW, Better Auth, or
`/api/auth` interception and stores nothing across refreshes.

The ENG-41 barbershop setup module follows the same replaceable-adapter boundary while keeping its
presentation contracts, query keys, forms, and UI under `src/modules/barbershop-setup`. One
development adapter coordinates its related catalog and availability records through the generic
engine. `virtual:studio-barbershop-setup-source` resolves to memory for configured `local`/`dev`
targets and to a disabled source for `hml`/`prd`. The authenticated `/barbershop-setup` route exposes
no ordinary scenario or reset controls. See `docs/studio/barbershop-setup.md` for its source,
test-infrastructure, privacy, and production-exclusion contract.

The ENG-44 client-management module uses the same replaceable boundary without changing a shared
component contract. Presentation and repository vocabulary live under `src/modules/clients`;
deterministic scenarios and the session-memory adapter live under `src/dev/clients`.
`virtual:studio-client-management-source` resolves to memory only for configured `local`/`dev` and
to a disabled shim for `hml`/`prd`. It composes the existing table, drawer, tabs, confirmation,
mask, form, status, and feedback contracts. See `docs/studio/client-management.md`.

## Primary Vendor References

- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Vitest](https://vitest.dev/guide/)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
