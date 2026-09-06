# Initiative 23 QA Findings

## Corrected findings

1. Shared Base UI Sheet retained `data-starting-style`, leaving an opened ActionDrawer translated offscreen. Removed the conflicting transition-state transforms and rechecked open/close, focus and responsive bounds.
2. Shared Select retained closing transition state. Removed conflicting scale/opacity transition-state classes and rechecked option open/select/unmount.
3. Service Desk E2E initially reported 16 missing-element failures. A stale/harness-origin condition prevented authenticated UI composition: mocks fixed CORS to port 3100. `reuseExistingServer` is false; `STUDIO_E2E_PORT=3113` now drives base URL, Vite server and mock origin. The clean rerun passed 16/16 without weakening assertions.
4. Legacy memory fixtures omitted explicit item status after the production model introduced sequential states. Presentation now derives the prior initial/added default only for absent legacy status; HTTP items retain authoritative explicit status.
5. Old E2E completion copy promised payment readiness. Exact assertions now match the approved operational boundary: completion is saved and payment remains separate.

## Limitations

Acceptance is local with synthetic data and Playwright browser emulation. No physical-device or manual screen-reader certification, production capacity guarantee, deployment or remote migration is claimed.
