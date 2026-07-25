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

- [ ] Confirm source and traceability:
  - [x] Preserve the complete supplied design Markdown verbatim in the
        repository and verify its SHA-256 against the original file.
  - [x] Store the complete source as a Linear document owned by the initiative.
  - [x] Link the initiative, Linear design document, single implementation
        issue, PRD, task plan, ENG-40, and ENG-35 in both systems.
  - [ ] Re-read the current Agenda, theme, component inventory, and ENG-40
        verification evidence immediately before implementation.
- [ ] Capture the before-state with synthetic data:
  - [ ] Record controlled light/dark 1600 × 900 screenshots for the normal and
        dense Agenda scenarios without real user/session data.
  - [ ] Capture representative scheduled, confirmed, arrived, waiting,
        in-progress, completed, canceled, and no-show cards in compact,
        medium, and full layouts where fixtures provide them.
  - [ ] Record current browser-computed surfaces, status treatments, grid
        boundaries, focus, filter, CTA, sidebar, drag overlay, and drop target.
- [ ] Audit component ownership before editing:
  - [ ] Confirm `AppointmentCard`, drag preview, drop targets, and grid remain
        scheduling-owned.
  - [ ] Inspect `StatusBadge`, `FilterTrigger`, Button variants, and workspace
        sidebar contracts and current consumers.
  - [ ] Reuse current shared behavior when computed styles already meet the
        handoff; record why no edit is needed.
  - [ ] If a shared change is required, define its cross-route contract and
        regression scope before implementation.
  - [ ] Do not add a new registry component or shared package; record discovery
        evidence if an unexpected missing primitive changes that conclusion.
- [ ] Establish Agenda component tokens:
  - [ ] Define the smallest tokens for grid surface/lines, time column, barber
        header, appointment surface/border/shadow, leading tint/indicator,
        hover, dragging, overlay, and drop target.
  - [ ] Resolve tokens from existing semantic and schedule roles; add a raw
        primitive only when no accepted anchor exists and document its meaning.
  - [ ] Preserve separate light/dark values through semantic resolution rather
        than component conditionals or raw JSX colors.
  - [ ] Add forced-colors fallbacks and reduced-motion behavior for every new
        visual effect.
  - [ ] Keep global `:root`/`.dark` theme contracts intact unless a measured
        defect requires a separately documented shared-token correction.
- [ ] Decouple status presentation from the card container:
  - [ ] Remove full status background/foreground classes from the appointment
        card container contract.
  - [ ] Keep all eight labels, symbols/icons, terminal behavior, and accessible
        names unchanged.
  - [ ] Map `data-appointment-status` to local status surface, foreground, and
        border variables without raw status colors in React.
  - [ ] Keep the list-view status badge and other status consumers correct
        after narrowing the presentation contract.
  - [ ] Update theme contract tests so full-card status fills cannot return.
- [ ] Refine appointment card anatomy:
  - [ ] Use a neutral card surface/foreground, one subtle border, existing
        radius, minimal shadow, and a two-to-three-pixel logical leading
        indicator.
  - [ ] Add a low-intensity leading gradient that remains bounded in light and
        dark modes and disappears safely in forced colors.
  - [ ] Render status-specific badges on medium/full cards with text and
        existing symbol/icon semantics.
  - [ ] Preserve compact card time/customer geometry and complete accessible
        status; add only a visible compact signal that fits without clipping.
  - [ ] Keep canceled neutral with restrained red/burgundy signals, completed
        calm, confirmed distinct, no-show neutral, in-progress desaturated blue,
        and waiting burnt amber.
  - [ ] Preserve customer/time/service typography hierarchy without adding
        blanket bold or status-colored body text.
  - [ ] Ensure pseudo-elements do not intercept pointer events or obscure focus.
- [ ] Refine hover, focus, drag, and drop states:
  - [ ] Increase hover border/elevation modestly without strengthening status
        fill or moving content beyond the handoff maximum.
  - [ ] Keep focus more prominent than hover and verify it is not clipped by
        overflow, sticky regions, or pseudo-elements.
  - [ ] Give the drag source/overlay a clear neutral elevated treatment with a
        bounded status outline and no collision/layout geometry change.
  - [ ] Make active drop targets a low-intensity primary surface/inset border,
        never a saturated cell fill.
  - [ ] Remove transforms/transitions under reduced motion and retain current
        Portuguese DnD instructions, outcomes, focus restoration, and drawer
        `Remarcar` alternative.
- [ ] Refine the Agenda grid hierarchy:
  - [ ] Position the grid surface between page background and cards.
  - [ ] Soften row/column lines without losing meaningful non-text contrast.
  - [ ] Distinguish the sticky time column and barber headers through neutral
        surfaces and preserve their z-index, position, geometry, and scroll.
  - [ ] Visually recheck occupied/blocked periods, empty slots, filtered hidden
        occupancy, loading, error, and empty states in both themes.
