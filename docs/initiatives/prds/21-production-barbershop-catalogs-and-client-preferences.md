# 21 Production Barbershop Catalogs And Client Preferences

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: In progress — local testable version available
- Owner: CRV Triad
- Last updated: 2026-09-04
- Approved by/date: User / 2026-09-04

## Summary

Deliver production-backed, tenant-isolated CRUDs for units, professionals, and services and replace
the Studio barbershop-setup memory source with authenticated HTTP behavior for those catalogs. Each
record can exist independently, while explicit assignments describe where a professional works,
where a service is offered, and which professionals can perform it. Client service preferences will
stop being free-text labels, and the client profile will support optional preferred units and
professionals using the same stable catalogs. Bounded operational-option contracts and Backstage
aggregate counts will make the catalogs useful across the existing system while scheduling,
availability, service-desk, checkout, and reporting persistence remain outside this initiative.

Execution plan:
[21-production-barbershop-catalogs-and-client-preferences.md](../tasks/21-production-barbershop-catalogs-and-client-preferences.md)

## Context

- Current state:
  - Initiative 19 delivered tenant context, access decisions, persistent clients, and the Studio
    client HTTP adapter.
  - `apps/api/src/modules/clients` is the only production tenant-owned business CRUD.
  - `apps/studio/src/modules/barbershop-setup` already defines and presents units, professionals,
    services, relationships, availability, payment settings, commissions, service overrides, and
    setup readiness, but its data source is session memory in `local`/`dev` and disabled in
    `hml`/`prd`.
  - The current prototype requires every professional to select at least one unit and every service
    to select at least one unit and professional. This creates a circular first-use dependency and
    makes incomplete but valid catalog records impossible.
  - Client `servicePreferences` are stored and edited as arbitrary strings. The Studio form accepts
    comma-separated labels, so spelling variants cannot reliably connect a client to scheduling or
    service analytics.
  - Agenda, Dashboard, Service Desk, Revenue Operations, Reporting, and Operational Notifications
    already exchange synthetic unit, professional, and service IDs. Agenda hard-codes the unit ID
    union, while Service Desk reuses Agenda catalogs and Revenue/Reporting correctly snapshot labels
    and prices for historical facts.
  - Backstage exposes bounded client/member counts but no unit, professional, or service inventory
    counts.
- Problem:
  - Owners and managers cannot persist the core operating catalog needed by a real barbershop.
  - Receptionists and later operational modules do not have stable unit, professional, and service
    IDs to use.
  - Client preferences cannot be validated against the tenant's current service catalog and become
    stale or ambiguous when services are renamed.
  - Existing operational prototypes encode likely catalog consumers, but no explicit production
    contract distinguishes current catalog lookup from immutable historical snapshots.
- Why now:
  - Tenant isolation, authorization, optimistic concurrency, HTTP adapters, and production delivery
    patterns now exist and can be reused.
  - These catalogs are the smallest coherent dependency layer beneath availability, scheduling,
    service fulfillment, checkout, commissions, and reporting.
- Related docs/issues:
  - [Business context and access](../../api/business-context-and-access.md)
  - [Studio barbershop setup](../../studio/barbershop-setup.md)
  - [Studio client management](../../studio/client-management.md)
  - [Initiative 07](07-triad-studio-barbershop-setup-visual-prototype.md)
  - [Initiative 16](16-triad-studio-first-mlp-completion-visual-prototype.md)
  - [Initiative 19](19-multi-tenant-client-foundation-and-platform-operations.md)
- Repository evidence:
  - `apps/studio/src/modules/barbershop-setup/contracts.ts` models the three catalogs and their
    relationships behind `BarbershopSetupRepository`.
  - `apps/studio/src/modules/barbershop-setup/entity-drawer.tsx` contains the accepted field and
    validation inventory, but currently makes relationships mandatory during record creation.
  - `apps/api/src/modules/clients/database/schema.ts` stores `servicePreferences` as `text[]` and
    has no service foreign key.
  - `apps/studio/src/modules/clients/client-schema.ts` converts a comma-separated preference field
    into string labels.
  - `apps/api/src/modules/access/domain/access-decision.ts` has client/member capabilities but no
    catalog capability.

## Actors And Workflows

- Primary actors:
  - Tenant owner or admin: creates and maintains operational catalogs and assignments.
  - Tenant member/receptionist: reads active catalog options when managing clients and, later,
    appointments; mutation access is not granted by default.
  - Professional: a tenant-owned business record that may optionally reference an IDP user without
    becoming an identity role or organization membership.
- Current workflow:
  - A local/development user manipulates deterministic setup fixtures; the state disappears with a
    fresh browser runtime.
  - Client service preferences are typed manually and may not identify a real service.
