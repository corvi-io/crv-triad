# 19 Multi-Tenant Client Foundation And Backstage Operations

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: In progress (original scope delivered; Backstage boundary revision not started)
- Owner: CRV Triad
- Last updated: 2026-09-04
- Approved by/date: User / 2026-09-04

## Summary

Establish the first production business-data vertical slice for TRIAD: one global Better Auth
identity, multiple organization memberships and selectable work contexts, server-enforced
permissions, plan entitlements and quotas, a persistent client-management CRUD, and a restricted
TRIAD Backstage application for internal operations.
Barbershop members will manage only their own clients in Studio; explicitly designated CRV
Backstage operators will use a separately deployed internal application to see cross-tenant
operational summaries and may enter a reason-bound support context to inspect
and correct client records without impersonating a tenant user. Every cross-tenant access and write
will be attributable and auditable. A provider-neutral, manually managed subscription foundation
will prove module paywalls and usage limits without pretending that payment processing is already
integrated.

Execution plan: [19-multi-tenant-client-foundation-and-platform-operations.md](../tasks/19-multi-tenant-client-foundation-and-platform-operations.md)

## Context

- Current state: the delivered foundation persists tenant-isolated clients, resolves memberships,
  enforces capabilities/subscriptions/quotas, and exposes tenant inventory plus reason-bound support
  through temporary `/platform` routes inside Studio. Backstage does not yet exist, internal
  operators have no bounded roles, and tenant provisioning still depends on trusted CLI commands.
- Problem: mixing Corvi-wide administration with the customer-facing Studio blurs product,
  deployment and organizational boundaries. The future internal support/operations team needs one
  dedicated system that can govern both Studio and Barber tenants without becoming a tenant member
  or carrying Studio business UI and state.
- Why now: the tenant/access API and first operator workflows are proven, so they can be extracted
  before more global capabilities accumulate in Studio. The reset development database also makes
  the first Backstage system-owner and tenant-provisioning journey the next natural acceptance path.
