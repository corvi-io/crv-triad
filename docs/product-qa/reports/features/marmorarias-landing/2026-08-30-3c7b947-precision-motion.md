# Feature QA Report: Marmorarias — Precisão em movimento

## Run Metadata

| Field | Value |
| --- | --- |
| Date | `2026-08-30` |
| Branch / commit | `feature/configurable-commercial-research-themes` / `3c7b947` |
| Worktree | Dirty; this recheck covers the `/marmorarias` visual rebuild and excludes unrelated `apps/web` changes. |
| Environment / ports | Astro dev `3001`; production preview `3101`. |
| Data / database safety | Non-mutating browser recheck. The configured lead path still lacks an isolated local PostgreSQL target, so no real lead was submitted. |
| Baseline | `2026-08-29-3c7b947-dirty.md` |
| Evaluator | Codex |

## Scope And Product Contract

- Intended outcome: replace the rejected industrial-document direction with the approved premium composition B, then make the scroll sequence visibly transform the stone across the order journey.
- Persona: owner or manager of a small or medium custom marble shop.
- Affected apps: `apps/site` and the public lead contract in `apps/api`.
- Trust boundaries: no fictional metrics, no calculator PII in analytics, result released only after accepted lead intake, no shared database mutation.
- Out of scope: production deployment, CRM integration, paid Sprint delivery and live lead persistence.

## Journey Matrix

| ID | Journey | Viewport/input | Result | Evidence |
| --- | --- | --- | --- | --- |
| PM-J1 | Read the hero and follow the nine-stage cause-and-effect order story | 1440×1000, scroll | Passed | `desktop-hero.png`; seven inspected story captures |
| PM-J2 | Read the reduced static sequence | 390×844, reduced motion | Passed | `mobile-story.png`; 9 visible beats; no pinning |
| PM-J3 | Complete the estimator, submit both contact channels and then receive the estimate | 1440×1000, pointer and keyboard | Passed | `calculator-contact-gate.png`; `calculator-contact-validation.png`; `calculator-result.png`; five estimator tests |
| PM-J4 | Recover from a failed lead submission without exposing the estimate | 1440×1000, pointer and keyboard | Passed | Browser assertions: result hidden before intake and after simulated failure; accepted retry reveals it; 10 public intake tests |
| PM-J5 | Submit an empty evaluation form and recover | 1440×1000, keyboard focus | Passed | `form-validation.png` |
| PM-J6 | Submit a valid evaluation and verify persistence | site + API + PostgreSQL | Blocked | `ENV-MARM-001` from baseline remains applicable |

## Screenshot Inspection

| Checkpoint | Artifact | Visual assessment | Result |
| --- | --- | --- | --- |
| Premium first view | `apps/site/.impeccable/review/precision-motion/desktop-hero.png` | Warm architectural field, large proposition, restrained blue and one photoreal stone object; no SaaS or ERP chrome. | Passed |
| Measurement | `story-measurement.png` | Dimension lines belong to the physical object and remain subordinate to the copy. | Passed |
| Material and production | `story-material.png`, `story-production.png` | The object visibly changes from raw slab to separated components instead of receiving only overlays. | Passed |
| Delivery and installed result | `story-delivery.png`, `story-margin.png` | Transport protection and installed island provide distinct, legible end states while preserving material continuity. | Passed |
| Mobile story | `mobile-story.png` | Four concise visual states precede the static nine-step explanation; no horizontal overflow. | Passed |
| Calculator contact gate | `calculator-contact-gate.png`, `mobile-calculator-contact.png` | Name, company, e-mail and WhatsApp are presented as one clear required step on desktop and mobile. | Passed |
| Calculator validation | `calculator-contact-validation.png` | Missing fields and consent receive aligned, associated feedback; the estimate remains hidden. | Passed |
| Calculator result | `calculator-result.png` | Monthly range, annual impact, confidence, investigation point and disclaimer are direct, without redundant contact choices. | Passed |
| Form validation | `form-validation.png` | E-mail and WhatsApp are simultaneously visible, required and associated with their errors. | Passed |