- Target workflow:
  1. An authorized owner or admin opens the existing barbershop setup catalogs.
  2. The user creates a unit or service independently, or invites a professional without requiring
     prior catalog assignments.
  3. The record is saved as active but may show `Configuração pendente` until its operational
     requirements are satisfied. Catalog existence and operational readiness are distinct.
  4. The user assigns professionals to units, services to units, and eligible professionals to
     services. The server validates every referenced ID within the active tenant and applies each
     relationship update atomically.
  5. Lists, details, edits, archives, restores, and relationships survive reloads and tenant
     context changes without leaking between tenants.
  6. When creating or editing a client, the user searches a bounded list of active services from
     the current tenant and selects zero or more preferred services by stable ID. The same client
     surface can optionally select preferred units and preferred professionals.
  7. A client preference is an affinity recorded by staff, not an authorization, exclusivity rule,
     ranking, automatic assignment, or promise of availability.
  8. Renaming a catalog record updates its displayed name everywhere in current client preferences
     without rewriting preference links. Archiving preserves existing preference history, visibly
     labels it as archived, and excludes it from new selections.
  9. Backstage tenant inventory/detail shows bounded active and archived counts for each catalog,
     without exposing catalog record fields.
- Alternate/failure/recovery flows:
  - Unauthorized mutation returns a stable denial and leaves form state recoverable.
  - A stale record or relationship version returns a conflict; Studio offers a reload instead of
    silently overwriting newer data.
  - A referenced, foreign-tenant, missing, or newly archived record is rejected atomically.
  - An archive that would break an active downstream dependency is rejected with a stable conflict
    and a bounded dependency summary. Catalog-to-catalog assignments alone do not block archive;
    they remain historical and become unavailable operationally.
  - Service-search failures in the client form preserve other client fields and provide retry.
  - Legacy free-text preferences that cannot be linked automatically remain readable as unlinked
    historical labels during the compatibility period and cannot be newly created.

## Goals

- Establish units, professionals, and services as production tenant-owned aggregates with stable
  IDs, validation, versioning, lifecycle, and bounded APIs.
- Make all three record types independently creatable and model readiness separately from existence.
- Persist explicit, tenant-safe relationships without embedding business rules in the IDP.
- Replace the three setup catalog memory CRUDs with real Studio HTTP behavior while retaining the
  accepted information architecture and interaction quality.
- Convert client service preferences from free text to stable service references without hiding or
  corrupting existing values.
- Let staff record optional client affinities for real units and professionals as well as services,
  without making scheduling decisions automatically.
- Provide narrow read contracts that later availability, scheduling, checkout, commission, and
  reporting initiatives can consume.
- Establish which downstream facts use current catalog projections and which must retain immutable
  labels/prices as event-time snapshots.
- Add catalog inventory counts to existing Backstage operational summaries without enabling
  cross-tenant record browsing.

## Non-Goals

- Persisting availability, payment settings, setup completion, professional access-policy switches,
  commission rules, service price/duration overrides, appointments, queues, service sessions,
  checkout, cash, notifications, or reports.
- Treating prototype professional access choices as server authorization.
- Multiple addresses per unit, geocoding, maps, files/photos, legal or tax registration, rooms,
  chairs, equipment, inventory, products, bundles, promotions, variable pricing, or service add-ons.
- Client-specific pricing, inferred preferences from appointment history, preference ranking,
  automatic professional/unit selection, recommendation engines, marketing automation, bulk
  import/export, hard deletion, or record merge.
- Backstage catalog correction or cross-tenant catalog browsing.
- A public booking flow or changes to `apps/site`.

## Requirements

### Functional

- REQ-001: An authorized tenant user shall list, retrieve, create, update, archive, and restore units,
  professionals, and services belonging only to the active tenant; no hard-delete route shall be
  exposed.
- REQ-002: Each aggregate shall use an opaque UUIDv7 ID, tenant ownership, `active` or `archived`
  lifecycle status, integer optimistic version, and timezone-aware creation/update timestamps.
- REQ-003: A unit shall contain a tenant-unique normalized code, name, plain-text address, and one
  or more structured weekly opening periods, each with selected weekdays and valid start/end times.
  A weekday shall belong to at most one period.
- REQ-004: A professional shall always be an authenticated global user linked to a tenant-owned
  employment relationship. Name, email, phone, credentials, and other personal profile attributes
  belong exclusively to the IDP user and shall not be copied into or edited through the employment
  relationship.
- REQ-004A: An owner shall add a professional only by email invitation. If the normalized email
  belongs to an active user, acceptance shall link that existing identity; otherwise acceptance
  shall create the invite-gated account before activating the employment relationship. No active
  professional or standalone employee record may exist without an IDP user.
- REQ-004B: Before acceptance, business attributes selected by the owner shall belong to a pending
  professional invitation, not an active professional record. After acceptance the tenant-owned
  relationship may contain only employment attributes such as role, specialties, commission,
  unit/service assignments, availability, and employment status.
