# Studio Schedule Visual Prototype

ENG-34 introduces a frontend-only daily schedule for product and UX validation. The authenticated
product route is `/agenda`; `/workspace-preview/agenda` is a development-only QA surface using the
same presentation and repository port without mocking or intercepting authentication.

## Accepted Product Decisions

- Daily view only, one synthetic unit, 15-minute increments, and visible hours from 08:00 to 18:00.
- Professionals are columns and time is rows on desktop. Below the large breakpoint, each
  professional has a semantic ordered list. This avoids an incomplete ARIA-grid keyboard model and
  keeps long content readable at 320 CSS pixels and 200% zoom-equivalent widths.
- Walk-ins are diamond-shaped visual markers only. There is no queue action or lifecycle.
- Statuses use Portuguese text plus symbols and bordered shapes; color is supplementary.
- Prototype types are UI-facing validation vocabulary, not future OpenAPI, database, or
  authorization contracts.

## Component Discovery

The existing Studio inventory supplied `ModuleLayout`, `PageHeader`, `ActionDrawer`, form fields,
`DatePicker`, select/input/textarea controls, loading/empty/error surfaces, `Button`, and Sonner.
`bunx --bun shadcn@latest info --json` confirmed Base UI, Vite, Tailwind v4, and the installed
catalog. `bunx --bun shadcn@latest docs sheet select calendar badge skeleton empty` inspected the
official APIs. `bunx --bun shadcn@latest search @shadcn -q "schedule calendar timeline"` returned
no schedule composition. No community item or dependency was accepted.

The schedule table and grouped lists are module-owned because an official primitive was unavailable
and a generic calendar/ARIA grid would add behavior outside the accepted journey. No shared
component changed, so the exhaustive shared inventory requires no new entry.

## Runtime And Repository Boundary

`src/modules/scheduling` owns the async repository port, query keys, TanStack Query hooks, status
presentation, validation, and UI. `src/dev/scheduling` owns deterministic synthetic data and the
memory adapter, which reuses the domain-neutral `MemoryScenarioEngine`.

Vite aliases `virtual:studio-scheduling-prototype` to memory only when
`VITE_SCHEDULING_SOURCE=memory` and `VITE_DEPLOY_TARGET` is `local` or `dev`; otherwise it resolves
to a null shim. Production builds exclude the adapter, scenarios, synthetic records, and mock-engine
markers. Production-boundary scripts force `prd` plus `disabled` even when the parent process asks
for `dev` plus `memory`; development and deploy builds retain their explicit environment. No fetch
handler, API route/client, durable browser storage, or auth interception was added.

## Scenarios And Feedback

The URL reproduces `normal`, `empty`, `all-statuses`, `dense`, `many-professionals`, `long-content`,
`blocked`, `walk-in`, `conflict`, `slow`, `next-failure`, and `persistent-error`. Reset restores the
active scenario. Create/update/cancel invalidate only scheduling keys. Starts must align to the
15-minute grid. Appointment conflicts, breaks, blocked periods, closed hours, ineligible
professionals, and insufficient space are rejected at the repository boundary. Recoverable domain
failures keep the drawer open, focus the time field, and provide field plus toast feedback. Walk-in
markers remain visual-only and do not block appointments.

Status filtering changes the visible appointment list without changing occupancy. A privacy-safe
occupancy projection carries only ID, professional, start, and duration, so hidden appointments
render as non-interactive “Ocupado” spans without exposing filtered details or offering false create
actions. The default synthetic service includes the extra professionals used by
`many-professionals`, making those stress-test slots honestly actionable.

## Verification Evidence

- `bun --filter studio format`, `lint`, and `typecheck`: pass during focused verification.
- `bun --filter studio check`: 20 files and 94 tests passed; production build and the 30-file
  synthetic-marker scan passed.
- `bun --filter studio test:e2e`: 10 Chromium tests passed, including 5 schedule journeys and axe.
- `bun --filter studio test:e2e:production`: 3 Chromium production-preview tests passed.
- `bun test ./.github/scripts`: 16 tests passed, including fixed target and scheduling-source
  propagation through the three deployment workflows.
- `VITE_DEPLOY_TARGET=dev VITE_SCHEDULING_SOURCE=memory bun --filter studio
  test:production-boundary`: passed because the boundary build deterministically used
  `prd`/`disabled`.
- Explicit `dev`/`memory` build plus marker inspection and Playwright preview journeys proved that
  development composition still includes and serves the prototype.

Automated browser evidence covers desktop, 320 CSS pixels, dark mode, reduced motion, keyboard
Escape/focus return, long content, horizontal density, hidden-status occupancy, extra-professional
creation, conflicts, and axe. VoiceOver and Windows High Contrast remain manual-only and must not
be claimed unless performed.

Manual screenshot inspection covered 1440 × 900 light mode with ten professional columns and a
320 × 720 dark narrow layout. It found and corrected overflow in the narrow date-control row.
VoiceOver, Windows High Contrast, and real-IDP deployed `dev` login were not available locally.

## Scale And Residual Risk

Scenarios query one bounded day for one synthetic unit. Dense and many-professional cases are UX
stress fixtures, not capacity measurements. A future API needs bounded indexed time-range queries,
authorization, concurrency semantics, and measurements before considering virtualization.
VoiceOver behavior and real IDP login in a deployed `dev` environment remain residual manual risks.
