# Product QA

This directory defines CRV Triad's reproducible product-acceptance contract. Product
QA drives real browser journeys through the frontend, API, and an isolated local
PostgreSQL database while evaluating functionality, usability, rendered quality,
accessibility, authorization, tenant isolation, and persistent outcomes.

It complements, but does not replace, automated testing:

- `crv-testing` owns unit/integration boundaries and the 80% coverage gate.
- `crv-product-qa` owns real-system end-to-end acceptance and corrective rechecks.
- `crv-preflight-review` owns branch readiness and requires product-QA evidence
  when the changed product has runnable browser journeys.

## Modes

- **Feature QA:** changed behavior plus adjacent regressions and affected personas.
- **Full-product QA:** every active contract and critical cross-app journey.
- **Recheck:** prior findings plus all outcomes the correction could affect.

No mode is a visual-only walkthrough. A local run must use the actual app stack
and isolated database. External providers may use documented local substitutes
only when the provider itself is outside the acceptance scope.

## Sources Of Truth

- [Protocol](protocol.md)
- [Contract catalog](contracts/README.md)
- [Feature report template](templates/feature-report.md)
- [Full-product report template](templates/full-product-report.md)
- [Machine-readable schema](report.schema.json)

Save reports without overwriting history:

```text
reports/features/<initiative-slug>/<yyyy-mm-dd>-<commit>.{md,json}
reports/full/<yyyy-mm-dd>-<commit>.{md,json}
```

Keep screenshots, videos, traces, downloads, and database artifacts in ignored
local artifact directories. Reports reference only safe artifact paths and must
not contain secrets, credentials, PII, private headers, or protected payloads.
