# TRIAD Studio Basic Reporting Prototype

ENG-53 adds the authenticated `/reports` management surface. It is a bounded
local/configured-`dev` evaluation module for historical criticism, not a
production analytics or authorization contract. It adds no API, persistence,
export, polling, realtime behavior, forecasting, or role enforcement.

## Runtime And Source Boundary

`virtual:studio-reporting-source` resolves a deterministic repository only when
the accepted scheduling and client-management memory sources are enabled for
`local` or `dev`. The same virtual module resolves disabled for `hml` and
`prd`; the route then renders an unavailable state and the production bundle
excludes reporting fixtures and source markers. No reporting environment
variable is introduced.

The development coordinator consumes accepted scheduling, paid-sale,
commission, client, and cash/open-day facts through their public repository
ports. Reporting presentation imports only the reporting port, query hooks, and
view models. It never imports `src/dev` or another module's presentation.
Future production reporting requires tenant/unit-authorized aggregate and
facet endpoints; the browser must not scan raw appointments, sales, or clients.

The injected source clock is `2026-07-24` for deterministic evaluation. Default
filters cover that clock's current calendar month. Scenario and reset changes
increment a generation; delayed work checks its captured generation before
returning, so stale results cannot replace a newer scenario.

## URL And Filter Contract

One inclusive, bounded query applies to every report:

- `from` and `to`: canonical local `YYYY-MM-DD` dates;
- optional `professional`: allowlisted technical facet identifier;
- optional `service`: allowlisted technical facet identifier;
- optional `paymentMethod`: `pix`, `cash`, `debit`, or `credit`.

The route supports `Hoje`, `Últimos 7 dias`, `Este mês`, and a custom inclusive
range using the shared `DatePicker`. One query may cover at most 366 calendar
days. Invalid dates, reversed/overlong periods, unsupported payment methods,
unsafe facet identifiers, and unknown scenario values normalize to safe
defaults. Customer names, notes, contact data, and financial payloads never
enter the URL.

The development-only `scenario` search value supports deterministic typical,
empty, edge, partial identity, zero-paid-sales, unknown-customer, ranking-tie,
long-label, slow, fail-next, and persistent-error evaluation. There is no
ordinary product scenario/reset chrome. Reload reconstructs the URL-selected
scenario; repository reset reconstructs the same accepted facts.

## Report Rules

All money is integer cents. Percentage rates are integer basis points and are
formatted only at presentation:

- **Faturamento por período:** exact paid service-line net cents bucketed by
  operational date.
- **Atendimentos por profissional:** count of performed service items in paid
  sales, not appointment rows.
- **Serviços mais vendidos:** paid item quantity and exact net service revenue;
  ordering is quantity, revenue, pt-BR label, then stable identifier, capped at
  eight rows.
- **Ticket médio:** exact paid revenue divided by distinct paid-sale count;
  zero paid sales render no calculation.
- **Comissões por profissional:** immutable item commission snapshot cents and
  their associated net service revenue.
- **Cancelamentos e ausências:** separate canceled and no-show counts/rates;
  the visible denominator is all matching scheduling appointments.
- **Clientes novos e recorrentes:** only sales with a stable accepted analysis
  key participate. A customer is new when their first completed paid visit is
  in the selected range and returning when an earlier completed paid visit
  exists. Unknown customers are counted separately and excluded from both
  percentages. An unavailable identity source is a partial state, never zero.

Exact tests reconcile summary revenue with the revenue series, summary
commission with professional commission rows, ticket numerator/denominator,
and filtered repository results.

Payment-method filtering preserves split tenders. Each service-line net value
and immutable commission snapshot is allocated across the sale's tender methods
in proportion to applied integer cents. Floor allocations are reconciled by
deterministic largest remainder, then stable payment-method order. A filtered
ticket is allocated revenue divided by distinct sales containing that method;
service and ranking quantities count each paid item that contains the selected
method. Therefore quantity counts across separate payment-method slices are not
additive when one item was paid with more than one method, while revenue and
commission cents reconcile exactly across all method slices.

## Presentation And Accessibility

Reports remain distinct from the current-day Dashboard: the page leads with
one historical filter set, then a summary and seven titled analysis sections.
The reviewed official shadcn Chart composition uses Recharts 3 with semantic
Studio tokens. Every chart has a visible textual takeaway, programmatic name
and description, Recharts' accessibility layer, and a semantic table
equivalent. Values and labels remain available without color; charts are
supplementary to their tables.

Tables own bounded horizontal overflow so the document does not overflow at
320 CSS pixels or 200% zoom. Source order remains reading and keyboard order.
The shared controls retain visible focus and at least 24px targets. Loading,
empty, partial, fail-next, persistent-error, retry, and disabled states use
stable Brazilian Portuguese labels. Forced colors and reduced motion rely on
the existing semantic component contract; no reporting palette or animation
token is added.

Automated verification covers projection invariants, filter normalization,
route privacy and URL recovery, component table/chart equivalents, stale
generation rejection, production exclusion, Playwright keyboard/reload/error
journeys, and axe. Manual screen-reader evidence remains explicitly separate
from automated semantics and must not be claimed unless exercised.
