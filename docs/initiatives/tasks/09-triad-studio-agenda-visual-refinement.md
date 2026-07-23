# 09 TRIAD Studio Agenda Visual Refinement - Execution Plan

## Source

- PRD: `docs/initiatives/prds/09-triad-studio-agenda-visual-refinement.md`
- Verbatim design source:
  `docs/initiatives/sources/09-triad-studio-agenda-visual-refinement-design-handoff.md`
- Linear initiative: [TRIAD Studio Agenda Visual Refinement](https://linear.app/corvi-io/initiative/triad-studio-agenda-visual-refinement-d54c129f1ebb)
- Linear design document: [Complete verbatim design handoff](https://linear.app/corvi-io/document/triad-studio-agenda-visual-refinement-verbatim-design-handoff-90e76e4aba45)
- Related issue: [ENG-43](https://linear.app/corvi-io/issue/ENG-43/refine-triad-studio-agenda-visual-hierarchy-and-appointment-cards)
- Predecessor: [ENG-40](https://linear.app/corvi-io/issue/ENG-40/build-the-triad-studio-agenda-board-visual-prototype)
- Theme foundation: [ENG-35](https://linear.app/corvi-io/issue/ENG-35/migrate-triad-studio-to-the-navy-and-gold-brand-theme)

## Implementation Principles

- Refine the current `/agenda`; do not redesign, replace, or fork it.
- Treat the preserved handoff as visual intent and examples, not drop-in global
  CSS.
- Keep the accepted primitive → semantic → component token architecture and
  raw colors out of scheduling React components.
- Keep appointment cards neutral. Status color is limited to the leading
  indicator, subtle tint, border interaction, badge, and optional icon/symbol.
- Preserve all routes, data, scenarios, card geometry/content, filters, views,
  sticky axes, internal scroll, DnD, drawers, mutations, announcements,
  rollback, and production boundaries.
- Audit existing shared components before changing them. If the sidebar,
  filter/button variant, or status badge requires refinement, update the single
  shared owner and verify every current consumer; do not create an Agenda-only
  fork.
- Preserve light, dark, system, forced-colors, reduced-motion, keyboard, touch,
  screen-reader, zoom, narrow viewport, and coarse-pointer behavior.
- Use only synthetic fixtures in visual evidence and never include credentials,
  sessions, tokens, private headers, or real customer data.

## Tasks

- [x] Confirm source and traceability:
  - [x] Preserve the complete supplied design Markdown verbatim in the
        repository and verify its SHA-256 against the original file.
  - [x] Store the complete source as a Linear document owned by the initiative.
  - [x] Link the initiative, Linear design document, single implementation
        issue, PRD, task plan, ENG-40, and ENG-35 in both systems.
  - [x] Re-read the current Agenda, theme, component inventory, and ENG-40
        verification evidence immediately before implementation.
- [x] Capture the before-state with synthetic data:
  - [x] Record controlled light/dark 1600 × 900 screenshots for the normal and
        dense Agenda scenarios without real user/session data.
  - [x] Capture representative scheduled, confirmed, arrived, waiting,
        in-progress, completed, canceled, and no-show cards in compact,
        medium, and full layouts where fixtures provide them.
  - [x] Record current browser-computed surfaces, status treatments, grid
        boundaries, focus, filter, CTA, sidebar, drag overlay, and drop target.
- [x] Audit component ownership before editing:
  - [x] Confirm `AppointmentCard`, drag preview, drop targets, and grid remain
        scheduling-owned.
  - [x] Inspect `StatusBadge`, `FilterTrigger`, Button variants, and workspace
        sidebar contracts and current consumers.
  - [x] Reuse current shared behavior when computed styles already meet the
        handoff; record why no edit is needed.
  - [x] If a shared change is required, define its cross-route contract and
        regression scope before implementation.
  - [x] Do not add a new registry component or shared package; record discovery
        evidence if an unexpected missing primitive changes that conclusion.
- [x] Establish Agenda component tokens:
  - [x] Define the smallest tokens for grid surface/lines, time column, barber
        header, appointment surface/border/shadow, leading tint/indicator,
        hover, dragging, overlay, and drop target.
  - [x] Resolve tokens from existing semantic and schedule roles; add a raw
        primitive only when no accepted anchor exists and document its meaning.
  - [x] Preserve separate light/dark values through semantic resolution rather
        than component conditionals or raw JSX colors.
  - [x] Add forced-colors fallbacks and reduced-motion behavior for every new
        visual effect.
  - [x] Keep global `:root`/`.dark` theme contracts intact unless a measured
        defect requires a separately documented shared-token correction.
- [x] Decouple status presentation from the card container:
  - [x] Remove full status background/foreground classes from the appointment
        card container contract.
  - [x] Keep all eight labels, symbols/icons, terminal behavior, and accessible
        names unchanged.
  - [x] Map `data-appointment-status` to local status surface, foreground, and
        border variables without raw status colors in React.
  - [x] Keep the list-view status badge and other status consumers correct
        after narrowing the presentation contract.
  - [x] Update theme contract tests so full-card status fills cannot return.
- [x] Refine appointment card anatomy:
  - [x] Use a neutral card surface/foreground, one subtle border, existing
        radius, minimal shadow, and a two-to-three-pixel logical leading
        indicator.
  - [x] Add a low-intensity leading gradient that remains bounded in light and
        dark modes and disappears safely in forced colors.
  - [x] Render status-specific badges on medium/full cards with text and
        existing symbol/icon semantics.
  - [x] Preserve compact card time/customer geometry and complete accessible
        status; add only a visible compact signal that fits without clipping.
  - [x] Keep canceled neutral with restrained red/burgundy signals, completed
        calm, confirmed distinct, no-show neutral, in-progress desaturated blue,
        and waiting burnt amber.
  - [x] Preserve customer/time/service typography hierarchy without adding
        blanket bold or status-colored body text.
  - [x] Ensure pseudo-elements do not intercept pointer events or obscure focus.
- [x] Refine hover, focus, drag, and drop states:
  - [x] Increase hover border/elevation modestly without strengthening status
        fill or moving content beyond the handoff maximum.
  - [x] Keep focus more prominent than hover and verify it is not clipped by
        overflow, sticky regions, or pseudo-elements.
  - [x] Give the drag source/overlay a clear neutral elevated treatment with a
        bounded status outline and no collision/layout geometry change.
  - [x] Make active drop targets a low-intensity primary surface/inset border,
        never a saturated cell fill.
  - [x] Remove transforms/transitions under reduced motion and retain current
        Portuguese DnD instructions, outcomes, focus restoration, and drawer
        `Remarcar` alternative.
- [x] Refine the Agenda grid hierarchy:
  - [x] Position the grid surface between page background and cards.
  - [x] Soften row/column lines without losing meaningful non-text contrast.
  - [x] Distinguish the sticky time column and barber headers through neutral
        surfaces and preserve their z-index, position, geometry, and scroll.
  - [x] Visually recheck occupied/blocked periods, empty slots, filtered hidden
        occupancy, loading, error, and empty states in both themes.
- [x] Audit shell and controls against the handoff:
  - [x] Verify the shared sidebar is darker than content in dark mode and its
        active state uses a leading gold signal rather than a complete outline.
  - [x] If needed, replace the shared full active border with one leading
        indicator while preserving sidebar geometry, collapse, mobile, focus,
        and every route.
  - [x] Verify inactive filter triggers are neutral and active filters use a
        restrained semantic gold surface/foreground/border; change the shared
        variant only if measured styles fail.
  - [x] Keep `Novo agendamento` in its current location and use semantic gold
        tokens for base/hover/border/shadow without raw hex or saturated yellow.
  - [x] Preserve the `Lista`/`Quadro` toggle, search, filter order/counts,
        period/unit controls, settings, and responsive overflow behavior.
- [x] Add focused tests:
  - [x] Cover all eight status mappings and reject full status backgrounds on
        appointment containers.
  - [x] Cover compact/medium/full anatomy, badge/status accessibility, canceled,
        completed, no-show, waiting, and in-progress distinctions.
  - [x] Preserve board/list, filters, CTA, drawers, terminal states, DnD,
        announcements, focus restoration, rollback, and production-boundary
        tests.
  - [x] Add browser checks for neutral computed card surface, indicator, badge,
        hover, focus, drag overlay, drop target, light/dark, and reduced motion
        where stable automation is practical.
  - [x] Add cross-route tests for every changed shared sidebar/button/filter
        contract.
- [x] Complete accessibility and responsive verification:
  - [x] Keyboard-test controls, cards, menus, drag handles, slots, drawers, and
        dialogs with visible/unobscured focus.
  - [x] Verify VoiceOver or equivalent card/status names and DnD announcements.
  - [x] Verify 320 CSS pixels, 200% zoom, horizontal/internal scroll, sticky
        axes, coarse pointers, and target sizes.
  - [x] Verify forced colors, reduced motion, light/dark/system, and color-
        independent status meaning.
  - [x] Measure browser-computed text, badge, focus, control, and meaningful
        non-text contrast against WCAG 2.2 AA.
- [x] Complete visual acceptance:
  - [x] Compare controlled after screenshots with the preserved design intent
        at 1600 × 900 in light/dark normal and dense scenarios.
  - [x] Verify no card is a solid green, red, blue, amber, gray, or gold block.
  - [x] Verify all cards belong to one neutral TRIAD surface family and status
        remains quickly identifiable through non-color-only signals.
  - [x] Verify sidebar, filters, CTA, grid lines, canceled, completed, no-show,
        in-progress, waiting, hover, focus, dragging, and drop target.
  - [x] Do not attach screenshots containing real identities, sessions, tokens,
        or private request data.
- [x] Update durable documentation:
  - [x] Update `docs/studio/theme-system.md` with the neutral appointment-card
        status rule and accepted component-token mapping.
  - [x] Update `docs/studio/agenda-kanban-ux-reference.md` and
        `docs/studio/schedule-prototype.md` with the refined visual contract.
  - [x] Update `docs/studio/component-system.md` only for changed active shared
        component contracts.
  - [x] Update `apps/studio/README.md` only if the runtime or verification
        workflow changes; record why it is unchanged otherwise.
  - [x] Do not update API, IDP, site, env, deployment, or release docs because
        their contracts are outside this initiative.
- [x] Run verification and record evidence:
  - [x] `bun --filter studio routes:generate`
  - [x] `bun --filter studio format`
  - [x] `bun --filter studio lint`
  - [x] `bun --filter studio typecheck`
  - [x] `bun --filter studio test`
  - [x] `bun --filter studio test:production-boundary`
  - [x] `bun --filter studio build`
  - [x] `bun --filter studio check`
  - [x] `bun --filter studio test:e2e -- tests/e2e/schedule-prototype.spec.ts`
  - [x] `git diff --check`

## Verification Evidence

Record evidence only after implementation. Use synthetic fixtures and avoid
credentials, tokens, sessions, private headers, real identities, and production
screenshots.

- Source preservation/hash: repository source is 736 lines with SHA-256
  `7b4003cf660388abd1b36fb2f88ea604b61187482af19db0e36de71638ad21e2`;
  it matches the ground planning artifact byte-for-byte.
- Before/after visual references:
  `docs/studio/evidence/eng-43/{before,after}` contains controlled 1600 × 900
  light/dark normal/dense screenshots plus computed-style JSON. All content
  comes from deterministic synthetic fixtures.
- Token/status contract tests: `tests/unit/brand-theme-contract.test.ts`,
  `tests/unit/workspace-tokens.test.ts`, and `tests/e2e/theme.spec.ts` reject
  status-filled containers, verify all eight badge mappings, and enforce the
  neutral card/sidebar token contracts.
- Agenda unit tests: 30 Vitest files and 182 tests pass, including existing
  schedule derivation, fixtures, cards, drawers, transitions, rollback, and
  production-boundary assertions.
- Playwright/computed-style checks:
  `tests/e2e/schedule-prototype.spec.ts` passes 14 tests covering the complete
  ENG-40 journeys plus neutral cards, compact/medium/full geometry, hover,
  focus, drag overlay, drop target, and eight statuses.
- Accessibility/responsive/contrast checks: focused axe reports no WCAG 2.2
  A/AA violations; browser checks cover accessible status names, Portuguese DnD
  outcomes, keyboard focus restoration, 24 × 24 CSS-pixel coarse-pointer
  controls, 320 CSS pixels, 200%-zoom equivalent, sticky/internal scroll,
  system theme, forced colors, and reduced motion. Minimum computed card
  boundary is 4.58:1, status indicator 3.26:1, and badge text 6.81:1.
- Studio check/build/production boundary: routes, format, lint, typecheck,
  build, `check`, production-boundary scan, focused Playwright, and
  `git diff --check` pass. No dependency or lockfile change exists.
- Documentation review: theme, Agenda UX, schedule prototype, component
  inventory, testing, and this execution plan are updated. `apps/studio/README.md`
  remains unchanged because commands, env, routes, setup, and runtime boundaries
  did not change. API, IDP, site, env, deployment, and release docs are
  intentionally unchanged.

## Risks And Follow-Ups

- [x] A literal full badge may not fit the compact 15-minute layout without
      violating the preserved geometry; use the accepted compact exception and
      record visual evidence.
- [x] Shared sidebar/filter/button refinement can affect setup and future routes;
      require cross-route evidence or leave already-correct shared styles alone.
- [x] `color-mix`, gradients, pseudo-elements, and sticky/overflow contexts can
      differ by browser; verify computed behavior in the supported Chromium
      path and inspect graceful fallbacks.
- [x] Screenshot assertions can become brittle; prefer semantic/computed-style
      checks and use screenshots as controlled visual evidence, not the only
      automated gate.
- [x] Any request to replace the entire Studio global palette, change Agenda
      structure/content, or add production scheduling data belongs in a
      separate accepted initiative.

Residual manual verification: the available Chromium environment simulates
touch/coarse pointer media and validates the TouchSensor contract without a
physical device, and it validates programmatic accessible names/live-region
messages without producing VoiceOver/NVDA audio. Real-device touch, desktop
screen-reader output, and authenticated deployed `dev` review remain manual
handoff checks; no automated failure or branch-caused risk is known.
