# Initiative 25 Contract And Provider Readiness

Date: 2026-09-06  
Base: `67bd01ebc9739646562d858371c371c637442d5e`

## Predecessor contract map

- Initiative 23 provides tenant-owned completed service handoffs whose line snapshots retain the
  service, professional, labels, price, unit and completion time used by checkout.
- Initiative 24 provides `revenue_receipts`, immutable `revenue_receipt_lines`, tender snapshots,
  full `revenue_receipt_reversals`, cash movements and closing revisions. Its `allocateNet` result
  is the authority for per-line net cents. Commission facts attach to receipt lines and are sealed
  in the receipt transaction; reversals append equal-and-opposite facts.
- Runtime task plans 23 and 24 are complete. Their PRD delivery-state headers remain stale at
  `Not started`; this documentation mismatch does not change the shipped database contracts.

## Provider decisions

- Trigger.dev packages and CLI: `4.5.16`, pinned to the same version. Configuration belongs to
  `apps/api`, discovers API-owned named task exports and uses the experimental Bun runtime required
  by the approved PRD. Backend dispatch uses a type-only task import.
- Dispatch idempotency: SHA-256 of the internal logical request ID, created with explicit `global`
  scope. Raw string keys are prohibited because Trigger.dev 4.3.1+ defaults them to run scope.
- Export queue: one named queue with a tenant concurrency key. Payload schema v1 contains only
  opaque report-request and tenant IDs.
- R2: private S3-compatible buckets, conditional create (`If-None-Match: *`), `HEAD` verification,
  deterministic report attempt keys and authenticated presigned GET URLs valid for five minutes.
- Artifact retention: 30 days. Lifecycle deletion is externally provisioned; PostgreSQL metadata
  remains after object expiry.
- Business logo policy: decoded JPEG, PNG or WebP only; at most 5 MiB and 4096×4096 pixels;
  normalized bytes strip metadata. Random tenant-scoped keys are server-owned. A prior reference is
  committed only after the new object succeeds, and cleanup is durable and retryable.

## Safe environment-name map

| Runtime | Deployment source | Classification |
| --- | --- | --- |
| `REPORT_EXPORT_PROVIDER` | `API__REPORT_EXPORT_PROVIDER` | safe enum |
| `TRIGGER_PROJECT_REF` | `API__TRIGGER_PROJECT_REF` | provider identifier |
| `TRIGGER_SECRET_KEY` | `API__TRIGGER_SECRET_KEY` | secret |
| `BUSINESS_MEDIA_STORAGE_PROVIDER` | `API__BUSINESS_MEDIA_STORAGE_PROVIDER` | safe enum |
| `R2_ACCOUNT_ID` | `API__R2_ACCOUNT_ID` | provider identifier |
| `R2_BUSINESS_MEDIA_BUCKET` | `API__R2_BUSINESS_MEDIA_BUCKET` | deployed resource |
| `R2_REPORT_ARTIFACTS_BUCKET` | `API__R2_REPORT_ARTIFACTS_BUCKET` | deployed resource |
| `R2_ACCESS_KEY_ID` | `API__R2_ACCESS_KEY_ID` | secret identifier |
| `R2_SECRET_ACCESS_KEY` | `API__R2_SECRET_ACCESS_KEY` | secret |

Local validation uses deterministic Trigger.dev and object-storage fakes. Missing external
resources block only provider-enabled `hml` validation, not local completion.

## External revalidation still required

- Create per-environment Trigger.dev projects/keys and private R2 buckets with least privilege.
- Configure and verify the 30-day R2 lifecycle rule.
- Deploy the named task and run the authenticated `hml` put/head/get/delete and export smoke tests.
