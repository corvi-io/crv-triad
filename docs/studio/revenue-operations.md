# TRIAD Studio Revenue Operations Prototype

## Scope

ENG-48 adds the authenticated `/service-desk/$sessionId/checkout` child route under
`Atendimentos`. It continues a `ready-for-payment` service session into a frontend-only command
tab, exact payment registration, item-level commission preview, and immutable paid-sale snapshot.
ENG-49 adds the authenticated top-level `/cash` route for a unit/date operational summary, counted
cash, one immutable daily closing, and bounded read-only closing history.

The prototype registers demonstration payments; it never processes money. It has no provider,
gateway, QR Code, terminal, card number, CVV, token, credential, refund, settlement, fiscal,
accounting, persistence, polling, realtime, or commission-payout behavior.

## Ownership And Composition

- `src/modules/revenue-operations` owns checkout, tender, paid-sale, commission, cash aggregation,
  daily closing, history, repository, query, and presentation contracts.
- `src/dev/revenue-operations` owns the deterministic memory coordinator and scenarios.
- `service-desk` exposes only a typed ready-session handoff and completion seam. Revenue
  presentation imports neither service-desk presentation nor `src/dev`.
- `scheduling` remains the appointment lifecycle owner. Successful scheduled payment asks its
  public repository to transition the linked appointment to `completed` and `paid`.
- `virtual:studio-revenue-operations-source` follows the accepted scheduling source enablement. It
  resolves memory only for `local` or configured `dev` and resolves a disabled shim in `hml` and
  `prd`. No new runtime variable exists.

The repository instances share the same scheduling/service-desk composition. A walk-in paid sale
does not create an appointment. Supported Dashboard finance values use paid-sale projections when
the revenue source is present; scheduling continues to own operational appointment facts.

## Cash And Daily Closing Contract

The `/cash` route scopes every read and mutation by scheduling unit and canonical local
`YYYY-MM-DD` operational date. It derives paid-sale count, received revenue, payment methods,
discounts, surcharges, commissions, barbershop value, professional values, and expected cash from
the accepted paid-sale ledger. Cancellation and no-show counts come from `SchedulingRepository`
day facts; cash presentation imports neither scheduling fixtures nor development adapters.

Payment-method values must equal received revenue. Professional commission plus barbershop values
must equal accepted net sale values. All calculations use safe integer cents. Counted cash minus
expected cash produces the signed difference. A non-zero difference requires a trimmed
3–160-character reason; reason text remains outside URLs, logs, toasts, and telemetry.

Closing validates the complete projection before writing. One detached snapshot is committed per
unit/date with exact aggregates, counted cash, difference, bounded reason, responsible-person
display name, and close time. Duplicate close requests return the existing snapshot. Synthetic
failure and stale-generation paths write nothing. Closed days and historical details expose no
reopen or edit action.

History is bounded to 24 snapshots per unit in the evaluation source. A production API requires
server-side pagination and indexed tenant/unit/date queries.

## Exact-Money Contract

All BRL amounts are safe integer cents. Percentage commission rates are integer basis points.
Adjusted line values are allocated proportionally from adjusted line prices, with remaining cents
assigned in stable service-item order. When every adjusted line price is zero, proportional
allocation has no denominator: the complete non-negative net adjustment is assigned to the first
service item in stable order, and an adjustment without any service item is rejected. Totals cannot
be negative.

The command tab accepts one fixed discount and one fixed surcharge. Non-zero values require bounded
reasons. Authorized scenarios may override a line price with a bounded reason; unauthorized
scenarios reject the operation without claiming production RBAC.

Commission precedence is:

1. service/professional percentage, fixed-cent, or explicit no-commission override;
2. professional default percentage;
3. no commission.

The commission base is the line's net allocated value. Fixed commission is capped at that
non-negative base. Every paid item snapshots the matched rule, source, base, calculated commission,
barbershop value, and professional display identity.

## Tender And Completion Contract

The UI supports `Pix`, `Dinheiro`, `Débito`, and `Crédito`. Mixed payment is two or more internal
tender lines, not a gateway split. Applied amounts must equal the checkout total exactly. Cash
received must cover its applied amount and derives non-negative change. Zero, negative, duplicate,
excessive, and incomplete combinations cannot complete.

Payment completion validates all invariants before writes. The memory coordinator then completes
the service/optional appointment and commits exactly one paid sale plus immutable commission
snapshots. Exact operation retries return the accepted sale. Synthetic decline and one-shot failure
occur before writes. Paid state exposes no mutation controls.

Scenario selection and reset increment the source generation. Delayed reads or writes verify that
generation before commit. A full reload reconstructs the selected deterministic scenario rather
than persisting business state.

Cash scenarios cover typical, exact-count, positive/negative difference, empty, multiple-tender,
adjustment, scheduling-outcome, multiple-professional/commission, slow, next-failure,
persistent-error, already-closed, dense-history, and long-reason states. They seed sales only by
completing accepted ENG-48 checkout contracts; the cash route has no copied financial fixtures.

## Privacy, Security, And URLs

Only stable session ID and allowlisted technical service-desk search values enter route state.
Customer snapshots, amounts, tenders, reasons, commissions, and payment details stay out of URLs.
Reasons are limited to 160 characters and the UI warns against personal, card, credential, or
sensitive data. No checkout payload is logged or sent to telemetry.

## Accessibility And Responsive Contract

The routes use source-ordered headings, complete Card anatomy, native forms/buttons, associated
labels and errors, first-invalid focus, a focus-managed confirmation dialog, stable pending labels,
concise live feedback, and visible text in addition to status color. Controls retain 24 CSS pixel
minimum targets.

The two-column desktop composition becomes a single semantic flow before narrow widths. Long
labels wrap without document overflow. Automated Playwright evidence covers light/dark,
320-CSS-pixel width as the 640px-at-200%-zoom layout equivalent, keyboard entry, confirmation
focus, forced colors, reduced motion, target sizes, and axe WCAG A/AA rules. Real browser 200%
zoom, VoiceOver/NVDA, and physical coarse-pointer review remain manual release evidence.

## Future Production Boundary

A future API must define tenant/unit authorization, canonical identities, transactional
persistence, idempotency keys, concurrency, audit attribution, provider adapters, server-side
webhook verification/fetch-back, asynchronous payment states, reconciliation, privacy retention,
observability, and indexed queries. The internal paid-sale ledger remains product truth; a payment
provider is an adapter rather than a domain owner.

## Setup Policy Consumption

ENG-55 adds a narrow checkout policy port. Each future in-memory checkout snapshots the active Pix,
cash, debit, and credit choices from barbershop setup; the payment form lists only those choices and
the repository rejects a disabled tender even if called directly. “Mixed” remains a derived
capability represented by two or more accepted tender lines. Changing setup after payment does not
rewrite the paid sale, its service-line values, tenders, or commission snapshots.