- REQ-005: A service shall contain a tenant-unique normalized name, category, description, default
  duration in whole minutes, and non-negative default price in integer cents.
- REQ-006: Creation of a unit or service shall not require another catalog record. Activating a
  professional requires acceptance of its identity invitation but does not require a unit or
  service assignment. Operational readiness shall be derived separately from lifecycle status.
- REQ-007: Professional-to-unit, service-to-unit, and professional-to-service relationships shall be
  represented by tenant-safe association records and replaced through explicit atomic commands.
- REQ-008: A professional shall be operationally ready only when active and assigned to at least one
  active unit. A service shall be operationally ready only when active, offered by at least one
  active unit, and assigned to at least one active professional who shares an active unit with it.
- REQ-009: Relationship commands shall reject missing, archived, or foreign-tenant references and
  shall reject a professional/service assignment when the pair has no shared active unit.
- REQ-010: Catalog archive shall preserve associations and historical references. Archived records
  shall be excluded from new selectors and readiness calculations and shall remain visible in
  existing client preferences with an archived state.
- REQ-011: Archive shall fail with a stable `active_dependency` conflict only when an owning future
  module has registered an active operational dependency; the response shall contain bounded counts
  by dependency type and no PII.
- REQ-012: Catalog lists shall support bounded server-side search, status filter, allowlisted sorting,
  page sizes `10`, `20`, or `50`, deterministic tie-breaking, and pagination metadata.
- REQ-013: The API shall expose bounded service-option search by query and selected IDs so forms can
  search the tenant catalog and hydrate existing selections without loading every service.
- REQ-014: Tenant catalog reads shall require `catalogs.read`; mutations shall require
  `catalogs.manage`. Owner and admin receive both; member receives read only. Commercial
  entitlement checks shall reuse the existing access-decision pipeline without a catalog quota in
  this initiative.
- REQ-015: Studio shall use authenticated HTTP repositories for the three catalogs in every deploy
  target and shall never fall back to memory after an HTTP, authorization, or validation failure.
- REQ-016: Studio shall preserve the existing `/barbershop-setup` catalog sections, drawers, list
  controls, URL-restorable list/detail intent, Portuguese feedback, archive/restore flow, and
  active-tenant cache partitioning while replacing catalog fixture data with API data.
- REQ-017: Studio shall present incomplete-but-valid records with a non-color-only
  `Configuração pendente` state and actionable missing-assignment guidance, without confusing that
  state with archive.
- REQ-018: Client create/edit shall select zero to 20 preferred services by stable ID from active
  tenant service options; arbitrary new preference labels shall no longer be accepted.
- REQ-019: Client list/detail responses shall expose bounded preferred-service projections containing
  stable ID, current name, and lifecycle status. Client mutation shall accept service IDs and shall
  validate all IDs in the same tenant transaction.
- REQ-020: Service rename shall automatically change the displayed label in client preferences;
  service archive shall preserve the link and readable label but prevent a newly selected archived
  preference.
- REQ-021: The migration shall backfill a legacy client preference only when its normalized label
  resolves to exactly one service in the same tenant. Unmatched or ambiguous labels shall remain as
  read-only legacy values during a compatibility period and shall be reported only through
  metadata counts, never value-bearing logs.
- REQ-022: API errors shall expose stable English machine codes and a safe request identifier;
  Studio shall map expected failures to recoverable Brazilian Portuguese states.

### Non-Functional

- REQ-023: Every aggregate and association query shall include tenant scope in its database
  predicate and compound foreign keys or equivalent constraints shall prevent cross-tenant links.
- REQ-024: List and option queries shall be bounded, indexed, deterministic, and free from N+1
  relation loading. Detail projections shall retrieve relationship sets in bounded queries.
- REQ-025: Catalog and client-reference mutations shall use optimistic concurrency and transactions
  so partial relationship or preference replacement cannot become visible.
- REQ-026: Logs, traces, metrics, analytics, and migration reports shall not contain professional
  contact data, addresses, client data, preference labels, request payloads, credentials, tokens,
  cookies, or private headers.
- REQ-027: Studio catalog and client-preference journeys shall preserve keyboard operation, focus
  restoration, semantic names, screen-reader status, 320 CSS-pixel reflow, 200% zoom, light/dark
  themes, reduced motion, and status meaning independent from color.
- REQ-028: Rollout shall use additive database migration and compatibility reads before Studio begins
  writing service IDs; rollback shall allow the previous Studio/API version to operate without
  reverting an applied migration or losing newly created catalog data.
- REQ-029: Catalog mutation audit events shall record actor ID, tenant ID, action, entity type,
  opaque entity ID, request ID, timestamp, result, and changed field names, but never changed values.
- REQ-030: Durable API, Studio, and Backstage documentation shall replace prototype-only claims for
  the three catalogs and explicitly document catalog counts, preference behavior, consumer
  contracts, and which setup and operational capabilities remain memory-only or disabled.

