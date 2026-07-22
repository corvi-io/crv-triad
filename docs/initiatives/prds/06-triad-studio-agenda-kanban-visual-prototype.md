# 06 TRIAD Studio Agenda Board Visual Prototype

## Summary

ENG-40 corrects the Studio Agenda prototype to match the supplied operational reference. The route
must default to a time-based `Quadro`, with barbers as columns and 15-minute times as rows, and offer
an alternate `Lista`. The legacy filename and initiative link remain stable for migration, but the
status-column Kanban decision is superseded.

## Problem And Outcome

The earlier implementation organized cards by status. That made workflow state prominent but
removed the manager's primary orientation: who is serving whom, at what time, and where gaps exist.
The accepted outcome restores time and barber identity as the dominant axes, improves visual
fidelity, and supplies enough synthetic records to exercise density, filtering, and actions.

## Sources Of Truth

- Supplied 1600 × 900 Agenda reference image.
- `docs/studio/agenda-kanban-ux-reference.md`.
- Existing `/agenda` route, scheduling repository port, drawer, transition dialog, and runtime
  boundary.
- Linear ENG-40.

## Goals

- Match the reference hierarchy and proportions within the existing Studio shell.
- Default to `Quadro`; provide `Lista` through one icon toggle.
- Show six barber columns, portraits, counts, a left time axis, and portrait appointment cards.
- Put search, filter triggers, period, unit, view, and settings in one row.
- Prepopulate 42 deterministic synthetic appointments and preserve edge-case scenarios.
- Make the temporal board operate as the allocation Kanban: drag eligible appointments between
  15-minute times and barber columns without changing status.
- Retain the drawer `Remarcar` alternative, atomic mutation rollback, and the dev-only data boundary.

## Non-goals

- Production API, database, realtime, payments, authorization, audit, or deployment.
- Real client or employee photographs/data.
- Status-column Kanban or status changes caused by temporal drag.
- New business rules inside IDP.
- Enabling the prototype in `hml` or `prd`.

## Brainstorm, Gaps, And Counterproposal

Ideas evaluated included preserving both the status Kanban and time grid, replacing the prototype
with a calendar library, and using the reference-aligned temporal board plus list. Preserving three
views would duplicate navigation and testing without evidence of need. A calendar dependency would
add styling and accessibility risk for a bounded prototype. The selected board/list pair directly
answers the reference and reuses current contracts.

The strongest counterpoint is that drag adds precision, touch, table-geometry, and discoverability
risk to a surface that already has a form-based reschedule path. It remains worthwhile because it
matches the manager's direct-manipulation workflow, while an explicit handle and the existing
`Remarcar` drawer keep the operation understandable and satisfy the single-pointer alternative.

Status columns make work queues easier to scan. Status remains
visible and filterable, and every non-terminal card retains an explicit status action. If queue
management becomes a validated need, it should return as a separately scoped workflow view rather
than silently redefining `Quadro`.

Known gaps are real image sourcing, current-time indication, cross-day rendering, timezone rules,
overlap policy, barber availability, and production scale. Synthetic portraits and a fixed fixture
date are intentional for this visual prototype.

## Product And Architecture Boundaries

- `apps/studio` owns the route, UI state, prototype repository port, and deterministic data.
- `apps/api` is unchanged; future scheduling contracts require a separate initiative.
- `apps/idp` remains responsible only for identity/session boundaries.
- `apps/site` is unchanged.
- No secret or private runtime value enters a client-visible environment variable.

## UX Requirements

- Page heading and CTA follow the supplied reference.
- One horizontally bounded filter row uses button triggers with leading icons and trailing counts.
- `Período` supplies presets and an explicit start/end calendar.
- The board uses a sticky time column and sticky barber headers.
- Cards span their duration and include portrait, name, time, service, status, and actions.
- Anonymous occupied spans protect availability when a filtered appointment is hidden.
- Eligible non-terminal cards expose a drag handle for vertical, horizontal, or combined allocation
  changes. Every logical 15-minute subdivision remains a drop target even inside a table `rowSpan`.
- A drop updates only `start` and `professionalId`; no-op, unavailable, conflicting, ineligible,
  out-of-hours, hidden-occupancy, invalid, and terminal operations are rejected.
- No lower summary is rendered.

## Accessibility

- Semantic row/column headers communicate the time/barber matrix.
- Keyboard and focus support cover filter menus, period calendar, view toggle, slots, cards,
  contextual actions, drawers, and dialogs.
- Mouse, touch, and keyboard drag expose Portuguese instructions and live progress/outcome
  announcements. Focus returns to the moved or restored handle.
- The drawer `Remarcar` action is the equivalent click/tap path required by WCAG 2.5.7; drag is not
  the only way to change allocation.
- Drag overlay animation is removed when `prefers-reduced-motion: reduce` is active.
- Status and selection always have text in addition to color.
- Hover-only actions become visible on coarse pointers.
- Bounded overflow supports 320 CSS pixels and 200% zoom-equivalent testing.

## Performance And Scalability

The normal 42-record and dense 72-record scenarios validate layout and interaction only. Fixed
15-minute rows and six normal columns are acceptable for the prototype. Logical drop targets add a
bounded `times × professionals` set of elements (240 in the normal day), independent of appointment
count. Production must establish
server filtering, pagination or virtualization thresholds, date-range limits, stale-write handling,
and realtime reconciliation before capacity claims are made. React Profiler measurements are the
next step if render performance becomes a concern.

## Security, Privacy, And Observability

Fixtures and portraits are synthetic, local, and session-memory-only. Do not log names, phones,
notes, portraits, tokens, business payloads, or private headers. A future production implementation
may record aggregate query duration/result count, transition outcome, and conflict class with actor
authorization and audit attribution.

## Verification

- Focused TypeScript, Vitest, and Playwright coverage for vertical, horizontal/combined, keyboard,
  announcement, terminal-disabled, conflict, and atomic rollback behavior.
- axe WCAG 2.2 A/AA scan of the reference surface.
- Light/dark, forced-colors, narrow width, zoom-equivalent, and horizontal-overflow checks.
- Production-boundary checks continue to reject synthetic source in production builds.
- Visual browser inspection at the 1600 × 900 reference ratio.

## Acceptance Criteria

- [x] `Quadro` is the default; `Lista` is selectable and URL-backed.
- [x] Six portrait barber columns and the sticky time axis render.
- [x] Forty-two prepopulated appointments include client portraits and required metadata.
- [x] All accepted filters share one row and use menu/popover triggers.
- [x] Period supports a start/end calendar.
- [x] The obsolete summary and status-column board are removed.
- [x] Existing drawer, non-drag status, rollback, privacy, and runtime boundaries remain intact.
- [x] Pointer, touch, and keyboard drag change time and/or barber without changing status.
- [x] Grid-slot validation, Portuguese announcements, reduced motion, focus restoration, and atomic
  appointment/occupancy rollback are verified.
- [x] Drawer `Remarcar` remains the WCAG 2.5.7 non-drag alternative and terminal cards cannot drag.
