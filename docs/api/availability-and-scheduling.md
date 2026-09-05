# Availability and scheduling

Initiative 22 adds sibling `availability` and `scheduling` modules to the Bun/Elysia API.
Identity remains in IDP. Every request resolves the active tenant from the authenticated session
before looking up a business resource; a caller cannot select an organization in a request payload.

## Existing environment upgrade

Apply the pending Drizzle migrations to the explicitly confirmed development database before
testing an existing installation. Starting the API does not apply migrations. Migration 0001
adds the scheduling tables and nullable unit timezone, 0002 adds availability idempotency, and
0003 adds availability/scheduling entitlements to existing enabled catalog plans. It preserves
explicit entitlement denials and does not enable unrelated plans. Run `bun run db:migrate`
from `apps/api` only after confirming the database target. The isolated scheduling QA runner
does not upgrade the database configured in the ordinary API `.env`.

A `403` response must be diagnosed using its response `code`; a valid login alone does not
establish tenant context or commercial authorization. Missing tables are a separate migration
failure and must not be addressed by bypassing authorization.

## Access and contracts

All paths below are relative to `/api`. Owner/admin can manage availability. Active tenant members
can read availability and read/manage appointments, subject to `availability.read`,
`availability.manage`, `scheduling.read`, and `scheduling.manage` commercial entitlements.
Missing access fails closed. The existing access configuration script includes these capabilities.

| Method/path | Behavior |
| --- | --- |
| GET `/availability/summary` | Tenant availability configuration count |
| GET `/availability` | Unit/professional recurring projection; required start/end, at most 42 local dates; optional archived rules |
| GET `/availability/series/:id` | Current tenant-owned rule and version for explicit stale reload |
| POST `/availability/series` | Create available, break, blocked, or absence rule |
| PATCH `/availability/series/:id` | Versioned edit/archive/restore, explicitly scoped to series or dated occurrence |
| PUT `/availability/units/:id/timezone` | Explicit IANA timezone confirmation with unit version |
| GET `/scheduling/units` | At most 50 active units; bounded search |
| GET `/scheduling/options` | At most 50 active professionals/services each, unit relationships, remote search and selected-ID hydration |
| GET `/scheduling/range` | At most seven local dates, visible appointments and separate private occupancy |
| GET `/scheduling/appointments` | Server filters, date sort, page/pageSize; at most 366 dates and 50 rows/page |
| GET `/scheduling/appointments/:id` | Snapshot and lifecycle history, 50 events/page using `page` |
| POST `/scheduling/appointments` | Create from canonical client/unit/professional/service IDs |
| PATCH `/scheduling/appointments/:id` | Edit scheduled/confirmed appointment with expected version |
| POST `/scheduling/appointments/:id/reschedule` | Explicit reschedule command |
| POST `/scheduling/appointments/:id/{confirm,check-in,cancel,no-show}` | Public lifecycle commands |
| GET `/scheduling/clients/:id/history` | 20 historical rows/page and next active appointment |
| GET `/scheduling/professionals/:id` | Up to 20 appointments in a bounded 30-day projection |

Mutation requests require a UUID `Idempotency-Key`. Existing-resource mutations require `version`.
A command receipt stores tenant/actor/key, an HMAC fingerprint, action, resource ID/version and time;
it never stores the request body. A repeated key and matching request does not mutate again. Booking
replay returns the current resource; its version may have advanced since the original command.
A reused key with a different payload fails with a conflict. Clients keep the key through network
and server failures, then clear it after success or an expected rejected command.

## Time and availability

Existing units receive nullable `timezone`; migrations never guess one. Confirm an IANA identifier
before writing availability or appointments. Once any rule exists, timezone changes are refused.
The local date/time conversion rejects nonexistent and ambiguous DST times. Starts use 15-minute
increments. Appointment duration and price are resolved from the current eligible service on create;
ordinary notes/status edits preserve those snapshots. Material service/professional changes revalidate
catalog eligibility. UTC instants, original local date/time, timezone and display labels are persisted.

