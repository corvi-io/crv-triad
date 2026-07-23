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
- On the selected local calendar day, a labeled `Agora HH:mm` line marks the current minute only
  while it falls within the configured working interval. It starts after the sticky 80px time
  column, spans the visible professional grid, and remains clipped by the Agenda surface.
- Each barber heading includes a deterministic portrait, name, unit, active marker, and appointment
  count.
- Each appointment card includes a deterministic client portrait, client name, time range, service,
  and textual status. Color is supplementary.
- The lower summary from the previous prototype is intentionally absent.
- The temporal `Quadro` is the allocation Kanban. Eligible appointments can move vertically between
  15-minute times, horizontally between barber columns, or both; drag never changes status.
- Status-column Kanban remains outside the accepted visual direction.

## ENG-43 Visual Refinement

Appointment containers use the neutral `card`/`card-foreground` contract in
light and dark themes. The eight existing schedule status roles are mapped
through `data-appointment-status` and affect only a 3px logical leading
indicator, a bounded 16% light/12% dark leading tint, badge, compact symbol,
hover border mix, and drag outline. Canceled, completed, confirmed, no-show,
waiting, and in-progress records no longer become full red, green, gray, amber,
or blue blocks.

Medium/full cards retain the complete badge. Compact cards retain their 15-minute
height and time/customer information, show the existing non-color status symbol,
and keep the complete Portuguese status in the accessible name. Card borders,
foregrounds, shadows, grid surfaces/lines, sticky time/barber surfaces, hover,
focus, drag overlay, and drop target resolve through Agenda component tokens in
`src/index.css`; scheduling React contains no raw status colors.

The shared filter variants and primary CTA were measured and retained because
their existing neutral/rest and restrained semantic-gold states already meet the
handoff. The shared workspace active state replaces its complete outline with a
2px logical leading indicator; the shell remains its single owner.

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
and rollback update appointments plus occupancy projections together. Drag uses an explicit named
handle and changes only `start` and `professionalId`; no-op, conflicts, blocked periods, hidden
occupancy, ineligible barber/service, out-of-hours, invalid destinations, and terminal cards are
rejected. The drawer `Remarcar` action remains the equivalent click/tap alternative to drag.

## Deterministic Data And Runtime Boundary

The normal scenario contains six synthetic barbers and 42 selected-day synthetic appointments
between 08:00 and 16:00, including six legitimate non-terminal 16:00 records used by both Agenda
and Dashboard. It also owns 30 prior-day comparison records that remain outside Agenda's selected
day and are returned only when a bounded range includes them. The complete multi-day fixture is
projected once against a stable repository-local date anchor, so navigating between dates does not
move records and the same date always returns the same appointment IDs. A 72-record dense scenario, empty,
filtered-empty, many-professionals,
long-content, conflict, failure, and rollback scenarios remain available from prototype settings.
Generated SVG portraits are deterministic local data URIs: they require no network, persist no
biometrics, and do not represent real people.

`src/dev/scheduling` is session-memory-only. Refresh reconstructs the selected fixture; the app does
not write client, phone, note, portrait, payment, or transition data to browser storage or a mock
HTTP service. Vite exposes the memory implementation only for `local` or explicitly configured
`dev`; `hml` and `prd` resolve the null implementation. Better Auth remains the real identity
boundary.

Agenda and the ENG-45 operational Dashboard resolve one module-scoped local/dev scheduling
repository. Mutations made through the existing appointment drawer are therefore coherent across
`/agenda` and `/overview` during the browser session, while a full reload still reconstructs the
selected fixture. This composition change does not alter Agenda presentation, filters, rules, URL
state, drag-and-drop, status transitions, or mutation behavior.

ENG-46 composes that same repository into the development-only Service Desk coordinator.
`arrived`/`waiting` appointments are projected into `/service-desk`; reception-owned `called` state
does not extend Agenda status vocabulary; starting a scheduled service calls the existing
`transition` contract with `in-progress`. Agenda and Dashboard then observe the original appointment
change through their existing query keys. This integration does not change Agenda presentation,
drag-and-drop, filters, drawer, cards, allocation, or transition rules.

## Accessibility, Responsive, And Performance

- The board uses a semantic table with column and row headers; the time axis remains available to
  screen readers.
- Every interactive slot, card, filter, menu, toggle, drawer, and dialog has a keyboard path and a
  visible focus treatment.
- Mouse, touch, and keyboard drag use logical 15-minute targets across table `rowSpan` geometry;
  each arrow press advances exactly one time row or barber column. Portuguese live announcements,
  restored handle focus, and reduced-motion behavior remain part of the interaction.
- Filter state, status, and selection do not depend on color alone.
- The current-time cue combines its tokenized line with a visible Portuguese time label, exposes the
  same current time in the semantic table caption, ignores pointer input, and updates on the next
  minute boundary with subscription cleanup. It is absent on other dates and outside working hours.
- Menus and calendar use Base UI/shadcn focus management; card actions remain visible on coarse
  pointers.
- The filter row and board own their horizontal overflow so narrow layouts do not widen the page.
- Fixed 15-minute rows and bounded development fixtures keep DOM size predictable. The 72-record
  scenario is interaction evidence, not a production-capacity claim.

Focused Vitest covers URL parsing, derived filters, fixtures, the temporal board, list switching,
calendar opening, menus, drawers, drag contracts, repository validation, optimistic occupancy, and
non-drag state changes plus the neutral-container source/token contract. Focused
Playwright in `tests/e2e/schedule-prototype.spec.ts` covers the reference layout,
all eight rendered status contracts, compact/medium/full geometry, browser
contrast, pointer and keyboard drag, overlay/drop styling, announcements,
rollback, terminal state, menus, period, view switch, state transition,
light/dark/system, forced colors, reduced motion, coarse pointer, narrow/zoom
overflow, sticky axes, current-time date/range/position/bounds, scenarios, and
axe WCAG 2.2 A/AA checks. Real-device
touch, VoiceOver/NVDA, and authenticated deployed `dev` review remain manual
follow-ups.

## Backend And Observability Follow-ups

A production API must define authorization, bounded server filtering, conflict detection,
idempotency, stale-write handling, audit attribution, pagination/virtualization thresholds, and
realtime reconciliation. Operational telemetry must not log client names, phones, notes, portraits,
tokens, or private headers. Useful future events are aggregate query duration, result count, filter
kind, transition outcome, and conflict class.
