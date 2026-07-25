# ENG-54 Visual And Accessibility Evidence

The committed screenshots were produced by
`tests/e2e/operational-notifications.spec.ts` with synthetic local data.

- `notifications-light-1440.png`: light desktop notification center after one
  item is marked read.
- `notifications-dark-320.png`: dark narrow reflow with 105 unread items and
  the visible `99+` cap.
- `notifications-dark-forced-colors-320.png`: Chromium forced-colors narrow
  evidence with reduced motion.
- `notifications-200-percent-zoom.png`: CSS `zoom: 2` simulation at a 640px
  layout viewport, equivalent to a 320px visible content width.

The same Playwright run verifies exact accessible count, keyboard open/Escape
focus return, 24px notification controls, no document overflow, and axe WCAG
2.2 A/AA with zero violations.

Residual manual evidence: actual VoiceOver or NVDA, native browser 200% zoom,
and physical coarse-pointer review were not executed by the automated run and
must not be inferred from these files.
