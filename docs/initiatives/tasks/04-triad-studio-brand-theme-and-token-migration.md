# 04 TRIAD Studio Brand Theme And Token Migration - Execution Plan

## Source

- PRD: `docs/initiatives/prds/04-triad-studio-brand-theme-and-token-migration.md`
- Theme contract: `docs/studio/theme-system.md`
- Depends on: [ENG-34](https://linear.app/corvi-io/issue/ENG-34/build-the-triad-studio-schedule-visual-prototype)
- Linear initiative: [TRIAD Studio Brand Theme and Token Migration](https://linear.app/corvi-io/initiative/triad-studio-brand-theme-and-token-migration-0f69366b9fda)
- Related issue: [ENG-35](https://linear.app/corvi-io/issue/ENG-35/migrate-triad-studio-to-the-navy-and-gold-brand-theme)

## Implementation Principles

- Treat the designer handoff as intent and raw input, not drop-in runtime CSS.
- Keep `apps/studio/src/index.css` as the only runtime token source of truth.
- Preserve primitive, semantic, and component token layers.
- Make dark the primary visual acceptance surface while preserving light,
  dark, and system preferences.
- Keep `system` as the initial preference until product explicitly accepts a
  different default.
- Keep raw palette values in the primitive layer and consume semantic or
  component roles from UI source.
- Preserve the shadcn Base UI base, Nova style, Lucide icons, Geist typography,
  existing component APIs, and responsibility folders.
- Do not run `shadcn apply`, overwrite primitives, or accept registry source as
  part of a token-only migration.
- Keep state meaning independent from color and validate browser-computed
  contrast before accepting tokens.
- Use gradients only through named tokens on bounded brand surfaces.
- Keep API, IDP, product workflow, and persistence behavior unchanged.

## Tasks

- [ ] Confirm visual acceptance inputs:
  - [ ] Review the durable handoff distillation in `docs/studio/theme-system.md`
        with product and design.
  - [x] Confirm dark-first plus retained light/system support.
  - [x] Keep `system` as the default unless a separate explicit decision changes
        it.
  - [x] Select representative login, shell, form, overlay, feedback, and
        schedule scenarios for visual approval.
- [x] Establish migration safety:
  - [x] Record the current shadcn project info, preset, base, installed
        components, icon library, font, and CSS entrypoint.
  - [x] Inventory current primitive, semantic, component, feedback, chart,
        sidebar, and schedule-state token consumers.
  - [x] Inventory project-owned raw color utilities and distinguish them from
        reviewed upstream shadcn source.
  - [x] Add token-contract tests guarding the migrated palette values.
- [x] Migrate primitive anchors:
  - [x] Replace generic brand blue anchors with the accepted TRIAD navy and gold
        primitive scales.
  - [x] Preserve required neutral and feedback primitives that are not supplied
        by the handoff.
  - [x] Normalize source values and comments so hex/OKLCH representations do not
        claim false equivalence.
  - [x] Keep typography, spacing, radius, duration, and shell geometry unchanged
        unless visual evidence requires a bounded token adjustment.
- [x] Define semantic light and dark themes:
  - [x] Map dark background, surface, primary, secondary, muted, accent, border,
        input, ring, chart, and sidebar roles from the handoff.
  - [x] Derive and review an accessible navy/gold light companion theme.
  - [x] Correct success, destructive, completed, canceled, and any other pair
        that fails browser-computed contrast.
  - [x] Maintain `color-scheme` and native-control legibility in both themes.
  - [x] Verify gold is not used for low-contrast body text.
- [x] Complete feedback and schedule-state roles:
  - [x] Define success, warning, info, and destructive foreground/background/
        border roles.
  - [x] Define scheduled, confirmed, arrived, waiting, in-progress, completed,
        canceled, and no-show presentation roles inside scheduling ownership.
  - [x] Map every state to Portuguese text plus symbol/icon and shape/border;
        color remains supplementary.
  - [x] Keep presentation vocabulary independent from future API status models.
- [x] Add restrained brand effects:
  - [x] Express surface, highlight, gold, elevation, and focus effects through
        named tokens referencing accepted anchors.
  - [x] Limit gradient use to the desktop authentication preview.
  - [x] Keep schedule grids, tables, forms, and routine cards on solid semantic
        surfaces by default.
  - [x] Respect reduced motion and avoid decorative animation additions.
- [x] Migrate consumers safely:
  - [x] Update project-owned components to semantic variants instead of raw
        blue/emerald/amber utilities where applicable.
  - [x] Verify Button, Field, Input, Select, Sheet, Sidebar, Sonner, Badge,
        skeleton, loading, error, and empty states without changing their APIs.
  - [x] Leave copied upstream primitives unchanged; no shadcn source diff or
        overwrite was required.
  - [x] Verify official brand assets remain readable without duplicating
        light/dark logo files unless design supplies distinct assets.
- [x] Prevent initial-theme regressions:
  - [x] Reproduce and measure first paint with stored light, dark, and system
        preferences.
  - [x] Apply the theme class before React paint through the
        smallest CSP-compatible bootstrap and test it.
  - [x] Preserve browser-local preference and system-theme subscription.
- [x] Add focused automated verification:
  - [x] Test required token layers, mappings, theme completeness, and forbidden
        feature-level primitive/raw color consumption.
  - [x] Test theme selection, persistence, system changes, refresh, and first
        paint.
  - [x] Test all feedback and schedule-state semantics in both themes.
  - [x] Add browser checks for representative login, shell, preferences, drawer,
        toast, empty/error/loading, normal schedule, dense schedule, and
        all-status scenarios.
  - [x] Run axe and verify 320 CSS pixels, 200% zoom-equivalent layouts, keyboard
        focus, reduced motion, and production boundaries.
- [ ] Complete visual and accessibility review:
  - [x] Measure final browser-computed normal-text contrast at 4.5:1 or greater.
  - [x] Measure applicable focus and meaningful non-text UI contrast at 3:1 or
        greater.
  - [x] Inspect 1440 × 900 light/dark and 320 × 720 dark captures locally;
        external design approval remains open.
  - [x] Check forced colors in Chromium; basic VoiceOver is unavailable in the
        non-interactive test environment and remains a recorded residual risk.
  - [x] Record skipped checks and residual risks for the PR.
- [x] Complete documentation and handoff:
  - [x] Update `docs/studio/theme-system.md` from proposed to implemented values
        and record final contrast evidence.
  - [x] Update the component inventory only when a shared component contract
        changes.
  - [x] Update Studio README, AGENTS, skill, testing, and conventions only where
        runtime or contribution behavior changes.
  - [x] Run preflight before opening a PR against `staging`; the orchestrator
        retains Linear state ownership.

## Verification Evidence

- `bunx --bun shadcn@latest info --json` from `apps/studio`: confirmed Vite,
  Tailwind v4, Base UI, Nova, Lucide, Geist, `src/index.css`, and the unchanged
  installed component set.
- Focused Vitest command for brand, workspace, theme, scheduling, and login:
  6 files and 18 tests passed.
- `bunx playwright test tests/e2e/theme.spec.ts --project=chromium`: 5 tests
  passed, including first-frame theme resolution, system changes,
  browser-computed contrast, forced colors, 320 CSS pixels, and 200%-zoom
  equivalent coverage.
- `bun --filter studio check`: 21 files and 98 tests passed; production build
  and the 31-file production-boundary scan passed.
- `bun --filter studio test:e2e`: 15 Chromium tests passed.
- `bun --filter studio test:e2e:production`: production build and 3 Chromium
  production-boundary journeys passed.
- `bun run check`: all four workspace package checks passed; Studio was executed
  uncached while API, IDP, and site results were replayed from valid Turbo cache.
- Local capture inspection: 1440 × 900 light/dark and 320 × 720 dark passed for
  hierarchy, readable status cues, and absence of gradients on the schedule.
  Basic VoiceOver and external designer approval were not available locally.

## Risks And Follow-Ups

- [ ] Designer annotations may not exactly match the declared OKLCH colors;
      measure computed output instead of trusting comments.
- [ ] A dark-first direction can accidentally become dark-only; keep explicit
      light-theme tests and acceptance captures.
- [ ] Gold can fail as small text on light surfaces; reserve it for appropriate
      backgrounds, borders, focus, icons, and actions with measured contrast.
- [ ] Gradient and glow overuse can reduce dense operational legibility.
- [ ] Global token changes have a wide blast radius; review representative
      primitives and product surfaces before accepting screenshot differences.
- [ ] Theme migration should finish before additional Studio feature initiatives
      expand the number of surfaces that need revalidation.
