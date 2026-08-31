# ENG-43 Agenda Visual Evidence

This directory contains controlled evidence captured from the development-only
`/workspace-preview/agenda?date=2026-07-22` route at a 1600 × 900 viewport. The
route reconstructs deterministic synthetic fixtures; no production screenshot,
identity, session, token, credential, private header, or network-sourced customer
data is included.

## Visual References

- `before/`: light/dark normal and dense screenshots captured from
  `origin/staging` at `8a13c19eba358bafd5ecef1eea3c9e3a8ae2359c`.
- `after/`: matching light/dark normal and dense screenshots captured after the
  ENG-43 refinement.
- `before/computed-styles.json`: browser-computed status-filled card, focus,
  filter, CTA, grid, and sidebar values before implementation.
- `after/computed-styles-and-contrast.json`: browser-computed neutral surfaces,
  all eight badges/indicators/accessibility names, WCAG contrast ratios, focus,
  filter, CTA, grid, sidebar, reduced-motion, and forced-colors values.

The screenshot comparison is evidence, not a pixel snapshot gate. Stable
contracts are enforced by:

- `tests/unit/brand-theme-contract.test.ts`;
- `tests/unit/workspace-tokens.test.ts`;
- `tests/e2e/theme.spec.ts`;
- `tests/e2e/workspace-preview.spec.ts`;
- `tests/e2e/schedule-prototype.spec.ts`.

The focused schedule suite also exercises mouse and keyboard DnD, Portuguese
announcements, focus restoration, collision rollback, terminal states,
`Remarcar`, coarse-pointer action visibility, 320 CSS pixels, a 200%-zoom
equivalent, sticky/internal scroll, reduced motion, forced colors, and axe.
Real-device touch and VoiceOver/NVDA output remain manual verification items.
