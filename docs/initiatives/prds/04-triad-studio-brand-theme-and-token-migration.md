# 04 TRIAD Studio Brand Theme And Token Migration

## Summary

Translate the designer-provided dark-first navy and gold direction into the
existing TRIAD Studio design-token architecture. The initiative replaces the
temporary blue/neutral visual anchors with an accessible, maintainable brand
theme across the authenticated shell, authentication, shared components, and
the schedule prototype without applying a destructive shadcn preset or
introducing a parallel styling system.

The dark theme is the primary visual acceptance surface. Studio continues to
support light, dark, and system preferences; the light theme becomes a
deliberate navy/gold companion rather than being removed or silently mapped to
dark. Raw designer values are normalized through primitive, semantic, and
component tokens in `src/index.css` before components consume them.

## Context

- Current state:
  - Studio has a documented three-layer token architecture, Tailwind CSS v4,
    shadcn/ui Base UI primitives, Geist, light/dark/system preferences, and a
    production schedule prototype.
  - Current brand primitives are generic blue and neutral anchors inherited
    from the frontend foundation.
  - Initiative 03 supplies a dense operational surface where palette, status,
    focus, scroll, overlay, and theme behavior can be evaluated realistically.
  - The designer handoff supplied a navy scale, a gold scale, dark semantic
    values, schedule-state colors, chart colors, sidebar colors, gradients,
    shadows, and the broader MLP feature description.
- Problem:
  - Copying the handoff CSS directly would collapse `:root` and `.dark` into one
    dark theme, bypass part of the current token hierarchy, omit `arrived` and
    `no-show` schedule states, and accept contrast failures.
  - The annotated handoff colors produce approximately 2.18:1 for success text
    and 4.41:1 for destructive text on their backgrounds; both are insufficient
    for normal text at the WCAG AA 4.5:1 threshold.
  - Brand gradients and raw palette utilities could spread into feature markup
    without durable usage rules.
- Why now:
  - The product is still in visual validation, so changing global visual
    anchors is cheaper and safer before more modules are built.
  - Applying the accepted theme before onboarding and later operational modules
    avoids repeated visual migration.
