# Initiative 23 QA Findings

## Corrected findings

1. Shared Base UI Sheet retained `data-starting-style`, leaving an opened ActionDrawer translated offscreen. Removed the conflicting transition-state transforms and rechecked open/close, focus and responsive bounds.
2. Shared Select retained closing transition state. Removed conflicting scale/opacity transition-state classes and rechecked option open/select/unmount.
3. Service Desk E2E initially reported 16 missing-element failures. A stale/harness-origin condition prevented authenticated UI composition: mocks fixed CORS to port 3100. `reuseExistingServer` is false; `STUDIO_E2E_PORT=3113` now drives base URL, Vite server and mock origin. The clean rerun passed 16/16 without weakening assertions.
4. Legacy memory fixtures omitted explicit item status after the production model introduced sequential states. Presentation now derives the prior initial/added default only for absent legacy status; HTTP items retain authoritative explicit status.
5. Old E2E completion copy promised payment readiness. Exact assertions now match the approved operational boundary: completion is saved and payment remains separate.
6. Initial CI production preview still expected Service Desk to be disabled. Initiative 23 intentionally makes HTTP the production source, so the correct safe failure is an API load alert with no synthetic fixtures. The exact HTTP boundary test now passes 11/11; a separate source-resolution matrix proves memory is disabled in hml/prd.
7. Review found appointment occupancy was recreated at `in-progress`; the transition now removes the appointment claim so the service claim remains the sole occupancy. PostgreSQL regression proves the appointment claim is absent.
8. Review found incomplete production reads. Queue filters are applied server-side before cursor pagination, and the HTTP adapter consumes queue cursors plus client pagination; regression covers records beyond the first page.
9. Follow-up review found the legacy appointment exclusion still competed with unified occupancy. Migration `0024_release_completed_appointments.sql` removes only that obsolete constraint; PostgreSQL regressions prove the unified claim remains concurrency-safe and an early-finished interval can be booked again.
10. An overdue live service now blocks new appointments for its professional until an explicit finish, extension or interruption supplies authoritative release evidence. PostgreSQL regression covers the fail-closed path and subsequent release.
11. Owners with `service_desk.correct` can interrupt an active service with a required 3–160 character reason. The command preserves its idempotency key across unknown outcomes, closes active items, releases occupancy and records the reason in the audit event; E2E covers the authorized journey.
12. Linked-client projections now select, serialize and server-sort the persisted `lastVisitAt`; route and PostgreSQL tests cover the public projection and ordering input.
13. Walk-in times are composed from the unit's IANA timezone. The form fails closed when the unit has no timezone, and a deterministic unit regression proves the same instant under a browser-independent Recife wall clock.
14. History polling now fetches only the requested 10-record page and exposes total/page metadata with previous/next controls. The stable HTTP-adapter regression asserts exactly one history request and page 2 projection; the temporary page-mount coverage test was removed because importing the entire route tree changed the coverage universe without adding contract confidence.
15. Queue search matches customer or service name and no longer searches private notes. PostgreSQL regression proves a service-only match.
16. Pending arrivals use a stable `(startsAt, id)` cursor. PostgreSQL proves 51 records are returned as 50 plus 1, while the Studio adapter regression proves every cursor is consumed without silently hiding later arrivals.
17. Final CI exposed a timezone-dependent test clock: `new Date(year, month, day, 11, 30)` represented 11:30 in the host timezone, not in the unit timezone. The fixture now uses the explicit instant `2026-07-23T14:30:00.000Z` (11:30 in Recife), so the same behavioral assertion is deterministic locally and on UTC runners.

## Limitations

Acceptance is local with synthetic data and Playwright browser emulation. No physical-device or manual screen-reader certification, production capacity guarantee, deployment or remote migration is claimed.
