# Studio Agenda Visual Prototype

ENG-34 introduced the frontend-only daily schedule. ENG-40 extends the same authenticated `/agenda`
route and scheduling module with the default operational Kanban while retaining `Grade diária` as
the alternate planning view. `/workspace-preview/agenda` remains a development-only QA surface that
uses the same presentation and repository port without intercepting authentication.

## Accepted Views And Status Mapping

- One canonical selector owns `Kanban` and `Grade diária`; Kanban is the default.
- The six Kanban columns are ordered as `Confirmados`, `Check-in`, `Em espera`, `Em atendimento`,
  `Finalizados`, and `Cancelados / No-show`.
- Canonical statuses remain `confirmed`, `arrived`, `waiting`, `in-progress`, `completed`,
  `canceled`, and `no-show`. The final column groups the last two visually without collapsing their
  underlying values.
- `scheduled` remains canonical but is not silently relabeled. A textual notice reports scheduled
  appointments outside the six-column workflow until confirmation.
- The daily grid remains professionals-as-columns and 15-minute rows on desktop, with semantic
  professional lists below the large breakpoint.

## Query, Filters, And Derived State

The repository query is bounded by unit and validated date range. Unit options are exactly `Centro`
and `Artesão`; Centro is the initial value. Period options are today, tomorrow, current week, next
seven days, current month, and a validated custom range.

View, unit, period, custom dates, scenario, and synthetic stable professional/client/service IDs are
shareable URL state. Global search remains local and debounced by 250 ms so customer-shaped text is
not placed in URLs. Search, professional, client, service, period, and unit predicates feed one
`deriveAgendaResult` result. Cards, all six counts, scheduled-outside-board notice, empty states,
visible total, and visible value are projections of that result.

The visible value is explicitly not labeled as paid revenue. The future API must implement bounded
server-side filters, authorization, pagination where needed, audit attribution, stale-write
detection, and idempotent transitions; the prototype shape is not an API or database contract.

## Cards, Transitions, And Drawers

Cards expose client, time, synthetic rating, service, professional, duration, price, note, canonical
status, payment state, cancellation actor, and relevant tags using text in addition to color.
Contextual menus provide view, edit, status, cancellation/no-show, completion, and visual payment
actions only where meaningful.

Pointer, touch, and keyboard drag use the shared Kibo-derived Kanban with a dedicated native drag
handle. `Alterar status` provides the complete non-drag path. DnD announcements cover selection,
source/destination, result, and cancellation. The module live region covers transition progress,
success, failure, and rollback.

Entering the terminal cancellation column requires one of `Cliente cancelou`, `Barbearia cancelou`,
or `Não compareceu`; the first two map to `canceled` with a separate actor and the last maps to
`no-show`. Completing an unpaid appointment requires `Marcar como pago` or `Manter pagamento
pendente`. These are visual prototype decisions and do not capture money.

`useTransitionAppointment` snapshots every scheduling query before the optimistic update, updates
appointment plus occupancy projections, blocks a conflicting transition, restores every snapshot on
failure, and invalidates only scheduling keys after settlement. Cards, counts, and summary therefore
move and roll back atomically. Focus returns to the moved card handle or the stable dialog trigger.
The existing appointment drawer now carries unit, initial status, and visual payment state while
preserving create, view, edit, reschedule, and reasoned cancellation flows.

## Component Discovery

The implementation inspected existing Studio components first. `bunx --bun shadcn@latest info
--json` confirmed Base UI, Vite, Tailwind v4, Lucide, and the existing catalog. `bunx --bun
shadcn@latest docs button card dropdown-menu select popover sheet skeleton` supplied the official
APIs. Searches for `kanban drag board` and `multi select filter command` returned no official shadcn
composition.

The repository already contained `@dnd-kit/core`, sortable, utilities, and the vendor-derived Kibo
Kanban. It was adapted instead of adding another board dependency. The shared change adds dedicated
drag handles, sortable keyboard coordinates, mouse/touch activation constraints, destination-aware
Portuguese announcements, drag-cancel cleanup, focus semantics, and `prefers-reduced-motion`
handling. Scheduling-specific cards, filters, decisions, and summary remain module-owned.

## Deterministic Scenarios And Runtime Boundary

`src/dev/scheduling` owns the 18 approved synthetic Kanban records and normal, empty, empty-column,
filtered-empty, all-statuses, dense (72 cards), many-professionals, long-content, blocked, walk-in,
conflict, slow, next-failure, transition-rollback, and persistent-error scenarios. Reset restores the
active scenario. Refresh reconstructs its initial state. No appointment, name, phone, note, payment,
or transition is written to `localStorage`, IndexedDB, a database, or a mock HTTP endpoint.

Vite aliases `virtual:studio-scheduling-prototype` to memory only when
`VITE_SCHEDULING_SOURCE=memory` and `VITE_DEPLOY_TARGET` is `local` or `dev`; `hml` and `prd` resolve
the null shim. The production marker scan covers the memory repository, scenario engine, approved
fixture IDs/content, rollback scenario, and dense markers. Better Auth remains the real identity
boundary.

## Accessibility, Responsive, And Theme Evidence

- Focused Vitest covers mapping, combined filter predicates, period bounds, safe URL parsing,
  decisions, deterministic repositories, rollback failure isolation, view selection, drawers, and
  the non-drag status flow.
- Playwright covers pointer drag, keyboard drag and live output, complete menu transitions,
  reason/payment decisions, optimistic rollback, focus restoration, active/rest filters, canonical
  view switching, creation defaults, horizontal dense scrolling, long content, and axe WCAG 2.2
  A/AA tags.
- The existing theme suite measures every scheduling status in light and dark, forced colors,
  representative focus indicators, 320 CSS-pixel layouts, and a 200% zoom-equivalent run.
- Manual screenshot inspection covered the six-column 1440 × 900 dark surface and a 640 × 720
  light narrow surface. It found and corrected the 1440px breakpoint so all columns fit without
  page-level overflow while intermediate and narrow layouts retain bounded board scrolling.
- The focused dense/long-content browser journey renders 72 synthetic cards and verifies bounded
  scrolling, long-content actions, and reduced-motion behavior. No React render-commit or rerender
  profiling was performed, so the browser-test duration is not presented as rendering evidence or
  a capacity claim.
- Touch uses the DnD TouchSensor with a 150 ms/5 px activation constraint, and browser evidence
  verifies drag handles exceed the WCAG 2.2 24 px target minimum. A real touch device remains a
  residual manual check.
- DnD and mutation live regions are exercised in Chromium. VoiceOver/NVDA behavior remains a
  residual manual check and is not claimed as performed.

## Bundle Evidence

Production-disabled builds at baseline `4cf6670` and ENG-40 were measured from clean worktrees. JS
and CSS assets increased from 883,862 to 887,500 raw bytes (+3,638; +0.41%) and from 269,840 to
271,599 gzip bytes (+1,759; +0.65%). The largest application chunk changed from 437,346 to 437,587
raw bytes (+241), while the route-owned appointment drawer chunk absorbed most presentation growth.
Synthetic fixtures and the memory adapter remain absent from production output.

## Residual Risk

The 72-card scenario validates browser interaction only. It does not establish production capacity,
multi-user concurrency, authorization, audit, realtime reconciliation, or payment correctness.
The exact performance follow-up is to record React Profiler commits for the initial 72-card render,
one global-search refinement, and one status transition under documented local build/hardware
conditions before considering virtualization or making a render-performance claim.
Real-device touch, VoiceOver/NVDA, Windows High Contrast beyond Chromium forced-colors emulation,
and authenticated deployed `dev` review remain manual handoff checks.
