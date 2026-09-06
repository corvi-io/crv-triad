# Initiative 23 Product QA — local acceptance

Decision: **approved for local testing**, subject to final repository preflight and CI recorded in the PR.

The real local stack used PostgreSQL 16 on loopback 55443, API 8103 and Studio 3103 with synthetic tenant A/B fixtures. A guest was admitted, called, assigned, started, fulfilled, completed and observed in read-only history after refresh through real HTTP persistence. Desktop 1440px and mobile 320px captures were visually inspected; no horizontal overflow or browser-console error was observed.

Automated evidence: API check 37 files/338 tests; clean PostgreSQL integration 7 files/26 tests; Studio unit/component 73 files/709 tests; Service Desk Playwright 16/16; focused Sheet/Select desktop/mobile/reduced-motion 2/2; production build and boundary scan 107 files/1,778,256 bytes. Studio coverage passed at 84.67% statements, 80.06% branches, 83.58% functions and 86.17% lines. Final preflight is recorded in the PR.

The sealed handoff is schema version 1, immutable, transactional and excludes contact, notes, private reasons, revenue and commission. Linked-client completion updates `lastVisitAt`; guest completion retains `clientId: null`; canceled and zero-item interrupted visits are ineligible.

See `qa-findings.md`, `ui-inventory.md`, `acceptance-matrix.md` and `docs/operations/service-desk-fulfillment-runbook.md`.
