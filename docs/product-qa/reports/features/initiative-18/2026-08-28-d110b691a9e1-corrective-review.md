# Initiative 18 corrective review addendum

- Date: 2026-08-28
- Frozen SHA: `d110b691a9e109e9a40c1f72abf0d138d6703b7c`
- Mode: recheck
- Decision: **approved**
- Score: **10/10**

## Outcome

The review correction passed the isolated real-stack recheck. No production,
migration, or durable documentation file was changed during QA.

The historical lineage test created a fresh PostgreSQL cluster, applied
historical migrations 0000 through 0020, and simulated the deployed Drizzle
journal with 21 entries. The real migrator then ran with `APP_ENV=staging`:

- the journal increased from 21 to 22 entries;
- `commercial_campaign_links` and its slug unique index appeared;
- the existing `idp_users` table retained the same OID;
- a second staging migration produced the identical aggregate, proving no
  recreation or conflict.

A separate fresh local baseline (`APP_ENV=test`) started the real API and passed
the adjacent browser journeys.

## Public intake lineage and retry

The normal visible Site→API submission returned 201 and persisted exactly one
processed delivery and one lead.

For the ambiguous-response scenario, the API committed and returned 201 to the
test transport before the browser received a synthetic 502. The visible form
remained retryable. The next submit reused the same required `deliveryId`,
returned the same `leadId`, and left the aggregate at exactly one delivery and
one lead. Identifiers, request bodies, fixture values, and PII were not recorded
in output or reports.

At 390×844 with `prefers-reduced-motion: reduce`, the success container received
focus and rendered without transitional blur/opacity. The inspected screenshot
shows the complete “Vamos analisar o contexto...” heading fully below the
viewport top, with no fixed-header overlap:

`apps/web/tests/e2e-integrated/.artifacts/test-results/real-stack-MVP-S2-reuses-o-e30ff-mbiguous-committed-response-chromium/mvp-s2-ambiguous-retry-success.png`

The retryable error form and adjacent active campaign destination screenshots
were also inspected. Network/console signals matched the injected 502 and known
Astro development-toolbar behavior; no additional request failure or page error
was observed.

## Commands and results

- `bunx biome check <four integrated scaffold files>` — passed.
- `bun --filter web typecheck` — passed.
- `bun --filter web test:e2e:integrated -- migration-lineage.spec.ts` — 1 passed
  in 6.9s, one worker, retries 0.
- `bun --filter web test:e2e:integrated -- real-stack.spec.ts --grep
  'MVP-S1|MVP-S2'` — 3 passed in 20.6s, one worker, retries 0.
- Companion JSON — validated against `docs/product-qa/report.schema.json`.

This addendum supersedes the failed visual checkpoint from SHA `5c03ddd` only;
the broader Initiative 18 final report remains the baseline for unchanged C1-C4
scope.
