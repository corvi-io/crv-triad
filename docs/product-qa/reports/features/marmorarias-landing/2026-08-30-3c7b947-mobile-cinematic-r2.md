# Feature QA Report: Marmorarias — Mobile cinematic and inline calculator

## Run Metadata

| Field | Value |
| --- | --- |
| Date | `2026-08-30` |
| Branch / commit | `feature/configurable-commercial-research-themes` / `3c7b947` |
| Worktree | Dirty; scope limited to the `/marmorarias` mobile story and calculator presentation. |
| Environment | Local Astro `3001`; Cloudflare Pages dev alias. |
| Data safety | Synthetic intercepted lead responses; no shared database or real PII used. |
| Baseline | `2026-08-30-3c7b947-precision-motion.md` |
| Evaluator | Codex |

## Scope

- Make mobile a primary acquisition experience with the complete nine-stage stone narrative.
- Preserve desktop behavior and a static `prefers-reduced-motion` fallback.
- Replace the focused calculator dialog with an inline stateful flow.
- Verify the deployed dev route at `https://dev.crv-site.pages.dev/marmorarias/`.
- Live lead persistence remains outside this run because no isolated PostgreSQL target was available.

## Journeys

| ID | Journey | Result | Evidence |
| --- | --- | --- | --- |
| MC-J1 | Follow all nine mobile story stages with motion enabled | Passed | `mobile-cinematic-01.png` through `mobile-cinematic-09.png`; one active beat per stage; expected five-image sequence |
| MC-J2 | Read the story with reduced motion | Passed | 9 visible beats, 0 `aria-hidden` beats, normal document flow |
| MC-J3 | Open the calculator from the hero | Passed | `mobile-inline-calculator.png`; section lands at viewport top; no modal semantics or body lock |
| MC-J4 | Complete the calculator through failed and accepted synthetic lead responses | Passed | Result hidden before intake and after failure; accepted retry reveals it; 2 lead attempts |
| MC-J5 | Preserve desktop story | Passed | `story-production.png`; one active beat; no horizontal overflow |
| MC-J6 | Submit a real lead and verify PostgreSQL persistence | Blocked | `ENV-MARM-001` remains applicable |

## Findings And Corrections

| ID | Severity | Finding | Correction | Status |
| --- | --- | --- | --- | --- |
| MC-001 | High | Motion-enabled mobile still used the reduced static presentation. | Added a device-specific ScrollTrigger sequence with nine beats, five photographic states and per-stage framing. | Fixed |
| MC-002 | High | Static fallback visibility rules overrode GSAP and visually stacked all story copy. | Removed the forced states from the default fallback and scoped animated visibility to the enhanced story. | Fixed |
| MC-003 | Medium | The measurement close-up clipped the length annotation. | Reframed the mobile measurement line inside the viewport. | Fixed |
| MC-004 | High | Starting the calculator opened a fixed dialog while the document also moved to the section. | Replaced the dialog, inert background, focus trap and body lock with an inline state surface. | Fixed |
| MC-005 | Medium | Combined global and local scroll offsets exposed the previous section above the calculator. | Programmatic launch now lands at the calculator's exact document offset. | Fixed |

## Verification

- `bun --filter site check`: passed; 60 Astro files, no diagnostics.
- `bun test apps/site/tests/margin-loss-estimator.test.ts`: 5 passed, 12 assertions.
- `bun --filter site build`: passed; static `/marmorarias` generated.
- Browser QA: no console errors, failed requests or 390 px horizontal overflow.
- Mobile story: 9/9 labels and visuals matched; enhanced height `6921px` at `390×844`.
- Reduced motion: complete static content; no pinning.
- Deployed dev smoke: HTTP 200, mobile enhancement active, calculator inline at viewport top.
- Impeccable detector: 95 advisory findings, no blocking severity.

## Decision

- Mobile visual and interaction recheck: **approved**.
- Dev demonstration readiness: **ready**.
- Controlled production readiness: **not approved** until the existing real lead persistence gate is executed against an isolated PostgreSQL target.
