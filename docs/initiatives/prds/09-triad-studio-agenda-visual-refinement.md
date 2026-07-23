# 09 TRIAD Studio Agenda Visual Refinement

## Summary

Refine the existing TRIAD Studio Agenda without redesigning its structure or
changing its behavior. The initiative keeps the implemented temporal board,
list view, filters, synthetic data, drag-and-drop rescheduling, internal scroll,
drawers, and status workflows while making appointment cards predominantly
neutral navy/card surfaces. Status color becomes a bounded operational signal
through a slim leading indicator, subtle tint, border, icon, and badge.

The work is frontend-only and token-first. It translates the designer handoff
into the existing primitive, semantic, and component token architecture rather
than pasting the supplied CSS or replacing the accepted Studio theme globally.

## Context

- Current state:
  - ENG-40 completed the current `/agenda` evaluation surface with `Quadro` as
    a time-by-barber matrix, `Lista` as the alternate view, six barber columns,
    15-minute rows, 42 normal synthetic appointments, bounded dense/failure
    scenarios, and accessible mouse/touch/keyboard rescheduling.
  - Appointment card containers currently consume each schedule status token
    as the full background, foreground, and two-pixel border. This makes dense
    boards look like unrelated colored blocks rather than one product surface.
  - Schedule status tokens already exist for `scheduled`, `confirmed`,
    `arrived`, `waiting`, `in-progress`, `completed`, `canceled`, and `no-show`
    in light and dark themes.
  - The shared sidebar active item still draws a complete border, while the new
    handoff requests a restrained leading indicator.
  - Shared `filter` and `filter-active` button variants already represent the
    neutral/gold selected direction and need visual verification before any
    change.
- Problem:
  - Status saturation dominates customer, time, service, and barber hierarchy.
  - Canceled, completed, waiting, and in-progress records are especially heavy
    in dense views.
  - Directly applying the handoff's global `:root` and `.dark` snippets would
    affect authentication, setup, preferences, and every shared Studio surface,
    contradicting the requested Agenda-only refinement.
- Why now:
  - The functional Agenda reference is accepted, so visual refinement can be
    isolated and verified without reopening product behavior.
  - This prevents the current full-status-surface card treatment from becoming
    a repeated pattern in future operational modules.
