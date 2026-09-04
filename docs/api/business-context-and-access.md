# Business Context And Access Contract

This document freezes the first multi-tenant business contract introduced by Initiative 19. It is
the implementation contract for tenant selection, client management, platform support, commercial
access decisions, and their HTTP vocabulary. Identity remains global; business authority is always
resolved for one current context.

## Boundary And Authority

- Better Auth `1.6.23` owns global users, sessions, organizations, and organization memberships.
- `modules/idp` configures those identity primitives. It does not own client, plan, subscription,
  quota, access-request, platform-operator, support-context, or support-audit rules.
- A Better Auth organization is the stable tenant identifier for one barbershop.
- A caller-provided organization ID is selection input or a platform support target only. It never
  grants authority.
- Ordinary business requests resolve the user and `activeOrganizationId` from the authenticated
  session, then re-read the active organization and membership. Disabled organizations or
  memberships fail closed.
- Platform authority is a separate active assignment to a global user. It is not inferred from an
  IDP role or an organization role and does not impersonate a tenant member.
- Resource lookups include tenant scope in the database predicate. A known foreign resource ID
  receives the same not-found result as an unknown ID.

## Better Auth Organization Configuration

The server organization plugin uses these fixed choices:

| Option | Decision |
| --- | --- |
| Package | Pinned `better-auth@1.6.23` |
| Organization creation | `allowUserToCreateOrganization: false` |
| Organization deletion | `disableOrganizationDeletion: true` |
| Creator role | `owner` |
| Static roles | `owner`, `admin`, `member` |
| Dynamic roles | Disabled |
| Teams | Omitted |
| Member invitations | No product route or UI; plugin-required persistence remains isolated |
| Admin plugin | Not enabled |
| Session field | `activeOrganizationId` mapped to `idp_sessions.active_organization_id` |
| Model names | `organization`, `member`, and `organizationInvitation` mapped to `idp_*` tables |

The plugin-required organization invitation is `idp_organization_invitations`. It is not the
existing `idp_invitations` first-access proof, has no acceptance UI in this slice, and cannot be used
to bypass invite-gated account creation.

Organization and member operational `status` fields are server-managed additional fields with
`input: false`. Supported values are `active` and `disabled`. A user can have at most 50 active
memberships. Trusted membership creation rejects the fifty-first membership with
`membership_limit_reached`.

## Identity And Relationship Model

- One `idp_users.id` remains the global person identity across all contexts.
- Membership answers whether a user may administer a tenant; its role is `owner`, `admin`, or
  `member`.
- A future professional is a tenant-owned business record that may reference `idp_users.id` and is
  independent from membership.
- A client is a tenant-owned customer record. Its nullable `globalUserId` is never populated by
  contact matching and grants no authentication, organization listing, or Studio access.
- Email is a login/contact attribute, never a relational identity key.
- Every active tenant has exactly one active principal `owner`. Multiple `admin` members are
  permitted. Generic member operations cannot create, demote, disable, remove, or replace the
  principal owner.

## Administrative Context Routing

`GET /api/contexts` returns at most 50 active tenant contexts plus an optional platform context. It
does not include client relationships.

| Available contexts after fresh authentication | Destination |
| --- | --- |
| No tenant and no platform assignment | Stable forbidden/no-context state |
| Exactly one tenant, no platform assignment | Set/confirm it and enter `/overview` |
| No tenant, active platform assignment | `/platform` |
| Two or more contexts of either kind | `/select-workspace` |

Tenant selection uses `POST /api/contexts/active`. The endpoint accepts one `organizationId`,
verifies an active membership and active organization for the authenticated user, and persists the
selection only on the current session. Studio navigates only after confirmation, partitions all
tenant query keys by organization ID, and cancels/removes old-context data. Backstage authority
never creates a synthetic organization membership.

## Capability Contract

Capability keys are stable English machine values:

- `clients.read`
- `clients.manage`
- `members.read`
- `members.manage`
- `ownership.transfer`
- `access_requests.review`

