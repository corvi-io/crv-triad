# Staging preflight — 2026-09-05

The product owner approved local availability and scheduling and authorized Dashboard restoration,
Codex review, and staging merge. The delivery branch is isolated from the shared development checkout.

## Scope and boundaries

- API availability/scheduling modules, narrow catalog/client integration and typed access capabilities.
- Studio HTTP consumers, calendar interaction, searchable appointment fields, and original Dashboard panels.
- Published migrations 0000–0017 retained; 0018–0020 append tables, timezone and entitlements.
- Legacy client preference database column retained for compatibility; no schema drift after generation check.
- Concurrent profile/authentication, backstage deployment and CI changes excluded.

## Review findings resolved

- Dashboard had lost its original composition: reused WorkspaceOverview with explicit unintegrated metrics.
- Monthly Dashboard queries exceeded the seven-day range contract: split into at most five bounded calls.
- Negative availability blocks must reduce capacity once: verified overlapping break/block subtraction.
- Database entitlement test depended on suite ordering: now migrates its isolated database itself.
- Runtime source test still expected disabled scheduling: updated for the accepted HTTP default.
- Shared local migration consolidation cannot safely replace published history: preserved deployed chain.

## Evidence

Desktop and mobile screenshots are adjacent to this report. They use synthetic data and validate the
shared composition rather than claiming an authenticated production journey. Product-owner local
journeys were separately approved in the conversation. Existing production-boundary checks ensure
that the production bundle does not include demonstration repositories.

The final PR checks and Codex review are the staging merge gates. No production release is authorized.

## Verified gates

- API: 336 unit tests; coverage 89.16% statements, 81.06% branches, 90.11% functions, 91.27% lines.
- PostgreSQL: 19 integration tests passed on a separate loopback database using the preserved migration chain.
- Studio: 700 tests; coverage 84.92% statements, 80.07% branches, 83.60% functions, 86.43% lines.
- Studio build and production-source boundary passed; focused Dashboard tests passed after deduplication.
- No unresolved local blocking findings. Bundle size warning is retained; no measured concurrency capacity is claimed.

## Codex review cycle 1

All six findings were valid and fixed in one batch: legacy preferences, audit failure response,
request ID propagation, restoration at the excluded-date limit, elapsed professional slots, and
unit-local client dates. The database regression also exposed and fixed a correlated-query column
qualification issue that returned null despite future bookings. Verification: 338 API unit tests,
22 PostgreSQL integration tests, and 33 focused Studio tests passed. API coverage remains above 80%.

## Dev tenant-creation blocker — 2026-09-05

- Reproduced through the real Backstage form with development Vite/API and PostgreSQL migrated
  from the published chain: POST `/api/backstage/tenants` returned 500. PostgreSQL rejected the
  audit insert because `access_audit.entity_type` did not exist. The transaction rolled back.
- The ORM/snapshot already declared `entity_type` and `changed_fields`, but no additive SQL
  migration introduced them. Migration `0021_access-audit-catalog-fields` now adds both, preserving
  existing rows and accepting local databases that already contain those columns.
- Retested the browser form: existing owner returned 201, active ownership and subscription;
  a separate new owner returned 201 with a pending invitation. The synthetic email credential
  intentionally could not deliver external mail; invitation delivery is not claimed as verified.
- Logged the existing owner into Studio through the real login form and opened
  `/barbershop-setup/units`: authorized empty catalog and working creation entrypoint, no 403/500.
  Screenshot: `tenant-studio-units.png`. No request interception or fake browser responses.
- Also exercised the operational bootstrap use case through Better Auth and then
  `configureTenantAccess`; both succeeded against the same isolated database.
- Real database regression: `backstage-provisioning.postgres.test.ts` asserts the HTTP 201,
  owner membership, active subscription and persisted audit. PostgreSQL suite: 23 tests / 6 files.
- Verified every column in the latest Drizzle snapshot exists in the migrated QA database.
- The restartable scheduling QA runner now uses a separate named volume and loopback 55444;
  it preserves the earlier prototype database at 55442 and ordinary user servers.
- Studio final coverage: statements 85.04%, branches 80.23%, functions 83.73%, lines 86.48%.
- No Linear issue reference exists in Initiative 22's PRD/task plan and no Linear connector is
  available in this session. Evidence and workflow status are maintained in this PR and repository.
- Restarted the committed QA runner on a fresh published-chain database: both Playwright live
  journeys passed (8.8s), covering real availability, appointment creation/confirmation/cancellation,
  member write denial, foreign-tenant hiding, mobile overflow and Axe accessibility.
- This pass also fixed keyboard access to the read-only calendar scroll region (`tabIndex=0`),
  and updated live-test selectors to the accepted compact calendar and keyboard-selectable controls.

## Second review triage

Four additional findings were valid and fixed as one batch:

- Metadata-only appointment edits retain an archived service's snapshot; changing the slot or
  canonical relations still requires an active service. PostgreSQL verifies both paths.
- Appointment search matches the persisted professional name as well as client and service names.
- List-period filter data covers the entire selected interval through bounded sequential range
  queries (at most seven days each, at most 366 days overall), with appointment-ID deduplication.
  A client appearing only on the second day remains selectable.
- Filter and text-search changes reset URL-controlled pagination to page one; pagination commands
  themselves retain their requested page.

The two allowed automated review cycles are complete. These remaining corrections are verified
locally and by CI; no redundant third automated review is requested.

Final second-round validation: 705 Studio tests passed; Studio coverage is 84.83% statements,
80.02% branches, 83.42% functions and 86.34% lines. API coverage remains above all 80% gates.
API/Studio typechecks passed, 23 PostgreSQL tests passed, and both live browser journeys passed
again (9.6s). The temporary QA API/Studio servers were stopped afterwards.