- Related docs/issues:
  - [Studio client management](../../studio/client-management.md)
  - [Studio authentication](../../studio/authentication.md)
  - [API conventions](../../api/conventions.md)
  - [Initiative 10](10-triad-studio-client-management-visual-prototype.md)
  - [Initiative 17](17-platform-consolidation-and-delivery-maturity.md)
  - [Better Auth 1.6 organization plugin](https://better-auth.com/docs/1.6/plugins/organization)
  - [Better Auth 1.6 admin plugin](https://better-auth.com/docs/1.6/plugins/admin)
  - [Better Auth database and plugin schema](https://better-auth.com/docs/concepts/database)
- Repository evidence:
  - `apps/studio/src/modules/clients/contracts.ts` already defines list, detail, duplicate,
    archive/restore, and note operations behind `ClientRepository`.
  - `apps/studio/src/dev/clients/memory-repository.ts` is the current behavioral reference, not a
    persistence or authorization contract.
  - `apps/api` currently pins Better Auth `1.6.23`; its organization plugin is available but not
    configured, and the Drizzle schema has no organization, member, or active-organization fields.
  - Better Auth 1.6 organization documentation defines organization/member/invitation models,
    active organization on the session, static roles and permissions, schema customization, and
    organization lifecycle hooks.
  - `apps/api/src/modules/idp/identity/session-context.ts` exposes an active identity context; it
    does not establish business authorization.
  - `apps/api/src/entrypoints/rest/app.ts` composes IDP, leads, and analytics only.

## Actors And Workflows

- Primary actors:
  - Tenant owner: administers one barbershop and its client records.
  - Tenant member: uses client capabilities allowed by an active membership.
  - Professional: a tenant-owned future business record that may optionally reference the same
    global identity as an owner or member without becoming an authorization role.
  - Client: a tenant-owned customer record that may later be claimed by a global identity but does
    not grant Studio access.
  - Backstage operator: a CRV-controlled internal actor with an explicit internal assignment and
    bounded role.
  - Auditor/developer: investigates access and mutations through metadata-only audit evidence.
- Current workflow:
  - A signed-in Studio user sees deterministic local client fixtures when the memory source is
    enabled. Refreshing reconstructs the fixture state; deployed production builds disable it.
  - The CRV owner has no tenant inventory, cross-tenant counts, or governed support workflow.
- Target tenant workflow:
  1. Better Auth resolves the authenticated identity and lists its active organization memberships.
  2. With exactly one tenant context, Studio enters `/overview`; with multiple tenant memberships,
     Studio opens `/select-workspace` after fresh sign-in. Internal Backstage authority never appears
     as a Studio workspace.
  3. The user selects a tenant, Better Auth records it as the active organization, and the business
     API revalidates membership before producing its tenant context.
  4. The selected organization stays visible in the authenticated shell and can be changed without
     signing out; switching invalidates tenant-bound client caches before the next screen renders.
  5. The member lists, searches, filters, creates, edits, archives, restores, and annotates clients.
  6. Every client query and mutation is scoped by the server-resolved tenant ID.
  7. Conflict and validation errors return stable contracts and the Studio preserves recoverable UI
     state.
- Target access and commercial-policy workflow:
  1. The API resolves an access decision from the active identity, tenant membership, tenant state,
     subscription state, plan entitlement, and current quota before protected work executes.
  2. Studio uses a server-provided access summary to shape navigation and actions, but the API
     repeats the authoritative decision for every protected request.
  3. Role-denied users see an accessible forbidden state and may submit a bounded access request to
     tenant administrators; approval maps to an existing role and never creates an ad hoc grant.
  4. Plan-denied users see an upgrade explanation; quota-denied mutations show current usage, limit,
     recovery options, and an upgrade path while existing data remains readable.
  5. The first slice uses a persisted manual/mock subscription source and proves the client-count
     quota. A later billing provider will update the same normalized subscription contract through
     verified webhook processing.
- Target ownership workflow:
  1. Each active tenant has exactly one principal `owner`; additional partners or managers receive
     `admin`, while legal ownership remains outside the authorization model.
  2. Ordinary member management cannot remove, disable, or demote the owner.
  3. Normal ownership transfer targets an active admin, requires authentication no older than five
     minutes and explicit confirmation, and atomically promotes the target while demoting the former
     owner to admin.
  4. If the owner cannot authenticate, only a platform operator may perform exceptional recovery,
     with recent authentication, required reason, typed tenant confirmation, and immutable audit.
- Target Backstage workflow:
  1. An explicitly assigned internal operator signs in to the separately deployed TRIAD Backstage
     application. Studio never hosts or links its global administration routes.
  2. The operator sees paginated tenant metadata and non-PII operational counts, including active
     and archived client totals.
  3. A system owner or operations operator creates a tenant through a bounded Backstage workflow,
     selects an existing active owner by exact email or issues the invite-gated owner onboarding,
     and assigns the initial manual plan in one auditable operation.
  4. To inspect tenant business data, an authorized support operator starts a support context by
     selecting a tenant and entering a reason.
  5. The UI displays a persistent support-context banner. API calls carry no caller-selected
     authorization role; the server validates the operator and target on every request.
  6. Reads and allowed interventions are recorded with operator, tenant, action, target ID, reason, request ID, and
     timestamp. Audit records do not contain client field values.
  7. The operator exits the support context explicitly; expiry also terminates it.
- Alternate/failure/recovery flows:
  - A user with no active membership receives a stable forbidden state and no tenant data.
  - A platform operator cannot access tenant records without an active, unexpired support context.
  - Changing, disabling, or deleting a membership invalidates authorization on the next request.
  - Duplicate contact candidates warn but do not block a tenant-authorized save.
  - Concurrent edits use optimistic concurrency and return a conflict that reloads current data
    without silently overwriting it.
  - Support-context creation, expiration, denial, read, mutation, and exit remain diagnosable without
    logging PII or session material.

## Goals

- Persist the first tenant-isolated business aggregate and replace the Client module's production
  disabled source with a real HTTP adapter.
- Support one identity holding several simultaneous organization memberships and selecting exactly
  one administrative work context at a time.
- Preserve a future-safe distinction between membership authority, professional work, customer
  identity, and CRV platform authority.
- Establish reusable business authorization context without placing tenancy rules in the IDP.
- Give CRV internal operators a dedicated Backstage with cross-tenant inventory and client-count
  overview, independent deployment, navigation, and authorization.
- Allow authorized internal operators to create a tenant, establish its initial owner, and configure
  its initial manual subscription without direct database or CLI access.
- Permit narrowly controlled support inspection and client correction with reason, expiry, visible
  operator context, and immutable audit attribution.
- Prove isolation, query bounds, concurrency behavior, and production delivery before subsequent
  CRUD modules reuse the foundation.
- Establish reusable capability, entitlement, subscription, and quota decisions before feature
  modules accumulate inconsistent menu, button, route, and API checks.

## Non-Goals

- Agenda, units, services, professionals, availability, checkout, cash, notifications, or reports.
- Public or customer-self-service tenant signup, payment collection, checkout, invoices, refunds, taxes, coupons, provider
  webhooks, self-service subscription changes, tenant deletion, or tenant export.
- A customer-facing portal, customer login journey, appointment self-service, or a customer option
  in the Studio workspace selector.
- User impersonation, session takeover, password access, or acting under another person's identity.
- Arbitrary SQL/data editing, bulk client import, client merge, hard deletion, or support access to
  authentication secrets.
- Custom tenant roles, per-user permission overrides, field-level permissions, or a generalized
  external policy engine. This slice uses explicit capability keys mapped to static tenant roles.
- Commercial plan pricing or production plan limits. Seeded development tiers and their client
  quotas are test fixtures, not market commitments.
- Multiple authorization owners per tenant, legal-shareholder modeling, voting, quorum, or corporate
  ownership records. Business partners who need broad operational access use `admin`.
- Persisting appointment projections currently present in the Studio client view model.

## Requirements

### Functional

- REQ-001: The system shall enable the Better Auth `organization` plugin as the tenant identity
  source of truth, map an organization to a barbershop tenant, and assign each business record to
  exactly one organization ID.
- REQ-002: Better Auth organization membership shall link an IDP user to a tenant with the static
  `owner`, `admin`, or `member` role. Tenant and membership operational status shall be input-disabled plugin
  fields managed only through trusted server operations; disabled tenants or memberships fail
  closed.
- REQ-003: Each tenant business request shall derive identity and active organization from the
  Better Auth session and revalidate server-side organization membership; caller-supplied
  organization IDs or client-side permission results shall never be sufficient authorization.
- REQ-004: The initial administrative bootstrap shall create one barbershop and active owner
  membership for the existing Gabriel administrator without opening public provisioning.
- REQ-005: An active tenant member granted the client-read capability shall list and retrieve only
  clients belonging to the resolved tenant, with server-side search, status/contact/duplicate
  filters, allowlisted sorting, and bounded page sizes compatible with the existing Studio contract.
- REQ-006: An active tenant member granted the client-manage capability shall create and update a client with a required name and at
  least one normalized phone or email contact, while preserving the accepted Brazilian Portuguese
  validation behavior.
- REQ-007: An active tenant member granted the client-manage capability shall archive and restore
  clients; the API shall not expose hard deletion in this initiative.
- REQ-008: An active tenant member granted the client-manage capability shall create, update, and
  remove bounded plain-text client notes.
- REQ-009: The API shall report exact normalized email or phone duplicate candidates only within
  the authorized tenant to callers with client-read capability and shall exclude an edited client
  when requested.
- REQ-010: Client responses shall keep appointment-derived fields empty or null until the future
  scheduling integration owns those projections.
- REQ-011: Backstage-operator authority shall require an explicit active assignment keyed to an IDP
  user and shall remain separate from organization membership roles and the IDP `admin` role. The
  Better Auth `admin` plugin shall not be enabled by this initiative.
- REQ-012: A Backstage operator shall access a separately built and deployed authenticated
  Backstage application with a
  paginated tenant inventory containing tenant status, creation timestamp, membership counts, and
  active/archived client counts without listing client PII by default.
- REQ-013: Cross-tenant client detail or mutation shall require a server-issued, time-bounded support
  context containing a selected tenant and a non-empty operator reason.
- REQ-014: An active support context shall allow the platform operator to use the same bounded
  client list/detail/create/update/archive/restore/note capabilities as a tenant member while every
  access remains attributed to the platform operator, never to an impersonated user.
- REQ-015: Backstage shall display a persistent, accessible banner naming the selected tenant and the
  fact that support mode is active, with a clear exit action; normal tenant and platform navigation
  shall remain visually distinct.
- REQ-016: The system shall append audit records for support-context lifecycle, cross-tenant detail
  reads, and mutations, recording metadata but no client payload values, credentials, tokens,
  cookies, or private headers.
- REQ-017: Client updates, archive/restore, and note updates/removals shall reject stale versions
  with a stable conflict response rather than overwrite newer data.
- REQ-018: API errors shall use stable English machine codes, safe messages, and request correlation;
  Studio shall map them to Brazilian Portuguese loading, empty, validation, forbidden, conflict,
  retry, and success states.

### Non-Functional

- REQ-019: Every tenant-scoped query shall include tenant scope in its predicate and relevant
  compound indexes; tests shall prove that known IDs from another tenant cannot be read or mutated.
- REQ-020: Tenant and platform lists shall be server-paginated with bounded page sizes, allowlisted
  sorting, bounded search input, deterministic ordering, and no unbounded relation loading or N+1
  query behavior.
- REQ-021: IDs shall be opaque, timestamps shall be timezone-aware, normalized contacts shall use
  dedicated indexed columns, and database constraints shall preserve tenant uniqueness and
  referential integrity.
- REQ-022: Support contexts shall expire after 30 minutes, shall not be silently extended, shall be
  revocable, and shall fail closed when the operator assignment or tenant is inactive. Changing the
  duration requires an explicit server-side configuration change within a maximum of 60 minutes.
- REQ-023: Logs, traces, metrics, analytics, and audit metadata shall not contain client names,
  phone numbers, emails, note bodies, support tokens, session tokens, or submitted form payloads.
- REQ-024: Client and Backstage routes shall meet the established TRIAD keyboard, focus, semantic,
  responsive, theme, reduced-motion, and non-color-only status conventions.
- REQ-025: The production rollout shall be reversible independently for the tenant client adapter
  and Backstage app, without rolling back an already-applied additive database migration.
- REQ-026: Support audit metadata shall be retained for 365 days by default and removed through a
  bounded scheduled cleanup; a future legal or contractual policy may replace that default.
- REQ-027: Organization configuration shall disable user-created organizations, organization
  deletion, and tenant-member invitation creation in the first slice; omit teams and dynamic roles;
  use static `owner`, `admin`, and `member` roles; use schema names compatible with the `idp_`
  prefix; and add the organization client plugin only
  for active-organization/session integration needed by Studio.
- REQ-028: The existing invite-gated account-creation contract shall remain authoritative for first
  access in this slice. Initial organization membership shall be assigned server-side by bootstrap;
  adopting Better Auth organization invitations for later tenant-member onboarding requires a
  separate compatibility design and shall not create a second first-access flow here.
- REQ-029: One Better Auth user ID shall be the stable global identity even when the same person is
  a tenant owner, a member of other tenants, a professional, a client, and a platform operator in
  different contexts; email shall remain a login/contact attribute rather than a relational key.
- REQ-030: One user shall be allowed up to 50 active Better Auth organization memberships, while
  exactly one tenant organization is active for ordinary business requests in a session. Attempts
  above the bound shall fail with a stable error and require an explicit product-policy revision.
- REQ-031: After fresh authentication, Studio shall enter `/overview` directly when exactly one
  tenant context is available and shall require `/select-workspace` when multiple tenant contexts
  exist. Backstage authority shall never be presented as a Studio context, and a Backstage-only
  identity shall receive the Studio no-workspace state.
- REQ-032: The authenticated Studio shell shall continuously identify the active tenant and provide
  a keyboard-accessible context switcher. Switching shall set the Better Auth active organization,
  clear or partition all tenant-bound query caches, and navigate only after the new server context
  is confirmed.
- REQ-033: Tenant membership role and professional status shall remain independent. A future
  tenant-owned professional record may reference a global user ID and coexist with `owner` or
  `member` membership, including one user working professionally in multiple organizations.
- REQ-034: A client record shall support a nullable future global-user reference, but this
  initiative shall not populate or expose it through email matching. Linking a client to an identity
  requires a future explicit, verified, consent-aware claim flow.
- REQ-035: A client relationship without an active organization membership shall grant no Studio
  route, API, organization-list, or workspace-selector access.
- REQ-036: Every active tenant shall have exactly one active principal `owner`. Creation and
  bootstrap shall establish it, and ordinary member removal, disablement, leave, or role-update
  operations shall never produce zero or multiple active owners.
- REQ-037: A tenant `admin` shall receive broad operational and member-management capabilities but
  shall not delete the organization, remove/disable/demote the owner, promote a user to owner, or
  execute ownership recovery.
- REQ-038: Normal ownership transfer shall accept only an active admin in the same tenant, require
  owner authentication no older than five minutes and explicit confirmation, and atomically exchange
  the roles so the former owner becomes admin. It shall be idempotent, auditable, and reject stale or
  concurrent transfer attempts.
- REQ-039: Exceptional ownership recovery shall be available only to an active CRV platform
  operator through a dedicated non-impersonating action requiring recent authentication, a support
  reason, typed tenant confirmation, and an active target admin. It shall preserve the same atomic
  invariant and produce a distinct high-severity audit event.
- REQ-040: Protected business actions shall use stable capability keys and a centralized
  server-side decision that evaluates authenticated identity, active tenant, active membership,
  static role grants, tenant status, subscription access, plan entitlement, and applicable quota.
  Neither hidden UI nor a client-provided access result shall authorize an API request.
- REQ-041: The API shall expose a bounded access summary for the active context containing granted
  capability keys, module entitlements, subscription access state, and relevant quota snapshots.
  It shall contain no authority token and may be used only to shape Studio UX.
- REQ-042: Studio shall omit navigation and actions that are irrelevant to a user's role, explain
  recoverable plan/quota restrictions near the attempted action, and render dedicated accessible
  forbidden, subscription-required, and quota-reached states for direct navigation or stale client
  state. Security shall never depend on concealment.
- REQ-043: A role-denied tenant member shall be able to create one pending access request per
  capability and tenant, with an optional bounded reason. Owners/admins shall be able to approve or
  deny it; approval may assign only an existing static role whose grants satisfy the capability,
  and every decision shall be audited. Email or push delivery is not required in this slice.
- REQ-044: The system shall persist a versioned, provider-neutral plan catalog with stable plan and
  feature keys, enabled module entitlements, and nullable integer quota limits. Historical
  subscriptions shall retain the plan-version facts needed to explain past decisions.
- REQ-045: Each tenant shall have at most one current subscription record with a normalized access
  state and effective period. This slice shall support a trusted manual/mock source for local,
  test, and controlled rollout use; absence, expiry, suspension, or cancellation shall fail closed
  according to the documented state matrix.
- REQ-046: Client creation shall prove quota enforcement with seeded non-commercial test tiers of
  5, 100, and 1,000 active clients. Archive reduces active usage; restore and create consume it.
  Existing client reads and archive operations remain available after the limit is reached.
- REQ-047: Quota-enforced mutations shall check and reserve capacity transactionally so concurrent
  requests cannot exceed the effective limit. Cached entitlement or usage snapshots may accelerate
  reads but shall never be the sole authority for a write; stale or unavailable cache shall fall
  back to the database decision.
- REQ-048: Access denials shall return stable reason codes that distinguish role, tenant,
  subscription, entitlement, and quota causes without leaking cross-tenant existence. Quota
  responses shall include safe current/limit values when the caller may view them.
- REQ-049: Durable documentation shall define the role-capability matrix, access-decision order,
  subscription state matrix, plan/entitlement/quota vocabulary, manual/mock operating procedure,
  cache consistency rules, denial UX, provider-integration seam, and the requirement to update the
  documentation whenever those contracts change.
- REQ-050: `apps/backstage` shall be an independent React/Vite application on local port `3003`,
  sharing the API and Better Auth identity contract while owning its routes, shell, runtime env,
  tests, production boundary, deployment target, documentation, and release surface.
- REQ-051: Studio shall remove `/platform` and support routes, platform navigation, and platform-only
  context routing; Studio shall expose only tenant memberships and shall never grant Backstage
  authority from a tenant or IDP role.
- REQ-052: Backstage shall reuse the proven Studio engineering baseline—TanStack Router and Query,
  Better Auth, Tailwind CSS v4, shadcn/Base UI primitives, Vitest, Playwright, Biome, accessibility,
  themes, production-boundary checks, and Brazilian Portuguese UX copy—without copying Studio
  business modules, fixtures, tenant shell, or tenant-selected authorization.
- REQ-053: Backstage shall expose an operator-gated tenant directory and tenant detail route with
  bounded search, pagination, status, creation metadata, aggregate counts,
  current manual subscription, entitlements, and quota usage without client PII by default.
- REQ-054: An authorized Backstage system owner or operations operator shall create a tenant with
  unique name/slug, an existing active owner resolved by exact normalized email, and an initial
  immutable provider-neutral manual plan version/current subscription through one auditable server
  transaction that cannot leave an ownerless or partially provisioned tenant. Pending-owner
  onboarding and commercial plan selection require a future product contract.
- REQ-055: Backstage operator assignments shall use explicit bounded roles (`system_owner`,
  `operations`, `support`, and `billing`) mapped to server-side capabilities; tenant membership and
  the IDP `admin` role shall grant none of them implicitly. Operator-management mutations are not
  exposed in this initial slice.
- REQ-056: Tenant lifecycle controls shall support suspend and reactivate with a required reason,
  optimistic concurrency, audit, and immediate fail-closed effects; hard deletion remains unavailable.
- REQ-057: Local development ports shall be API `8000`, Studio `3000`, Barber `3001`, Backstage
  `3003`, and landing page `3004`. Until `apps/barber` exists, port `3001` remains reserved and shall
  not be occupied by another Triad app.
- REQ-058: Backstage product and design documentation shall preserve the TRIAD family identity while
  defining a distinct internal-operations information architecture and shall establish durable
  Backstage AGENTS and development-skill guidance before feature expansion.

## Brainstorm

### Problem Framing

- What are we solving? The absence of a secure business ownership boundary and a first persisted
  domain, plus the owner's need to understand and support the tenant estate.
- Who is affected? Barbershop operators who need durable client records and CRV operators who need
  operational visibility and accountable support capabilities.
- What improves? Tenant client management becomes durable and production-capable; support moves
  from database/manual intervention to an explicit, reviewable workflow.

### Gaps And Unknowns

- Product gaps: the temporary Studio console cannot create or govern tenants, plans or internal
  operators and cannot serve as the future shared support surface for Studio and Barber.
- Technical gaps: there is no independent Backstage app/deployment/env contract, bounded internal
  role model, atomic UI-driven tenant provisioning API, or safe Studio-to-Backstage cutover path.
- Data/model gaps: client contacts are presentation-shaped strings today; canonical normalization,
  note bounds, optimistic version shape, and tenant lifecycle require explicit contracts.
- Operational gaps: no platform-operator provisioning/runbook, support-access audit review, or
  alert threshold exists.

### Counterpoints

- A global unrestricted “god mode” is fast to build but makes accidental cross-tenant disclosure,
  unattributed edits, and privilege escalation difficult to prevent or investigate.
- A read-only dashboard is simpler and safer, but it does not satisfy the stated need to help a
  tenant correct client data.
- Full user impersonation is more flexible but obscures the true actor and expands session, privacy,
  and authorization risk. It is not required for the first CRUD.
- A mature policy engine could model all future permissions, but it would front-load complexity
  before roles and workflows are validated.
- Hiding menus and buttons alone produces a cleaner interface but provides no security. Conversely,
  enforcing only at the API creates repeated dead ends and poor upgrade/access-request journeys.
- Calling a payment provider on every request would couple product availability to provider latency
  and availability. The runtime needs a local normalized subscription projection even after a real
  provider is selected.
- Treating cached counters as authoritative is fast but permits quota overruns under eviction,
  races, or invalidation failures. Transactional writes with cached read summaries are safer.
- Multiple equal authorization owners model real-world partnerships literally, but introduce
  reciprocal-removal, concurrent-transfer, quorum, account-compromise, and dispute-resolution rules
  that are disproportionate to this slice. Legal partners can use `admin` without becoming a second
  root authority.
- A single owner without admins is simpler but creates an operational bottleneck and encourages
  credential sharing; multiple admins preserve delegation without weakening ownership recovery.
- Doing nothing preserves safe prototypes but blocks production business data and forces future
  support through direct database access.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Global platform role with unrestricted tenant impersonation | Maximum flexibility and fast manual support | Weak attribution, broad blast radius, session and privacy risk | Do not choose for the first production slice |
| B | Better Auth organization tenancy plus separate platform assignment, aggregate inventory, and reason-bound support context | Reuses maintained organization/session/member behavior while meeting visibility and support needs with explicit attribution | Requires careful adaptation to existing invite gating and does not replace business authorization | Recommended |
| C | Read-only tenant inventory and client counts | Smallest and safest platform scope | Cannot correct client data for support | Choose if all cross-tenant writes are rejected during approval |
| D | Tenant CRUD only; platform operations later | Fastest client delivery | Leaves the system owner dependent on database access and delays the platform model | Choose only under a strict delivery deadline |
| E | Add centralized capabilities plus provider-neutral entitlements/quotas, proven by a manual subscription and client limit | Creates one reusable access contract, fast request decisions, coherent denial UX, and a safe billing seam | Adds schema, policy, UI, and concurrency work before a real provider is chosen | Recommended foundation extension |
| F | Extract global operations into independent TRIAD Backstage and add bounded tenant/operator administration | Preserves a clear internal-team boundary, supports Studio and future Barber equally, and allows independent deployment and growth | Adds a fourth deployed app and requires careful parity/cutover plus selective foundation reuse | Recommended revision |

### Recommendation

Choose Option B. Better Auth `organization` owns organization membership, static tenant roles, and
active-organization session state. The business API still revalidates those facts and owns client
authorization. The requested helicopter view remains a distinct platform boundary and supports
intervention without impersonation. The Better Auth `admin` plugin is rejected because its identity
administration surface includes capabilities such as password changes, bans, deletion, session
revocation, and impersonation that are unnecessary for tenant operations. Platform assignment,
support context, and audit evidence therefore remain separate business concepts.
Use exactly one technical `owner` per tenant and multiple `admin` memberships. This preserves a
single accountable ownership authority while giving partners and managers broad operational access.
Dedicated transfer and platform-recovery commands replace generic owner role mutation.
Add Options E and F to the selected foundation. Backstage becomes the only browser owner of global
operations; Studio returns to tenant-only management. Backstage reuses the proven Studio toolchain,
tokens and reviewed primitives, but owns a distinct internal shell and never imports Studio business
modules or tenant context. Keep four concepts separate: role capabilities answer who
may act; plan entitlements answer which modules are included; quotas answer how much may be used;
subscription state answers whether commercial access is currently valid. Persist the normalized
commercial state locally, enforce protected writes in the database transaction, and use bounded
cacheable summaries only for fast UI shaping and read-path optimization. The manual/mock source is
an explicit first adapter, not a fake payment integration.

## Architecture And Boundaries

- Site impact: Move the landing-page local development port from `3001` to `3004`; public product
  behavior remains unchanged.
- API impact:
  - Configure Better Auth `organization` under the IDP for organization, membership, static roles,
    active-organization session state, and server-only bootstrap operations.
  - Add a narrow business-context boundary that adapts Better Auth organization/session facts for
    business modules without moving domain policy into the IDP.
  - Add a `clients` module for domain validation, persistence, use cases, and tenant-scoped routes.
  - Evolve the existing `platform` module into the server boundary consumed by Backstage for
    operator assignments/RBAC, tenant provisioning and lifecycle, inventory/detail, support
    contexts, cross-tenant authorization, and audit metadata.
  - Add an `access-control` business boundary for stable capabilities, static role grants, access
    requests, and composed access decisions. It consumes IDP membership facts but does not live in
    the IDP.
  - Add a `subscriptions` business module for the plan catalog, plan versions, tenant subscription
    projection, entitlements, and quotas. Provider-specific billing remains outside this slice.
  - Compose module-owned Elysia plugins in the REST entrypoint and publish a committed OpenAPI
    contract. Do not add `/v1`.
- IDP impact: Enable and schema-map the Better Auth organization plugin, extend sessions with active
  organization, support multiple memberships, and expose only the organization list/set-active
  client behavior needed by Studio. Extend invite-gated onboarding so a Backstage tenant-provisioning
  command can establish a pending owner without enabling public signup. Keep client
  permissions, tenant operational workflows, platform intervention, and audit business rules out of
  `modules/idp`. Do not enable the Better Auth admin plugin or change public registration.
- Studio impact:
  - Add an HTTP implementation of the existing `ClientRepository` and enable it through explicit
    runtime source selection.
  - Add `/select-workspace` and an active-tenant switcher integrated with the authenticated shell.
  - Remove the temporary `/platform` and `/platform/support/*` surfaces after Backstage reaches
    parity; do not show Backstage authority as a Studio workspace.
  - Add centralized route/navigation/action guards and reusable forbidden, request-access,
    subscription-required, upgrade, and quota-reached states driven by the access summary.
  - Keep customer-only relationships outside the administrative context selector and Studio
    navigation.
- Backstage impact:
  - Add `apps/backstage` as an independently built/deployed authenticated React/Vite application on
    port `3003`, with its own operator gate, shell, routes, env contract, production-boundary check,
    tests, README, PRODUCT, DESIGN, AGENTS, and app development skill.
  - Port the existing tenant inventory and reason-bound support experience from Studio, then add
    tenant creation, detail, edit, suspension/reactivation, plan/subscription visibility, and bounded
    operator administration.
  - Reuse the Studio toolchain, TRIAD tokens, vetted primitives, accessibility contracts, and test
    maturity; do not copy tenant business modules or development fixtures.
- Data/persistence impact: Add schema-mapped Better Auth organization, member, and required
  organization-invitation models plus active-organization session fields. Map the unused first-slice
  organization invitation model distinctly from the existing access invitation table. Add a
  nullable, non-email-derived identity reference to clients for future verified claiming. Add clients,
  client notes, access requests, plan/version/entitlement/quota definitions, tenant subscriptions,
  Backstage operator roles, support contexts, provisioning/lifecycle audit tables with
  additive migrations, foreign keys, compound indexes, optimistic versions, and retention metadata.
  Teams and dynamic organization roles are not enabled.
- External provider impact: None in this slice. Better Auth and PostgreSQL are existing
  dependencies; the normalized subscription contract is intentionally ready for a separately
  selected billing provider and verified webhook adapter.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Tenant CRUD, access requests, paywalls, quota recovery, and cross-tenant support have primary and failure paths | `requirements-analysis`, `spec-writer` |
| Architecture | Applicable | Introduces clients, access control, subscriptions, and a separately deployed Backstage boundary | `triad-architecture`, `docs/api/conventions.md` |
| API | Applicable | New authenticated CRUD, access-summary/request, subscription/quota, platform, support, error, and OpenAPI contracts | `triad-api-development`, `elysia` |
| Identity and authorization | Applicable | Session identity feeds capability decisions while entitlements and quotas remain business rules outside IDP | `triad-idp-development`, `better-auth-best-practices` |
| Persistence | Applicable | Adds tenant, membership, client, access-request, plan, subscription, quota, operator, support, and audit data | `postgres-drizzle` |
| Studio UI | Applicable | Keeps tenant management and removes temporary internal-operation routes/context choices | `triad-studio-development` |
| Site UI | Applicable | Public behavior is unchanged, but local development moves to reserved port `3004` | `triad-site-development` |
| Accessibility | Applicable | Backstage shell, tables, tenant forms, support banner, focus, and responsive journeys require full coverage | `accessibility`, `impeccable` |
| Performance and scale | Applicable | Access decisions are hot-path; quotas must remain correct under concurrency while lists/counts stay bounded | API/Studio performance sections |
| Security and privacy | Applicable | Cross-tenant PII and elevated writes are the initiative's highest-risk capability | Security section below |
| Observability | Applicable | Support access, denials, conflicts, latency, and failures require metadata-only diagnosis | API conventions |
| Reliability and delivery | Applicable | Additive migrations, source rollout, support expiry, and rollback are required | Delivery section below |
| Testing and QA | Applicable | Tenant isolation, role matrix, persistence, UI, accessibility, and browser journeys are required | `triad-testing`, `triad-product-qa` |
| Documentation | Applicable | Durable boundaries, ports, Backstage workflows, skills, API, Studio, deployment, and runbooks change | Documentation plan |

## Performance And Scalability

- Expected data growth: tenants grow slowly relative to clients; clients and audit records are the
  primary unbounded collections. Administrative memberships are capped at 50 active organizations
  per user in this slice. Exact request/data capacity is not claimed before measurement.
- Critical paths: session-to-business-context resolution, capability/entitlement evaluation, quota
  reservation, client list/search, duplicate lookup, tenant inventory counts, and support
  authorization.
- Query bounds/pagination: client and tenant lists use bounded page sizes and indexed deterministic
  order. Counts are grouped in bounded SQL rather than per-tenant follow-up queries. Notes returned
  with client detail are bounded; list responses do not embed notes or appointments.
- Concurrency risks: concurrent client edits and support/tenant deactivation are resolved with
  version predicates and authorization checked within the mutation transaction where required.
- Access performance: role grants and immutable plan versions may be cached by stable version key.
  Subscription and quota summaries use short-lived or explicitly invalidated cache entries for UI
  reads. Protected writes revalidate subscription and reserve quota against PostgreSQL in the same
  transaction; cache failure degrades to database evaluation instead of granting or denying from
  stale state.
- External limits: no new provider limits. Database pool and request timeouts remain deployment
  constraints and must be exercised under representative synthetic load.
- Millions of records: no endpoint scans or returns all clients/audits; normalized-contact and
  tenant/order indexes preserve lookup shape. Search strategy must be measured with realistic data
  before claiming scale; PostgreSQL-native indexed search is preferred before external search.

## Security, Privacy, And Abuse

- Auth/session impact: existing Better Auth sessions identify the actor. Business context is
  resolved per request and never trusted from browser role metadata. Active-organization changes
  must not permit old tenant cache data or in-flight responses to render under the new context.
- Roles/access:
  - Better Auth organization `owner`, `admin`, and `member` roles map to client CRUD in this slice.
  - Exactly one active owner exists per tenant. Admins may manage operations and ordinary members
    but cannot change or create an owner.
  - Platform access requires a separate active assignment.
  - Platform detail/write access additionally requires an active support context for the target
    tenant and reason.
  - No implicit privilege follows from the existing IDP `admin` role.
- Initial capability matrix: all three active tenant roles receive client read/manage so existing
  staff workflows are not prematurely restricted; owner/admin receive ordinary member management;
  only owner receives normal ownership transfer. The access-request flow is proven by a member
  requesting an admin-level capability, with the UI clearly stating the broader role consequence.
  Later modules add capability keys to the same matrix rather than inline role comparisons.
- Decision order: authenticate, resolve active tenant and membership, confirm tenant/subscription
  state, check role capability, check plan entitlement, then check/reserve quota. Stable denial
  reasons stop at the earliest safe failure without revealing whether a foreign resource exists.
- UI enforcement: the access summary is advisory. Direct API calls, stale browser state, manipulated
  navigation, and hidden-button bypasses receive the same server-side decision.
- Commercial controls: plans and subscriptions contain no payment credentials. Manual subscription
  changes are trusted operator actions and are audited. Future provider payloads and secrets must
  remain server-side, be signature-verified, and be reduced to the normalized local projection.
- Ownership protection: use a database uniqueness strategy where compatible with the generated
  static-role schema plus transactions and hooks to prevent zero-owner or multiple-owner outcomes.
  Generic Better Auth remove, leave, disable, and role-update paths that could bypass the invariant
  must fail closed.
- Ownership transfer: require authentication within five minutes. Normal transfer is owner-only;
  exceptional recovery is platform-operator-only, non-impersonating, reason-bound, and visibly
  distinguished in audit evidence.
- PII/secrets: client name, phone, email, preferences, tags, and notes are private tenant data. The
  default platform inventory exposes counts and tenant metadata, not client PII.
- Identity linking: matching a client contact email to a login email is neither proof nor consent;
  no automatic linking, discovery, or cross-tenant customer correlation is allowed.
- Spam/abuse vectors: bounded search, notes, repeated support-context creation, duplicate lookup,
  and mutation attempts require input limits and request throttling where measured abuse justifies
  it. Authorization denials must fail before data-dependent responses leak record existence.
- Audit: append-only application behavior; changes require a reason and retain the real platform
  actor. Audit values describe action and IDs, never before/after PII payloads. Audit metadata is
  retained for 365 days by default and deleted in bounded batches after expiry.

## Accessibility And UX

- Keyboard flow: all tables, drawers, context actions, access requests, paywall actions, support
  entry/exit, pagination, and conflict recovery remain keyboard operable with deterministic focus
  return. Workspace selection and
  switching expose semantic names, organization and relationship labels, selected state, and safe
  focus placement.
- Screen reader states: loading, result counts, empty/error/forbidden/subscription-required/
  quota-reached/conflict states, completed mutations, and support-mode activation/expiry are
  announced appropriately.
- Responsive behavior: client management and Backstage tenant inventory work at 320 CSS pixels,
  zoom, desktop, light/dark themes, and reduced motion without hiding the active context or support
  indicator. The selector uses the existing authentication/Studio visual language, presents
  administrative tenant contexts as a semantic list and supports long names and the 50-context
  bound. Backstage uses its own operator shell and never appears as a Studio context.
- Loading/error/empty states: tenant unavailable, membership forbidden, no clients, no tenants,
  workspace-list loading/failure, no administrative context, context-switch failure, expired support
  context, subscription unavailable, module not included, quota reached, API timeout, and stale
  update have distinct recoverable presentation. Role denial offers a request-access action when an
  eligible approver exists; plan/quota denial offers an upgrade explanation without promising that
  self-service checkout exists.
- Duplicate submission prevention: mutations expose pending state, stable labels, and server-side
  concurrency/idempotency protection appropriate to each command.

## Logging And Observability

- Useful structured events: business-context denial reason, client operation name/outcome,
  platform inventory query outcome, support-context lifecycle, elevated read/write action, and
  optimistic conflict; ownership transfer/recovery attempt and outcome; fields are actor/tenant/
  target opaque IDs and request ID only.
- Additional access events: access-request lifecycle, subscription state transition, entitlement
  denial, quota reservation/release/denial, and cache fallback. Use stable plan/capability keys and
  numeric usage only; never log billing payloads or access-request free text.
- Metrics: request count/latency/error by route template and outcome; denials by safe reason class;
  access-decision and quota-reservation latency; quota denials; cache hit/fallback; conflicts;
  active/expired support-context events; database pool/query latency.
- Traces/spans: module/use-case and database spans with route templates and opaque IDs; no query
  values or request bodies.
- Alerts: sustained server errors, database readiness/pool exhaustion, and unexpected elevated
  access denial/failure patterns. Thresholds are set from observed baselines, not invented here.
- Must not log: names, emails, phones, notes, passwords, tokens, cookies, private headers, raw search
  terms, request/response payloads, or support-context credentials.

## Delivery And Rollback

- Compatibility strategy: keep the existing `ClientRepository` presentation port; introduce an
  HTTP adapter and committed contract mapping. Memory remains local/dev test tooling, never a
  production fallback.
- Feature flag/rollout: independently gate the Studio HTTP client source and Backstage deployment.
  Roll out database and API contracts first, deploy Backstage with one designated `system_owner`,
  prove tenant provisioning/support, then remove the temporary Studio platform routes. The two apps
  must not expose competing internal consoles during production cutover. A fail-closed commercial
  gate must not strand recovery/archive operations.
- Migration/backfill: generate and review the Better Auth 1.6.23 organization schema against the
  repository's explicit Drizzle schema, then create an additive migration. A one-off, idempotent
  server bootstrap creates the initial organization, owner membership, active-organization session
  behavior, and platform-operator assignment for an explicit existing IDP user. Synthetic fixtures
  are never migrated.
- Rollback: preserve the existing Studio platform implementation until Backstage parity and cutover
  evidence exist. Before removal, rollback re-enables that route; after removal, rollback deploys the
  prior Studio artifact while retaining additive tables. Never down-migrate tenant/client data.
- Operational readiness: bootstrap, operator revocation, support-audit inspection, tenant disable,
  manual subscription assignment/state change, quota reconciliation, cache invalidation, migration,
  rollback, and privacy-safe diagnosis require documented commands/runbooks. Durable architecture
  docs must label manual/mock billing as the current implementation and describe the trigger and
  contract for migrating to a real provider.

## Success Measures

- Success signals:
  - A tenant user completes persistent client create/edit/archive/restore/note flows across reloads.
  - Cross-tenant isolation and role-matrix tests pass for reads, writes, duplicate lookup, and notes.
  - The platform owner can find a tenant and see correct client/member counts without querying the
    database directly.
  - A reason-bound support correction is visibly elevated, expires, and produces attributable audit
    evidence.
  - Role-denied, plan-denied, and quota-denied journeys are distinguishable, recoverable, and match
    direct API enforcement.
  - Concurrent client creation/restoration never exceeds the effective plan limit, while archive
    and existing-data access remain usable at the limit.
- Baseline or measurement plan: establish API latency/error, client-list query, authorization denial,
  and support-action baselines in dev/hml using synthetic tenants; do not set unsupported capacity
  claims.
- Regression guardrails: authentication, invitation, site, production-boundary, API coverage, and
  Studio accessibility/build suites remain green.
- Evaluation window: review after initial internal operator usage and first tenant CRUD usage before
  expanding platform interventions or starting the next domain.

## Acceptance Criteria

- [ ] AC-001: Given two tenants with clients, an authenticated member of tenant A cannot infer,
  list, retrieve, duplicate-check, update, archive, restore, or annotate any tenant B client even
  when the tenant B IDs are known.
- [ ] AC-002: An explicit bootstrap associates the existing administrator with one barbershop as
  owner and separately assigns platform-operator authority; rerunning it is safe and public signup
  remains closed.
- [ ] AC-015: Better Auth organization is configured with user-created organizations, organization
  deletion, and member invitation creation disabled; static `owner`/`admin`/`member` roles; no teams or
  dynamic roles; reviewed
  `idp_` schema mapping; and active organization available from the session. Its required invitation
  model is distinct from existing access invitations, and the admin plugin is absent.
- [ ] AC-016: Existing invite-gated account creation and password flows remain green, and this slice
  introduces no competing organization-invitation acceptance journey.
- [ ] AC-017: A single global user can be owner of tenant A and member of tenant B, select either
  after login, and receive only the selected tenant's client data and permissions.
- [ ] AC-018: A Studio user with exactly one tenant context reaches `/overview`, a user with multiple
  tenant contexts reaches `/select-workspace`, and a Backstage-only identity sees no Studio workspace;
  no tenant business query runs before tenant selection.
- [ ] AC-019: The shell always names the active tenant and can switch tenants without signing out;
  stale or in-flight tenant A data never renders after tenant B becomes active.
- [ ] AC-020: Tenant membership role and future professional linkage are independently representable,
  so an owner may also work as a professional locally and a member may work professionally in a
  different tenant without duplicating the global identity.
- [ ] AC-021: A client can exist with no global identity reference; equal contact and login emails do
  not create a link, and a client-only relationship grants no Studio or organization access.
- [ ] AC-022: Workspace selection and switching pass keyboard, screen-reader, focus, 320-pixel,
  zoom, theme, loading, empty, error, and long/many-organization content checks.
- [ ] AC-023: Tenant creation, bootstrap, member removal/disablement, leave, and role changes preserve
  exactly one active owner under success, failure, retry, and concurrent requests.
- [ ] AC-024: Multiple admins may coexist and perform accepted operational/member-management work,
  but none can remove, disable, demote, replace, or create an owner through direct or generic Better
  Auth organization endpoints.
- [ ] AC-025: A recently authenticated owner can atomically transfer ownership to an active admin;
  the former owner becomes admin, stale authentication/target/version requests fail safely, retries
  are idempotent, and audit identifies both users without PII.
- [ ] AC-026: Only a platform operator can execute exceptional recovery, and the command fails
  without recent authentication, reason, typed tenant confirmation, or active target admin; success
  emits a distinct high-severity audit event and never impersonates either tenant user.
- [ ] AC-027: A server-reviewed role-capability matrix drives every protected client and tenant
  action; hidden navigation, omitted buttons, manipulated URLs, stale access summaries, and direct
  API calls cannot bypass the authoritative access decision.
- [ ] AC-028: Direct navigation produces distinct accessible forbidden, subscription-required,
  module-not-included, and quota-reached states. Eligible role-denied members can submit a deduplicated
  access request, and an owner/admin can approve or deny it with an audited static-role outcome.
- [ ] AC-029: A versioned local plan catalog and one current manual/mock tenant subscription can be
  provisioned, changed, expired, suspended, and inspected through documented trusted operations;
  the documented state matrix and API decisions agree without any payment-provider dependency.
- [ ] AC-030: Seeded test tiers enforce 5, 100, and 1,000 active-client limits. At the limit, create
  and restore fail with safe usage metadata, while list/read/archive remain available and archive
  releases capacity for a subsequent create or restore.
- [ ] AC-031: Concurrent create/restore attempts at one remaining slot produce no more than one
  successful capacity-consuming mutation. Cache eviction, staleness, or unavailability falls back
  to the authoritative database path and cannot grant excess usage.
- [ ] AC-032: The active-context access summary contains only bounded capabilities, entitlements,
  subscription state, and viewable quota snapshots; switching tenant clears or partitions it, and
  no summary field is accepted as server authority.
- [ ] AC-033: Durable API, Studio, authorization, subscription, quota, and operations documentation
  describes the implemented manual/mock state, provider-evolution seam, cache/consistency contract,
  and denial UX, and contains no claim that production billing exists.
- [ ] AC-003: The real Studio client route persists create, edit, archive, restore, and note changes
  across a reload and presents server pagination, filters, search, sorting, validation, and duplicate
  warnings in Brazilian Portuguese.
- [ ] AC-004: Client list responses do not embed notes or appointment histories; client detail
  returns bounded notes and empty/null appointment-derived fields until scheduling integration.
- [ ] AC-005: Stale concurrent client/note mutations return a stable conflict and do not overwrite
  the winning value; the Studio offers a safe reload/retry path.
- [ ] AC-006: A tenant user without an active membership and an IDP admin without explicit platform
  assignment receive forbidden responses without cross-tenant existence disclosure.
- [ ] AC-007: Backstage lists paginated tenants with correct tenant/member/client counts
  and no client PII in its default response or UI.
- [ ] AC-008: A platform operator cannot read client details or mutate tenant data until a valid
  reason-bound support context exists for that tenant.
- [ ] AC-009: While support mode is active, Backstage persistently identifies the target tenant and
  elevated context; expiry or exit immediately fails closed and returns the operator to the platform
  boundary.
- [ ] AC-010: Elevated detail reads and mutations record operator ID, tenant ID, action, opaque target
  ID, reason reference, request ID, outcome, and timestamp without client values or authentication
  material.
- [ ] AC-011: Tenant/client/platform queries remain bounded, use reviewed indexes and deterministic
  pagination, avoid N+1 tenant counts, and have query-plan/load evidence at a documented synthetic
  dataset size.
- [ ] AC-012: Keyboard, screen-reader, 320-pixel, zoom, theme, reduced-motion, tenant role, platform
  role, denial, empty, loading, error, conflict, and support-expiry journeys have reviewable evidence.
- [ ] AC-013: Additive migrations, bootstrap, staged rollout, operator revocation, application
  rollback, and privacy-safe operational diagnosis are documented and verified in a non-production
  environment.
- [ ] AC-014: API, Studio, Backstage, and site checks, coverage gates, production-boundary builds, and applicable
  Playwright/Product QA journeys pass without regressing authentication or exposing synthetic memory
  data in production artifacts.
- [x] AC-034: `apps/backstage` runs independently on port `3003`, rejects unauthenticated and
  non-operator users, and never accepts Studio workspace state or tenant membership as internal
  authority.
- [x] AC-035: The Backstage tenant directory and detail route expose bounded operational metadata,
  current provider-neutral subscription state and any configured quota without default client PII;
  search, pagination, direct URL, loading, empty, error, and retry states are verified.
- [x] AC-036: A `system_owner` or `operations` operator can create a tenant with exactly one owner and
  an initial provider-neutral manual subscription using an existing active exact-email identity.
  Duplicate slugs fail safely and a transaction failure leaves no ownerless or partially provisioned
  tenant. Pending-owner invitation provisioning is explicitly deferred.
- [x] AC-037: Backstage enforces `system_owner`, `operations`, `support`, and `billing` capabilities
  server-side; IDP admin and tenant roles grant no internal access and disabled operators fail closed.
  Operator-management mutations, including final-owner safeguards, are outside this initial slice.
- [x] AC-038: Authorized tenant suspension and reactivation require an audited reason,
  reject stale versions, produce privacy-safe audit evidence, and take effect on the next tenant or
  support request; hard deletion is absent.
- [x] AC-039: Studio contains no `/platform` route, support-session state, global inventory request,
  or Backstage context selector entry after migration, while all tenant selection and client journeys
  remain green.
- [x] AC-040: Local development and documentation consistently reserve API `8000`, Studio `3000`,
  Barber `3001`, Backstage `3003`, and landing page `3004`; trusted origins and test callbacks cover
  only the apps that require authenticated API access.
- [x] AC-041: Backstage preserves the TRIAD design language and Studio engineering quality floor,
  has its own PRODUCT/DESIGN/AGENTS/README and development skill, passes keyboard, screen-reader,
  320-pixel, zoom, light/dark, reduced-motion and visual review, and ships no Studio fixtures or
  tenant business modules.

## Verification Plan

- Unit tests: organization-plugin configuration, owner invariant/transfer/recovery state machine,
  multi-membership/context-routing matrix, capability/entitlement/subscription/quota decision
  matrices, access-request transitions, business-context decision matrix, normalized
  contacts, duplicate detection, validation, optimistic versions, support-context lifecycle, audit
  redaction, query parsing, Studio adapters, error mapping, and components.
- Integration/API tests: Better Auth generated-schema drift, migrations, foreign keys/constraints,
  active-organization session and membership resolution,
  two-tenant isolation for every client operation, transactional quota races/cache fallback,
  subscription transitions, operator role matrix, support expiry/revocation, audit transactions,
  pagination/filter/sort, N+1 guard, and safe errors/OpenAPI.
- UI tests: single/multiple/no-context login routing, workspace selection and switching, cache
  isolation, tenant client CRUD, duplicate inspection, conflicts, role-hidden navigation/actions,
  direct-route denials, access request/review, paywall and quota recovery, platform inventory,
  support entry/banner/exit/expiry, loading/error/empty states, accessibility, and responsive behavior.
- Manual/browser checks: owner, member, non-member, IDP-admin-only, platform operator without
  support context, platform operator with support context, admin attempting owner changes, normal
  ownership transfer, exceptional recovery, and revoked operator at desktop and 320-pixel viewport.
  Include active, expired, suspended, missing-entitlement, below-limit, at-limit, and concurrent
  quota journeys with cache available and unavailable.
- Build/check commands:
  - `bun --filter api check`
  - `bun --filter api coverage:check`
  - `bun --filter studio check`
  - `bun --filter studio test:e2e`
  - `bun --filter backstage check`
  - `bun --filter backstage test:e2e`
  - `bun --filter site check`
  - relevant migration verification and query-plan/load scripts defined by the implementation plan
  - root production-boundary and preflight checks applicable at handoff

## Open Questions

### Blocking

- None. The narrowest reversible product decisions are specified for approval.

### Non-Blocking

- [ ] What additional platform interventions are actually needed beyond client correction? — review
  support evidence after this slice; require a new approved initiative for expansion.
- [ ] How should a future customer-facing product expose a claimed identity? — define in a separate
  customer-identity initiative; do not add customer contexts to Studio.
- [ ] Does a future contract require audit retention longer or shorter than 365 days? — review
  contractual requirements before changing the default through a separately reviewed decision.
- [ ] Which search implementation meets production scale? — begin with bounded indexed PostgreSQL
  behavior and select alternatives only from measured query evidence.
- [ ] Which billing provider, checkout flow, grace-period policy, commercial plan names/prices, and
  production limits should be adopted? — validate separately before provider integration; preserve
  the normalized contracts and replace seeded test tiers through versioned configuration.
- [ ] When should the reserved `apps/barber` application be created? — port `3001` remains reserved;
  define its product scope in a later approved initiative rather than scaffolding an empty app here.

## Assumptions

- Gabriel's existing IDP user is the initial tenant owner and sole platform operator — validate by
  explicit email/user ID input during bootstrap; do not hard-code identity data.
- Better Auth `1.6.23` remains pinned during this initiative — review the version-specific plugin
  schema and behavior; any package upgrade is a separate decision with its own compatibility checks.
- Tenant `owner`, `admin`, and `member` may manage clients in the first slice; differentiation is
  proven with member-management and ownership capabilities — validate with early product use and
  refine the static matrix through a later initiative rather than adding per-user grants now.
- Platform support may correct client records but never impersonate users — validate during approval
  and internal support usage.
- A single global user may hold many memberships, but ordinary business API calls operate against
  one confirmed active organization at a time — validate with cross-tenant switching tests.
- Plan tiers of 5, 100, and 1,000 clients are development acceptance fixtures only — commercial
  limits require a later product decision and a new immutable plan version.
- The first subscription source is trusted manual/mock administration in non-production or a
  controlled rollout — no UI or documentation may imply that payment has been collected.
- Backstage inherits the established TRIAD family design language and engineering conventions but
  owns an internal-operations shell and information architecture — validate its product/design
  artifacts and visual direction before UI implementation.
- `apps/barber` is not created by this revision; only its future local port `3001` is reserved.

## Definition of Ready

- [x] All mandatory gates in `planning-gates.md` pass.
- [x] Requirement-to-acceptance-to-task traceability is complete.
- [x] The planning state is `Ready` before requesting approval.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-04 | Awaiting approval |  | Initial proposal: tenancy, client CRUD, and bounded platform operations |
| 2026-09-04 | Changes requested | User | Evaluate Better Auth plugins for tenancy |
| 2026-09-04 | Awaiting approval |  | Revised to adopt Better Auth organization and reject admin/impersonation for platform operations |
| 2026-09-04 | Changes requested | User | Add multi-membership, contextual professional/client identities, and workspace selection |
| 2026-09-04 | Awaiting approval |  | Revised for one global identity, multiple administrative contexts, and safe workspace switching |
| 2026-09-04 | Changes requested | User | Define multi-owner governance and owner-removal protections |
| 2026-09-04 | Awaiting approval |  | Revised to one principal owner, multiple admins, atomic transfer, and audited platform recovery |
| 2026-09-04 | Changes requested | User | Add permissions UX, access requests, subscription paywall, plan entitlements, quotas, performance, and durable documentation |
| 2026-09-04 | Awaiting approval |  | Revised with centralized capabilities, mock subscription foundation, transactional client quota, denial UX, and provider-evolution docs |
| 2026-09-04 | Approved | User | Approved for implementation; execution will be handled by another agent |
| 2026-09-04 | Changes requested | User | Move all global administration out of Studio into the independent TRIAD Backstage app and reserve the product-family ports |
| 2026-09-04 | Awaiting approval |  | Revised in-place with Backstage ownership, tenant provisioning/lifecycle, internal RBAC, Studio extraction, deployment, ports, and quality gates |
| 2026-09-04 | Approved | User | Approved Backstage revision with tenant creation, subscription visibility, basic tenant statistics, and a testable client-registration journey |