### Cross-Module Functional

- REQ-031: Client create/edit shall allow zero to five preferred unit IDs and zero to five preferred
  professional IDs, in addition to zero to 20 preferred service IDs. These affinities shall not
  change authorization, eligibility, availability, pricing, or automatic assignment.
- REQ-032: Client detail shall project current ID, name, and lifecycle state for all three preference
  types. Rename and archive behavior shall match service preferences; archived links remain readable
  and removable but cannot be newly selected.
- REQ-033: Units, professionals, and services shall each expose bounded option-search contracts that
  hydrate explicitly selected IDs and support relevant active relationship filters. Downstream
  consumers shall not need to load complete catalogs to populate selectors.
- REQ-034: Backstage tenant inventory and detail shall expose active and archived counts for units,
  professionals, and services. It shall not expose names, contacts, addresses, descriptions, prices,
  relationships, or preference records through this integration.
- REQ-035: The production catalog contract shall identify current operational projections for future
  Agenda, availability, Service Desk, and notification consumers: units supply scope and hours;
  professional options are filtered by active unit assignments; service options are filtered by
  active unit/professional eligibility and expose current default duration/price.
- REQ-036: Future transaction owners, including appointments, service sessions, checkout, paid
  sales, commissions, closings, reports, and notifications, shall store stable catalog IDs plus the
  event-time labels, prices, durations, and rules needed for historical truth. This initiative shall
  document that contract but shall not connect production catalogs to synthetic runtime records.

## Brainstorm

### Problem Framing

- We are creating the stable operating vocabulary used by nearly every later barbershop workflow,
  not merely converting three screens from memory to HTTP.
- Owners and managers need to build the catalog in any order. Receptionists need trustworthy,
  current options without catalog mutation authority.
- Stable service references immediately improve client data and prevent later scheduling from
  depending on human-entered labels.
- Optional client unit/professional affinities are useful staff-entered context, but must remain
  suggestions until a scheduling owner validates eligibility and availability.
- Backstage needs aggregate inventory signals for support and lifecycle diagnosis; catalog record
  access would exceed its present bounded purpose.

### Gaps And Unknowns

- Product gaps:
  - Multiple weekly opening periods are required so weekdays may use different hours; split
    intervals on the same weekday, breaks, rooms/chairs, and public service descriptions remain
    unvalidated.
  - The existing prototype includes commissions, access switches, account presentation, and service
    overrides, but those require separate production contracts.
- Technical gaps:
  - The setup module currently has one broad repository/source combining persistent candidates with
    out-of-scope memory-only capabilities. Its composition must be split without breaking the
    existing evaluation surfaces.
  - Existing client API callers use string preferences and need a compatibility contract during
    rollout.
  - Existing Agenda and Service Desk fixtures use IDs that do not correspond to production records;
    runtime composition would create invalid mixed-source behavior.
- Data/model gaps:
  - Existing preference strings may be unmatched or ambiguous. Automatically creating services from
    those labels would pollute the catalog, so only unique matches are safe.
  - No production appointment dependency exists yet, so archive dependency checks need a narrow
    extension point rather than invented scheduling tables.
- Operational gaps:
  - No baseline catalog volume or latency measurement exists. Query bounds and indexes are required,
    but capacity claims must wait for measurement.

### Counterpoints

- Shipping only units first would reduce migration size, but would leave the user-visible setup
  journey incomplete and provide no immediate client-data integration.
- Keeping mandatory links during create mirrors the prototype, but produces a circular workflow and
  couples aggregate existence to configuration completeness.
- Placing all three tables and rules in one generic `catalogs` module is quick, but professional
  identity/contact rules and service pricing vocabulary will evolve differently. Separate domain
  modules with a narrow composition contract avoid a catch-all boundary.
- Fully normalizing opening hours, specialties, and categories into separate catalogs now would add
  administrative surfaces without a demonstrated workflow.
- Removing legacy preference strings immediately is simpler but risks silent data loss. A bounded
  compatibility projection is safer and reversible.
- Dynamically joining paid-sale/report labels to the latest catalog looks consistent but rewrites
  history after rename; transaction owners must snapshot event-time presentation and values.
- Wiring the real catalogs into current memory Agenda/Service Desk would demonstrate selectors
  sooner, but their synthetic records and relationships would no longer be coherent. Only the
  catalog consumer contract should be prepared now.
- Adding every plausible client affinity would invite speculative CRM fields. Units and
  professionals are included because both already participate in appointment/walk-in choice;
  ranking, exclusivity, inferred preferences, and automatic behavior remain out of scope.
- Doing nothing keeps all downstream prototypes detached from production and allows more free-text
  preference debt to accumulate.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Three independent modules with explicit association tables and client preference links | Honest boundaries, independent creation, stable downstream IDs, scalable queries | More contracts and coordinated migration work | Selected for production foundation |
