# Studio Agenda Visual Prototype

ENG-40 refines the existing authenticated `/agenda` route into a visual prototype aligned with the
approved operational reference. The primary surface is a temporal board: time progresses down the
left edge and each barber owns one column. The alternate `Lista` view presents the same derived
records without changing the repository contract. `/workspace-preview/agenda` remains the
development-only QA route.

## Accepted Views And Layout

- `Quadro` is the default and canonical temporal view.
- `Lista` is the alternate view; the selector uses icon buttons and one controlled URL value.
- The board has a sticky `Horário` column with 15-minute rows and sticky barber headings.
- Each barber heading includes a deterministic portrait, name, unit, active marker, and appointment
  count.
- Each appointment card includes a deterministic client portrait, client name, time range, service,
  and textual status. Color is supplementary.
- The lower summary from the previous prototype is intentionally absent.
- Status-column Kanban and drag-and-drop are not part of the accepted visual direction.

## Filters And Period

Search, `Barbeiro`, `Cliente`, `Serviço`, `Status`, `Período`, `Unidade`, the view toggle, and
prototype settings share one horizontally bounded control row. Filters are button-like triggers,
not visible select fields. Each categorical trigger has a leading icon and a trailing total or
selected count, and opens a keyboard-accessible menu. Searchable catalogs provide a labeled search
field inside the menu.

`Período` opens a popover with today, tomorrow, and seven-day shortcuts plus a range calendar for
start/end selection. Unit, period, view, scenario, and stable synthetic entity IDs are shareable URL
state. Global search stays local so client-shaped text is not placed in URLs.

All predicates feed one `deriveAgendaResult`. Filtered-out appointments remain privacy-safe occupied
spans so the visible board cannot offer a conflicting free slot. The prototype is not an API or
database contract.

## Actions And State Changes

Cards open the existing details/edit/reschedule/cancel drawer. A contextual action menu supplies a
non-drag `Alterar status` path for non-terminal appointments. Cancellation/no-show and unpaid
completion still require explicit decisions. Terminal records remain read-only. Optimistic updates
and rollback remain repository-owned and update appointments plus occupancy projections together.

## Deterministic Data And Runtime Boundary

The normal scenario contains six synthetic barbers and 42 synthetic appointments between 08:00 and
the early afternoon. A 72-record dense scenario, empty, filtered-empty, many-professionals,
long-content, conflict, failure, and rollback scenarios remain available from prototype settings.
Generated SVG portraits are deterministic local data URIs: they require no network, persist no
biometrics, and do not represent real people.

`src/dev/scheduling` is session-memory-only. Refresh reconstructs the selected fixture; the app does
not write client, phone, note, portrait, payment, or transition data to browser storage or a mock
HTTP service. Vite exposes the memory implementation only for `local` or explicitly configured
`dev`; `hml` and `prd` resolve the null implementation. Better Auth remains the real identity
boundary.

## Accessibility, Responsive, And Performance

- The board uses a semantic table with column and row headers; the time axis remains available to
  screen readers.
- Every interactive slot, card, filter, menu, toggle, drawer, and dialog has a keyboard path and a
  visible focus treatment.
- Filter state, status, and selection do not depend on color alone.
- Menus and calendar use Base UI/shadcn focus management; card actions remain visible on coarse
  pointers.
- The filter row and board own their horizontal overflow so narrow layouts do not widen the page.
- Fixed 15-minute rows and bounded development fixtures keep DOM size predictable. The 72-record
  scenario is interaction evidence, not a production-capacity claim.

Focused Vitest covers URL parsing, derived filters, fixtures, the temporal board, list switching,
calendar opening, menus, drawers, and non-drag state changes. Focused Playwright covers the reference
layout, menus, period, view switch, state transition, narrow overflow, scenarios, and axe WCAG
2.2 A/AA checks. Real-device touch, VoiceOver/NVDA, and authenticated deployed `dev` review remain
manual follow-ups.

## Backend And Observability Follow-ups

A production API must define authorization, bounded server filtering, conflict detection,
idempotency, stale-write handling, audit attribution, pagination/virtualization thresholds, and
realtime reconciliation. Operational telemetry must not log client names, phones, notes, portraits,
tokens, or private headers. Useful future events are aggregate query duration, result count, filter
kind, transition outcome, and conflict class.
