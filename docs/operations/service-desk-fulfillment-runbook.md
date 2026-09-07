# Service Desk Fulfillment Runbook

## Signals

Investigate sustained command conflicts, repeated idempotency-key mismatches, failed occupancy claims, unusual command latency, or visits remaining `in-service` beyond their interval. Use correlation, tenant, unit, visit, actor, command, version and result metadata. Never copy customer names, phone, notes, departure reasons or handoff contents into logs or tickets.

## Safe diagnosis

1. Confirm tenant/unit/visit identifiers and current visit version through authorized reads.
2. Inspect live occupancy and the active item in one read-only PostgreSQL transaction.
3. Check command/event metadata and receipt identity for an exact retry; do not invent a new key for an unknown-outcome retry.
4. Verify opening hours, professional/service eligibility and adjacent appointments before extension or interruption.
5. If the UI is stale, reload the authoritative visit. Do not overwrite using a silently adopted version.

Owner/admin interruption is the supported recovery path for genuinely stuck work. It records a private reason, releases occupancy and either seals performed items or cancels a zero-item visit atomically. Direct table edits and hard deletion are unsupported.

## Rollout and rollback

Apply additive migrations before switching Studio to `VITE_SERVICE_DESK_SOURCE=http`. Verify occupancy backfill and unique/exclusion constraints before enabling commands. Roll back Studio to `disabled` to stop new UI commands while preserving data; never point production to memory. Application rollback must retain additive tables and columns until compatibility is verified. Do not down-migrate by dropping fulfillment data during incident response.

After recovery, verify queue/history reads, absence of orphan live claims, handoff eligibility and linked-client `lastVisitAt`. Record only metadata-safe evidence.