- Related sources:
  - [Linear initiative: TRIAD Studio Agenda Visual Refinement](https://linear.app/corvi-io/initiative/triad-studio-agenda-visual-refinement-d54c129f1ebb)
  - [ENG-43: Refine TRIAD Studio Agenda visual hierarchy and appointment cards](https://linear.app/corvi-io/issue/ENG-43/refine-triad-studio-agenda-visual-hierarchy-and-appointment-cards)
  - [Linear document: complete verbatim design handoff](https://linear.app/corvi-io/document/triad-studio-agenda-visual-refinement-verbatim-design-handoff-90e76e4aba45)
  - [Verbatim designer handoff](../sources/09-triad-studio-agenda-visual-refinement-design-handoff.md)
  - `docs/initiatives/prds/06-triad-studio-agenda-kanban-visual-prototype.md`
  - `docs/initiatives/prds/04-triad-studio-brand-theme-and-token-migration.md`
  - `docs/studio/agenda-kanban-ux-reference.md`
  - `docs/studio/theme-system.md`
  - `docs/studio/component-system.md`
  - [ENG-40: Build the TRIAD Studio Agenda board visual prototype](https://linear.app/corvi-io/issue/ENG-40/build-the-triad-studio-agenda-board-visual-prototype)
  - [ENG-35: Migrate TRIAD Studio to the navy and gold brand theme](https://linear.app/corvi-io/issue/ENG-35/migrate-triad-studio-to-the-navy-and-gold-brand-theme)

## Source Preservation

- The complete 736-line designer file is preserved verbatim at
  `docs/initiatives/sources/09-triad-studio-agenda-visual-refinement-design-handoff.md`.
- The repository copy has SHA-256
  `7b4003cf660388abd1b36fb2f88ea604b61187482af19db0e36de71638ad21e2`,
  matching the supplied file at planning time.
- The same complete Markdown source will be stored as a Linear document owned
  by this initiative. The PRD records accepted interpretations separately so
  the original design intent is never silently rewritten.

## Goals

- Make every Agenda appointment card read first as a TRIAD neutral surface and
  second as an operational status.
- Replace full-card status backgrounds with a neutral card surface, one subtle
  border, a two-to-three-pixel leading indicator, a low-intensity leading tint,
  a status-aware badge, and restrained elevation.
- Preserve distinct, semantically complete treatment for all eight statuses,
  especially neutral `no-show`, burgundy/desaturated `canceled`, calm
  `completed`, green `confirmed`, blue `in-progress`, and burnt-amber `waiting`.
- Preserve the accepted information hierarchy, geometry, sticky axes, internal
  scroll, list/board toggle, filters, CTA position, card content, mock data,
  status vocabulary, drawers, and drag-and-drop behavior.
- Refine grid, time column, barber headers, empty drop targets, active filters,
  new-appointment CTA, and sidebar selection only where the current computed
  styles do not already meet the handoff.
- Keep light, dark, system, forced-colors, reduced-motion, keyboard, touch,
  screen-reader, 200% zoom, and 320 CSS-pixel behavior intact.
- Keep raw colors out of scheduling React components and express accepted
  visuals through the existing token layers.
- Add focused visual-contract and regression evidence so future changes cannot
  restore full-card status fills accidentally.

## Non-Goals

- A new page, alternate Agenda layout, new card content, new status, new filter,
  changed card dimensions, changed column/time geometry, or changed navigation
  order.
- Changes to mock records, scenarios, sorting/filter semantics, URLs, drawer
  forms, status transitions, drag collision rules, mutation/rollback behavior,
  or query/repository contracts.
- API, IDP, site, database, migration, OpenAPI, authorization, tenancy,
  deployment, environment, realtime, analytics, or persistence work.
- Replacing the accepted Studio navy/gold theme, Geist, shadcn/Base UI,
  Tailwind, `StatusBadge`, or DnD library.
- Pasting the handoff's global hex declarations into component JSX or replacing
  global `:root`/`.dark` semantic tokens for an Agenda-only result.
- Creating Agenda-only forks of shared sidebar, button, filter, or badge
  primitives.
- Treating synthetic density as production capacity evidence.

## Brainstorm

### Problem Framing

- The workflow is visual scanning under density: a receptionist or manager must
  find customer, time, service, barber, and status without status color becoming
  the largest object on the page.
- The designer is not asking for a new workflow. The task succeeds when the
  existing workflow is easier to read and still behaves identically.
- The primary design rule is “status colors are signals, not surfaces.”
- The implementation problem is therefore token responsibility and card anatomy,
  not a new data or component architecture.

### Gaps And Unknowns

- Product gaps:
  - The handoff asks every card to show a badge while also prohibiting content,
    height, and position changes. The current 15-minute compact layout has one
    text row and cannot always add a readable badge without clipping.
  - The supplied global palette differs slightly from the accepted ENG-35 theme
    and does not define whether the whole Studio should migrate again.
- Technical gaps:
  - The current status presentation object couples badge and full-container
    utility classes. It needs a narrower presentation contract so card surfaces
    are neutral while badges remain status-specific.
  - CSS pseudo-elements, gradients, `color-mix`, drag transforms, sticky layers,
    focus rings, menus, and DnD overlays must be checked together in actual
    browsers.
  - Updating shared sidebar or filter/button styling affects setup and other
    Studio routes; an Agenda-local fork would be worse, so shared changes need
    cross-route regression evidence.
- Data/model gaps:
  - None. Existing status vocabulary and synthetic records remain unchanged.
- Operational gaps:
  - Visual acceptance needs stable screenshots/computed-style evidence in both
    themes and at representative density, not only unit assertions.

### Counterpoints

- Copying the CSS snippets verbatim is fast, but it would bypass the accepted
  token hierarchy, introduce raw component colors, and globally change surfaces
  outside the Agenda. The handoff is visual intent plus examples, not drop-in
  runtime CSS.
- Keeping full status fills makes states unmistakable, but color then competes
  with the scheduling axes and weakens dense scanning. Badge text, symbol/icon,
  leading indicator, border, and accessible name preserve state recognition.
- Adding a badge to every compact 15-minute card follows the literal handoff,
  but may reduce customer/time legibility or change geometry. Preserve the
  compact layout: expose status through the leading indicator and accessible
  label, and show a visible compact symbol/badge only when it fits without
  changing the row contract. Medium/full cards keep the full badge.
- Applying the sidebar treatment only on `/agenda` would avoid other-route
  changes, but would fork a shared shell. If the current shared indicator fails
  the accepted refinement, update it once and verify every shell route.
- A new general-purpose appointment-card component could appear reusable, but
  there is only one accepted consumer. Keep the card in `scheduling` and add
  shared APIs only when stable cross-module reuse exists.
- Strong hover/drag animation looks premium in isolation, but can distract in a
  dense operational surface and must respect reduced motion. Use the handoff's
  movement as a maximum, not a mandatory amplitude.

### Options

| Option | Description                                                                                                                  | Pros                                                                 | Cons                                                                        | When To Choose |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------- |
| A      | Paste supplied styles and hex values into the current card and global theme                                                  | Fastest apparent match                                               | Violates token ownership, expands blast radius, and creates regression risk | Do not choose  |
| B      | Translate the handoff into Agenda component tokens and a neutral card anatomy, auditing shared variants before changing them | Matches intent, preserves architecture and behavior, and is testable | Requires computed-style, accessibility, and cross-route verification        | Recommended    |
| C      | Redesign the Agenda/card system around a new component library                                                               | Maximum visual freedom                                               | Reopens accepted structure, DnD, accessibility, and dependencies            | Do not choose  |

### Recommendation

Choose Option B.

Keep the existing primitive and semantic theme as the global contract. Add the
smallest Agenda/scheduling component-token layer needed for grid, time column,
barber header, neutral appointment card, indicator, subtle tint, hover, drag
overlay, and drop target. Those tokens must resolve from existing semantic and
schedule status roles; raw hex values remain only in the primitive layer if an
existing primitive cannot represent an accepted value.

Use `data-appointment-status` to map local CSS variables such as status surface,
foreground, and border. The appointment container consumes neutral card
foreground/background tokens and uses status variables only for its leading
indicator, subtle gradient, border interaction, and badge. Split the status
presentation contract so it no longer assigns a full status background to the
container.

Audit shared sidebar, `FilterTrigger`, button variants, and CTA before changing
them. Reuse current behavior when computed styles already satisfy the handoff.
When a shared change is necessary, update the single shared semantic contract
and verify Agenda, setup, overview, and shell regressions; never create a route-
specific fork.

## Visual Contract

### Appointment Cards

- Base surface uses `card`/`card-foreground`, one subtle border, existing radius,
  minimal shadow, and no status-colored full fill.
- A two-to-three-pixel logical leading indicator carries the strongest status
  color and works in left-to-right and future right-to-left layouts.
- A low-intensity leading gradient may mix the status surface into the neutral
  card, with dark mode no stronger than light mode and forced colors retaining a
  visible structural boundary.
- Medium/full cards show the existing status label in a status-specific badge.
  Compact cards preserve time/customer geometry and expose visible status only
  when it fits; their accessible name always includes the complete status.
- Customer remains medium/semibold, time medium/tabular, service regular/muted,
  and badge medium. No blanket bold treatment is added.
- Hover increases border/elevation modestly without increasing status fill.
  Focus remains more prominent than hover.
- Drag source/overlay remains identifiable without changing collision geometry;
  drop zones use a low-intensity primary treatment. Reduced motion removes
  rotation, scaling, translation, and animated transitions.

### Status Semantics

- `scheduled`: restrained gold family.
- `confirmed`: calm green, distinct label/symbol.
- `arrived`: existing navy/information family with `Check-in` text.
- `waiting`: burnt amber, not saturated orange.
- `in-progress`: desaturated blue only on indicator/badge/border/icon.
- `completed`: calmer green than confirmed, retaining `Finalizado` and check
  semantics without neon treatment.
- `canceled`: desaturated burgundy/red on signals only; neutral card surface.
- `no-show`: neutral gray, explicitly distinct from canceled.
- Text and symbol/icon continue to carry meaning independently of color.

### Grid, Shell, And Controls

- Grid surface sits between page background and cards; lines remain perceptible
  but quieter than card borders.
- Time column is distinct but neutral; sticky barber headers sit above the grid
  and below popover elevation.
- Sidebar stays darker than main content in dark mode. Active navigation uses
  a leading gold indicator, text/icon treatment, and no complete gold outline
  when a shared-shell update is required.
- Inactive filters remain neutral; active filters use restrained gold surface,
  foreground, and border without a saturated fill.
- `Novo agendamento` remains the existing header action and uses semantic gold
  tokens; no raw button hex is introduced in the component.

## Architecture And Boundaries

- Site impact: none.
- API impact: none. No production scheduling contract is inferred.
- IDP impact: none. Authentication/session behavior is untouched.
- Studio impact:
  - Refine scheduling card, status presentation, grid, drag/drop visual states,
    and focused theme/component tokens.
  - Audit shared shell/button/filter variants and change them only through their
    existing owner with cross-route regression coverage.
  - Preserve the local/dev evaluation source, route, repository, fixtures, and
    fail-closed `hml`/`prd` boundary.
- Data/persistence impact: none.
- External provider impact: none.

## Performance And Scalability

- Expected data growth:
  - No new records or data flow. Existing normal/dense scenarios remain visual
    test inputs only.
- Critical paths:
  - Prefer CSS/data-attribute resolution over per-card JavaScript style objects
    or additional React state.
  - Do not add image requests, observers, layout measurement loops, or runtime
    palette computation.
- Query bounds/pagination:
  - Unchanged; this initiative does not authorize production query behavior.
- Concurrency risks:
  - None added. Drag/mutation concurrency behavior remains the ENG-40 contract.
- External limits:
  - None.
- What happens with millions of records/items:
  - This visual task does not make the DOM board suitable for unbounded data.
    Future production range limits, server filtering, pagination, or
    virtualization remain separate backend/product decisions.

## Security, Privacy, And Abuse

- Auth/session impact: none; keep the authenticated route and existing gate.
- Roles/access: no authorization change.
- PII/secrets:
  - Use only current synthetic fixtures in screenshots and test evidence.
  - Do not attach real customer data, sessions, tokens, private headers, or
    production screenshots to Linear or visual baselines.
- Spam/abuse vectors: none introduced.
- Rate limiting or throttling needs: none.

## Accessibility And UX

- Keyboard flow:
  - Preserve card details, menu, drag handle, pointer/touch/keyboard reschedule,
    focus restoration, and drawer `Remarcar` alternative.
  - Styling and pseudo-elements never intercept pointer or focus events.
- Screen reader states:
  - Accessible card names continue to include customer, time, service, and
    complete status. Drag/drop Portuguese instructions and live outcomes remain
    unchanged.
  - Status is never conveyed by tint, indicator, or badge color alone.
- Responsive behavior:
  - Preserve current bounded horizontal/internal scroll, sticky axes, 320 CSS-
    pixel behavior, 200% zoom, coarse pointers, and compact card geometry.
- Loading/error/empty states:
  - Preserve existing loading, error, empty, filtered-empty, occupied, blocked,
    and pending mutation behavior; visually audit them in both themes.
- Duplicate submission prevention:
  - No command behavior changes; preserve pending reschedule and form controls.
- WCAG visual checks:
  - Measure browser-computed text, badge, border, focus, active filter, CTA, and
    non-text contrast against WCAG 2.2 AA targets.
  - Verify forced colors and reduced motion explicitly. Focus must remain at
    least as visible as hover/drag styling.

## Logging And Observability

- Useful structured events: none added for a CSS/presentation-only change.
- Metrics: no runtime metrics added.
- Traces/spans: none.
- Alerts: none.
- Sensitive data that must not be logged: existing synthetic/customer-shaped
  payload rules remain unchanged; do not log card contents, drag payloads, or
  screenshot data.

## Acceptance Criteria

- [ ] The complete designer handoff is preserved verbatim in the repository and
      as a Linear document owned by the initiative.
- [ ] Appointment cards use a neutral card surface in light and dark mode; no
      status supplies the full container background or foreground treatment.
- [ ] Every status has a distinct leading indicator, subtle bounded tint,
      border/badge treatment, text label, and existing accessible name without
      raw status colors in React components.
- [ ] Canceled cards are neutral with restrained red/burgundy signals;
      completed cards are calm rather than neon; `no-show` is neutral and
      distinct from canceled; waiting and in-progress avoid saturated full-card
      fills.
- [ ] Medium/full cards retain readable status badges. Compact cards preserve
      geometry and complete accessible status, with a visible compact status
      signal only when it does not clip customer/time content.
- [ ] Grid, lines, time column, barber headers, sidebar selection, filters, CTA,
      hover, drag source/overlay, and drop target follow the restrained navy/gold
      hierarchy without structural or behavioral changes.
- [ ] Existing sidebar/filter/button contracts are reused when already correct;
      any necessary shared change has overview/setup/shell regression evidence
      and no Agenda-only shared-component fork.
- [ ] Sidebar geometry, page/header/CTA positions, filter order and behavior,
      list/board views, columns, time rows, card sizes/positions/content, mock
      data, statuses, internal scroll, drawers, and DnD/mutations remain intact.
- [ ] Light, dark, system, forced-colors, reduced-motion, keyboard, touch,
      screen-reader, 200% zoom, 320 CSS-pixel, coarse-pointer, and focus behavior
      pass focused checks.
- [ ] Browser-computed contrast meets WCAG 2.2 AA for text, status badges,
      controls, focus indicators, and meaningful non-text boundaries.
- [ ] No API, IDP, site, database, environment, deployment, analytics, external
      asset, or production scheduling behavior is added.

## Verification Plan

- Unit tests:
  - Update theme/status contract tests to reject full-container status classes,
    require all eight local status mappings, and preserve labels/symbols.
  - Preserve Agenda render, actions, filtering, drawer, compact/full layout,
    terminal state, DnD, announcement, rollback, and source-boundary tests.
- Integration/API tests:
  - None; API/IDP behavior is explicitly unchanged.
- UI tests:
  - Add computed-style or DOM contract checks for neutral card surfaces,
    indicators, badges, active filters, focus, drag source/overlay, drop target,
    and reduced motion where browser tooling can verify them reliably.
  - Preserve relevant ENG-40 Playwright journeys without rewriting behavior.
- Manual/browser checks:
  - Compare stable synthetic screenshots at 1600 × 900 in light and dark themes,
    plus dense, canceled/completed/no-show/in-progress, hover, focus, drag, and
    drop-target states.
  - Check 320 CSS pixels, 200% zoom, forced colors, reduced motion, keyboard,
    touch/coarse pointer, sticky headers/time column, horizontal/internal scroll,
    and major overlay z-index interactions.
  - Measure computed contrast instead of approving hex values by inspection.
- Build/check commands:
  - `bun --filter studio routes:generate`
  - `bun --filter studio format`
  - `bun --filter studio lint`
  - `bun --filter studio typecheck`
  - `bun --filter studio test`
  - `bun --filter studio test:production-boundary`
  - `bun --filter studio build`
  - `bun --filter studio check`
  - `bun --filter studio test:e2e -- tests/e2e/schedule-prototype.spec.ts`
  - `git diff --check`

## Open Questions

- [x] Should the handoff's global `:root`/`.dark` values replace ENG-35? No.
      Preserve the global theme and translate the visual intent through existing
      token layers; a whole-Studio palette migration requires a separate
      explicit decision.
- [x] Should every compact 15-minute card be forced to contain a full text
      badge? No. Preserve geometry and primary information; keep full status in
      the accessible name and use the strongest visible compact signal that
      fits without clipping.
- [x] Should shared sidebar/filter/button components be forked for Agenda? No.
      Audit first, then update the single shared contract only if required and
      verify all current consumers.
- [x] Should this initiative change Agenda data or behavior? No. It is visual
      refinement only.
