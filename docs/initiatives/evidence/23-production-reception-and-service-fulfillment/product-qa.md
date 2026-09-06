# Initiative 23 Product QA — local acceptance

Decision: **approved for local testing**, subject to final repository preflight and CI recorded in the PR.

The real local stack used PostgreSQL 16 on loopback 55443, API 8103 and Studio 3103 with synthetic tenant A/B fixtures. A guest was admitted, called, assigned, started, fulfilled, completed and observed in read-only history after refresh through real HTTP persistence. Desktop 1440px and mobile 320px captures were visually inspected; no horizontal overflow or browser-console error was observed.

Automated evidence: API check 37 files/340 tests; clean PostgreSQL integration 7 files/26 tests plus focused follow-up scheduling/service-desk 18/18; Studio unit/component 74 files/729 tests; Service Desk Playwright 17/17; focused Sheet/Select desktop/mobile/reduced-motion 2/2; production E2E 11/11; production build and boundary scan 105 files/1,782,132 bytes. Studio coverage passed at 84.41% statements, 80.04% branches, 82.92% functions and 85.99% lines. Final preflight is recorded in the PR.

The sealed handoff is schema version 1, immutable, transactional and excludes contact, notes, private reasons, revenue and commission. Linked-client completion updates `lastVisitAt`; guest completion retains `clientId: null`; canceled and zero-item interrupted visits are ineligible.

See `qa-findings.md`, `ui-inventory.md`, `acceptance-matrix.md` and `docs/operations/service-desk-fulfillment-runbook.md`.
