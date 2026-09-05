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
