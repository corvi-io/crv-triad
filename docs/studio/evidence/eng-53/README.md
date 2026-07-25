# ENG-53 Reporting Evidence

Captured by `apps/studio/tests/e2e/reporting.spec.ts` against the deterministic
local reporting source on 2026-07-24:

- `reports-light-1440.png`: light theme at 1440 by 900 CSS pixels, including
  canonical filters, exact summary, revenue chart, and table equivalent.
- `reports-dark-320.png`: dark theme with reduced motion at 320 by 720 CSS
  pixels after settled data, with no document-level horizontal overflow and
  all visible controls at least 24 by 24 CSS pixels.
- `reports-200-percent-zoom.png`: dark theme at a 640 CSS-pixel viewport with
  document zoom set to 200%, equivalent to 320 CSS pixels of layout pressure;
  the browser check rejects document-level horizontal overflow.

The same browser flow:

- traverses to the period controls by keyboard and verifies a visible focus
  outline;
- runs axe against WCAG 2.0, 2.1, and 2.2 A/AA tags with zero violations;
- inspects the Chromium accessibility snapshot and verifies the report
  headings, chart figures/images, named semantic tables, and customer identity
  limitation;
- emulates forced colors and reduced motion;
- verifies canonical combined filters and reload;
- selects `Hoje`, `Últimos 7 dias`, and `Personalizado`, changes both custom
  dates through their named calendar dialogs, and verifies the canonical
  inclusive URL range;
- verifies explicit unknown-customer and long-label scenarios without document
  overflow;
- verifies loading, empty, fail-next/retry, and persistent-error states.

An actual VoiceOver/NVDA spoken-output session is not automated in this
headless checkout. The accessibility-tree snapshot is feasible screen-reader
semantic evidence, not a claim that a human completed a VoiceOver or NVDA
journey. That manual assistive-technology pass remains a review follow-up.
