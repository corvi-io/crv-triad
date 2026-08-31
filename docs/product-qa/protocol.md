# Product QA Protocol

## 1. Establish The Run

Record mode, branch, commit, dirty-worktree scope, date, evaluator, environment,
local ports, data mode, database safety, personas, tenants, scope, limitations,
and comparison baseline. Read applicable product, architecture, route,
permission, and test contracts. Never infer acceptance from implementation or
test names.

Prove that the run targets local or disposable infrastructure before writing.
The CRV Triad default ports remain API `8000`, studio `3000`, and site `3001`; isolated
test ports are allowed when recorded and must not attach to an unrelated server.

## 2. Build A Risk-Based Journey Matrix

For every journey, record persona, tenant, preconditions, starting route, intent,
expected persisted outcome, affected apps, viewport/input, and evidence points.
Select applicable states from:

- happy path, empty, loading, slow, error, retry, offline/dependency failure;
- invalid, missing, boundary, duplicate, long, and unusual input;
- cancel, undo, correction, interruption, refresh, back/forward, and deep link;
- session expiry, stale cache/tab/version, concurrency, idempotency, and partial
  success or rollback;
- unauthenticated, forbidden role, inactive user, invalid invitation, and direct
  API or URL access;
- cross-tenant read/write attempts, foreign identifiers, searches, lists,
  counts, exports, files, notifications, caches, and browser history;
- desktop, narrow mobile, 200% zoom, keyboard-only, reduced motion, and basic
  screen-reader use.

Mark inapplicable states with a reason. Untested applicable states remain missing
evidence; they do not silently pass.

## 3. Prepare Safe Real-System Data

Use synthetic personas and at least two tenants whenever tenant isolation is in
scope. Fixtures must make leakage detectable without containing real customer
or employee data. Seed through an owned fixture mechanism or normal setup flow;
do not bypass the behavior under test. Never reset a database unless the user
has explicitly authorized that exact local/disposable target.

Record identifiers only when synthetic and safe. Prefer aggregate verification
(`count`, existence, ownership) over dumping rows or payloads.

## 4. Execute Through The Browser

Use Playwright for repeatable navigation and assertions, plus direct screenshot
inspection for product judgment. When running in Maestri, first run `maestri
list` and prefer a connected Portal: use its accessibility snapshot to target
and inspect controls, its browser logs during the journey, and its screenshots
for live product judgment. Preserve the Portal for corrective rechecks unless
the user asks to close it. Outside Maestri, use the available controllable local
browser; lack of a Portal alone is not a failed gate. The browser must call the
real local API, and the API must use the authorized local PostgreSQL database.

For each journey:

1. Begin from the documented persona, tenant, route, and state.
2. Perform actions through visible controls as a user would.
3. Check URL/history, browser console, failed requests, focus, accessible names,
   and visible feedback during the flow.
4. Assert outcome state rather than trusting a toast or status code.
5. Refresh, revisit, or start a new session to prove persistence when expected.
6. Use safe API/database evidence only to confirm the browser-observed result.

## 5. Capture And Inspect Rendered Evidence

Capture screenshots at the initial state, every material transition, and final
state, including applicable loading, empty, error, success, disabled, menu,
dialog, validation, and permission states. Capture representative desktop and
mobile widths; add intermediate widths when layout behavior changes there.

Open and inspect every required screenshot. Check at minimum:

- alignment, spacing rhythm, hierarchy, density, wrapping, truncation, clipping,
  overlap, z-index, overflow, layout shift, and viewport fit;
- typography, contrast, icons, imagery, selected/current states, focus visibility,
  disabled/loading affordances, and consistency with neighboring patterns;
- forms and composite controls: label/value separation, visible selected value,
  placeholder replacement, option check state, menu positioning, validation,
  preserved input, and duplicate-submit prevention;
- Brazilian Portuguese copy clarity, terminology, capitalization, punctuation,
  error recovery, and absence of raw technical/provider messages;
- mobile touch targets, keyboard order, zoom, reduced motion, and content with
  realistic long or missing values.

Rendered defects count even when DOM assertions pass. Preserve the existing
visual direction; QA fixes must not conceal a redesign.

## 6. Prove Access And Tenant Isolation

For each sensitive resource, test the allowed persona and at least one denied
persona. When multi-tenancy exists, create distinguishable synthetic tenant A
and tenant B data and attempt cross-tenant access through UI navigation, direct
URLs, identifiers, API calls initiated by the client, lists/search/counts,
mutations, files/exports, notifications, caches, and stale tabs.

Require deny-by-default behavior and verify that responses, rendered messages,
redirects, logs, analytics, and browser storage reveal no foreign data or
sensitive implementation detail. A hidden navigation item is not authorization.

## 7. Automated Verification

Run focused checks first, then the relevant app `check`, build, and Playwright
suite. Full-product QA runs all applicable app checks after focused diagnosis.
Follow `crv-testing`; do not duplicate unit assertions in E2E tests. Record exact
counts, skips, retries, console errors, failed network requests, and commands.

## 8. Findings, Corrections, And Rechecks

Classify findings as `product_defect`, `test_defect`, `environment_limitation`,
`documentation_gap`, or `accepted_deferral`, with severity:

- **Blocker:** unsafe release, inaccessible critical journey, unauthorized
  access, tenant leakage, data loss/corruption, or no viable recovery.
- **High:** material outcome failure, misleading success, privacy/accessibility
  barrier, persistent visual breakage of a core task, or frequent dead end.
- **Medium:** meaningful friction, inconsistent state, responsive regression,
  or incomplete non-critical recovery.
- **Low:** minor polish or copy issue without outcome risk.

Record the original evidence before editing. Fix authorized in-scope defects in
severity-ordered batches, add or improve durable automated coverage where the
regression warrants it, and rerun affected plus adjacent journeys. Capture new
screenshots rather than replacing old evidence.

Stop when all readiness gates pass. Batch visual corrections and use at most one
visual confirmation pass per batch. If the same blocker survives three total
attempts, or progress requires unavailable authority, service, credentials, or
unsafe data mutation, stop and report the run as blocked.

## 9. Scoring And Readiness

Score observed evidence from 0 to 10:

| Dimension | Weight |
| --- | ---: |
| Product outcome | 25% |
| Functional reliability and persistence | 20% |
| UX and visual integrity | 15% |
| Access, privacy, and tenant isolation | 20% |
| Accessibility | 10% |
| Operability and regression protection | 10% |

Use `null` only when genuinely inapplicable and redistribute its weight
proportionally. Missing evidence never raises a score. Round the total to one
decimal. Scores cannot override mandatory gates.

- **Approved:** no blocker/high finding, score at least 9.0, every critical
  journey passed, required screenshots inspected, and real persistence and
  tenant boundaries proved where applicable.
- **Approved with reservations:** no blocker, every critical journey passed,
  score at least 8.0, and each remaining high has explicit accepted ownership
  and plan. Security, privacy, tenant, data-integrity, and accessibility barriers
  cannot be accepted by implication.
- **Not approved:** any blocker, unaccepted high, score below 8.0, failed
  critical journey, or missing critical browser/persistence/tenant evidence.

Report demonstration, internal acceptance, controlled production, and external
integration readiness separately.

## 10. Save And Compare

Create immutable matching Markdown and JSON reports from the templates and
schema. Compare with the latest same-scope report. If rechecking the same commit,
append `-r2`, `-r3`, and so on. Heavy or sensitive artifacts stay outside Git.
