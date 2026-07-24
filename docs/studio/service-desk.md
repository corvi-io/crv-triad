# Studio Service Desk

## Scope

`/service-desk` is an authenticated local/configured-`dev` product-evaluation module labeled
`Atendimentos`. Reception can project scheduled arrivals into a queue, add a temporary walk-in,
call a customer, start service, operate the performed-service session, and hand it off as
`Pronto para pagamento`.

It does not define prices, discounts, payment, commission, cash closing,
production authorization, persistence, realtime reconciliation, or automatic allocation.

## Architecture

- `src/modules/service-desk` owns queue vocabulary, pure time/filter/count projections, safe search
  state, the repository port, TanStack Query hooks, RHF/Zod form behavior, and presentation.
- `src/dev/service-desk` owns deterministic walk-ins, the scheduled `called` overlay, the injected
  source clock, scenarios, and the session-memory coordinator.
- `virtual:studio-service-desk-source` is the only route composition seam. Presentation never
  imports `src/dev`.
- The memory coordinator receives the module-scoped scheduling repository created by
  `src/dev/scheduling/entry.ts`. Agenda, Dashboard, and Service Desk therefore read the same
  appointment instance.

Scheduled `arrived` and `waiting` appointments are projected rather than copied. `Chamar cliente`
adds only a reception-owned `called` overlay. `Iniciar atendimento` calls the scheduling
repository's public transition contract with `in-progress`, so Agenda and Dashboard remain coherent.
Walk-ins remain temporary contact snapshots and create neither Client records nor Agenda
appointments.

## Service Fulfillment

`/service-desk/$sessionId` is the focused child workspace for an `in-service` queue entry. The same
service-desk repository owns the queue entry and its service session; no second source or browser
storage exists. Starting service creates one immutable initial item from the selected service and
professional. Additional catalog services may be added, reassigned to an eligible available
professional, and removed. Operational notes are optional, trimmed, limited to 500 characters, and
must not contain credentials, payment-card data, documents, or health information.

The source clock records `startedAt` and derives elapsed time with future-clock clamping for
presentation. Every session write rejects a regressed source clock before changing the snapshot.
Stable operation IDs deduplicate exact retries for add, remove, reassignment, notes, and finish at
the memory boundary without forbidding separate duplicate service items. Completion requires at
least the initial item and an eligible available professional on every item. Finish is atomic,
pending-safe, and idempotent, records `finishedAt`, and changes only the service session and queue
handoff to `ready-for-payment`. A linked scheduled appointment remains `in-progress`. Completed
sessions are read-only and cannot be reopened.

The child route carries only the board's allowlisted technical search context and restores it on
return. Missing sessions use a bounded not-found state. Recoverable source failures use a shared
Alert with `Tentar novamente`; mutation promises keep stable labels, suppress duplicate submission,
and produce concise PII-free Sonner success/error feedback.

## Queue And Form Contract

The visible stages are `Aguardando`, `Chamados`, and `Em atendimento`. Only waiting can become
called, and only called can become in service. A first-available walk-in remains unassigned until a
person explicitly selects an eligible professional at start time. No optimizer or automatic
assignment is implied.

The walk-in drawer collects a required name and service, optional masked phone, specific or
first-available preference, conditional professional, arrival time, normal or fit-in priority, and
bounded notes. React Hook Form and Zod own application validation. Every validation branch has
explicit Brazilian Portuguese copy, errors are linked to controls, and invalid submission focuses
the first field.

Search uses `ListSearchField`; stage, priority, preference, and professional use shared list-filter
compositions. Only unit, stage, priority, preference, stable professional ID, and technical scenario
ID may enter URL state. Search text, names, phones, notes, and form values remain component/session
memory and are never logged.

## Deterministic Source And Reset

The source exposes bounded normal, empty, dense, long-wait, specific-professional,
first-available, unavailable-professional, slow, next-failure, and persistent-error scenarios.
Scenario IDs are technical URL inputs and never appear in ordinary product chrome. A full reload
reconstructs fixtures. Scenario changes and resets increment a generation so delayed operations
cannot write into a newer scenario. Failures occur before writes.

The service-desk memory source follows the scheduling source boundary. It is available only when
`VITE_SCHEDULING_SOURCE=memory` and `VITE_DEPLOY_TARGET` is `local` or `dev`. No new public
environment variable exists. `hml` and `prd` resolve the disabled shim, and production artifact
scans reject the adapter, scenarios, and representative synthetic markers.

## Accessibility And Responsive Behavior

The board uses ordered named regions with neutral cards, visible text plus badge/icon state, native
buttons, full Card anatomy, Avatar fallbacks, and shared feedback components. Wide screens use three
columns; medium and narrow screens stack the stages without document overflow. Stage lists own
bounded internal vertical scrolling. Shared focus-managed drawer behavior restores the trigger,
reduced motion removes transitions, and actions preserve at least 24 by 24 CSS pixels.

Playwright records 1600x900 and 320-CSS-pixel evidence, focused axe WCAG 2.2 A/AA, light/dark/system,
forced colors, reduced motion, focus return, target size, loading/error/empty states, both accepted
journeys, and production disablement. Real browser 200% zoom, VoiceOver/NVDA, and physical
coarse-pointer review remain manual evidence and must be reported honestly.

## Future Production Boundary

A production initiative must define canonical visit/client identity, tenant and unit authorization,
queue ordering, concurrency and idempotency, audit attribution, persistence, clock/timezone
semantics, bounded API queries, realtime reconciliation, privacy lifecycle, and observability.
Finance remains a separately owned future initiative.