## Findings And Correction Cycles

| ID | Severity | Finding | Correction | Recheck | Status |
| --- | --- | --- | --- | --- | --- |
| PM-001 | Medium | The first scroll build changed copy but relied on one repeated stone render. | Added raw slab, cut components, protected delivery and installed island states; ScrollTrigger now crossfades them by stage. | Five desktop captures and mobile strip inspected. | Fixed |
| PM-002 | Medium | The analytics banner obscured most of the first mobile viewport and used glass/blur effects inconsistent with the approved direction. | Reduced copy and height; removed glass, gradients and decorative glows; kept consent behavior unchanged. | Desktop and mobile hero captures inspected. | Fixed |
| PM-003 | High | Generated alternates returned a baked checkerboard instead of alpha. | Added deterministic background cleanup, optimized WebP output and responsive 960px variants. | All stage captures inspected without visible rectangles. | Fixed |
| PM-004 | High | Static mobile and reduced-motion story beats remained `aria-hidden` after the animated desktop contract was removed. | Moved `aria-hidden` state into the desktop animation lifecycle and remove it during cleanup. | Reduced-motion browser check exposes 9 beats and zero hidden beats. | Fixed |
| PM-005 | High | The calculator exposed its result before capturing a lead and the public contract allowed incomplete contact data. | Added a required contact step before the result; both e-mail and WhatsApp are required in calculator, evaluation form and API. The result is released only after an accepted response. | Browser failure/retry assertions and 10 public intake tests passed. | Fixed |
| PM-006 | Medium | The scroll used detached labels and repeated “Possível desvio” callouts instead of one operational story. | Rewrote it as nine cause-and-effect stages, from approved budget to real margin, and removed the detached deviation component. | Seven stage captures and reduced-motion sequence inspected. | Fixed |
| PM-007 | Medium | The result screen repeated details and asked the visitor to choose e-mail or WhatsApp again after lead capture. | Reduced the screen to monthly range, annual impact, confidence, investigation point, disclaimer and restart action. | `calculator-result.png` inspected. | Fixed |
| PM-008 | High | The evaluation section still offered a WhatsApp-only shortcut before the required form. | Removed the shortcut so every evaluation request captures e-mail and WhatsApp together. | Updated `form-validation.png` inspected. | Fixed |
| ENV-MARM-001 | High | No isolated database target for a real browser persistence assertion. | No shared/remote mutation attempted. | Not available. | Blocked |

## Verification

| Check | Result | Exact observation |
| --- | --- | --- |
| `bun run typecheck` | Passed | 60 Astro files; 0 errors, warnings or hints. |
| `bun test tests/margin-loss-estimator.test.ts` | Passed | 5 tests, 12 assertions. |
| `bun test tests/integration/http/public-lead-routes.test.ts` | Passed | 10 tests, including the requirement for both e-mail and WhatsApp. |
| `bun run build` | Passed | Static `/marmorarias` route and sitemap generated. |
| Real-browser recheck | Passed | No console errors, failed requests or mobile horizontal overflow. |
| Reduced motion | Passed | Normal document flow; 9 story beats visible and zero beats marked `aria-hidden`. |
| Production Lighthouse | Passed | Performance 98; accessibility 100; best practices 100; SEO 100; LCP 2.2s. |
| Impeccable detector | Passed with advisories | 98 advisory findings and no blocking severity. The measurement grid is intentional on the precision stage. |

## Decision

- Visual and interaction recheck: **approved**.
- Demonstration readiness: **ready**.
- Controlled production readiness: **not approved** because the baseline browser-to-API-to-PostgreSQL persistence gate remains blocked by the lack of an isolated database target.
- Next action: use the rebuilt route for design/message review; run the valid lead journey against an isolated PostgreSQL target before release approval.
