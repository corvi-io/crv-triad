# 06 TRIAD Studio Agenda Kanban Visual Prototype

## Summary

Evolve the existing TRIAD Studio scheduling prototype into a desktop-first
Kanban workflow that lets receptionists and managers understand and change the
operational state of appointments throughout the day. The initiative adds six
ordered workflow columns, detailed appointment cards, bounded search and
filters, accessible status transitions, cancellation and payment decisions,
and a live daily summary while preserving the current scheduling module,
repository boundary, authenticated shell, theme system, and synthetic
development-only runtime.

This remains a frontend visual prototype. It validates the interaction and
presentation contract before API, persistence, authorization, concurrency, or
payment contracts are accepted. The normalized UX reference is preserved in
`docs/studio/agenda-kanban-ux-reference.md`.

## Context

- Current state:
  - Initiative 03 and ENG-34 delivered the authenticated `/agenda` daily grid
    with professionals as columns, time as rows, appointment drawers, URL-backed
    filters, deterministic scenarios, and a removable `SchedulingRepository`.
  - Scheduling mock data is session-memory-only and is excluded from `hml` and
    `prd` artifacts. Those targets fail closed until an HTTP adapter exists.
  - The scheduling status contract already distinguishes `scheduled`,
    `confirmed`, `arrived`, `waiting`, `in-progress`, `completed`, `canceled`,
    and `no-show`.
  - Studio already supports light, dark, and system themes, with the approved
    navy-and-gold brand tokens shared across both color modes.
  - A vendor-derived Kibo Kanban composite exists in the shared component
    inventory, but it has not yet been accepted for a Studio module or measured
    for this scheduling workload.
- Problem:
  - The time grid helps users reason about availability, but it does not present
    the appointment lifecycle as an operational queue.
  - Product needs to validate whether staff can scan status, move work forward,
    explain cancellation/no-show outcomes, and identify pending payment without
    navigating across multiple screens.
  - Implementing the UX source literally would regress existing decisions by
    storing customer-shaped mock data in `localStorage`, making Studio
    dark-only, duplicating shell controls, and treating optional keyboard drag
    support as sufficient.
- Why now:
  - UX has supplied a detailed, approved Kanban screen specification with card
    content, filters, states, interactions, responsiveness, and mock scenarios.
  - The existing scheduling module provides the safest extension point and
    avoids prematurely creating an API or duplicating product contracts.
  - ENG-38 is independently completing the authentication lifecycle; this
    initiative must not mix authentication changes with scheduling work.
