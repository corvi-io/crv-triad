# 07 TRIAD Studio Barbershop Setup Visual Prototype

## Summary

Create a frontend-only TRIAD Studio prototype for configuring the operational
foundation of a barbershop: business overview, units, professionals, services,
and weekly availability. The initiative exists to validate information
architecture, forms, relationships, dense management views, and presentation
quality before accepting any business API, persistence, tenancy, or
authorization contract.

The prototype uses deterministic synthetic data through the existing Studio
development runtime. Reviewers can switch between representative scenarios,
mutate data in memory, simulate latency and failures, and restore the active
scenario repeatedly. No prototype record crosses a network boundary or remains
after refresh/reset.

## Context

- Current state:
  - The Studio foundation, component system, theme, authentication lifecycle,
    and Agenda visual prototype are complete.
  - `/workspace-preview/sandbox` demonstrates deterministic CRUD, search,
    filtering, sorting, pagination, latency, failures, and reset.
  - `/workspace-preview/agenda` demonstrates a domain-owned repository port and
    scenarios composed over the generic `MemoryScenarioEngine`.
  - The Agenda already presents synthetic units, professionals, services,
    prices, durations, eligibility, working periods, and blocked periods, but
    those values cannot be managed through dedicated setup screens.
- Problem:
  - Product decisions about setup order, catalog relationships, form density,
    availability editing, empty states, and management navigation remain
    unvalidated.
  - Creating a backend now would turn presentation-oriented fixture shapes into
    premature database and API contracts.
  - Static mockups would not validate keyboard behavior, focus, form errors,
    dependent fields, failure recovery, dense lists, or repeated mutations.
- Why now:
  - Authentication and the Agenda presentation are available, so operational
    setup is the next missing Studio workflow needed to explain where Agenda
    professionals, services, units, and availability come from.
  - A resettable interactive prototype lets product review the flow repeatedly
    before tenancy and scheduling persistence are designed.
