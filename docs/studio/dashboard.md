# TRIAD Studio Operational Dashboard

ENG-45 replaces the authenticated `/overview` placeholder with an operational
Dashboard derived from the current scheduling source. It is a visual evaluation
surface, not an accounting report or a production analytics contract.

## Source And Runtime Boundary

The Dashboard and Agenda resolve the same module-scoped scheduling repository in
local and configured `dev` builds. A successful appointment mutation made from
either route is therefore visible from the other route until a full reload
reconstructs the selected deterministic scenario. There is no Dashboard fixture,
source variable, fake HTTP layer, browser persistence, polling, or realtime
subscription.

`hml` and `prd` continue to resolve scheduling as disabled. In those targets the
Dashboard fails closed with an unavailable state and no synthetic operational
values. A future production Dashboard needs an authorized, tenant-bounded
aggregate API rather than browser calculation over raw appointments.

The user-supplied visual reference inspected on 2026-07-23 influenced only the
large-screen fold order, density, alignment, and relative weight: filters; five
KPIs; upcoming plus attention; flow plus professional occupancy; capacity plus
supported finance plus services; and cancellations/no-show plus clients. The
implementation gives upcoming appointments more width than attention, keeps the
flow/professional row balanced, and uses equal three- and two-column lower
groups. Existing TRIAD tokens, semantic components, accepted formulas,
responsive behavior, and accessibility take precedence over its pixels, colors,
numbers, and parallel identity.

## Filters And URL Safety

One validated search contract drives every visible block:

- period: `Hoje`, `Ontem`, `Esta semana`, `Este mês`, or `Personalizado`;
- date-only anchor and custom bounds;
- allowlisted scheduling unit;
- safe professional identifier, retained only when the loaded source contains it;
- allowlisted technical scenario identifier in the development source.

Custom ranges contain at most 31 inclusive calendar days. Invalid dates, units,
periods, professional IDs, and scenarios fall back safely. A syntactically valid
professional ID absent from the loaded catalog is removed from the URL, and
drill-down uses only the validated projection filter. Names, phone numbers,
notes, search text, appointment payloads, and other client-shaped data never
enter URL state. Filter completion is announced politely without moving focus.

## Projection And Formulas

`deriveDashboard` is a typed, pure scheduling-owned projection over one bounded
`ScheduleDay` read. Presentation receives a read-only view model and does not
import scheduling or development-source internals.

| Value | Calculation |
| --- | --- |
| Agendamentos | All matching appointments in the inclusive date/professional bounds. |
| Concluídos | `completed` count; percentage denominator is all matching appointments. |
| Valor em estado pago | Sum of prices for completed appointments marked `paid`; this is not provider settlement. |
| Média em estado pago | Paid-state completed value divided by paid completed count; unavailable when the denominator is zero. |
| Ocupação | Duration of all records except `canceled` and `no-show`, divided by available professional minutes. |
| Próximos atendimentos | Up to six non-terminal records at or after the source/query time, ordered by date and start. |
| Atenção necessária | Derivable waiting, completed-pending, overrun in-progress, near scheduled, and overlap items, capped at five. |
| Fluxo | Factual count for each of the existing eight Agenda statuses. |
| Ocupação dos barbeiros | Non-canceled/non-no-show booked minutes divided by each professional's available minutes; never ranked. Current state is shown only when the bounds include today, otherwise it is explicitly unavailable. |
| Capacidade | Available, reserved, and non-negative free minutes, also projected into 08h–12h, 12h–18h, and 18h–22h bands. |
| Previsto | Prices for all records except `canceled` and `no-show`; not forecast accounting revenue. |
| Pendente | Prices for completed appointments marked `pending`. |
| Serviços | Up to five services ordered by matching appointment count, then name, with scheduled and paid-state values. |
| Cancelamentos e no-show | Counts and percentage over all matching appointments; potential value is the sum of those appointment prices, not recognized lost revenue. |
| Clientes atendidos | Unique client IDs among completed appointments. |
| Mais de um atendimento no período | Client IDs appearing more than once inside the selected bounds; not acquisition or long-term retention. |
| Atualizado | Time of the most recent successful browser query; it makes no realtime claim. |

Available minutes begin with each selected professional's configured work
periods for every inclusive day, then subtract that professional's breaks and
blocked periods. Walk-in periods remain bookable capacity. Every percentage
uses zero when its denominator is zero.

## Truthful Unsupported Data

Discounts, payment-method distribution, provider settlement, new-client status,
first-visit history, acquisition, and long-term retention are unavailable in the
current source. The Dashboard names those gaps explicitly; it never displays an
invented zero or derives a stronger business claim from appointment frequency.

## Actions And State

`Novo agendamento` and appointment rows open the existing scheduling drawer and
reuse its validation, mutation, feedback, reschedule, cancellation, and rollback
contracts. KPI, status, and professional actions navigate to Agenda with
allowlisted filters. Services navigate to the existing setup section. The
clients action navigates only to the existing clients route and imports no
client-module internals. No finance, alert-detail, service-detail, client-detail,
or second Dashboard route is introduced.

Loading, delayed, empty, filtered-empty, error/retry, unsupported-data, and
disabled-source states use Brazilian Portuguese copy. A full reload resets the
local scheduling source.

## Accessibility And Responsive Contract

Source order is the accepted reading and keyboard order regardless of responsive
grid changes. Sections use semantic headings, tables, lists, buttons, labels,
status text, and accessible progress values. Color is supplementary. Interactive
targets retain at least 24 CSS pixels, focus remains visible and unobscured, and
reduced motion suppresses the added progress transition.

The five KPI cards reflow from five columns through intermediate wrapping to one
column. Operational groups stack without page-level horizontal overflow; tables
own their overflow. Automated browser evidence covers 1600 × 900 hierarchy,
medium/tablet layouts, 320-CSS-pixel reflow, keyboard focus, target size,
light/dark/system, forced colors, reduced motion, progress track/indicator
contrast, and axe. Actual browser 200% zoom, VoiceOver/NVDA, and physical
touch-device review remain manual release follow-ups.