The initial static tenant matrix is:

| Capability | owner | admin | member |
| --- | ---: | ---: | ---: |
| `clients.read` | yes | yes | yes |
| `clients.manage` | yes | yes | yes |
| `members.read` | yes | yes | no |
| `members.manage` | yes | yes, except principal-owner changes | no |
| `ownership.transfer` | yes | no | no |
| `access_requests.review` | yes | yes | no |

Support contexts grant the platform operator only the client capabilities for their selected
tenant. They do not grant membership or ownership capabilities.

## Commercial Access Contract

Authorization evaluates, in order, authenticated identity, selected context, tenant/member status,
role capability, subscription state, plan entitlement, then mutation quota. Evaluation stops at the
first denial. UI summaries never replace this server decision.

Stable denial codes are:

- `unauthenticated`
- `context_required`
- `tenant_forbidden`
- `capability_forbidden`
- `subscription_required`
- `subscription_inactive`
- `module_not_included`
- `quota_reached`

Subscription states are `active`, `expired`, and `suspended`. Only `active` permits entitled work.
Plans use stable plan keys and immutable versions. Entitlements name a capability/module key and an
optional quota key. The first quota is `clients.active.count`; development fixtures have limits 5,
100, and 1,000 and are not commercial commitments.

At the client limit, reads and archive remain available. Create and restore reserve capacity in the
same database transaction as the mutation. Cached counts and access summaries are hints only; the
database is the final write authority.

Role-denied members can create one pending access request per tenant/capability. Approval selects an
existing static role; it never creates an ad hoc grant. Plan and quota denials do not create access
requests.

## Client Resource Contract

### Bounds and normalization

| Value | Bound / rule |
| --- | --- |
| Name | Trimmed, 1–160 Unicode characters |
| Phone | Optional input; normalized E.164-like digits with optional leading `+`, max 16 characters |
| Email | Optional input; trimmed, lowercase, max 254 characters |
| Contact rule | At least one normalized phone or email |
| Preference note | Plain text, max 1,000 characters |
| Tags | At most 20; each trimmed and max 60 characters |
| Service preferences | At most 20; each trimmed and max 100 characters |
| Client note | Plain text, 1–2,000 characters |
| Search | Trimmed, max 120 characters |
| Page size | `10`, `20`, or `50`; default `20` |

Exact normalized phone/email duplicates are warnings scoped to the active tenant. They do not block
a save. List payloads exclude notes and appointments. Detail payloads bound notes to 100 newest
items and expose appointment-derived values as `null` or empty lists until scheduling owns them.

Client and note resources expose an integer `version`. Update, archive, restore, note update, and
note removal require the last observed version. The database predicate includes that version and
increments it atomically. A miss caused by a stale version returns `version_conflict` with no silent
overwrite; the current representation may be returned only after a fresh tenant-scoped lookup.

## HTTP Vocabulary

All routes are under `/api`, without `/v1`. JSON fields use camel case. Timestamps are ISO 8601 UTC.

### Tenant context and access

- `GET /api/contexts`
- `GET /api/access-summary`
- `POST /api/access-requests`
- `GET /api/access-requests`
- `POST /api/access-requests/{requestId}/approve`
- `POST /api/access-requests/{requestId}/deny`
- `POST /api/ownership/transfers`

### Tenant clients

- `GET /api/clients`
- `GET /api/clients/tags`
- `POST /api/clients`
- `POST /api/clients/duplicates`
- `GET /api/clients/{clientId}`
- `PATCH /api/clients/{clientId}`
- `POST /api/clients/{clientId}/archive`
- `POST /api/clients/{clientId}/restore`
- `POST /api/clients/{clientId}/notes`
- `PATCH /api/clients/{clientId}/notes/{noteId}`
- `DELETE /api/clients/{clientId}/notes/{noteId}`

