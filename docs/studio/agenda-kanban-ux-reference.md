# TRIAD Studio Agenda Board UX Reference

> The filename is retained so existing initiative and Linear links do not break. This document
> supersedes the earlier status-column Kanban specification.

## Reference Decision

The supplied 1600 × 900 dark desktop reference is the visual authority for ENG-40. It describes an
operational time board, not a workflow Kanban. Visual fidelity means preserving its hierarchy,
density, proportions, and interaction anatomy while continuing to use the Studio theme tokens and
accessible shadcn/Base UI primitives.

## Page Anatomy

1. Existing Studio workspace shell and Agenda navigation.
2. Page heading: `Agenda`, supporting text, and `Novo agendamento` at the upper right.
3. One filter/view row.
4. One bordered, scrollable temporal board.
5. No lower summary section.

## Control Row

The row order is:

1. Global search with search icon, placeholder, and keyboard shortcut hint.
2. `Barbeiro` trigger with icon and count.
3. `Cliente` trigger with icon and count.
4. `Serviço` trigger with icon and count.
5. `Status` trigger with icon and count.
6. `Período` trigger with icon and current date/range; opens a start/end calendar.
7. `Unidade` trigger with icon.
8. `Lista` / `Quadro` icon toggle.
9. Prototype settings icon.

Triggers use a quiet bordered button style. An active filter receives the brand treatment. Menus
support one or many choices according to the filter; large catalogs are searchable. The entire row
may scroll horizontally in compact layouts but must remain a single visual band.

## Temporal Board

- The first sticky column is `Horário` and lists 15-minute intervals.
- Each following column represents one barber and starts with portrait, name, `Unidade Centro`,
  availability marker, and appointment count.
- The accepted normal data set shows six barber columns: Carlos Lima, Bruno Rocha, Ana Clara,
  João Vitor, Diego Rodrigues, and Marcos Paulo.
- An appointment spans the number of time rows implied by its duration.
- Empty cells are quiet interactive slots for `Novo agendamento`.
- Appointments hidden by filters remain as anonymous occupied spans.
- Eligible appointments can be dragged vertically between 15-minute times, horizontally between
  barber columns, or both. Temporal drag changes allocation only and never status.
- Each logical grid subdivision is a drop target, including the visual area inside appointment,
  anonymous occupancy, and blocked-period `rowSpan` cells, so conflicts can be rejected accurately.

## Appointment Card

Required visible anatomy:

- synthetic client portrait;
- client name;
- start and end time;
- service name;
- textual status badge;
- contextual action trigger.

Use compact spacing and truncation without removing actions. Terminal status stays readable and
read-only. Eligible cards expose a named drag handle; terminal handles are visibly disabled. On
touch/coarse pointers, contextual actions and the drag affordance must not depend on hover.

## Lista

`Lista` is a semantic table using the same filtered result. It includes time, client portrait/name,
barber portrait/name, service, status, and actions. Switching views changes presentation only.

## Responsive And Accessibility Contract

- Preserve the fixed time axis and barber identity while the board scrolls horizontally.
- Keep page-level width bounded at 320 CSS pixels and 200% zoom-equivalent layouts.
- Use semantic table headers for the time/barber relationship.
- Provide accessible names for icon-only controls and portraits; portrait fallbacks expose initials.
- Maintain focus order from the control row into board slots/cards.
- Support menus, toggles, calendar, drawers, and status decisions without a pointer.
- Support drag with mouse, touch, and keyboard, Portuguese live instructions/outcomes, focus
  restoration, and reduced motion.
- Preserve drawer `Remarcar` as an equivalent click/tap path that does not require dragging (WCAG
  2.5.7).
- Never encode status, selection, or availability by color alone.

## Data And Privacy

All names, phones, notes, services, and portraits are synthetic. Portraits are locally generated SVG
data URIs and must not be described as real people. No fixture data persists or crosses a network
boundary. The prototype does not authorize production identity, payment, or scheduling contracts.

## Acceptance Checklist

- [x] `Quadro` is the default and `Lista` is the alternate canonical label.
- [x] Six barber headers include portraits, identity, unit, and counts.
- [x] The left time column exposes 15-minute rows.
- [x] Cards include client portraits, time, service, and status.
- [x] Filters are trigger buttons in one row, not visible select fields.
- [x] `Período` opens a start/end calendar.
- [x] The lower summary is removed.
- [x] The normal scenario contains 42 prepopulated synthetic appointments.
- [x] Eligible cards reschedule by time and/or barber without changing status; terminal cards do not.
- [x] Drag validation and atomic appointment/occupancy rollback cover every logical grid slot.