- Related sources:
  - [Linear initiative: TRIAD Studio Barbershop Setup Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-barbershop-setup-visual-prototype-d02965c61df9)
  - [Linear issue: ENG-41](https://linear.app/corvi-io/issue/ENG-41/build-the-triad-studio-barbershop-setup-visual-prototype)
  - `docs/initiatives/prds/02-triad-studio-component-system-and-mock-runtime.md`
  - `docs/initiatives/prds/03-triad-studio-schedule-visual-prototype.md`
  - `docs/initiatives/prds/06-triad-studio-agenda-kanban-visual-prototype.md`
  - `docs/studio/component-system.md`
  - `docs/studio/schedule-prototype.md`
  - [Booksy staff setup](https://support.booksy.com/hc/pt-br/articles/16536054878354-Como-fa%C3%A7o-para-adicionar-um-funcion%C3%A1rio)
  - [Booksy services setup](https://support.booksy.com/hc/pt-br/articles/16538347706386-Como-fa%C3%A7o-para-configurar-os-meus-servi%C3%A7os)
  - [Booksy working hours](https://support.booksy.com/hc/pt-br/articles/16536020166546-Como-fa%C3%A7o-para-ajustar-o-hor%C3%A1rio-de-trabalho-dos-funcion%C3%A1rios)
  - [Square services and staff setup](https://squareup.com/help/us/en/topic/services-and-staff-setup)

## Goals

- Validate a coherent setup hub with overview, units, professionals, services,
  and availability sections.
- Validate create, inspect, edit, archive/restore, relationship, validation, and
  failure-recovery interactions using in-memory mutations only.
- Preload deterministic synthetic data that represents normal, incomplete,
  empty, multi-unit, dense, conflicting, slow, and failing conditions.
- Let reviewers select a scenario, make changes, reset the active scenario, and
  repeat the same presentation without stale state leaking between scenarios.
- Reuse the existing Studio shell, form/drawer/table compositions, theme tokens,
  accessibility conventions, TanStack Query boundary, and development-only
  `MemoryScenarioEngine`.
- Keep module contracts explicitly presentation-facing and replaceable by a
  future accepted HTTP adapter without treating them as API/database designs.
- Keep every prototype route and fixture unavailable in `hml` and `prd`
  artifacts through the existing preview-loader and production-boundary model.

## Non-Goals

- Business API routes, OpenAPI, HTTP adapters, database tables, migrations,
  server persistence, background jobs, realtime, or deployment changes.
- Better Auth Organization Plugin, tenancy, organization membership, business
  permissions, unit-scoped authorization, or IDP schema/route changes.
- A production onboarding flow or a production-enabled settings route.
- Browser persistence through local storage, IndexedDB, cookies, service
  workers, or cross-tab synchronization.
- Customer management, appointments, public booking, queue/service fulfillment,
  payments, commissions, cash closing, reporting, inventory, or notifications.
- Real people, businesses, addresses, phone numbers, photos, documents, or
  operational data.
- Treating frontend IDs, types, validation rules, relationships, or scenario
  sizes as future backend contracts or capacity evidence.
- Uploading real logos/portraits or integrating maps, address lookup, messaging,
  payments, calendars, or other external providers.

## Brainstorm

### Problem Framing

- The affected user is an owner, manager, or receptionist preparing the Studio
  before the first real day of Agenda operation.
- The workflow to validate is: understand setup progress, configure the
  business/unit presentation, add professionals, define services, connect the
  catalogs, configure working hours and exceptions, then understand whether the
  setup is ready for scheduling.
- The deliverable is a presentation-quality interactive prototype. It is not a
  business system and does not authorize backend implementation decisions.

### Market And Existing-Product Signals

- Current appointment products commonly connect staff profiles with offered
  services, working hours, time off, permissions, and optional account access.
- Service catalogs commonly include name, category, duration, price, location
  availability, and eligible staff.
- Staff availability commonly begins with business hours and supports breaks
  and time-off exceptions.
- TRIAD should prototype these visible relationships while deferring billing,
  online-booking policies, permission matrices, and persistent business rules.

### Gaps And Unknowns

- Product gaps:
  - Final names and grouping for setup navigation require visual validation.
  - The exact boundary between an initial guided checklist and ongoing settings
    management is not yet proven.
  - The minimum professional and service fields must be validated without
    implying payroll, tax, commission, or public-marketplace scope.
- Technical gaps:
  - One scenario must coordinate several related collections while preserving
    atomic reset and rollback behavior.
  - Availability editing needs an accessible non-drag interaction that remains
    usable on narrow screens and with long schedules.
  - Preview-only module loading must keep domain fixtures and controls out of
    production artifacts.
- Data/model gaps:
  - Unit, professional, service, and availability records are UI-facing view
    models only; tenancy keys, normalization, uniqueness, effective dating,
    soft deletion, and referential integrity remain future backend decisions.
  - A professional may eventually be linked to an IDP user, but this prototype
    represents only whether account access appears connected, invited, or not
    configured. It performs no identity mutation.
- Operational gaps:
  - There is no production telemetry, persistence, recovery, migration, or
    support contract because no production behavior is introduced.

### Counterpoints

- Building real onboarding and catalogs now could make the result appear more
  complete, but it would force tenancy, roles, authorization, and persistence
  decisions before the screens are accepted.
- A static design file would be faster for appearance, but it would not validate
  forms, relationships, focus, destructive confirmations, reset, errors, or
  responsive density.
- One universal JSON-driven CRUD renderer could reduce code, but it would hide
  the different responsibilities of units, professionals, services, and
  availability and create an API before the product is understood.
- A single giant wizard could optimize first use while making later maintenance
  awkward. A setup hub with a progress overview and reusable management
  sections validates both initial and ongoing flows with less duplication.
- Adding customers and appointments would tell a fuller story, but the Agenda
  already validates appointment presentation. This initiative should isolate
  the setup catalogs that precede it.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Produce static setup mockups only | Fastest visual output | Cannot validate interaction, reset, errors, accessibility, or dense states | Do not choose |
| B | Build a resettable development-only setup hub backed by deterministic in-memory scenarios | Reuses current Studio architecture and supports repeated product review without backend commitments | Requires bounded module contracts, fixture relationships, and production-boundary tests | Recommended |
| C | Build production setup APIs and screens together | Creates durable behavior immediately | Premature tenancy, authorization, API, and persistence decisions | Revisit after prototype acceptance |
| D | Build a generic multi-domain admin/CRUD platform | Could support future catalogs | High abstraction and maintenance cost before stable reuse exists | Do not choose |

### Recommendation

Choose Option B.

Create a development-only `/workspace-preview/barbershop-setup` surface using
`WorkspacePreviewShell`. Use one URL-backed `section` value for `overview`,
`units`, `professionals`, `services`, and `availability`, plus one URL-backed
`scenario` value for reproducible review links. Global search/filter state may
be URL-backed when useful, but no synthetic name, phone, address, or notes value
may enter the URL.

Create a `barbershop-setup` Studio module with presentation-facing contracts,
query keys, a repository port, TanStack Query hooks, and explicit UI
composition. Implement the development adapter under `src/dev` using the
generic `MemoryScenarioEngine`; the product module must not import the adapter
or engine directly. A build-time loader composes the adapter only for local/dev
preview and resolves to the existing null behavior elsewhere.

Use an overview/checklist as the entry point, then reusable management sections
rather than a one-time-only wizard. Use existing `ModuleLayout`, `PageHeader`,
`DataTable`, `ActionDrawer`, form sections, confirmation dialogs, masks, status
badges, and feedback components where their contracts fit. Inspect official
shadcn components before adding a missing primitive and record why any custom
composition is necessary.

## Prototype Experience Contract

### Navigation And Sections

- `Visão geral` summarizes synthetic setup completion, incomplete items, and
  direct next actions without claiming production readiness.
- `Unidades` validates list, detail, create, edit, archive/restore, business
  hours, address presentation, and empty/dense states.
- `Profissionais` validates profile presentation, assigned units, offered
  services, availability summary, active/inactive state, and a visual-only
  account-access status.
- `Serviços` validates category, name, description, duration, price,
  unit availability, eligible professionals, active/inactive state, and
  dependencies that prevent unsafe archive actions.
- `Disponibilidade` validates weekly schedules per unit/professional, breaks,
  time off, closed days, copy-to-days behavior, overlaps, and explicit conflict
  feedback without drag as the only interaction.

### Deterministic Scenario Contract

The prototype includes at least these selectable scenarios:

| Scenario | Purpose |
| --- | --- |
| `new-business` | Empty first-use state and guided next action |
| `incomplete-setup` | Missing relationships and a partially completed overview |
| `single-unit` | Normal small operation with complete linked catalogs |
| `multi-unit` | Professionals and services distributed across multiple units |
| `dense-catalogs` | Long names and bounded larger lists for table/filter/form stress |
| `availability-conflicts` | Overlaps, closed periods, breaks, time off, and invalid dependencies |
| `slow` | Deterministic bounded latency with loading/skeleton behavior |
| `next-failure` | Exactly one failed mutation followed by recovery |
| `persistent-error` | Repeatable list/load failure until scenario switch or reset |

- Scenario selection restores that scenario's canonical seed before presenting
  it; prior mutations never leak into another scenario.
- `Restaurar cenário` resets all related collections, pending failure controls,
  active drawers/dialogs, form drafts, and module query state atomically.
- Refresh may reconstruct the selected scenario from its URL ID, but mutated
  record data is never persisted.
- Normal fixtures remain presentation-sized. Dense fixtures stress UX only and
  are not backend capacity claims.

### Mutation And Relationship Contract

- Create/edit/archive/restore actions mutate only the active in-memory adapter.
- IDs are deterministic and synthetic. UI-generated records use the generic
  engine's deterministic sequence.
- Mutations validate visible dependencies and return stable prototype error
  categories without defining future server error codes.
- Optimistic updates must restore every affected collection and selection when
  the failure scenario rejects a mutation.
- Archiving a unit, professional, or service with visible dependencies requires
  an explicit safe outcome: block, request reassignment, or demonstrate the
  accepted presentation. It must never silently orphan a fixture.
- Scenario/reset controls are clearly marked as development presentation tools,
  not product settings.

## Architecture And Boundaries

- Site impact: none.
- API impact: none. No route, schema, client, OpenAPI contract, persistence, or
  business authorization is introduced.
- IDP impact: none. Authentication remains real where the existing preview
  shell uses it; no organization, membership, invitation, role, or user mutation
  is added.
- Studio impact:
  - add the preview route and `barbershop-setup` presentation module;
  - add module-owned UI contracts, repository port, query keys/hooks, forms,
    screens, and feedback;
  - compose deterministic scenarios through a development-only adapter;
  - reuse shared components and update their inventory only when a public
    contract genuinely changes.
- Data/persistence impact: session-memory-only synthetic collections. No local
  storage, IndexedDB, cookie, API, database, or cross-tab persistence.
- External provider impact: none.
- Deployment impact: no new runtime source is expected. The preview must follow
  the current local/dev loader and production-null boundary; `hml` and `prd`
  remain unavailable.

## Performance And Scalability

- Expected data growth is bounded to deterministic preview fixtures.
- Critical browser paths are scenario switch/reset, section navigation, table
  filtering/sorting/pagination, opening forms, dependent selectors, and weekly
  availability editing.
- Dense lists must use the existing bounded pagination/table behavior rather
  than render an unbounded catalog.
- Stale results from a slow scenario must not overwrite a newer scenario or a
  reset state.
- Related collection mutations must invalidate only the module-owned query
  keys needed to update the visible relationships.
- Fixture counts demonstrate layout and interaction only. A future backend
  initiative must separately define server query bounds, N+1 prevention,
  indexes, concurrency, and capacity.
- No polling, WebSocket, background refresh, upload, external request, or
  expensive image processing is introduced.

## Security, Privacy, And Abuse

- The preview does not change authentication, sessions, invitations, roles, or
  authorization.
- All people, businesses, addresses, contact values, images, and schedules are
  explicitly synthetic and deterministic.
- Use local generated placeholders/avatars; perform no external image requests.
- Do not place synthetic contact/address/note values in URLs, logs, analytics,
  screenshots labeled as real data, or browser persistence.
- The memory runtime must not intercept Better Auth or any API route.
- The production-boundary scan must reject fixture, scenario, reset-control,
  and mock-engine markers from production artifacts.
- Spam, rate limiting, and server-side abuse prevention do not apply because no
  network mutation exists; future APIs must define them independently.

## Accessibility And UX

- Section navigation, tables, menus, drawers, forms, dialogs, schedules, and
  reset controls are fully keyboard operable with visible, unobscured focus.
- Form validation uses Brazilian Portuguese field-level messages,
  `aria-invalid`, descriptions, a summary/live outcome where useful, and focus
  on the first invalid field after submission.
- Opening/closing a drawer or confirmation restores focus to the initiating
  control or affected row.
- Archive/reset operations require clear confirmation and announce success or
  rollback without relying on color.
- Availability editing provides explicit day/time controls, copy actions, and
  list-based conflict descriptions; drag is not required.
- Loading, empty, filtered-empty, incomplete, slow, error, conflict, successful,
  stale, and failure-recovery states are represented.
- Tables and forms remain usable at 320 CSS pixels and 200% zoom-equivalent
  width through reflow or bounded local overflow.
- Verify light, dark, system, reduced motion, forced colors, long Portuguese
  labels, coarse pointers, autofill/paste, and duplicate submission prevention.

## Logging And Observability

- No production logging, metrics, traces, analytics, or alerts are introduced.
- The preview may show a visible local status summary containing only scenario
  ID, synthetic record counts, configured latency, and failure mode.
- Do not log fixture records, names, addresses, contact values, form payloads,
  auth/session values, private headers, or screenshots containing values that
  could be mistaken for real data.
- Future production observability must be designed with the accepted API and
  authorization contracts, not inferred from this prototype.

## Acceptance Criteria

- [x] `/workspace-preview/barbershop-setup` is development-only and renders in
      `WorkspacePreviewShell`; production builds resolve the loader to null and
      do not contain fixture/scenario/reset markers.
- [x] The overview and the `Unidades`, `Profissionais`, `Serviços`, and
      `Disponibilidade` sections are directly selectable and shareable through
      stable non-PII URL state.
- [x] Every section has presentation-quality normal, loading, empty,
      filtered-empty, error, and narrow-responsive behavior.
- [x] Create, inspect, edit, archive/restore, dependency, and availability
      interactions work through a module-owned repository port and in-memory
      adapter only.
- [x] The required deterministic scenarios are selectable and never leak
      mutations into each other.
- [x] `Restaurar cenário` atomically restores all active scenario collections,
      query state, failure controls, selections, and open form/overlay state.
- [x] Slow, next-failure, persistent-error, conflict, stale-result, optimistic
      rollback, and retry behavior are repeatable and covered by tests.
- [x] No API, IDP, OpenAPI, database, migration, browser persistence, external
      provider, or production runtime behavior is added.
- [x] Frontend contracts and fixtures are documented as presentation-facing and
      are not described as future API/database schemas or capacity evidence.
- [x] Existing shared components are reused before new primitives; accepted
      additions follow shadcn discovery, responsibility folders, tokens,
      inventory, accessibility, and focused tests.
- [x] Keyboard, focus, announcements, validation, 320px reflow, 200% zoom,
      theme, reduced motion, forced colors, and non-color status behavior are
      verified or explicitly recorded as manual residual checks.
- [x] All fixture content is synthetic, local, resettable, and absent from
      network requests, URLs containing PII-shaped values, logs, and persistent
      browser storage.
- [x] Focused Vitest, Playwright, route generation, formatting, lint,
      typecheck, Studio build/check, production-boundary, and workspace checks
      pass.

## Verification Plan

- Unit tests:
  - scenario isolation, deterministic IDs, cross-collection reset, stale-result
    protection, dependency validation, failure modes, rollback, and query-key
    invalidation;
  - URL parsing/serialization with only stable section/scenario/filter IDs;
  - Zod form validation and dependent-field clearing;
  - production-null loader and module-boundary rules.
- Integration/API tests:
  - no API or IDP integration is required because no network contract changes;
  - production-boundary tests prove no preview runtime/fixture markers ship.
- UI tests:
  - overview progress and next actions;
  - table/filter/pagination states for all catalogs;
  - create/edit/archive/restore and confirmation flows;
  - professional/service/unit relationships and availability conflicts;
  - scenario switching, reset, slow, failure, rollback, and retry.
- Manual/browser checks:
  - Chromium visual review of every section in normal and dense scenarios;
  - keyboard-only, focus return, 200% zoom, 320px, light/dark/system,
    forced-colors, reduced-motion, and coarse-pointer review;
  - VoiceOver/NVDA basics where the environment is available.
- Build/check commands:
  - `bun --filter studio routes:generate`
  - `bun --filter studio format`
  - `bun --filter studio lint`
  - `bun --filter studio typecheck`
  - `bun --filter studio test`
  - `bun --filter studio test:e2e`
  - `bun --filter studio test:production-boundary`
  - `bun --filter studio build`
  - `bun --filter studio check`
  - `bun run check`

## Accepted Decisions And Open Questions

- [x] Delivery mode: frontend-only development presentation before backend.
- [x] Data mode: deterministic, synthetic, session-memory-only scenarios.
- [x] Review mode: URL-selectable scenarios plus an explicit full reset.
- [x] Information architecture: overview plus units, professionals, services,
      and availability sections.
- [x] Runtime boundary: local/dev preview only; unavailable in `hml` and `prd`.
- [x] Backend boundary: no tenancy, API, persistence, or IDP organization
      decision is made by this initiative.
- [ ] Product should review the prototype before deciding whether the accepted
      production experience remains a hub, becomes a guided onboarding flow,
      or combines both.
- [ ] Product should decide after visual review which optional fields and
      relationships survive into a future backend contract.