| B | One generic setup/catalog module mirroring the memory repository | Faster initial adapter replacement | Catch-all domain, circular create rules, hard to evolve independently | Only for a disposable prototype |
| C | Units-only vertical slice followed by separate initiatives | Smallest first deployment | Repeated integration work; client preferences stay weak; setup remains hybrid longer | Choose only if delivery capacity requires a forced scope cut |

### Recommendation

Choose Option A. Create `units`, `professionals`, and `services` as sibling API modules with their
own vocabulary and persistence, and compose cross-catalog assignments through narrow repository/use-
case dependencies. Make records independently creatable and expose derived readiness. Introduce a
client/preference junction per catalog type, with compatibility handling for legacy service labels.
Expose bounded option projections, add only aggregate catalog counts to Backstage, and document the
current-projection versus historical-snapshot boundary for future consumers. In Studio, preserve
the existing setup route but split production catalog data from the remaining memory-only setup
capabilities so a source cannot ambiguously mix persistence modes.

## Cross-Module Integration Map

| Consumer | Opportunity | Decision In This Initiative | Boundary / Reason |
| --- | --- | --- | --- |
| Clients | Preferred services, professionals, and units | Implement stable optional links and bounded selectors | Affinities are staff-entered hints, never automatic allocation |
| Barbershop setup | Catalog lists, detail, relationships, readiness, and overview | Replace the three memory CRUDs with HTTP and real readiness | Availability, payments, commissions, access switches, and overrides remain non-production |
| Workspace/tenant context | Current tenant owns all catalog options | Partition queries/caches by confirmed organization | A unit is not a new auth or tenant context |
| Agenda/Dashboard | Unit scope, professionals, eligible services, duration, and price defaults | Publish option/projection contract only | Current Agenda/Dashboard records are synthetic; runtime mixing is prohibited |
| Availability | Active professional/unit pairs and unit hours | Publish relationship projection contract only | Availability recurrence/persistence needs its own initiative |
| Service Desk | Walk-in unit/service/professional choices and eligibility | Publish option/projection contract only | Queue/session data remains synthetic and requires production concurrency design |
| Revenue/checkout | Service price and professional/service commission context | Document snapshot boundary only | Paid transactions must retain event-time facts after catalog edits |
| Reporting | Service/professional/unit facets and historical labels | Document stable-ID plus snapshot boundary only | Reporting persistence does not exist yet |
| Notifications | Stable unit and source entity routing | Document stable catalog ID consumption only | Notification source facts remain owned by future operational modules |
| Backstage | Operational catalog inventory per tenant | Implement active/archived aggregate counts | No record-level fields or new support mutation authority |
| Access/commercial policy | Catalog read/manage entitlement | Implement capability/entitlement integration | Prototype professional switches remain unrelated to authorization |

## Architecture And Boundaries

- Site impact: none.
- API impact:
  - Add `apps/api/src/modules/units`, `professionals`, and `services` with domain validation,
    application actions, Drizzle repositories, and module-owned Elysia routes.
  - Add narrow cross-module ports for assignment validation, all client catalog preferences,
    operational option projections, and Backstage aggregate counts. Do not import internal database
    tables across application/domain layers.
  - Extend access capabilities and composed REST wiring.
- IDP impact:
  - No new authentication routes, invitations, roles, or sessions.
  - `Professional.globalUserId` may reference an IDP user only through an explicit trusted link
    operation deferred from this initiative; normal catalog forms cannot set it.
- Studio impact:
  - Reuse `/barbershop-setup` and its catalog presentation, but introduce HTTP repositories and
    clear source composition for production-backed catalogs.
  - Replace the client preference text input with an async, bounded multi-select from services.
  - Keep availability, payments, commission/access settings, service overrides, and setup completion
    on their existing non-production boundary until separately accepted.
- Data/persistence impact:
  - Add `units`, `professionals`, `services`, `professional_units`, `service_units`,
    `professional_services`, `client_service_preferences`, `client_professional_preferences`, and
    `client_unit_preferences` with tenant-safe foreign keys, indexes, versions where mutable, and
    timestamps.
  - Retain the legacy client preference label column during compatibility; remove it only in a
    later explicitly reviewed cleanup after unmatched values are resolved.
- External provider impact: none.
- Backstage impact: extend inventory/detail response and UI with aggregate active/archived catalog
  counts only; do not add catalog browsing or correction, and do not expand support-session access.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Three maintenance flows and client preference integration change real workflows | `requirements-analysis`, setup/client docs |
