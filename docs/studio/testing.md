# Studio Testing

Use Vitest for unit/component tests:

```bash
bun --filter studio test
```

The unit suite includes focused component behavior, architecture-boundary, and exhaustive textual
inventory checks. Verify that the development engine, Faker, seeds, controls, and obsolete catalog
sources are absent from the production output:

```bash
bun --filter studio test:production-boundary
```

Use Playwright only when e2e coverage is intentionally added:

```bash
bun --filter studio test:e2e
bun --filter studio test:e2e:sandbox
bun --filter studio test:e2e:production
```

`tests/e2e/auth-lifecycle.spec.ts` covers the public auth route shell, route-entry focus, 320
CSS-pixel reflow, reduced motion, focused axe scans, forgot/reset request composition,
duplicate-submit protection, and the Google-only last-method guard. It fulfills cross-origin Better
Auth requests with local synthetic responses and must never call Google, Resend, a deployed IDP, or
live credentials. Unit coverage remains authoritative for every thin client payload and safe error
category.

`tests/e2e/schedule-prototype.spec.ts` exercises the module through the development-only schedule
preview without intercepting Better Auth. It covers view, create, reschedule, cancel, URL scenarios
and filters, conflict recovery, all eight neutral card/status contracts, compact/medium/full
geometry, hover/focus/drag/drop computed styles, browser contrast, light/dark/system, forced colors,
320 CSS-pixel and 200%-zoom-equivalent reflow, coarse pointer, sticky axes, current-time
date/range/position/horizontal bounds, reduced motion, focus return, long content, horizontal
density, and a focused axe scan. The authenticated `/agenda` route
continues to use the real IDP boundary; the preview is local QA tooling and redirects in production.

`tests/e2e/barbershop-setup.spec.ts` covers the authenticated setup module: direct entry, normal
sidebar navigation, collapsed and mobile active states, stable section URLs, absence of preview
chrome, guided overview, fill-height catalogs, session-memory create/reload, structured opening
hours, observable drawer entry/exit with reduced-motion suppression and focus restoration, scalar
and relationship first-invalid focus, one-shot mutation recovery, atomic recurring availability
failure/retry, series-scoped editing, safe recurring deletion, pointer-drag and keyboard block
creation, dated day/week/month navigation, bounded projection, single-occurrence exceptions,
overflow-aware catalog scrollbars with body-only scrolling, linked-service archive blocking,
service-unit eligibility, Portuguese numeric errors, persistent load failure, axe, 320 CSS-pixel
calendar reflow and keyboard focus, and dark mode.
Production coverage proves the removed setup preview route is inaccessible, the normal route
resolves a disabled source, and the artifact scan rejects adapter, fixture, scenario, and
dense-record markers.

`tests/e2e/client-management.spec.ts` covers authenticated expanded, collapsed, and mobile
navigation; safe URL state; empty and dense lists; bounded overflow; keyboard row actions; exact
duplicate inspection without merge; create/edit/archive/restore and note CRUD; validation and
first-invalid focus; full-reload reset; drawer focus return; axe; dark theme; reduced motion; and
320 CSS-pixel reflow. Focused Vitest verifies bounds, normalized duplicates, mutation behavior,
one-shot rollback/retry, persistent failure, deterministic reset, and delayed-operation isolation.
Production-boundary tests reject the client memory source and representative scenario markers.

`tests/e2e/dashboard.spec.ts` covers the authenticated operational Dashboard hierarchy at
1600 × 900, shared compact filter menus, KPI semantic icons and bounded prior-period comparisons,
five populated upcoming rows, seven operational flow tiles, workspace navigation order, bounded URL
filters, invalid-professional URL normalization, safe drill-down
destinations, existing appointment-drawer reuse, Dashboard-to-Agenda session-memory coherence,
full-reload reset, delay/error/empty scenarios, historical current-state unavailability,
light/dark/system, reduced motion, forced colors, computed progress track/indicator contrast,
visible focus, 24px targets, medium/tablet/320-CSS-pixel reflow, page overflow, and axe. Focused
Vitest covers URL allowlists and bounds, every accepted projection formula, zero denominators,
collection caps, interleaved-professional conflicts, unsupported values, invalid professionals,
shared repository identity, presentation actions, and loading/error/empty/disabled states.
Production coverage proves `/overview` fails closed when scheduling is disabled. Actual browser
200% zoom, VoiceOver/NVDA, and physical touch-device review remain manual. Focused unit coverage
also proves comparison bounds/formulas/unavailable baselines and current/prior scheduling-scenario
coherence in one repository read. The repository regression then reads the prior day with Agenda
semantics, both from the same instance and a fresh instance with the same injected anchor, and
requires identical counts and appointment IDs.

`tests/e2e/service-desk.spec.ts` covers authenticated expanded navigation, scheduled
Agenda-to-queue-to-called-to-in-service coherence, the equivalent walk-in journey with explicit
first-available assignment, drawer validation and first-invalid focus, PII-safe URL behavior, exact
filtered counts, deterministic loading/empty/error states, full Card and shared feedback anatomy,
1600x900 and 320-CSS-pixel screenshots, dark/system, reduced motion, forced colors, focus return,
24px targets, and focused axe WCAG 2.2 A/AA. Focused Vitest covers transition allowlists, scheduled
projection without appointment copies, start-inclusive/end-exclusive time bounds, wait formatting,
filter/count equivalence, URL allowlists, every form bound, shared scheduling transition identity,
walk-in isolation, unavailable-professional recovery, one-shot failure/reset, and persistent error.
Production coverage proves the authenticated route resolves disabled and the built artifact excludes
the adapter, scenarios, and representative synthetic queue markers.

`tests/e2e/theme.spec.ts` verifies stored light/dark and live system preference behavior, records
the resolved class at the first animation frame, measures browser-computed contrast for core
semantic pairs, all four feedback roles, focus, input boundaries, and all eight schedule roles in
both themes, and checks schedule labels plus boundaries under forced colors.

The sandbox e2e test uses the real Studio shell and local repository adapter without intercepting
authentication. Its focused axe scan fails on automatically detectable WCAG 2.0, 2.1, and 2.2
Level A/AA violations. Keyboard coverage opens row actions with `Shift+F10`, operates the menu and
drawer without a pointer, and verifies focus returns to the row. Production preview tests prove both
preview routes redirect and expose no sandbox controls.

When Studio is affected, the develop workflow installs Chromium headless shell and its Linux
dependencies, then the Studio quality gate runs `check`, `test:e2e:sandbox`, and
`test:e2e:production`. CI does not build or publish a separate component documentation artifact.

Manual WCAG 2.2 AA review remains required for complex components: keyboard-only operation and
focus return, VoiceOver basics, real browser 200% zoom, 320 CSS-pixel reflow, reduced motion,
visible/unobscured focus, target size, and visual light/dark review. Record any skipped manual
checks and residual risk in the PR; headless forced-colors and computed-contrast coverage do not
replace assistive-technology review.
