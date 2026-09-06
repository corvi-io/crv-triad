# Initiative 24 Runtime And Local QA Evidence

## Runtime milestone

- Accepted predecessor: Initiative 23 staging merge `1842099b94d9b11790f82a58128909e17ba11043`.
- Runtime milestone commit: `ad33fce`.
- Additive migration: `apps/api/drizzle/0025_flaky_malcolm_colcord.sql`.
- Production module: `apps/api/src/modules/revenue-operations`.
- Studio HTTP source: `apps/studio/src/modules/revenue-operations/http-repository.ts`.

The Initiative 24 PR incorporated the approved PRD and execution plan from the Ground checkout byte-for-byte
before implementation because those approved documents were absent from the initial branch checkout. This
closed a documentation-distribution gap without changing the approved contract or its `Approved` state.

## Security and authority checks

- `responsiblePersonName` was removed from `CloseDayInput` and is never sent by the Studio HTTP adapter.
- Closing actor ID and display name are resolved from the authenticated session on the API and snapshotted
  server-side.
- The close body is strict. A forged `responsiblePersonName` returns `400`, does not invoke the service and
  does not reflect the submitted sentinel.
- All revenue mutation bodies are strict; telemetry excludes reasons, money, tender payloads and command keys.
- Registration/correction invalidate financial queries only and never mutate or invalidate Service Desk or
  Scheduling lifecycle state.

## Automated evidence

- API check: 39 files, 360 tests passed.
- API coverage: 88.61% statements, 80.61% branches, 88.83% functions, 90.51% lines.
- Focused PostgreSQL: migration from scratch and 4 tests passed, including the open-day timezone-change
  guard, exact posting, isolation, reversal and concurrency assertions.
- Studio focused checkout/cash/HTTP adapter: defensive command, failure, draft and actor-authority
  branches pass; the complete Studio suite contains 749 tests.
- Studio coverage: 84.51% statements, 80.29% branches, 83.27% functions and 86.17% lines.
- Studio production boundary: production build passed and 116 files were verified without a memory fallback.
- Studio production-preview E2E: 11/11 passed, including the fail-closed cash route.
- Cash-day summaries use full-set PostgreSQL aggregates while movements, receipts and closing revisions
  are deterministically capped at 50 rows per response.
- Cash date-sensitive component tests fix only `Date` at the contractual instant
  `2026-09-05T14:30:00.000Z`; 7/7 passed under both `TZ=UTC` and `TZ=America/Recife`.

## Browser acceptance

Environment: loopback PostgreSQL with the accepted Initiative 23 synthetic fixture, API `127.0.0.1:8104`,
Studio `127.0.0.1:3104`. Credentials stayed in the ignored Initiative 23 artifact.

Observed real-browser journey:

1. Opened the completed guest visit from Initiative 23 and explicitly created its checkout.
2. Verified the immutable performed line at R$ 50,00 and no inferred commission/profit.
3. Opened the current operational cash day with an explicit R$ 0,00 count.
4. Saved a R$ 50,00 cash tender and registered one immutable receipt.
5. Confirmed the checkout displayed `Pagamento registrado` and the receipt history.
6. Canceled the full registration with an outside-TRIAD acknowledgement; history changed to
   `Registro cancelado`, while the service remained `Concluído`.
7. Verified cash net revenue R$ 0,00, reversed registrations R$ 50,00 and expected cash R$ 0,00.
8. Closed the day at R$ 0,00 and verified the responsible display snapshot was the authenticated fixture user,
   not caller input or a placeholder.
9. Rechecked the cash layout at a 320 CSS-pixel viewport with no document-level horizontal overflow.
10. Opened production payment settings, disabled Credit, saved it through the versioned revenue policy and
    confirmed the disabled state survived a full route reload. No commission controls were rendered.

Issues found and corrected during QA: inherited opaque unit IDs were incorrectly constrained as UUIDs; an
absent cash day produced an empty HTTP body instead of explicit JSON; and checkout mutations invalidated a
cache key based on checkout ID while the route was keyed by visit ID. Production cash fail-closed copy was
also restored after the HTTP source replaced the prototype-disabled adapter.

## Residual manual limits

- The accepted real-browser path covered desktop and 320 CSS pixels, persisted production policy,
  registration/reversal/closing, server actor attribution, and lifecycle non-mutation. Existing prototype
  evidence supplies light/dark/forced-color baselines; a new physical coarse-pointer and independent
  screen-reader session were not repeated for this increment.
- The internal ledger does not perform external collection or refunds. Those remain explicitly deferred.