| Architecture | Applicable | Adds three modules and cross-module contracts | `triad-architecture`, API conventions |
| API | Applicable | New CRUD, relationship, option-search, validation, errors, auth, and pagination contracts | `triad-api-development`, `elysia` |
| Identity and authorization | Applicable | Professional identity is mandatory; invitation acceptance creates membership and the employment link | business context/access doc |
| Persistence | Applicable | Adds aggregates, associations, preference migration, constraints, indexes, and transactions | `postgres-drizzle` |
| Studio UI | Applicable | Replaces memory CRUDs and client free-text preferences | `triad-studio-development` |
| Site UI | Not applicable | No public-site workflow changes | Product boundary instructions |
| Accessibility | Applicable | Forms, tables, drawers, async selectors, states, and responsive behavior change | `accessibility`, Studio conventions |
| Performance and scale | Applicable | Catalog lists, selectors, relationships, and preference joins can grow | API/Studio skills |
| Security and privacy | Applicable | Tenant isolation and professional/client PII require explicit controls | API security conventions |
| Observability | Applicable | Production CRUDs, conflicts, migration, and failures need metadata-only diagnosis | API conventions |
| Reliability and delivery | Applicable | Coordinated additive migration and API/Studio compatibility rollout | deployment/release docs |
| Testing and QA | Applicable | Domain, database, route, adapter, UI, tenancy, accessibility, and migration evidence required | `triad-testing`, `triad-product-qa` |
| Documentation | Applicable | Durable API/setup/client behavior changes | docs instructions |

## Performance And Scalability

- Expected data growth: unit counts should remain small per tenant, while professionals, services,
  associations, and client preference links may grow substantially across tenants. No numeric
  production capacity is claimed.
- Critical paths: catalog list/search, async service-option search, relationship replacement,
  client detail preference projection, and appointment-form catalog reads in later initiatives.
- Query bounds/pagination:
  - CRUD lists use page sizes 10/20/50 and deterministic `id` tie-breaking.
  - Option search requires a bounded query and returns at most 50 matches plus explicitly requested
    selected IDs.
  - Client list must not load preference objects; client detail returns at most 20 services, five
    professionals, and five units.
  - Relation detail is bounded by validated per-record association limits; initial limits are 100
    unit assignments and 200 service/professional assignments per source record and require an
    explicit product revision if insufficient.
- Concurrency risks: stale base edits, simultaneous relationship replacement, archive during
  selection, and client save during service archive use versions, transactions, and post-lock
  validation.
- External limits: none.
- What happens with millions of records/items: tenant-first compound indexes and bounded queries
  prevent global loads; option search remains indexed and paginated/bounded; no client list join
  multiplies rows by preferences; aggregate counts are not calculated by scanning full tables per
  row. Query plans on synthetic high-cardinality data are review evidence, not capacity claims.

## Security, Privacy, And Abuse

- Auth/session impact: every route uses the existing server-resolved active tenant and revalidates
  membership/access. No caller-supplied tenant authority is accepted.
- Roles/access: owner/admin can read/manage; member can read. Studio action visibility is only a UX
  hint; API checks remain authoritative.
- PII/secrets: identity email/phone and unit address are private data. Professional relationships
  never duplicate identity attributes. Catalog option responses expose only the minimum fields
  needed by a selector. Client preferences remain private.
- Cross-app exposure: Backstage receives counts only. Operational option responses do not expose
  identity contacts, unit addresses, internal descriptions, client preference counts, or audit
  data.
- Spam/abuse vectors: authenticated mutation and list/search inputs are bounded; duplicate tenant
  codes/names are rejected; no public endpoint exists.
- Rate limiting or throttling needs: infrastructure-level authenticated API protection remains
  applicable. No feature-specific rate limit is required initially; monitor option-search and
  mutation rates before adding one.

## Accessibility And UX

- Keyboard flow: every catalog row, context menu, drawer action, relationship selector, async service
  selector, archive confirmation, retry, and conflict-reload action is keyboard operable.
- Screen reader states: loading skeletons have named status regions; search results, selection
  changes, validation, readiness, archive, conflict, empty, and error states are announced.
- Responsive behavior: tables retain owned overflow; drawers reflow at 320 CSS pixels; selector
  chips and long names wrap without horizontal page overflow; 200% zoom remains operable.
- Loading/error/empty states: each list and selector distinguishes loading, no records, no search
  matches, denied access, recoverable failure, and unavailable source without exposing fixtures.
- Duplicate submission prevention: save labels remain stable and shared loading states disable
  repeat mutation while preserving accessible busy state.

## Logging And Observability

- Useful structured events: catalog mutation result, relationship replacement result, client
  preference replacement result by preference type, conflict/denial/error code, migration matched/
  unmatched/ambiguous counts, Backstage aggregate-query result, module, tenant ID, actor ID, entity
  type/ID, request ID, duration, and changed field names.
- Metrics: request count/duration/error by route template and status; conflict and denial counts;
  option-search result count and latency; migration outcome counts. Do not use raw search terms as
  labels.
- Traces/spans: composed request, authorization, repository transaction, and bounded database query
  spans correlated by request ID.
