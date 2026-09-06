# Management Profile, Commissions, and Reporting

Initiative 25 adds tenant-owned business profile and logo data, future-only commission policies,
immutable commission facts at receipt registration, bounded management summaries, and asynchronous
PDF/CSV exports. The backend report catalog extends that lifecycle with six typed report contracts.

## Runtime Boundaries

- Business profile and commission state is authoritative in PostgreSQL and capability-gated under
  `/api/business-profile` and `/api/commissions`.
- Logos use the local filesystem only in `local`; deployed environments use the private R2 adapter
  selected by `PROFILE_IMAGE_STORAGE_DRIVER=r2`.
- Interactive summaries are bounded to 365 days at `/api/reports/summary`.
- Export request/history/status/retry/download routes live under `/api/reports/generated`.
- `GET /api/reports/catalog` returns the six authenticated catalog entries: sales and revenue,
  professional performance, commissions, new/returning customers, cancellations/no-shows, and
  cash/payments. `POST /api/reports/generated` accepts `reportType` and its type-specific `config`;
  omitting both retains the Initiative 25 request contract and selects sales/revenue defaults.
- Each accepted request stores a versioned configuration snapshot and the requester's active,
  verified identity email. Configuration is never read again from mutable UI state.
- Generation state and email-delivery state are independent. A ready artifact remains ready when
  email delivery fails; Trigger.dev retries the idempotent delivery separately on the same task.
- Trigger.dev payloads contain only schema version, tenant ID, and opaque report request ID. The
  worker reloads authorized server state, writes a deterministic private R2 key, verifies it with
  `HEAD`, then persists checksum, size, content type, retention, and terminal state.
- Lifecycle logs contain event name, opaque request ID, attempt/failure code, and environment only;
  they omit filters, amounts, contacts, artifact URLs, credentials, and private headers.

## Local Validation and Provider Readiness

The default provider is `trigger`; development, staging, and production therefore use the real
Trigger.dev task and private R2 adapter when exports are enabled. Use
`REPORT_EXPORT_ENABLED=true` with `REPORT_EXPORT_PROVIDER=fake` only in `APP_ENV=local`. The fake
dispatcher and in-memory artifact adapter execute the same worker and authenticated download path.
Deployed environments reject enabled exports unless Trigger.dev and the dedicated report R2 settings
are complete. `hml` must remain disabled until the external project, task version, private bucket,
least-privilege credentials, lifecycle rule, put/head/get/delete behavior, and rollback drill are
revalidated.

The notification contains only a Studio route. The requester must authenticate and retain tenant
access before the API issues the private R2 URL, which expires after 300 seconds. R2 object keys and
presigned URLs are never placed in email or lifecycle logs. Report email delivery reuses the verified
IDP identity contract and the configured Resend sender.

Rollback is additive: disable `REPORT_EXPORT_ENABLED` to stop new requests while preserving history,
artifacts, profile data, policies, and immutable receipt facts. Do not roll back by deleting facts or
reusing the identity profile-image bucket for report artifacts.
