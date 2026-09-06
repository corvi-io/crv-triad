# Studio Service Desk

## Scope

`/service-desk` is the authenticated reception and service-fulfillment workspace. The production source is the tenant-safe HTTP API; the deterministic memory source remains an explicit local/dev test seam. Reception can admit scheduled arrivals or walk-ins, call and return customers, register a pre-service exit, conduct services sequentially, interrupt work with manager authorization, and read bounded completed history.

Service Desk owns operational fulfillment. It does not mutate payments, discounts, commissions or cash. Completion seals an internal handoff for the finance boundary; the production UI truth is `Atendimento concluído`, not a promise that payment has been recorded.

## Runtime composition

- `VITE_SERVICE_DESK_SOURCE=http` is the default and production-safe value.
- `memory` is accepted only with `VITE_DEPLOY_TARGET=local|dev`; it preserves synthetic evaluation scenarios and the prior checkout prototype for adjacent regression coverage.
- `disabled` renders the bounded unavailable state. There is no implicit fallback from HTTP to memory.
- `virtual:studio-service-desk-source` is the route composition seam. Production presentation does not import `src/dev`.
- Query keys, requests and invalidation are scoped by active tenant and selected unit. Commands use a stable idempotency key and the version captured when the user initiated the action.

## Reception and identity

Scheduled admission references one eligible appointment and is unique per tenant/appointment. Walk-ins choose exactly one identity mode: an active canonical `clientId`, or a guest display name with optional phone. A guest is not silently converted into a Client. The drawer exposes canonical unit, client, service and professional options supplied by the API and keeps names, phone, notes and reasons out of URLs.

Queue order is server-owned FIFO. The operational stages are `Aguardando`, `Chamados` and `Em atendimento`; completed/canceled visits move to bounded history. Calls may return to waiting. Pre-service departure requires a private reason and produces no completed handoff.

## Sequential fulfillment

A called visit can start only while its unit is open and the selected professional/service remains eligible. Scheduling owns the shared occupancy projection and lock, so appointment and live-service claims cannot overlap across units. Exactly one visit item can be active at a time. Pending items may be removed; active items may be finished or extended; completed items retain immutable service, professional and price snapshots.

Finishing the visit requires at least one completed item and no pending/active item. The API commits visit state, item snapshots, occupancy release, client projection, metadata events and sealed handoff in one PostgreSQL transaction. Exact idempotent retries replay the stored result before version validation; a reused key with a different payload is rejected. Completed and canceled visits are read-only and cannot reopen.

## Sealed handoff v1

The immutable internal `CompletedServiceHandoff` contains:

- `schemaVersion: 1`, `tenantId`, `unitId`, `unitName`, `timezone`, `visitId`;
- `clientId | null`, `appointmentId | null`, `customerDisplayName`;
- `finishedAt`, `visitVersion`;
- `items[]`: `itemId`, `serviceId`, `serviceName`, `professionalId`, `professionalName`, `priceCents`, `startedAt`, `finishedAt`.

Only a completed visit with at least one performed item is eligible. Guest completion uses `clientId: null`; linked-client completion updates `lastVisitAt` in the same transaction. Canceled or zero-item interrupted visits never create the handoff. Contact details, operational notes, private reasons, revenue and commission are excluded.

## Authorization, privacy and observability

`service_desk.read` reads bounded projections, `service_desk.manage` performs ordinary reception and fulfillment commands, and `service_desk.correct` permits owner/admin correction or interruption. Tenant and unit references are revalidated server-side; foreign resources use safe not-found/denied responses.

Logs and events contain correlation, actor/entity IDs, command/result, versions and timing only. Do not log customer names, phone, notes, reasons, tokens or handoff payloads. Durable HMAC receipts prove command payload identity without retaining payloads in telemetry.

## Accessibility and shared overlays

The board, list, drawers and session workspace use shared Sheet, Select, form, card and feedback primitives. Keyboard dismissal restores focus. Desktop and 320px layouts avoid document overflow; reduced-motion and forced-colors modes remain usable. Any shared Sheet/Select correction requires explicit open/close regression in desktop, mobile and reduced-motion modes before delivery.

## Local verification

Use `apps/api/tests/fixtures/service-desk-local-qa.ts` to prepare two isolated synthetic tenants, then run API on 8103 and Studio on 3103 with `VITE_SERVICE_DESK_SOURCE=http`. The Playwright memory suite accepts an isolated port through `STUDIO_E2E_PORT`, starts its own Vite process with `reuseExistingServer: false`, and derives mock CORS from the same port.

For incident and rollout guidance, see `docs/operations/service-desk-fulfillment-runbook.md`.