- Alerts: sustained server-error or latency regression on catalog/client routes and failed migration
  execution; thresholds belong to the existing platform monitoring configuration when available.
- Sensitive data that must not be logged: names, contacts, addresses, descriptions, specialties,
  preference labels, search terms, payloads, tokens, cookies, and private headers.

## Delivery And Rollback

- Compatibility strategy:
  1. Apply additive catalog/association/preference tables while retaining the legacy text array.
  2. Deploy API compatibility reads/writes and backfill only uniquely matched preference labels.
  3. Verify tenant isolation and migration counts.
  4. Deploy Studio catalog HTTP adapters and ID-based preference selector.
  5. Stop new legacy free-text writes while continuing to present unmatched legacy labels read-only.
- Feature flag/rollout: source composition may keep production catalog UI disabled until the API and
  migration are healthy. It must fail closed, never fall back to memory.
- Migration/backfill: run on empty and representative existing databases; make reruns idempotent;
  publish only counts by outcome and tenant-independent totals; do not print labels.
- Rollback: revert Studio first, then API if needed. The previous version continues using the retained
  legacy column. Do not down-migrate populated catalog tables during emergency rollback.
- Operational readiness: migration status, API health, error/latency dashboards, safe backfill
  summary, smoke journeys for two tenants, and a documented compatibility cleanup condition.

## Success Measures

- Success signals:
  - An authorized owner/admin can persist and maintain all three catalogs across reload and tenant
    switches.
  - A member can read catalog options but cannot mutate them.
  - A client can be saved with catalog-backed preferences and service rename/archive behavior is
    consistent.
  - No known foreign-tenant ID can be read, linked, or mutated in automated integration tests.
- Baseline or measurement plan: there is no production baseline. Establish route latency/error,
  conflict, option-search, and migration outcome telemetry during rollout and review after the first
  representative catalog usage window.
- Regression guardrails: existing auth, tenant switching, client CRUD/notes, production-boundary,
  theme, responsive, and coverage checks remain green.
- Evaluation window: implementation evidence plus the first monitored staging/homologation rollout;
  production capacity remains unclaimed until measured.

## Acceptance Criteria

- [ ] AC-001: In two populated tenants, unit, professional, service, association, option-search, and
  client-preference API requests return or mutate only records belonging to the resolved tenant,
  including attempts using known foreign IDs.
- [ ] AC-002: An owner or admin can independently create each catalog record, reload Studio, inspect
  it, edit it with the latest version, archive it, and restore it.
- [ ] AC-003: A member can list and select active catalog records but receives a stable forbidden
  response for every catalog mutation.
- [ ] AC-004: A newly created unassigned professional or service is active and visibly marked
  `Configuração pendente`; valid assignments make it operationally ready without recreating it.
- [ ] AC-005: Relationship replacement is atomic and rejects archived, missing, incompatible, or
  foreign records without partial writes.
- [ ] AC-006: Unit code and service name uniqueness, field bounds, opening-period order and weekday
  exclusivity, duration, price, contact, specialty, association-count, and version validation return
  stable safe errors.
- [ ] AC-007: Catalog lists prove bounded search, filter, sorting, pagination, deterministic ordering,
  and no per-row relationship query behavior.
- [ ] AC-008: Service option search returns no more than 50 active matches, hydrates explicitly
  selected archived IDs, and never returns another tenant's service.
- [ ] AC-009: Client create/edit accepts zero to 20 service IDs, rejects foreign/missing/archived new
  selections atomically, and no longer permits arbitrary preference labels.
- [ ] AC-010: Renaming a preferred service updates the client presentation; archiving preserves the
  preference with an archived label and excludes it from new selection.
- [ ] AC-011: The legacy backfill links only unique same-tenant normalized matches; unmatched and
  ambiguous values remain readable, reruns are idempotent, and output contains counts but no values.
- [ ] AC-012: Stale base-record, relationship, and client-preference updates return conflict without
  overwriting newer state, and Studio provides a recoverable reload path.
- [ ] AC-013: Catalog archive preserves catalog associations and client preferences and emits a
  bounded `active_dependency` response when an active dependency provider reports a blocker.
- [ ] AC-014: Studio uses HTTP in production-capable targets, partitions catalog and client queries by
  confirmed tenant, clears stale context data on switch, and never falls back to fixtures on error.
- [ ] AC-015: Catalog and client-preference journeys pass keyboard, focus, named-status, focused axe,
  320 CSS-pixel, 200% zoom, light/dark, reduced-motion, and non-color-only status checks.
- [ ] AC-016: Logs, traces, metrics, audits, API errors, and migration output pass sensitive-sentinel
  checks and contain the required safe correlation metadata.
- [ ] AC-017: Empty-schema and representative-existing-schema migration rehearsals pass, the previous
  application version remains compatible after the additive migration, and rollback does not
  require destructive down-migration.
