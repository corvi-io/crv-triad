# Management Profile, Commissions, and Reporting

Initiative 25 adds tenant-owned business profile and logo data, future-only commission policies,
immutable commission facts at receipt registration, bounded management summaries, and asynchronous
CSV exports. The backend report catalog extends that lifecycle with six typed report contracts.

## Runtime Boundaries

- Business profile and commission state is authoritative in PostgreSQL and capability-gated under
  `/api/business-profile` and `/api/commissions`.
- Logos use the local filesystem only in `local`; deployed environments use the private R2 adapter
  selected by `PRIVATE_STORAGE_DRIVER=r2`. Business media keys are tenant-scoped under
  `tenants/{tenantId}/branding/logo/`; legacy keys remain readable until replaced or
  removed. Business logos use only `R2_PRIVATE_*`; they are read through authenticated API routes
  and never receive a public object URL.
- User profile images use the separate identity-owned namespace
  `users/{userId}/profile/avatar/`, because one user may belong to multiple tenants. Existing root
  image keys remain readable until the user replaces or removes the image. New images share the
  private R2 bucket and are served only through the authenticated, owner-scoped profile image route;
  the persisted URL never exposes R2 directly.
- Interactive summaries are bounded to 365 days at `/api/reports/summary`.
- Export lifecycle routes remain under `/api/reports/generated` for internal compatibility and
  support, but Studio does not expose history, status, retry, or download controls.
- `GET /api/reports/catalog` returns the six authenticated catalog entries: sales and revenue,
  professional performance, commissions, new/returning customers, cancellations/no-shows, and
  cash/payments. `POST /api/reports/generated` accepts `reportType` and its type-specific `config`;
  omitting both retains the Initiative 25 request contract and selects sales/revenue defaults.
- Each accepted request stores a versioned configuration snapshot and the requester's active,
  verified identity email. Configuration is never read again from mutable UI state.
- Generation state and email-delivery state are independent. A ready artifact remains ready when
  email delivery fails; Trigger.dev retries the idempotent delivery separately on the same task.
- Trigger.dev payloads contain only schema version, tenant ID, and opaque report request ID. The
  worker reloads authorized server state, writes a deterministic private R2 key under
  `tenants/{tenantId}/reports/{reportType}/{year}/{month}/{requestId}/attempt-{attempt}.csv`, verifies it with
  `HEAD`, then persists checksum, size, content type, retention, and terminal state.
- Lifecycle logs contain event name, opaque request ID, attempt/failure code, and environment only;
  they omit filters, amounts, contacts, artifact URLs, credentials, and private headers.

## Metric Definitions

All report queries are tenant-scoped and accept an inclusive local-date interval of at most 366
days. Unit, professional, service, and payment-method filters are applied only where the catalog
declares them. Reversed receipts never contribute to active sales, client, or professional totals.

- Sales and revenue reports count distinct active receipts as paid sales and their filtered receipt
  lines as completed services. Gross and net revenue sum line snapshots. Explicit reversals subtract
  the reversed receipt line amount when `includeReversals` is enabled. Average ticket is active net
  revenue divided by paid sales, rounded to the nearest cent. Comparison uses the immediately
  preceding interval with the same inclusive number of days.
- Professional performance builds its professional universe from both scheduling facts and active
  receipt-line snapshots, so a professional with only cancellations or no-shows remains visible.
  Completed appointments are scheduling rows whose status is `completed`; they are intentionally
  distinct from completed service/receipt lines. Service revenue comes from active receipt lines,
  average ticket divides that revenue by distinct active receipts, and cancellation/no-show counts
  come from scheduling facts in the same filter interval.
- Commission reports sum immutable commission facts. Service revenue is the signed net commission
  base; commission and barbershop share are signed totals. Earned and reversal fact counts are
  reported explicitly.
- New/returning customers use distinct stable client IDs on active receipts. A client is new when
  its first active receipt in the tenant falls inside the interval and returning when it predates the
  interval. The mix denominator is unique identified customers; unidentified active receipts are
  reported separately and excluded from percentage basis points.
- Cancellation/no-show reports use every matching appointment in the interval as the denominator.
  Each rate is `round(outcome count * 10000 / matching appointments)`; zero appointments produces
  zero basis points. Affected value sums price snapshots for canceled and no-show appointments.
- Cash/payment reports group receipt tenders by method. They expose active receipt count, active
  received amount, reversed receipt count, reversed amount, and signed net (`active - reversed`).

When a sales/summary query combines professional or service with a payment method, each matching
line amount is allocated across all receipt tenders proportionally. Integer cents use largest
remainder allocation: floor every proportional share, then distribute residual cents by descending
remainder with the stable tie order Pix, cash, debit, credit. This keeps combined filters exact and
deterministic without assigning the full receipt to every line or tender.

## Public Lifecycle Contract

Generation status is `queued | running | ready | failed | expired`; delivery status is
`pending | sending | sent | failed | not_applicable`. Clients poll generation only for `queued` or
`running`, and poll delivery only for a ready report in `pending` or `sending`. Legacy requests with
no requester email are migrated, and also defensively converged by the worker, to terminal
`not_applicable`.

Generation retry accepts only `failed` or `expired`. Delivery retry accepts only
`ready + failed`, reuses the existing private artifact, and never regenerates it. Concurrent callers
compete on an optimistic update so only one delivery attempt is dispatched. Dispatch failure is
compensated back to `failed`; a lost response after successful delivery cannot overwrite `sent`.
Provider success followed by database acknowledgement loss leaves a recoverable `sending` lease;
an immediate retry fails retriably instead of acknowledging the task, and after five minutes a
worker may reclaim the lease using the same report-request provider idempotency key.

Status, history, request, and retry responses use this allowlist only: `id`, `format`, `reportType`,
`status`, `emailDeliveryStatus`, `activeAttempt`, `createdAt`, `completedAt`, and `safeFailureCode`.
Requester identity/email, idempotency keys, provider references, raw filters/configuration, storage
keys, and delivery failure internals are never returned.

## Local Validation and Provider Readiness

The default provider is `trigger`; development, staging, and production therefore use the real
Trigger.dev task and private R2 adapter when exports are enabled. Use
`REPORT_EXPORT_ENABLED=true` with `REPORT_EXPORT_PROVIDER=fake` only in `APP_ENV=local`. The fake
dispatcher and in-memory artifact adapter execute the same worker and authenticated download path.
Deployed environments reject enabled exports unless Trigger.dev and the dedicated report R2 settings
are complete. `hml` must remain disabled until the external project, task version, private bucket,
least-privilege credentials, lifecycle rule, put/head/get/delete behavior, and rollback drill are
revalidated.

The success notification contains a private R2 signed URL that expires after seven days. The failure
notification contains no download link. R2 object keys and presigned URLs are never placed in
lifecycle logs. Report email delivery reuses the verified IDP identity contract and the configured
Resend sender.

The cross-domain object ownership and deletion rules are documented in
`docs/api/object-storage.md`.

Rollback is additive: disable `REPORT_EXPORT_ENABLED` to stop new requests while preserving history,
artifacts, profile data, policies, and immutable receipt facts. Do not roll back by deleting facts or
reusing the identity profile-image bucket for report artifacts.
