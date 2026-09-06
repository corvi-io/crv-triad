# Initiative 23 Staging Preflight

## Source and scope

- Branch: `feature/initiative-23-service-fulfillment`, synchronized with accepted staging `e8c7df0cfffce30ba3d547fc96a0247baafc3f20`.
- Approved PRD remains byte-identical to the Ground source (`cmp` exit 0); approval state remains Approved.
- The approved PRD/plan were absent from staging and incorporated before implementation without contractual change. Only execution status/evidence changed in the plan.
- Diff scope is limited to API service-desk/scheduling/client/access composition, Studio Service Desk and the two shared overlay corrections exposed by acceptance.

## Passed gates

- `git diff --cached --check`: passed; 49 intended files.
- API check: 37 files / 340 tests; type/build passed; coverage branches 81.27%.
- Clean PostgreSQL 16 integration: 7 files / 26 tests against isolated loopback database.
- Studio unit/component: 74 files / 729 tests; captured exit 0.
- Studio coverage: 84.41% statements, 80.04% branches, 82.92% functions, 85.99% lines; captured exit 0.
- Studio production build and boundary: 105 files / 1,782,132 bytes; captured exit 0.
- Service Desk E2E on isolated port 3104: 17/17 passed; production E2E: 11/11.
- Shared Sheet/Select: desktop and 320px reduced-motion open/select/close, focus restoration and viewport bounds passed (focused 2/2).
- Product QA: real HTTP/PostgreSQL guest completion/history journey, desktop/mobile visual inspection and WCAG scan passed.
- Evidence JSON parses successfully; PRD Ground comparison passed.

## Review notes

The initial E2E 16/16 systemic failure was a harness CORS origin fixed to port 3100. The runner now uses `STUDIO_E2E_PORT` consistently and never reuses an existing server. No assertions or coverage thresholds were weakened. The production completion copy deliberately does not promise payment readiness.

No secrets, credentials, customer payloads or remote environment changes are included. Local credentials/artifacts remain ignored. Remote CI and review outcomes are recorded on the pull request before merge.
