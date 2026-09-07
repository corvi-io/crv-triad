# Initiative 22 Dependency Audit

Date: 2026-09-05. Scope: local implementation readiness, TASK-001.
Source: working tree based on `685fa22855fd313b5add072f189bd872b058bee9`.
The worktree includes concurrent Initiative 21 and identity/deployment work. A commit hash alone
is not a reproducible snapshot of this source. Existing changes must remain intact.

## Current dependency matrix

| Dependency | Observed contract | Integration consequence |
| --- | --- | --- |
| Clients | Tenant-owned stable IDs, active/archive lifecycle, version, normalized contacts, compound tenant unique index | Select canonical active client; do not copy client creation rules into scheduling |
| Preferences | Stable unit/professional/service IDs and bounded selected hydration | Suggestions only; never automatically select a preference |
| Units | Weekly opening periods, code/name/address, active/archive, version | Add nullable explicit timezone; existing records stay incomplete until confirmation |
| Opening periods | Multiple disjoint weekday groups; same weekday cannot occur twice | Preserve current opening contract; never invent split same-day periods |
| Professionals | Invitation acceptance links business professional to IDP user; personal name read from user | Pending invitations cannot own availability or appointments |
| Relationships | Compound tenant foreign keys on professional-unit, professional-service, service-unit | Recheck all three inside the booking transaction |
| Services | Integer price cents and duration minutes; active/archive and version | Resolve duration and price on server and snapshot at booking |
| Options | Bounded 50 active matches plus bounded selected IDs; professional option returns ID/name/status/unitIds | Do not cast a professional option to full professional detail or assume serviceIds exist |
| Authorization | Session-derived tenant, role and per-capability commercial entitlement | Add availability/scheduling capabilities and explicitly configure entitlements |
| Archive | Optimistic catalog update, no persistent appointment dependency reader yet | Scheduling must supply the bounded dependency port before integration closes |
| Migrations | Concurrent work replaced prior history with a clean generated baseline | Generate an additive successor only after baseline owner stabilizes it; do not regenerate baseline |
| Studio sources | Setup/Clients HTTP; Agenda/Dashboard still memory or disabled | Cut over all scheduling consumers together; no fallback and no hybrid catalogs/operations |
| Errors | Stable codes and safe field metadata; version_conflict is recoverable | Preserve draft and offer reload-latest without silent replacement |

## Observed verification

- `bun --filter api check`: passed on 2026-09-05, 36 files / 265 tests, including
  format/lint/typecheck. This checks the current dependency baseline, not Initiative 22 behavior.
- `bun --filter studio check`: passed, 53 files / 396 tests, production build and boundary scan.
- `bun --filter api coverage:check`: passed, statements 88.56%, branches 80.49%, functions
  88.85%, lines 90.54%.
- `bun --filter api build`: passed.
- `bun --filter api test:integration:postgres`: newly passed, 3 files / 8 tests on a new disposable
  PostgreSQL 16 instance, loopback port 55442, database `initiative22_dependency_test`.
- `bun --filter studio test:e2e`: failed, 56 failed / 37 passed / 6 did not run, 3.6 minutes.
  These tests use memory repositories and mocked identity; they do not prove integrated HTTP/database QA.
- Initiative 21's recorded 2026-09-05 PostgreSQL evidence: 3 files / 8 tests passed.
  This is prior evidence; not a newly executed scheduling/concurrency suite.

## Gate status

TASK-001 completed after the user explicitly confirmed Initiative 21 complete and authorized
implementation through local acceptance. The earlier audit was a point-in-time observation, not an
outstanding approval requirement. Current contracts were verified by the API/Studio baseline gates
and the PostgreSQL catalog regression suite. Additive scheduling migrations follow the preserved
baseline; concurrent identity, catalog, deployment and operational-module work remains intact.

## Reproduced baseline findings

1. **Catalog creation contract mismatch:** the current pre-existing diff adds `.min(1)` to service
   unit/professional relationships in `entity-drawer.tsx`. The accepted Initiative 21 contract and
   `barbershop-setup.spec.ts:270` allow independent creation. The browser retains the form with
   relationship errors instead of creating the service. The relationship-clearing journey at
   line 297 also cannot complete its save. Determine whether the current change reflects a newer
   product decision before editing someone else's form or weakening the tests.
2. **Operational E2E context setup missing:** Dashboard's helper stubs `/api/auth/**` only. Its
   failed browser snapshot displays the workspace context load error, before Dashboard mounts.
   Similar context-dependent failures affect Agenda/Service Desk and downstream operational tests.
   This is evidence of incomplete test setup, not proof that every listed product feature is broken.
3. **Recovery regression remains unclassified:** setup's one-shot failure test keeps the edit
   drawer open but does not display its expected recovery message. Existing form error handling
   is already being edited in the working tree; do not overwrite it during this dependency audit.

Failure artifacts: `apps/studio/test-results/*/error-context.md` and
`apps/studio/test-results/.last-run.json` (ignored local output). The full test command uses port
3100 and does not replace the existing API/Studio processes at 8000/3000.

No runtime implementation, migration source, deployment or application-data modification was made
by this audit. The disposable dependency database is stopped after verification. No Initiative 22
acceptance criterion is marked passed from these predecessor results.
