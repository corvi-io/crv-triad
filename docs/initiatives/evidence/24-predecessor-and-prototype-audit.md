# Initiative 24 Predecessor And Prototype Audit

## Purpose

Record the read-only dependency, overlap, UI, and fixture preparation completed before Initiative 23 is
accepted and merged into `staging`. This document is execution evidence for Initiative 24; it does not
change the approved PRD or authorize financial runtime mutations against a provisional service source.

## Source Materialization

- The approved Initiative 24 PRD and execution plan were absent from the Initiative 22-based checkout at
  `51265ac` and from local/remote refs, connected Maestri notes, and GitHub issues.
- The user identified the approved Ground checkout as the source of truth on 2026-09-05.
- The PRD and plan were incorporated without contract changes. Their initial copied SHA-256 values were
  `90bd75628f6bb4f765090b98cc7574110d291bedec27339f92db2c1d1c4ce029` and
  `aa312e4eae0e1e0c73122632f1f67592e8593b3015ffba3b341233620a455873` respectively.
- `Approval state: Approved` and the recorded approval history were preserved.

## Dependency Gate

- Audited base: Initiative 22 merge commit `51265ac`.
- Initiative 23 owner: Brasa.
- Current state: blocked for TASK-001 completion and every financial runtime mutation until Brasa provides
  the sealed handoff schema, acceptance evidence, and the Initiative 23 merge SHA in `origin/staging`.
- Required synchronization: fetch and integrate the merged `origin/staging` commit before generating a
  finance migration or editing the Service Desk/revenue integration.

### Required Initiative 23 handoff evidence

- Immutable completed-visit identifier and handoff version.
- Eligibility states and proof that canceled/in-progress/no-performed-item visits cannot open checkout.
- Performed line IDs, catalog references, immutable labels, professional snapshots, exact price cents,
  stable line order, completion timestamp, tenant, unit, and snapshotted unit timezone.
- Guest and linked-client behavior without requiring an invented client record.
- Read port/query boundary owned by Service Desk; Revenue Operations must not query private tables directly.
- Transactional completion and retry evidence, including historical completed visits.
- Explicit confirmation that checkout registration/reversal never changes visit status, performed lines,
  appointment lifecycle, completion time, or `lastVisitAt`.

## Existing Prototype Inventory

The current Studio `revenue-operations` module is a development prototype and is not a production contract.

| Surface | Reusable reference | Production-incompatible behavior to remove or replace |
| --- | --- | --- |
| Checkout route | `/service-desk/$sessionId/checkout`; focused route and service-line presentation | Repository `getCheckout` creates a checkout; production GET must be side-effect free and opening is an idempotent POST. |
| Money helpers | Integer-cent types, deterministic proportional remainder, zero-subtotal example | Number reductions can overflow before validation; server needs bounded integer inputs and BigInt intermediate checks. |
| Tender form | Pix, cash, debit, credit; mixed tender and cash-change vocabulary | Drafts lack server versions/policy/day checks and durable command receipts. |
| Completion | Confirmation and read-only result patterns | `completePayment` marks a prototype sale and invalidates operational queries; production registration must not complete or reopen service work. |
| Cash page | Unit/date selection, closing form, summary composition | No explicit cash-day open, supply, withdrawal, movement reversal, reopen revisions, current-day correction, or server pagination. |
| Attribution | Session name is available for display | `responsiblePersonName` is sent by the caller; production derives actor ID/display snapshot from the authenticated session. |
| Finance summary | Tender totals and cash projection examples | Commission, professional take-home, and barbershop-profit projections are explicitly outside Initiative 24. |
| Sources | Module repository port and TanStack Query boundary exist | Memory scenarios, `scenarioId`, decline simulation, resets, unbounded `listPaidSales`, and commission preview cannot exist in normal production composition. |
| Setup payments | Four accepted method labels already exist in setup vocabulary | Current production HTTP completion returns no persisted method policy; commission controls are unrelated and must not be activated. |

## UI And Field Preparation

- Reuse the shared BRL `MaskedInput`, field/error ownership, `ActionDrawer`, confirmation dialog, DatePicker,
  table/pagination, skeleton, toast, and focus restoration patterns already established by Clients/Agenda.
- Preserve empty input versus explicit `R$ 0,00` for opening/counting fields.
- Keep reasons private: render inline validation and never echo them in toast, URL, analytics, logs, or
  idempotency fingerprints.
- Preserve entered tender/count/reason drafts across focus refetch, transient errors, stale versions, and
  unknown outcomes; do not persist them in browser storage or URLs.
- Remove commission/profit cards, provider-decline language, fake counters, and caller-selected actor data.
- Required baseline evidence after Initiative 23 merge: Clients, Agenda, completed Service Desk, checkout,
  cash, and setup payments at desktop and 320 CSS pixels in light/dark, plus keyboard/focus ownership.

## PostgreSQL Fixture And Race Plan

Use a dedicated disposable database containing migrations through Initiative 23. Do not use the live browser
QA database for destructive integration suites.

- Tenant A: owner, admin, two members/cashiers, two units with distinct timezones, linked client, and guest.
- Tenant B: foreign unit/visit/checkout/receipt IDs for read and mutation isolation assertions.
- Completed visits: linked and guest, yesterday/today, zero-price, multi-line rounding remainder, zero
  subtotal plus surcharge, renamed/repriced catalog after completion, and maximum 20-line handoff.
- Ineligible visits: in progress, canceled, no performed line, and foreign tenant/unit.
- Cash days: explicit zero/non-zero opening, unclosed prior day, current open day, closed/reopened/reclosed
  revisions, and later-day existence blocking reopen.
- Commands: same key/same payload replay, same key/different payload conflict, two actors/different keys,
  revoked access replay, failure after each write boundary, and lost-response reconciliation.
- Races: open/open, timezone/open, register/register, register/close, movement/close, reversal/close,
  reverse/replace, and reopen/later-day open.
- Money boundaries: safe-integer maximum, intermediate multiplication overflow, negative/decimal input,
  short/excess tender, duplicate method, cash received below applied, exact cash change, and signed reversal.

## Risks Before Runtime Work

- Initiative 23 may introduce migration IDs, module names, handoff fields, access capabilities, and shared UI
  changes that invalidate any provisional finance schema or adapter.
- The finance module requires one global lock order across policy, unit/day, checkout, receipt, and timezone
  writers; implementing only one use case early would create deadlock/race risk.
- Existing prototype types mix posted facts, mutable checkout state, commission policy, and UI scenarios;
  production contracts must be modeled from the approved PRD and sealed handoff, not evolved in place by
  merely adding persistence.
- Current browser arithmetic remains useful only for presentation and draft feedback. The API is the exact
  money authority and must reject forged totals.
- Dashboard and Service Desk projections must remain narrow so members cannot infer unit cash aggregates.

## Continuation

After Brasa reports acceptance and merge SHA: verify the SHA is reachable from `origin/staging`, synchronize
this branch, inspect the Initiative 23 diff and all new instructions/docs, then complete TASK-001 before any
finance migration or mutation implementation.
