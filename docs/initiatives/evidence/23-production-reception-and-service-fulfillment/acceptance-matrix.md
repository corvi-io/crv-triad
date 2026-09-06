# Initiative 23 Acceptance Evidence Matrix

This matrix records local evidence for the approved Initiative 23 contract.

| Criteria | Evidence | Result |
| --- | --- | --- |
| AC-001–AC-003 | Capability unit matrix; PostgreSQL tenant/guest/client, replay and unique-admission cases; real HTTP guest journey | Passed locally |
| AC-004 | Queue/call/return/exit commands, bounded arrivals/history reads, carryover query behavior and E2E queue journeys | Passed locally |
| AC-005–AC-006 | Scheduling-owned occupancy schema/lock, exclusion and live-claim constraints; PostgreSQL occupancy and rollback coverage | Passed locally |
| AC-007–AC-008 | Sequential pending/active/completed item rules; immutable snapshots; transactional handoff/client update and exact replay tests | Passed locally |
| AC-009 | Completed history works without finance; production UI exposes no checkout mutation; sealed v1 handoff test | Passed locally |
| AC-010 | `ui-inventory.md`; shared components and focused Sheet/Select regression | Passed locally |
| AC-011–AC-013 | Stable command keys/versions, tenant-scoped HTTP adapter, recovery states and 15-second query refresh behavior | Passed locally |
| AC-014 | Desktop and 320px, light/dark, forced colors, reduced motion, keyboard focus and axe WCAG 2.2 E2E | Passed locally |
| AC-015 | Additive migrations 0022/0023 and clean PostgreSQL 16 integration run: 7 files / 26 tests | Passed locally |
| AC-016 | Metadata-only telemetry, HMAC receipts, private-field exclusions and sentinel assertions | Passed locally |
| AC-017 | HTTP production build/boundary scan; additive-data rollback guidance in runbook | Passed locally |
| AC-018 | API 338 tests; Studio 709 tests; E2E 16; coverage >=80% all metrics; durable docs and preflight evidence | Passed locally |

Local browser QA used synthetic data on isolated API 8103, Studio 3103 and PostgreSQL 55443. No deployment or remote database mutation is claimed.