- [ ] Audit shell and controls against the handoff:
  - [ ] Verify the shared sidebar is darker than content in dark mode and its
        active state uses a leading gold signal rather than a complete outline.
  - [ ] If needed, replace the shared full active border with one leading
        indicator while preserving sidebar geometry, collapse, mobile, focus,
        and every route.
  - [ ] Verify inactive filter triggers are neutral and active filters use a
        restrained semantic gold surface/foreground/border; change the shared
        variant only if measured styles fail.
  - [ ] Keep `Novo agendamento` in its current location and use semantic gold
        tokens for base/hover/border/shadow without raw hex or saturated yellow.
  - [ ] Preserve the `Lista`/`Quadro` toggle, search, filter order/counts,
        period/unit controls, settings, and responsive overflow behavior.
- [ ] Add focused tests:
  - [ ] Cover all eight status mappings and reject full status backgrounds on
        appointment containers.
  - [ ] Cover compact/medium/full anatomy, badge/status accessibility, canceled,
        completed, no-show, waiting, and in-progress distinctions.
  - [ ] Preserve board/list, filters, CTA, drawers, terminal states, DnD,
        announcements, focus restoration, rollback, and production-boundary
        tests.
  - [ ] Add browser checks for neutral computed card surface, indicator, badge,
        hover, focus, drag overlay, drop target, light/dark, and reduced motion
        where stable automation is practical.
  - [ ] Add cross-route tests for every changed shared sidebar/button/filter
        contract.
- [ ] Complete accessibility and responsive verification:
  - [ ] Keyboard-test controls, cards, menus, drag handles, slots, drawers, and
        dialogs with visible/unobscured focus.
  - [ ] Verify VoiceOver or equivalent card/status names and DnD announcements.
  - [ ] Verify 320 CSS pixels, 200% zoom, horizontal/internal scroll, sticky
        axes, coarse pointers, and target sizes.
  - [ ] Verify forced colors, reduced motion, light/dark/system, and color-
        independent status meaning.
  - [ ] Measure browser-computed text, badge, focus, control, and meaningful
        non-text contrast against WCAG 2.2 AA.
- [ ] Complete visual acceptance:
  - [ ] Compare controlled after screenshots with the preserved design intent
        at 1600 × 900 in light/dark normal and dense scenarios.
  - [ ] Verify no card is a solid green, red, blue, amber, gray, or gold block.
  - [ ] Verify all cards belong to one neutral TRIAD surface family and status
        remains quickly identifiable through non-color-only signals.
  - [ ] Verify sidebar, filters, CTA, grid lines, canceled, completed, no-show,
        in-progress, waiting, hover, focus, dragging, and drop target.
  - [ ] Do not attach screenshots containing real identities, sessions, tokens,
        or private request data.
- [ ] Update durable documentation:
  - [ ] Update `docs/studio/theme-system.md` with the neutral appointment-card
        status rule and accepted component-token mapping.
  - [ ] Update `docs/studio/agenda-kanban-ux-reference.md` and
        `docs/studio/schedule-prototype.md` with the refined visual contract.
  - [ ] Update `docs/studio/component-system.md` only for changed active shared
        component contracts.
  - [ ] Update `apps/studio/README.md` only if the runtime or verification
        workflow changes; record why it is unchanged otherwise.
  - [ ] Do not update API, IDP, site, env, deployment, or release docs because
        their contracts are outside this initiative.
- [ ] Run verification and record evidence:
  - [ ] `bun --filter studio routes:generate`
  - [ ] `bun --filter studio format`
  - [ ] `bun --filter studio lint`
  - [ ] `bun --filter studio typecheck`
  - [ ] `bun --filter studio test`
  - [ ] `bun --filter studio test:production-boundary`
  - [ ] `bun --filter studio build`
  - [ ] `bun --filter studio check`
  - [ ] `bun --filter studio test:e2e -- tests/e2e/schedule-prototype.spec.ts`
  - [ ] `git diff --check`

## Verification Evidence

Record evidence only after implementation. Use synthetic fixtures and avoid
credentials, tokens, sessions, private headers, real identities, and production
screenshots.

- Source preservation/hash:
- Before/after visual references:
- Token/status contract tests:
- Agenda unit tests:
- Playwright/computed-style checks:
- Accessibility/responsive/contrast checks:
- Studio check/build/production boundary:
- Documentation review:

## Risks And Follow-Ups

- [ ] A literal full badge may not fit the compact 15-minute layout without
      violating the preserved geometry; use the accepted compact exception and
      record visual evidence.
- [ ] Shared sidebar/filter/button refinement can affect setup and future routes;
      require cross-route evidence or leave already-correct shared styles alone.
- [ ] `color-mix`, gradients, pseudo-elements, and sticky/overflow contexts can
      differ by browser; verify computed behavior in the supported Chromium
      path and inspect graceful fallbacks.
- [ ] Screenshot assertions can become brittle; prefer semantic/computed-style
      checks and use screenshots as controlled visual evidence, not the only
      automated gate.
- [ ] Any request to replace the entire Studio global palette, change Agenda
      structure/content, or add production scheduling data belongs in a
      separate accepted initiative.