List query fields are `page`, `pageSize`, `search`, `status`, `contact`, `duplicate`, `tag`,
`sortBy`, and `sortDirection`. Sort fields are allowlisted: `name`, `createdAt`, `lastVisitAt`, and
`nextAppointmentAt`; unavailable appointment projections sort deterministically after available
values. Ordering always adds `id` as a tie-breaker.

`GET /api/clients/tags` returns at most 100 distinct tags from the active tenant for filter
facets. Tag filtering is case-insensitive and remains server-side; Studio must not derive the
catalog only from the currently loaded page.

### Backstage operations

- `GET /api/backstage/me`
- `GET /api/backstage/inventory`
- `GET /api/backstage/tenants/{tenantId}`
- `POST /api/backstage/tenants`
- `PATCH /api/backstage/tenants/{tenantId}`
- `POST /api/backstage/support-contexts`
- `GET /api/backstage/support-contexts/{contextId}/tenant-summary`
- `GET /api/backstage/support-contexts/{contextId}/clients`
- `POST /api/backstage/support-contexts/{contextId}/revoke`
- `GET /api/backstage/operators`

Backstage inventory is bounded to a maximum page size of `50`, ordered by creation date and `id`,
and optionally filtered by barbershop name. It returns tenant metadata and aggregate member/client
counts, subscription state, plan, and client quota, never client contact fields.

Creating a barbershop accepts its name and owner email. The server owns slug generation using the
normalized name plus a random five-character suffix. Active users become owners immediately;
unknown users receive an invite, and their pending organization ownership becomes active only after
the identity invitation is consumed.

Support-context creation accepts a target tenant ID, a trimmed reason of 10–500 characters, and a
duration of 1–60 minutes. The server issues an opaque credential, stores only its digest, and does
not use sliding extension. Revocation, expiry, inactive
operator, inactive tenant, or target mismatch fails closed.

## Response And Error Contract

Successful list responses use:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 0,
  "totalPages": 0
}
```

CRV-owned errors use a safe code-only envelope and the response `X-Request-ID` header:

```json
{
  "code": "version_conflict",
  "requestId": "opaque-request-id",
  "details": {}
}
```

Stable resource codes include `invalid_request`, `unauthenticated`, `context_required`,
`tenant_forbidden`, `capability_forbidden`, `subscription_required`, `subscription_inactive`,
`module_not_included`, `quota_reached`, `resource_not_found`, `version_conflict`,
`membership_limit_reached`, `support_context_required`, `support_context_expired`, and
`internal_error`. Safe quota details may contain only `quotaKey`, `usage`, and `limit`. Client names,
contacts, notes, search terms, request bodies, credentials, cookies, private headers, and raw
exceptions never appear in errors, logs, traces, metrics, or audit metadata.

## Support Audit Contract

Audit rows are append-only through application permissions and record only actor ID, tenant ID,
action, opaque target ID when present, support-context ID, reason reference, request ID, outcome,
severity, and timestamp. Lifecycle, elevated detail reads, and all elevated mutations are audited.
Normal ownership transfer and exceptional platform recovery use distinct actions; recovery is high
severity. Audit records expire after 365 days and are deleted by a bounded scheduled cleanup.

## OpenAPI Implementation Notes

- Every business route declares success plus validation, authentication, authorization, not-found,
  conflict, commercial denial, and unexpected-error responses that apply to it.
- Schemas separate client list and detail projections and never expose persistence records directly.
- Route handlers receive an already authenticated identity dependency, but business use cases still
  resolve tenant/platform authority through explicit injected ports.
- Platform support DTOs never accept an organization role. The support-context credential selects
  an already authorized server record; it does not contain trusted caller claims.
- OpenAPI examples use synthetic non-PII values and describe machine codes in English. Studio owns
  Brazilian Portuguese presentation copy.

## Requirement Traceability

This contract implements the design boundary for REQ-001–REQ-003, REQ-005–REQ-018, and
REQ-027–REQ-049. Runtime behavior and evidence are delivered by TASK-002–TASK-024; this document
does not by itself satisfy those acceptance criteria.
