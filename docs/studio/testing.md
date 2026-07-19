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

The sandbox e2e test uses the real Studio shell and local repository adapter without intercepting
authentication. Its focused axe scan fails on automatically detectable WCAG 2.0, 2.1, and 2.2
Level A/AA violations. Keyboard coverage opens row actions with `Shift+F10`, operates the menu and
drawer without a pointer, and verifies focus returns to the row. Production preview tests prove both
preview routes redirect and expose no sandbox controls.

When Studio is affected, the develop workflow installs Chromium headless shell and its Linux
dependencies, then the Studio quality gate runs `check`, `test:e2e:sandbox`, and
`test:e2e:production`. CI does not build or publish a separate component documentation artifact.

Manual WCAG 2.2 AA review remains required for complex components: keyboard-only operation and focus return,
VoiceOver basics, 200% zoom, 320 CSS-pixel reflow, reduced motion, visible/unobscured focus, target
size, and light/dark contrast. Record any skipped manual checks and residual risk in the PR.