Weekly series have weekdays, inclusive effective bounds and excluded dates. Occurrence edits add an
exclusion and dated override in one transaction. Archive and restore preserve identity/history.
Effective availability requires a containing positive rule and no intersecting negative rule.
Unit hours and active professional/user/membership and all three catalog assignments are checked again
inside the booking transaction. The board clips offered availability to current opening periods;
the write-side validation remains authoritative for complete service intervals.

## Concurrency, history and bounded reads

Tenant-scoped PostgreSQL advisory transaction locks serialize schedule/availability writes. Compound
foreign keys enforce tenant links. A GiST exclusion constraint on tenant, professional and `[start,end)`
UTC ranges prevents double booking across units even if the application check is bypassed. Canceled
and no-show records release occupancy. Existing future bookings prevent invalidating availability.

Create/edit/reschedule/status commands append metadata-only lifecycle events atomically. Public
commands expose scheduled/confirmed/arrived/canceled/no-show behavior. No-show requires the start to
have passed. `transitionFromFulfillment` is the narrow internal port for arrived → waiting →
in-progress → completed; no generic status or fulfillment REST mutation is mounted by this module.

Range results cap appointments, private occupancies and rules at 2,000, returning an explicit capacity
error instead of truncating. Private occupancy contains only a response-local opaque ID, professional,
date, start and duration: filtering out a booking must not make its slot available or reveal its client.
Lists/counts, client next appointment and histories use set-based queries and tenant-leading indexes.
Archived catalog labels remain readable from appointment snapshots. Client `lastVisitAt` remains null;
this initiative does not infer a completed visit from a booking.

## Observability and operations

Structured request telemetry contains the route template, request correlation ID, tenant/actor,
HTTP result, safe result code, bounded result count/range and elapsed time. Event history excludes
notes and contact values. Never log bodies, search strings, private headers, tokens or command keys.
Sentinel tests cover safe error/event/receipt boundaries. Inspect conflicts, capacity rejections and
latency by route; investigate sustained p95 above 500 ms or increasing conflict/capacity rates before
raising limits. The isolated 10,000-row query-plan rehearsal is evidence of index use, not a production
capacity guarantee. Retention/partitioning and receipt expiry require a separate measured policy;
receipts currently remain durable so retries cannot accidentally duplicate an expired command.

## Additive rollout and local verification

Apply the existing Initiative 21 migration history and additive `0018`–`0020` migrations before enabling HTTP consumers.
`btree_gist` must be available to the migration role. Do not regenerate or rewrite the baseline to
install scheduling. Roll back the application/source to its prior disabled scheduling behavior while
retaining additive tables/columns and stored bookings; no destructive down migration is provided.
Previous catalog column reads/writes remain compatible. Re-enable HTTP after correction and rerun the
real journeys. Deployment/release publication remains a separate explicit action.

From the workspace root, run `bun scripts/scheduling-local-qa.ts` with Docker available. It uses only
loopback PostgreSQL 55442, API 8102 and Studio 3102, preserving normal ports 8000/3000. The fixture
accepts only the dedicated local QA database and writes synthetic credentials to ignored
`apps/api/.artifacts/initiative22/credentials.json`. Existing QA bookings are retained on restart.
Do not point the destructive integration suite at the browser QA database; use a separate disposable
`initiative22_suite_test` database and `TEST_DATABASE_URL`.

Evidence and exact commands: [Initiative 22 execution plan](../initiatives/tasks/22-production-availability-and-scheduling.md).

## Review hardening

Client next-appointment projections return persisted local date/time without a UTC offset so
client cards retain the unit's calendar date across browser timezones. Professional upcoming lists
exclude already-started appointments before applying their limit. Legacy client preference text
remains readable until explicitly migrated to canonical services.

Catalog audit persistence is best effort after the catalog transaction: a failed audit emits the
metadata-only `catalog_audit_failed` event and does not change a committed mutation into a failed
HTTP response. Response and audit events share the resolved request ID. This does not provide an
atomic audit guarantee; a transactional outbox is a future durability improvement.