- Related docs/issues:
  - `docs/studio/theme-system.md`
  - `docs/studio/component-system.md`
  - `docs/studio/schedule-prototype.md`
  - `docs/initiatives/prds/03-triad-studio-schedule-visual-prototype.md`
  - Linear initiative: [TRIAD Studio Brand Theme and Token Migration](https://linear.app/corvi-io/initiative/triad-studio-brand-theme-and-token-migration-0f69366b9fda).
  - Linear issue: [ENG-35](https://linear.app/corvi-io/issue/ENG-35/migrate-triad-studio-to-the-navy-and-gold-brand-theme).
  - Designer handoff reviewed from temporary local Markdown files on
    2026-07-19; distilled decisions are preserved in `docs/studio/theme-system.md`.

## Goals

- Replace generic blue brand primitives with the accepted TRIAD navy and gold
  anchors while preserving semantic component APIs.
- Establish an accessible dark-first theme and a deliberate light companion
  theme under the existing light/dark/system preference contract.
- Preserve the primitive-to-semantic-to-component token hierarchy in
  `apps/studio/src/index.css` as the only runtime token source of truth.
- Define complete semantic feedback and schedule-state tokens for scheduled,
  confirmed, arrived, waiting, in-progress, completed, canceled, and no-show.
- Keep state meaning independent from color through Portuguese text, symbols,
  shapes, and accessible names.
- Define restrained brand-gradient and elevation tokens without placing raw
  gradients or colors in components.
- Migrate project-owned shared and scheduling compositions away from raw color
  utilities when semantic tokens or variants apply.
- Validate contrast, focus, forced colors, reduced motion, theme persistence,
  initial paint, overlays, forms, dense schedule content, and narrow layouts.
- Document designer intent, accepted changes, rejected handoff details, token
  roles, and future contribution rules durably.

## Non-Goals

- Applying or switching the shadcn preset, base primitive library, icon library,
  component registry, font, or component APIs.
- Rebuilding layouts, navigation, scheduling workflows, mock scenarios, API
  contracts, IDP behavior, or backend persistence.
- Creating a second CSS entrypoint, runtime theme editor, tenant-customizable
  branding, white-label support, or database-backed theme configuration.
- Adding arbitrary raw palette utilities to product markup.
- Using gradient text, gold body copy, decorative glow on dense operational
  surfaces, or animation solely to communicate brand.
- Treating the designer-provided MLP feature list as new scope for this visual
  migration.

## Brainstorm

### Problem Framing

- We are aligning the implemented product with its intended brand without
  weakening the working component, accessibility, and theme contracts.
- Owners, managers, reception staff, product reviewers, and UX reviewers are
  affected because every Studio surface consumes the global theme.
- The improved workflow is visual evaluation: one accepted palette and token
  vocabulary should render consistently from login through the schedule and
  future modules.
- The deliverable is a production-capable token migration, not a static style
  board and not a full visual redesign of each feature.

### Gaps And Unknowns

- Product gaps:
  - The handoff says the principal theme is dark but does not explicitly reject
    light or system preference; the conservative decision is to keep both.
  - The handoff does not specify whether dark should replace `system` as the
    default preference. Keep `system` until product explicitly accepts a change.
  - Final visual approval is still required on representative login, shell,
    forms, overlays, feedback, and schedule states.
- Technical gaps:
  - Designer OKLCH declarations and annotated hex comments are not guaranteed
    to be exact equivalents; browser-computed colors must be measured.
  - Existing shadcn-owned primitives contain upstream `dark:` behavior. Do not
    mechanically remove it; change copied primitive source only when the token
    migration exposes a real incompatibility and inspect upstream diffs first.
  - The current theme class is applied after React mounts, so initial-paint
    flashing must be evaluated and corrected if reproducible.
- Data/model gaps:
  - There is no data model impact. Theme preference remains browser-local and is
    not an identity or business setting.
  - Schedule color names remain presentation vocabulary, not backend statuses.
- Operational gaps:
  - Automated contrast checks need fixed token pairs and must complement, not
    replace, browser and assistive-technology review.
  - Screenshot baselines can be noisy across platforms; prefer bounded
    representative browser assertions plus explicit manual evidence.

### Counterpoints

- Directly replacing `index.css` with the handoff is fastest, but would discard
  light-theme behavior, workspace component tokens, fonts, imports, geometry,
  focus rules, and existing semantic mappings.
- Applying a shadcn preset could generate a cohesive palette, but the handoff is
  not a preset and `apply` may overwrite accepted component source.
- Making Studio dark-only follows the handoff literally, but removes an already
  working preference and creates unnecessary accessibility/user-preference risk.
- Exposing every navy and gold step as Tailwind utilities is convenient, but
  encourages feature code to bypass semantic meaning.
- A separate theme skill or token JSON could appear reusable, but would create
  a competing source of truth. The existing Studio skill, AGENTS instructions,
  canonical theme document, and CSS token source are sufficient.
- Gradients everywhere would make the rebrand obvious, but would reduce
  operational legibility and make schedule density harder to scan.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Copy the designer CSS and make Studio dark-only | Lowest initial effort | Regresses existing contracts and accepts incomplete/inaccessible values | Do not choose |
| B | Translate navy/gold into the current three-layer system with dark-first and light companion themes | Preserves architecture, accessibility, shadcn semantics, and future maintainability | Requires token mapping, contrast adjustment, and representative review | Recommended |
| C | Build runtime/tenant-customizable themes | Enables future white-labeling | Adds persistence, authorization, caching, and support complexity without current demand | Revisit only after validated customer need |

### Recommendation

Choose Option B. Treat the designer handoff as visual intent and raw input, not
drop-in source. Keep hex or OKLCH values only in the primitive layer, map them to
semantic roles per theme, and consume those roles from shadcn primitives and
component tokens. Make dark the primary visual acceptance surface while keeping
light and system support. Correct contrast before accepting tokens, and use
gradients only through named brand-surface tokens.

## Theme Contract

### Token Layers

1. Primitive tokens preserve the accepted navy, gold, neutral, feedback, radius,
   shadow, and duration anchors.
2. Semantic tokens assign background, foreground, card, popover, primary,
   secondary, muted, accent, feedback, border, input, ring, chart, sidebar, and
   schedule-state meanings separately for light and dark.
3. Component tokens assign shell geometry and rare component-specific visual
   roles. A component token must reference a semantic or primitive token.

Only semantic and explicitly accepted component roles are registered through
Tailwind `@theme inline`. Feature code must not consume primitive palette steps
when a meaningful semantic role exists.

### Brand Direction

- Navy is the structural background and surface family.
- Gold is the primary brand/action/focus family, not a body-text color.
- Geist and the existing typography/spacing scales remain unchanged unless a
  later approved handoff supplies a typography system.
- The dark surface gradient and subtle highlight may appear on bounded brand or
  onboarding surfaces; the schedule grid, tables, forms, and routine cards use
  solid semantic surfaces.
- Gold gradients are reserved for rare brand emphasis and must not reduce label,
  icon, or focus contrast.

### Status And Feedback

- Global feedback roles are success, warning, info, and destructive.
- Scheduling adds all eight accepted visual states and keeps tokens inside the
  scheduling presentation boundary unless another module proves shared meaning.
- Text, icon/symbol, border/shape, and accessible name carry meaning. Color is
  supplementary.
- Every foreground/background pair used for normal text must meet at least
  4.5:1. Focus indicators and meaningful non-text UI boundaries target at least
  3:1 against adjacent colors.

## Architecture And Boundaries

- Site impact: none. Studio theme values do not automatically rebrand the public
  site; any site alignment requires its own accepted scope.
- API impact: none.
- IDP impact: none. Login screens owned by Studio may change visually, but auth,
  sessions, invitations, and IDP routes do not change.
- Studio impact:
  - `src/index.css` remains the runtime token source of truth;
  - `ThemeProvider` retains light/dark/system preference and browser-local
    storage;
  - shared components keep semantic APIs while token mappings change;
  - project-owned raw status colors are migrated to semantic roles;
  - schedule presentation receives complete module-owned state roles;
  - representative authenticated, unauthenticated, overlay, form, feedback, and
    dense schedule surfaces are verified.
- Data/persistence impact: none beyond the existing local theme preference.
- External provider impact: none.

## Performance And Scalability

- Expected data growth: none; token count grows by a bounded palette and state
  set independent of customer or appointment volume.
- Critical paths: initial CSS parse, theme class resolution before first paint,
  and avoiding duplicated styles or runtime token computation.
- Query bounds/pagination: not applicable.
- Concurrency risks: none. Theme preference is local to one browser profile.
- External limits: none.
- Millions of records/items: no token-system impact. Dense schedules must still
  avoid per-record inline style generation; status variants resolve through
  stable classes and CSS variables.
- Bundle impact: no new runtime theme or styling dependency is expected. Reject
  a new dependency unless measurement and a missing capability justify it.

## Security, Privacy, And Abuse

- Auth/session impact: none; do not move theme preference into IDP.
- Roles/access: every authenticated role receives the same product theme.
- PII/secrets: none. Screenshots and fixtures must remain synthetic or redact
  real customer/user information.
- Spam/abuse vectors: none.
- Rate limiting or throttling needs: none.
- Do not log theme storage contents, user identity, credentials, tokens,
  appointment/customer payloads, or screenshot content.

## Accessibility And UX

- Keyboard flow: all existing controls retain focus order and visible focus;
  gold focus treatment must reach 3:1 against adjacent surfaces.
- Screen reader states: visual theme changes introduce no extra announcements;
  schedule statuses keep accessible Portuguese text independent of color.
- Responsive behavior: validate login, shell, forms, drawers, toasts, preferences,
  and schedule at 320 CSS pixels and 200% zoom-equivalent widths.
- Loading/error/empty states: verify semantic text, icons, borders, skeletons,
  alerts, and toasts in both themes.
- Duplicate submission prevention: unchanged; visual loading and disabled states
  must remain distinguishable.
- Verify dark, light, system, high contrast/forced colors, reduced motion,
  browser zoom, and color-vision-independent state recognition.
- Use browser-computed colors for final WCAG contrast evidence; annotated hex
  comments are planning evidence only.

## Logging And Observability

- Useful structured events: none by default. Theme selection does not justify a
  product analytics event in this initiative.
- Metrics: bundle/CSS size deltas and optional local contrast-test coverage;
  avoid business telemetry.
- Traces/spans: none.
- Alerts: none.
- Sensitive data that must not be logged: credentials, sessions, tokens, user
  identity, client details, appointment data, local storage contents, and
  screenshots.

## Acceptance Criteria

- [x] Designer navy and gold anchors are preserved durably and mapped through
      primitive, semantic, and component layers in `src/index.css`.
- [x] Dark is the primary accepted visual direction while light, dark, and
      system preferences continue to work and persist.
- [x] Initial theme resolution does not produce a reproducible incorrect-theme
      flash on supported Studio entrypoints.
- [x] No shadcn preset, base, icon library, font, or component API is replaced.
- [x] Global feedback roles and all eight scheduling states have explicit,
      documented visual roles in both themes.
- [x] Normal text pairs meet at least 4.5:1 and focus/non-text UI indicators meet
      the applicable 3:1 requirement using browser-computed colors.
- [x] Schedule and feedback meaning never depends on color alone.
- [x] Gradients and branded shadows are tokenized, restrained, and absent from
      dense routine operational surfaces unless explicitly justified.
- [x] Project-owned raw color utilities are removed where semantic variants
      apply; upstream shadcn source is changed only through reviewed diffs.
- [x] Login, shell, preferences, forms, drawers, menus, toasts, loading/error/
      empty states, and schedule normal/dense/all-status scenarios are reviewed
      in light and dark.
- [x] Keyboard, visible focus, 320 CSS pixels, 200% zoom, reduced motion, forced
      colors, and basic VoiceOver checks are recorded with residual risks.
- [x] Theme documentation, component guidance, tests, and implementation
      decisions are updated without creating a parallel token source or skill.

## Verification Plan

- Unit tests:
  - token names, required mappings, complete theme pairs, and no forbidden
    primitive consumption in project-owned feature components;
  - theme preference, persistence, system changes, and initial resolution;
  - complete feedback and schedule-state presentation maps.
- Integration/API tests:
  - no API/IDP integration tests are required;
  - verify authentication behavior is unchanged while login visuals render.
- UI tests:
  - focused component coverage for buttons, fields, status badges, drawers,
    menus, toasts, and schedule states;
  - Playwright for light/dark/system switching, refresh persistence, initial
    paint, representative route accessibility, dense schedule, and axe.
- Manual/browser checks:
  - compare representative designer-approved captures at desktop and narrow
    widths in dark-first and light companion themes;
  - verify browser-computed contrast, focus, forced colors, 200% zoom, reduced
    motion, and basic VoiceOver.
- Build/check commands:
  - `bun --filter studio format`
  - `bun --filter studio lint`
  - `bun --filter studio typecheck`
  - `bun --filter studio test`
  - `bun --filter studio test:e2e`
  - `bun --filter studio test:e2e:production`
  - `bun --filter studio test:production-boundary`
  - `bun --filter studio build`
  - `bun --filter studio check`

## Open Questions

- [ ] Obtain final designer approval for the derived light companion palette;
      keeping light support is accepted, but exact values require visual review.
- [ ] Confirm whether a future initiative should change the initial preference
      from `system` to `dark`; this initiative preserves `system`.
- [x] Limit the named navy/gold gradient and branded shadow to the desktop login
      preview; solid semantic surfaces remain the default elsewhere.
