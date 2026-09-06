# Initiative 23 Staging Preflight

## Source and scope

- Branch: `feature/initiative-23-service-fulfillment`, based on accepted staging `51265ac`.
- Approved PRD remains byte-identical to the Ground source (`cmp` exit 0); approval state remains Approved.
- The approved PRD/plan were absent from staging and incorporated before implementation without contractual change. Only execution status/evidence changed in the plan.
- Diff scope is limited to API service-desk/scheduling/client/access composition, Studio Service Desk and the two shared overlay corrections exposed by acceptance.

## Passed gates

- `git diff --cached --check`: passed; 49 intended files.
- API check: 37 files / 338 tests; type/build passed.
- Clean PostgreSQL 16 integration: 7 files / 26 tests against isolated loopback database.
- Studio unit/component: 73 files / 709 tests.
- Studio coverage: 84.67% statements, 80.06% branches, 83.58% functions, 86.17% lines; exit 0.
- Studio production build and boundary: 107 files / 1,778,256 bytes; passed.
- Service Desk E2E on isolated port 3113: 16/16 passed.
- Shared Sheet/Select: desktop and 320px reduced-motion open/select/close, focus restoration and viewport bounds passed (focused 2/2).
- Product QA: real HTTP/PostgreSQL guest completion/history journey, desktop/mobile visual inspection and WCAG scan passed.
- Evidence JSON parses successfully; PRD Ground comparison passed.

## Review notes

The initial E2E 16/16 systemic failure was a harness CORS origin fixed to port 3100. The runner now uses `STUDIO_E2E_PORT` consistently and never reuses an existing server. No assertions or coverage thresholds were weakened. The production completion copy deliberately does not promise payment readiness.

No secrets, credentials, customer payloads or remote environment changes are included. Local credentials/artifacts remain ignored. Remote CI and review outcomes are recorded on the pull request before merge.
