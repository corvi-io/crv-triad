# 06 TRIAD Studio Agenda Kanban Visual Prototype - Execution Plan

## Source

- PRD: `docs/initiatives/prds/06-triad-studio-agenda-kanban-visual-prototype.md`
- UX reference: `docs/studio/agenda-kanban-ux-reference.md`
- Depends on: [ENG-34](https://linear.app/corvi-io/issue/ENG-34/build-the-triad-studio-schedule-visual-prototype)
- Parallel, non-blocking authentication work: [ENG-38](https://linear.app/corvi-io/issue/ENG-38/complete-triad-studio-authentication-lifecycle-and-google-sign-in)
- Linear initiative: [TRIAD Studio Agenda Kanban Visual Prototype](https://linear.app/corvi-io/initiative/triad-studio-agenda-kanban-visual-prototype-57dbe6ebc7ea)
- Implementation issue: [ENG-40](https://linear.app/corvi-io/issue/ENG-40/build-the-triad-studio-agenda-kanban-visual-prototype)
- Related PR: [#21](https://github.com/corvi-io/crv-triad/pull/21)

## Implementation Principles

- Extend the accepted `src/modules/scheduling` implementation instead of
  creating a parallel Agenda module or rebuilding the Studio shell.
- Preserve the daily grid as the alternate `Grade diária` view until product
  explicitly retires it.
- Keep one canonical view/filter state and derive board data, counts, summaries,
  empty states, and URL state from it.
- Keep existing scheduling statuses canonical and map UX labels at the
  presentation boundary.
- Keep synthetic records deterministic, resettable, session-memory-only, and
  unavailable in `hml` and `prd` artifacts.
- Use the real IDP for authentication and never intercept or mock Better Auth.
- Treat UI mock fields as presentation requirements, not future API or database
  contracts.
- Reuse components in this order: existing Studio component, official
  shadcn/ui component, reviewed compatible registry item, then justified custom
  code.
- Audit and adapt the existing Kibo Kanban before introducing another board
  primitive.
- Require a complete keyboard/non-drag transition path and preserve status
  meaning independently from color.
- Preserve light, dark, and system themes; use dark as the primary visual
  acceptance surface.
- Use Brazilian Portuguese UI copy and English technical artifacts.
- Do not log or durably persist customer-shaped mock data.

## Tasks

- [x] Confirm the remaining product decisions:
  - [x] Confirm `Kanban` and `Grade diária` as the canonical view labels.
  - [x] Confirm removal of the duplicate secondary view toggle.
  - [x] Confirm Kanban as the durable default Agenda view while preserving the
        daily grid as an alternate view.
  - [x] Confirm that `Barbearia cancelou` remains a cancellation reason rather
        than a third underlying status.
- [x] Reconcile the implementation baseline before coding:
  - [x] Rebase or start from the accepted `staging` baseline after ENG-38 is
        integrated; do not mix authentication files into this work.
  - [x] Re-read `apps/studio/AGENTS.md`, the Studio development skill, component
        inventory, schedule prototype docs, and theme docs.
  - [x] Inspect the current `/agenda` route, search schema, repository port,
        memory adapter, scenarios, drawers, and tests.
  - [x] Record which Initiative 03 contracts remain unchanged and which are
        extended.
- [x] Complete Kanban component discovery:
  - [x] Audit `src/modules/shared/components/kibo-ui/kanban` for controlled state,
        cross-column movement, keyboard coordinates, focus, screen reader
        announcements, reduced motion, touch, empty columns, long lists, and
        rerender behavior.
  - [x] Verify `@dnd-kit` compatibility and existing license/dependency evidence.
  - [x] Inspect official shadcn components for any missing toolbar, filter,
        popover/dialog, menu, drawer, or scroll primitives before adding code.
  - [x] Record why adaptations remain shared or become scheduling-owned.
  - [x] Update the textual component inventory for every accepted shared
        component change.
- [x] Extend the scheduling presentation contract:
  - [x] Keep `AppointmentStatus` unchanged and define an explicit column mapping
        for `confirmed`, `arrived`, `waiting`, `in-progress`, `completed`,
        `canceled`, and `no-show`.
  - [x] Decide how `scheduled` is represented outside the six-column board
        without silently relabeling it.
  - [x] Add the smallest UI-facing fields required for unit, stable synthetic
        client identity, rating, tags, payment state, and cancellation reason.
  - [x] Model cancellation reason separately from canceled/no-show status.
  - [x] Add a transition input/result contract that can carry reason and payment
        decisions and preserve a previous state for rollback.
  - [x] Keep future API versioning, authorization, idempotency, and audit fields
        out of the mock object while documenting those backend requirements.
- [x] Extend repository, query, and route state:
  - [x] Extend the repository port with the smallest explicit transition behavior
        or document why the existing update command safely meets the contract.
  - [x] Add stable query keys for bounded unit/date/period and filter inputs.
  - [x] Add canonical URL parsing/serialization for view and non-sensitive filter
        state.
  - [x] Keep customer names, phones, notes, and other PII-shaped values out of
        URLs.
  - [x] Add pending-transition guards, optimistic state capture, invalidation,
        rollback, and concise Portuguese feedback.
  - [x] Ensure rapid filter/scenario changes cannot apply stale delayed results.
- [x] Extend deterministic scheduling scenarios:
  - [x] Convert the 18 approved UX records into stable synthetic fixtures.
  - [x] Resolve fixture identity collisions only where necessary for deterministic
        behavior and document the change.
  - [x] Add `Centro` and `Artesão`, with `Centro` selected initially.
  - [x] Add normal, all-columns, empty-board, empty-column, filtered-empty, dense,
        long-content, slow, next-failure, persistent-error, and transition-
        rollback scenarios.
  - [x] Preserve reset behavior and session-memory-only storage.
  - [x] Extend boundary tests so no Kanban fixtures, scenario catalog, or memory
        adapter enters `hml` or `prd` artifacts.
- [x] Integrate Kanban into the accepted Agenda route:
  - [x] Reuse WorkspaceShell, module registry, `ModuleLayout`, `PageHeader`, and
        existing route authentication.
  - [x] Add one authoritative selector for `Kanban` and `Grade diária`.
  - [x] Make Kanban the initiative's initial acceptance view without deleting or
        regressing the daily grid.
  - [x] Preserve date and scenario controls needed by both views and avoid
        duplicate independent controls.
  - [x] Keep unavailable Studio modules and unrelated actions out of navigation.
- [x] Build search and filters:
  - [x] Add a 200-300 ms debounced global search over synthetic appointment,
        client, service, and professional presentation fields.
  - [x] Add professional, client, and service multi-select filters with internal
        search where the approved UX requires it.
  - [x] Add today, tomorrow, current week, next seven days, current month, and
        validated custom-period options.
  - [x] Add the unit filter with only `Centro` and `Artesão`.
  - [x] Add explicit rest/active states, selected counts/labels, individual clear,
        and global clear behavior.
  - [x] Derive visible cards, columns, counts, empty states, and summary from one
        memoized result and profile the dense scenario.
- [x] Build the Kanban board and appointment cards:
  - [x] Render the six approved columns and headings in the approved order.
  - [x] Add visible counts, semantic text/icon markers, empty-column state,
        bounded horizontal scroll, and a discoverable scroll affordance.
  - [x] Render client, rating, time, service, professional, duration, price,
        note, status/payment badges, and contextual actions.
  - [x] Keep canceled and no-show visually grouped but semantically distinct.
  - [x] Handle long text without hiding time, status, actions, or focus indicators.
  - [x] Ensure dark/light/system themes use existing semantic tokens rather than
        hard-coded source colors.
- [x] Implement accessible transitions:
  - [x] Support pointer, touch, and keyboard drag where the accepted component
        provides predictable behavior.
  - [x] Add a full `Alterar status` fallback independent from drag.
  - [x] Announce selection, source, destination, valid move, result, cancellation,
        and rollback through concise Portuguese accessibility text.
  - [x] Preserve or restore focus after a move and decision dialog.
  - [x] Require `Cliente cancelou`, `Barbearia cancelou`, or `Não compareceu` when
        entering the last column.
  - [x] Require paid/pending choice when an unpaid appointment is completed.
  - [x] Update cards, counts, filters, and summary atomically and roll all of them
        back on simulated failure.
  - [x] Prevent duplicate or conflicting actions while a transition is pending.
  - [x] Respect reduced motion and provide touch-sized targets.
- [x] Extend drawers, menus, and summary:
  - [x] Reuse the existing appointment drawer for creation, view, edit,
        reschedule, and cancel behavior.
  - [x] Add only fields required by the accepted Kanban card and transition flow.
  - [x] Add status-aware contextual actions and hide invalid actions.
  - [x] Keep the lower date/period, status chips, add action, visible count, and
        total synchronized with every active filter and mutation.
  - [x] Avoid presenting the appointment-value sum as settled revenue.
- [x] Add focused verification:
  - [x] Unit-test column/status mapping, search/filter predicates, period bounds,
        derived counts/totals, URL state, cancellation/payment decisions,
        transition rollback, and scenario factories.
  - [x] Test repository filtering, creation, edits, transitions, reset, delays,
        failures, pending guards, and delayed-result isolation.
  - [x] Component-test board/column/card semantics, active/rest filters, view
        switching, menus, drawers, dialogs, toasts, long content, themes, and
        responsive overflow.
  - [x] Add Playwright coverage for the main pointer and non-drag keyboard
        transition journeys, cancellation reason, payment choice, filters,
        rollback, focus return, dense scrolling, zoom-relevant viewport, and axe.
  - [x] Verify Better Auth is not intercepted and memory scheduling remains
        excluded from `hml` and `prd` artifacts.
  - [x] Record bundle delta and dense-scenario profiling without making an
        unsupported capacity claim.
- [x] Complete documentation and handoff:
  - [x] Update `docs/studio/schedule-prototype.md` with the accepted view,
        transition, status mapping, runtime, and test behavior.
  - [x] Update `docs/studio/component-system.md` for accepted shared Kanban or
        filter changes.
  - [x] Update environment/runtime docs only if an existing input changes; do not
        add uncategorized environment values.
  - [x] Record component discovery, custom-code rationale, keyboard, screen
        reader, focus, zoom, narrow viewport, reduced motion, contrast, theme,
        and boundary evidence.
  - [x] Run the Triad preflight review before commit, push, PR, or staging handoff.
  - [ ] Update Linear with the implementation issue, PR, blockers, and only
        evidence-based state transitions.

## Verification Evidence

Record evidence as tasks are completed:

- Command: `bun --filter studio check`
- Result: passed
- Notes: Biome and TypeScript passed; Vitest passed 25 files and 120 tests; the
  `prd` build and production-boundary scan passed across 36 files (967,090
  bytes).
- Command: `bun --filter studio test:e2e`
- Result: passed
- Notes: Playwright passed all 22 Chromium tests, including six Agenda journeys,
  axe, pointer and keyboard drag, decision dialogs, rollback, focus, dense
  overflow, themes, forced colors, narrow viewports, and 200%-zoom equivalents.
- Command: `bun --filter studio test:e2e:production`
- Result: passed
- Notes: The production build passed and all three production-preview boundary
  tests passed, including exclusion of the synthetic scheduling preview.
- Command: targeted scheduling unit/component tests
- Result: passed
- Notes: Focused Agenda mapping, filtering, period, repository, transition, and
  component suites passed during implementation; the final full Vitest run
  includes those suites.
- Command: production-boundary scan for `hml` and `prd`
- Result: passed
- Notes: Explicit disabled-source builds and scans passed for both deployment
  targets; fixtures, memory repositories, scenarios, and preview routes were
  absent from the generated artifacts.
- Command: `git diff --check`
- Result: passed
- Notes: Tracked and new in-scope files contain no whitespace errors.

- Linear mutation: intentionally not performed because the ENG-40 role brief
  forbids Linear writes. The pull request URL is returned to the orchestrator for
  source-of-truth follow-up.

## Risks And Follow-Ups

- [x] The approved UX reference may be interpreted as permission to rebuild the
      shell or theme; enforce the documented deviations during review.
- [x] Drag-and-drop can appear accessible while producing ambiguous keyboard
      destinations or announcements; keep the non-drag transition path complete.
- [x] The inherited Kibo Kanban may require adaptation or replacement after the
      audit; record evidence instead of forcing reuse.
- [x] Shared filters across two views can drift; keep one canonical state and
      test identical result sets.
- [x] Optimistic transitions can leave counts and summaries inconsistent; capture
      and roll back the complete derived state.
- [x] UI mock fields can be mistaken for backend requirements; design the real
      API, authorization, audit, and concurrency model in a separate initiative.
- [x] Dense synthetic fixtures validate browser interaction only, not production
      throughput or multi-user behavior.
- [x] The informal Initiative 03 roadmap called its future queue work
      “Initiative 06.” This numbered document supersedes that placeholder but
      does not pull service-fulfillment scope into the Kanban prototype.