- [ ] AC-018: API and Studio unit/integration/component/E2E suites, coverage gates, type checks,
  formatting/lint checks, production-boundary checks, and builds pass; Backstage checks and its
  focused catalog-count tests pass.
- [ ] AC-019: Durable API, setup, client, Backstage, and cross-module documentation describes
  production catalog behavior, preference compatibility, aggregate counts, consumer/snapshot
  contracts, permissions, rollout, and the remaining prototype-only capabilities.
- [ ] AC-020: Client create/edit stores zero to five preferred units and professionals by stable ID,
  validates tenant/lifecycle atomically, and displays rename/archive changes without automatic
  scheduling behavior.
- [ ] AC-021: Unit and professional option searches are bounded, tenant-isolated, hydrate selected
  archived IDs, and apply requested active relationship filters without complete-catalog loads.
- [ ] AC-022: Backstage inventory/detail shows correct active and archived unit, professional, and
  service counts for each tenant and exposes no catalog record fields.
- [ ] AC-023: Agenda, availability, Service Desk, revenue, reporting, and notification integration
  contracts are documented and contract-tested where code seams exist, while production catalog
  records never appear inside synthetic operational scenarios.
- [ ] AC-024: Contract fixtures prove that current operational selectors use active catalog
  projections and historical transaction/report fixtures preserve event-time names, durations,
  prices, and rule snapshots after catalog rename/archive.

## Verification Plan

- Unit tests: validation/normalization, readiness, relationship compatibility, capability matrix,
  conflict/error mapping, all client catalog preferences, legacy matching, option projections,
  snapshot-boundary contracts, and Studio form/query behavior.
- Integration/API tests: PostgreSQL constraints/migrations, two-tenant isolation, CRUD lifecycle,
  atomic associations/preferences, concurrency, option bounds, archive behavior, safe errors,
  query counts/plans, and composed Elysia authorization.
- UI tests: HTTP adapter parity, route/list/drawer behavior, incomplete readiness, permissions,
  retry/conflict, async unit/professional/service selection, renamed/archived/legacy preferences,
  Backstage counts, and tenant switching.
- Manual/browser checks: owner/admin/member journeys at desktop and 320px, keyboard-only, 200% zoom,
  light/dark, reduced motion, focused screen-reader/axe review, reload persistence, and two-tenant
  switching.
- Build/check commands:
  - `bun --filter api check`
  - `bun --filter api coverage:check`
  - `bun --filter api test:integration:postgres`
  - `bun --filter api build`
  - `bun --filter studio check`
  - `bun --filter studio test:e2e`
  - `bun --filter studio build`
  - `bun --filter backstage check`
  - `bun --filter backstage build`

## Open Questions

### Blocking

- None. The initiative uses conservative, reversible assumptions below.

### Non-Blocking

- [ ] Decide the compatibility cleanup date for legacy preference labels after rollout evidence shows
  no unresolved values — owner: product/engineering release review.
- [ ] Validate whether real barbershops need split intervals on the same weekday before an
  availability production initiative — owner: product discovery.
- [x] Professional onboarding is invitation-only and always links an IDP user to a tenant-owned
  employment relationship. There is no standalone professional identity or employee-without-login
  path — decided by product owner on 2026-09-04.
- [ ] Validate whether client unit/professional affinities should later support ordering, one primary
  choice, or per-service professional affinity — owner: product discovery; no such semantics are
  implied now.

## Assumptions

- The existing prototype field inventory is the best available product evidence for the first
  production catalog slice; validate during implementation QA and record material scope changes.
- Unit code and service normalized name are tenant-unique to prevent ambiguous operational selection;
  validate against realistic staging fixtures.
- Professionals may exist without catalog assignments only after accepting an identity invitation;
  personal contact attributes remain owned by the IDP user and are never duplicated in the
  employment relationship.
- Owner/admin manage catalogs and member reads them; validate against the first operational role
  review without using prototype access switches as authorization.
- Multiple weekly opening periods may assign different hours to disjoint weekday groups; split
  intervals within the same weekday belong to later availability work.
- Unmatched legacy client preference labels must remain readable until explicitly resolved or
  retired; they never become services automatically.

## Definition of Ready

- [x] All mandatory gates in `planning-gates.md` pass.
- [x] Requirement-to-acceptance-to-task traceability is complete.
- [x] The planning state is `Ready` before requesting approval.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-04 | Awaiting approval |  | Initial production catalog and client-preference proposal |
| 2026-09-04 | Changes requested | User | Expand discovery beyond the client/service example |
| 2026-09-04 | Awaiting approval |  | Added client unit/professional affinities, Backstage counts, and downstream consumer/snapshot contracts |
| 2026-09-04 | Approved | User | Approved the revised initiative for implementation |
| 2026-09-04 | Approved change | User | Replaced standalone professional records with mandatory identity invitation and employment linking |