- Related docs/issues:
  - `docs/studio/agenda-kanban-ux-reference.md`
  - `docs/studio/schedule-prototype.md`
  - `docs/studio/component-system.md`
  - `docs/studio/theme-system.md`
  - `docs/initiatives/prds/03-triad-studio-schedule-visual-prototype.md`
  - `docs/initiatives/prds/04-triad-studio-brand-theme-and-token-migration.md`
  - Linear issue: [ENG-34](https://linear.app/corvi-io/issue/ENG-34/build-the-triad-studio-schedule-visual-prototype).
  - Linear initiative: [TRIAD Studio Agenda Kanban Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-agenda-kanban-visual-prototype-57dbe6ebc7ea).
  - Implementation issue: [ENG-40](https://linear.app/corvi-io/issue/ENG-40/build-the-triad-studio-agenda-kanban-visual-prototype).
  - Parallel authentication issue: [ENG-38](https://linear.app/corvi-io/issue/ENG-38/complete-triad-studio-authentication-lifecycle-and-google-sign-in).
  - Original UX source: `TRIAD_STUDIO_AGENDA_KANBAN_SPEC.md`, supplied on
    2026-07-21 and normalized into the repository reference above.

## Goals

- Add a Kanban view to `/agenda` with these ordered columns: `Confirmados`,
  `Check-in`, `Em espera`, `Em atendimento`, `Finalizados`, and
  `Cancelados / No-show`.
- Make appointment state, time, client, service, professional, duration, value,
  notes, relevant tags, and payment state easy to scan without relying on color.
- Support pointer, touch, and keyboard-operable status transitions with an
  explicit non-drag fallback.
- Require a reason when transitioning to canceled/no-show and a payment choice
  when completing an unpaid appointment.
- Add bounded search, professional, client, service, period, and unit filters
  with clear rest/active states and one authoritative filter state.
- Keep column counts and the daily summary synchronized with filters, creation,
  edits, status transitions, cancellation, and unit selection.
- Reuse the existing authenticated shell, scheduling contracts and repository,
  shared component system, theme tokens, drawers, feedback, and scenario engine.
- Preserve deterministic synthetic scenarios and production-boundary checks.
- Produce evidence for a later scheduling API initiative without treating mock
  UI types as API or database contracts.

## Non-Goals

- Scheduling API routes, OpenAPI schemas, database tables, migrations, durable
  persistence, HTTP adapters, realtime synchronization, or offline behavior.
- Making the prototype available in `hml` or `prd` before a real backend and
  authorization model exist.
- Replacing Better Auth, changing the Studio authentication lifecycle, or
  adding identity/business rules to `apps/idp`.
- Real payment capture, financial reconciliation, commissions, cash closing,
  refunds, or payment-provider integration.
- Customer or barber applications, public booking, messaging, notifications,
  recurrence, multi-service fulfillment, or inventory.
- Rebuilding the Studio sidebar, header, theme system, module registry, or
  design tokens from the UX reference.
- Persisting synthetic customer, appointment, phone, note, or payment data in
  `localStorage` or IndexedDB.
- Claiming production capacity from synthetic rendering scenarios.
- Creating unrelated screens or exposing unavailable modules in navigation.

## Brainstorm

### Problem Framing

- We are validating an operational lifecycle view for owners, managers, and
  reception staff who need to move appointments through a busy day.
- The improved workflow is: find the relevant appointment, understand its
  current state, move it to the next state, supply required business context,
  and see all counts update without losing the current filters.
- The Kanban complements time-based planning. It does not by itself solve
  availability, overbooking, capacity, or durable multi-user coordination.
- The deliverable is a realistic frontend prototype with explicit production
  boundaries, not an operational source of truth.

### Gaps And Unknowns

- Product gaps:
  - The UX source presents both a primary and a secondary view toggle. Two
    independent controls for the same state would be confusing.
  - The source names the alternate view `Lista`, while the accepted existing
    view is a daily time grid rather than a list.
  - It is not explicit whether Kanban replaces the grid or becomes an alternate
    view. Preserving both is the safer reversible path.
  - `Barbearia cancelou` and `Cliente cancelou` share a status but have different
    operational meaning, so the reason must remain independent from status.
- Technical gaps:
  - The existing Kibo Kanban composite must be audited for scheduling-specific
    semantics, focus behavior, announcements, reordering, reduced motion,
    rendering cost, and controlled optimistic mutations before reuse.
  - The repository has generic appointment updates but no explicit transition
    command or rollback/concurrency contract.
  - The existing URL search contract does not include view, search text, unit,
    client, service, or period collections.
- Data/model gaps:
  - Rating, tags, payment state, cancellation reason, unit, and stable client
    identifiers are presentation needs absent from the current mock contract.
  - `checked_in` and `in_service` in the UX source differ from the accepted
    `arrived` and `in-progress` scheduling vocabulary.
  - Combining canceled and no-show in one column must not collapse the distinct
    underlying statuses.
- Operational gaps:
  - There is no real authorization policy for who may change status, cancel on
    behalf of the barbershop, or mark payment as complete.
  - A future multi-user backend will require conflict detection, versioning or
    equivalent reconciliation, idempotency, audit history, and bounded queries.
  - The exact deployed review target remains `dev`; `hml` and `prd` must stay
    fail-closed for mock scheduling data.

### Counterpoints

- Replacing the existing grid is visually simpler, but discards a validated
  availability workflow before the Kanban has been accepted. Keeping both views
  behind one canonical selector is reversible and supports comparative testing.
- Copying the source's dark-only criterion would maximize literal fidelity, but
  would violate the accepted theme contract and reduce accessibility choice.
  Dark remains the primary visual acceptance surface while light and system
  continue to work.
- `localStorage` makes a prototype appear persistent, but retains customer-shaped
  data on shared devices and weakens the production boundary. The current
  deterministic session-memory adapter is safer and already supports reset.
- Drag-and-drop is efficient for pointer users, but cannot be the only path.
  Keyboard DnD plus an explicit status action are required for equivalent use.
- A new custom board could exactly match the mockup, but the existing Kibo
  Kanban should be evaluated and adapted first under the component source policy.
- Building the backend now would enable durable transitions, but would freeze
  authorization and concurrency contracts before the workflow is validated.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Replace the existing daily grid with a Kanban-only screen | Closest literal interpretation and smallest visible control set | Removes validated planning behavior and makes rollback harder | Only after product explicitly retires the daily grid |
| B | Add Kanban as the default scheduling view while preserving the daily grid behind one canonical view selector | Reuses existing work, supports comparison, and keeps the change reversible | Requires shared filters and careful view-state composition | Recommended for this prototype |
| C | Build API-backed Kanban and durable transitions now | Exercises real concurrency and persistence | Expands scope, freezes unvalidated contracts, and requires authorization design | After the prototype is accepted and backend work is planned |

### Recommendation

Choose Option B. Extend `apps/studio/src/modules/scheduling` rather than creating
a parallel Agenda implementation. Make Kanban the initial visual acceptance
surface, preserve the accepted daily grid as the alternate `Grade diária` view,
and use one canonical view state even if UX review temporarily requires a
synchronized secondary control.

Normalize the UX status names onto the existing scheduling vocabulary:

| Kanban column | Existing appointment status |
| --- | --- |
| `Confirmados` | `confirmed` |
| `Check-in` | `arrived` |
| `Em espera` | `waiting` |
| `Em atendimento` | `in-progress` |
| `Finalizados` | `completed` |
| `Cancelados / No-show` | `canceled` or `no-show` |

Keep mock records deterministic and session-memory-only. Add UI-facing fields
only where the accepted card and transition behavior require them, and do not
promote those shapes into API contracts. Treat dark mode as the primary visual
comparison while preserving light and system themes. Require accessible drag
announcements and a menu/select-based transition fallback.

## Functional Scope

### Route, Shell, And Views

- Keep `/agenda` inside the existing authenticated WorkspaceShell and module
  registry; do not recreate the sidebar or profile controls.
- Present one authoritative view selector with `Kanban` and `Grade diária`.
- Default the prototype to Kanban while preserving a shareable view choice in
  URL search state when practical.
- Keep the existing grid implementation and drawers functional.
- Use the approved dark theme for primary screenshot comparison and verify the
  same semantic tokens in light and system modes.

### Search And Filters

- Add debounced global search over synthetic client, service, professional, and
  appointment identifiers; target 200-300 ms without delaying direct controls.
- Add multi-select professional, client, and service filters.
- Add period options for today, tomorrow, current week, next seven days, current
  month, and a validated custom range.
- Add a unit selector containing only `Centro` and `Artesão`, with `Centro` as
  the initial value for the approved scenario.
- Give every filter a clear rest and active presentation, selected count or
  concise label, keyboard behavior, and individual/global clear action.
- Derive the board, counts, empty state, and summary from the same filter result.
- Keep shareable, non-sensitive filter state in URL search parameters; do not
  place customer names, phones, or notes in the URL.

### Kanban Board And Cards

- Render the six columns in the approved order with semantic icon/text markers,
  visible counts, empty-column state, and bounded horizontal scrolling.
- Render detailed cards with client identity, optional synthetic rating, start
  time, service, professional, duration, price, note, status, payment state, and
  relevant tags.
- Preserve canceled and no-show as distinct states inside their shared visual
  column.
- Provide contextual actions appropriate to the current state: view, edit,
  professional/service change, reschedule, payment, cancel, no-show, and
  completion where applicable.
- Avoid exposing an action that is invalid for the current state.

### Status Transitions

- Support mouse, touch, and keyboard drag-and-drop when the accepted Kanban
  component can provide predictable semantics.
- Always provide a non-drag `Alterar status` action with equivalent outcomes.
- On transition, update the card, status presentation, column counts, filtered
  result, and daily summary atomically from the user's perspective.
- When moving into `Cancelados / No-show`, require one of `Cliente cancelou`,
  `Barbearia cancelou`, or `Não compareceu`; store the reason separately.
- When moving an unpaid appointment into `Finalizados`, require `Marcar como
  pago` or `Manter pagamento pendente`.
- Use optimistic UI only with a captured previous state, duplicate-action
  prevention, visible pending state, and rollback plus Portuguese error feedback.
- Announce source, destination, success, cancellation, and rollback to assistive
  technology without exposing customer details unnecessarily.

### Appointment Creation And Summary

- Reuse and extend the existing appointment drawer for `Novo agendamento`.
- Keep the existing scheduling fields and add only the presentation inputs
  necessary for the approved card, unit, payment, and initial-status behavior.
- Default the new appointment to the accepted initial status and selected unit.
- Keep the lower summary synchronized with search, filters, view mutations,
  creation, edits, cancellation, and unit selection.
- Show the selected date/period, per-column counts, add action, and visible total
  without implying revenue settlement.

### Prototype States And Scenarios

- Cover normal, empty result, empty column, loading, slow, next-failure,
  persistent-error, all-status, long-content, dense, and rollback scenarios.
- Preserve the 18 approved UX reference records as deterministic synthetic
  fixtures, correcting only identity collisions or content needed for stable
  test semantics.
- Reset restores the selected scenario; refresh restores its initial state.
- Do not persist mock business data beyond the browser session.

## Architecture And Boundaries

- Site impact: none.
- API impact: none in this initiative. A future API should expose bounded
  unit/date/status/professional queries and explicit transition commands rather
  than accepting the mock object wholesale.
- IDP impact: none. Better Auth remains the only identity/session boundary and
  no scheduling rules enter `apps/idp`.
- Studio impact:
  - Extend `src/modules/scheduling` contracts, view models, queries, route search,
    and UI compositions.
  - Extend `src/dev/scheduling` scenarios and the existing memory adapter.
  - Evaluate and adapt the existing shared Kibo Kanban before introducing a new
    board primitive.
  - Keep business-specific card, transition, filters, and summary compositions
    module-owned.
- Data/persistence impact:
  - UI-facing mock fields may include `unitId`, `clientId`, `rating`, `tags`,
    `paymentStatus`, and `cancellationReason`.
  - Existing appointment statuses remain canonical; no duplicate UX-only status
    union is introduced.
  - No durable browser or server persistence is added.
- External provider impact: none.

## Performance And Scalability

- Expected data growth:
  - The prototype remains bounded to synthetic units and date periods. Dense
    scenarios validate rendering behavior, not backend capacity.
  - A future production system may contain years of appointments across many
    units; it must never load all appointments, clients, or services to filter in
    the browser.
- Critical paths:
  - Filtering and derived counts, dragging across six columns, optimistic
    transitions, card rendering, and opening decision dialogs/drawers.
- Query bounds/pagination:
  - Keep prototype queries bounded by selected unit and date/period.
  - Future APIs should apply server-side filters, bounded date ranges, and
    cursor pagination or an equivalent explicit limit for lookup catalogs.
- Concurrency risks:
  - Prevent duplicate transitions for one appointment in the prototype.
  - Future HTTP commands need stale-write detection, idempotency, authorization,
    and a defined reconciliation path when another user changes the same item.
- External limits: none in this frontend-only phase.
- What happens with millions of records/items:
  - They are not loaded into the board. Server-side bounded queries return only
    the operational window. Virtualization should be introduced only after
    profiling an accepted card layout and interaction model.
- Measurement:
  - Record board bundle impact and profile dense-scenario rerenders. Do not state
    numeric capacity without measured evidence and documented conditions.

## Security, Privacy, And Abuse

- Auth/session impact:
  - `/agenda` remains authenticated through the existing Studio/IDP boundary.
  - The prototype must not intercept or mock Better Auth.
- Roles/access:
  - No production authorization behavior is claimed. A future backend must
    authorize view, edit, cancellation, no-show, completion, and payment actions
    independently.
- PII/secrets:
  - Use synthetic names, phones, notes, ratings, and identifiers only.
  - Do not persist mock business records in durable browser storage.
  - Do not put customer text in URLs, logs, traces, analytics, or error reports.
- Spam/abuse vectors:
  - Prevent repeated create/transition submissions while a mutation is pending.
  - Future write endpoints will need audit attribution and abuse controls.
- Rate limiting or throttling needs:
  - None for the memory prototype. Future lookup/search and mutation endpoints
    require bounded queries and provider-appropriate throttling.

## Accessibility And UX

- Keyboard flow:
  - All filters, menus, selectors, cards, drawers, dialogs, and actions are
    reachable and operable by keyboard.
  - Drag-and-drop supports keyboard movement where used, and `Alterar status`
    provides a complete non-drag path.
  - Focus returns to a stable trigger or moved card after drawers and decisions.
- Screen reader states:
  - Columns have names and counts; cards expose a concise accessible name;
    status never depends on color alone.
  - Live announcements describe drag start, destination, result, cancellation,
    failure, and rollback.
  - Loading, empty, filtered-empty, pending, and error states are announced.
- Responsive behavior:
  - At large desktop widths, show all six columns where space permits.
  - At intermediate widths, provide bounded horizontal board scrolling with
    visible affordance and stable page controls.
  - Below desktop width and at 200% zoom, keep controls usable, cards readable,
    and status changes available without drag. Do not merely shrink content.
- Loading/error/empty states:
  - Preserve context, provide retry/reset actions, distinguish no appointments
    from no filter matches, and show useful empty columns.
- Duplicate submission prevention:
  - Disable or guard conflicting actions while pending, keep labels stable, and
    provide status text beyond a spinner.
- Motion and targets:
  - Respect reduced motion and provide appropriately sized touch targets.

## Logging And Observability

- Useful structured events:
  - Development-only scenario selection/reset, view selection, filter result
    count, transition intent/result/rollback, and drawer mutation result.
  - Record only metadata such as scenario ID, status pair, action type, duration,
    and result; use synthetic/stable record IDs only when needed for debugging.
- Metrics:
  - Prototype test timings, transition failure/rollback counts, bundle delta,
    and dense-scenario render evidence.
- Traces/spans:
  - No distributed trace requirement in the memory phase. Future HTTP queries
    and transition commands should participate in existing API telemetry.
- Alerts:
  - None for the local/dev prototype. Production alerting belongs with the real
    API and operational SLOs.
- Sensitive data that must not be logged:
  - Client or professional names, phone numbers, notes, service payloads, payment
    details, auth tokens, cookies, private headers, and full drag payloads.

## Acceptance Criteria

- [x] `/agenda` offers `Kanban` and `Grade diária` through one canonical view
      state, with Kanban as the initiative's primary acceptance surface.
- [x] The Kanban renders the six approved columns in the approved order and
      preserves canceled and no-show as distinct underlying statuses.
- [x] The existing scheduling status union remains canonical; `Check-in` maps to
      `arrived` and `Em atendimento` maps to `in-progress`.
- [x] Detailed cards expose the approved scannable content without relying on
      color and remain readable with long synthetic content.
- [x] Search and professional, client, service, period, and unit filters work,
      have rest/active states, and update board, counts, and summary from one
      derived result.
- [x] Unit options are exactly `Centro` and `Artesão` for this prototype, with
      `Centro` initially selected.
- [x] Pointer, touch, and keyboard users can transition statuses, and a complete
      non-drag status action is available.
- [x] Cancellation/no-show transitions require a reason and retain cancellation
      actor/reason separately from status.
- [x] Completing an unpaid appointment requires an explicit paid/pending choice.
- [x] Pending transitions prevent duplicates; simulated failure rolls back the
      card, counts, and summary and provides Portuguese feedback.
- [x] The existing appointment drawer supports creation and remains consistent
      with both scheduling views.
- [x] Normal, loading, slow, empty, filtered-empty, empty-column, dense,
      long-content, failure, and rollback states are deterministic.
- [x] Mock business records remain session-memory-only and cannot enter `hml` or
      `prd` artifacts.
- [x] The current WorkspaceShell, navigation, light/dark/system themes, and brand
      tokens remain intact; dark is the primary screenshot surface, not the only
      supported theme.
- [x] The board is usable at desktop widths, narrower viewports, 200% zoom,
      reduced motion, and with keyboard and screen reader workflows.
- [x] Existing Kibo Kanban reuse/adaptation evidence, accessibility findings,
      bundle impact, and any custom component rationale are documented.
- [x] No API, IDP, database, payment-provider, or unrelated application behavior
      is added.

## Verification Plan

- Unit tests:
  - Status/column mapping, filters, derived counts and totals, transition
    decisions, cancellation reasons, payment decisions, optimistic rollback,
    query keys, URL parsing, and mock scenario determinism.
- Integration/API tests:
  - Repository adapter filtering, creation, update, transition, reset, latency,
    failure isolation, and stale/pending-action guards. No external API test is
    expected.
- UI tests:
  - Column/card semantics, filters, active/rest states, drawers, dialogs,
    contextual actions, drag behavior, non-drag status action, toasts, loading,
    empty/error states, themes, and responsive overflow.
- Manual/browser checks:
  - Pointer, touch-sized targets, keyboard-only workflow, screen reader
    announcements, focus restoration, 200% zoom, narrow viewport, reduced motion,
    contrast, long content, dense board, and dark/light screenshots.
- Build/check commands:
  - `bun --filter studio check`
  - `bun --filter studio test:e2e`
  - `bun --filter studio test:e2e:production`
  - targeted scheduling unit/component tests during implementation
  - production-boundary scan for `hml` and `prd`
  - `git diff --check`

## Product Decisions

- [x] Use `Kanban` and `Grade diária` as the canonical selector labels; do not
      call the existing grid `Lista` without an actual list design.
- [x] Remove the duplicate secondary view toggle and keep one canonical,
      accessible view selector.
- [x] Make Kanban the default Agenda view while preserving `Grade diária` as an
      alternate view.

These decisions were confirmed by product on 2026-07-21.
