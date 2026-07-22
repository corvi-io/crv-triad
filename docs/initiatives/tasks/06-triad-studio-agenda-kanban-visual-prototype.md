# 06 TRIAD Studio Agenda Board Visual Prototype - Execution Plan

## Traceability

- PRD: `docs/initiatives/prds/06-triad-studio-agenda-kanban-visual-prototype.md`
- UX: `docs/studio/agenda-kanban-ux-reference.md`
- Implementation: [ENG-40](https://linear.app/corvi-io/issue/ENG-40/build-the-triad-studio-agenda-kanban-visual-prototype)
- The legacy filenames are retained to preserve links; the temporal board decision supersedes the
  earlier status-column Kanban plan.

## Scope

- [x] Re-audit the supplied reference and record the corrected visual hierarchy.
- [x] Reuse the existing Studio shell, `/agenda` route, repository port, drawers, dialogs, and
  memory-only composition boundary.
- [x] Remove the status-column board and obsolete lower summary.
- [x] Implement `Quadro` as a semantic time/barber matrix with sticky axes.
- [x] Implement `Lista` as the alternate view.
- [x] Add deterministic barber/client portraits without external image requests.
- [x] Add 42 normal records and retain bounded edge-case scenarios.

## Controls

- [x] Keep search, all filters, period, unit, view, and settings in one row.
- [x] Use icon/count button triggers for `Barbeiro`, `Cliente`, `Serviço`, and `Status`.
- [x] Use searchable menus for large catalogs.
- [x] Use a period popover with presets and a start/end calendar.
- [x] Use canonical icon labels `Lista` and `Quadro`.
- [x] Preserve URL-backed stable IDs without placing global-search text in the URL.

## Board And Actions

- [x] Render six barber headers with portrait, name, unit, marker, and count.
- [x] Render 15-minute time headers on the left.
- [x] Span cards by duration and show portrait, client, time, service, and status.
- [x] Keep anonymous occupied spans for filtered-out appointments.
- [x] Keep open/edit/reschedule/cancel and non-drag status flows.
- [x] Keep terminal records read-only and optimistic rollback atomic.

## Documentation And Component System

- [x] Update the PRD, task plan, UX reference, Studio README, and schedule prototype contract.
- [x] Record official shadcn input-group/toggle/toggle-group additions in the component inventory.
- [x] Document the `filter` and `filter-active` Button variants.
- [x] Explain why API, IDP, site, deployment, and environment docs do not change.

## Verification

- [x] Update focused agenda and repository Vitest coverage.
- [x] Replace obsolete drag/Kanban Playwright journeys with board/list/filter/period/action journeys.
- [x] Run Studio format, typecheck, unit tests, focused Playwright, build, and production-boundary
  checks.
- [x] Inspect the rendered 1600 × 900 reference ratio and a narrow viewport in Chromium.
- [x] Record verification evidence and remaining manual checks on ENG-40.

## Explicit Non-changes

No API, IDP, site, database, migration, environment manifest, deployment, release, or production
runtime behavior changes. No Codex review cycle is required for this visual correction; verification
is proportional and repository-local unless publication is separately authorized.
