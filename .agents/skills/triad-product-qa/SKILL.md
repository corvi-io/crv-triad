---
name: triad-product-qa
description: Execute corrective, evidence-backed CRV product QA through real local browser journeys spanning frontend, API, and PostgreSQL. Use for feature or full-product acceptance, end-to-end validation, product-owner critique, visual screenshot review, tenant-isolation checks, and rechecking prior QA findings.
---

# CRV Triad Product QA

Validate the product as a critical product owner using the real browser-facing
system. Exercise the frontend, API, and local PostgreSQL persistence together;
mocked frontend responses do not prove an end-to-end journey.

Write the user-facing handoff in Brazilian Portuguese. Keep report filenames,
keys, commands, and technical documentation in English.

## Read The Contract

Before execution, read:

1. root and scoped `AGENTS.md` files;
2. `docs/product-qa/README.md` and `docs/product-qa/protocol.md`;
3. every applicable contract under `docs/product-qa/contracts/`;
4. the related PRD, task plan, durable app docs, routes, permissions, and tests;
5. the latest same-scope report, when one exists.

Use `triad-architecture` for ownership, `triad-testing` for automated-test levels,
and the applicable app development skill. For rendered frontend evaluation,
use `impeccable` audit guidance, `ux-heuristics`, and `accessibility`; use
`impeccable` polish guidance only after fixes are authorized.

## Modes

- **Feature:** test the changed feature, affected apps/modules, adjacent
  regressions, all changed personas, and applicable risk states.
- **Full:** test every active contract and every critical cross-app journey.
- **Recheck:** reproduce named findings first, then rerun every journey and
  downstream state that the fix could affect.

There is no visual-only or smoke substitute for these modes. If the integrated
local stack cannot run, report missing end-to-end evidence and do not approve.

## Execute And Correct

1. Record branch, commit, worktree, environment, local data mode, personas,
   tenant fixtures, scope, baseline, and limitations. Never print real `.env`
   values, credentials, tokens, PII, private headers, or protected payloads.
2. Start or connect only to the authorized local stack. Confirm the browser is
   using the real API and that mutations reach an isolated local PostgreSQL
   database. Never reset or mutate shared or production data.
   When running in Maestri, run `maestri list` and prefer a connected Portal for
   live navigation and visual judgment. Outside Maestri, use the available
   controllable local browser; Portal availability is not itself a readiness
   gate.
3. Build a risk-based journey matrix before navigating. Include happy paths,
   recovery, edge cases, authorization, tenant isolation, responsive states,
   accessibility, and persistence verification required by the protocol.
4. Navigate through the visible UI as each real persona. Use the Maestri Portal
   accessibility snapshot for semantic targeting and its screenshot capability
   for rendered evidence when available; use Playwright for reproducible
   regression coverage. Do not bypass the UI
   to manufacture a passing journey, except for documented synthetic fixture
   setup that is not itself under test.
5. Capture and inspect screenshots at every required checkpoint. Open each
   screenshot and judge the rendered pixels; DOM assertions, snapshots, and a
   successful build are not visual evidence.
6. Verify the outcome through the UI after refresh or a new session and, when
   safe and necessary, through aggregate API/database evidence. A toast or HTTP
   status alone is not proof.
7. Run focused automated checks before broad app checks. Record exact counts,
   failures, retries, skips, console errors, failed requests, and artifact paths.
8. Classify and preserve every finding before editing. Because this workflow
   authorizes corrections, fix verified in-scope defects in severity-ordered
   batches, then rerun affected and adjacent journeys with new evidence.
9. Stop only when readiness gates pass or progress is genuinely blocked. Do not
   loop on cosmetic taste: batch visual fixes and allow at most one confirmation
   pass per batch. If the same blocking condition survives three total attempts,
   or needs unavailable authority/service/credentials, report it as blocked.
10. Save immutable matching Markdown and JSON reports. Heavy browser artifacts
    stay in ignored local directories; reports may reference safe paths.

## Mandatory Product Judgment

Inspect complete flows, not isolated screens. Be especially critical of visual
alignment, clipping, overflow, stacking, spacing, hierarchy, readable copy,
loading and empty states, error recovery, focus, touch targets, responsive
behavior, and design-system consistency. Exercise native controls and composite
widgets: a selected value must remain visible in its select/combobox trigger,
labels must not overlap values, menus must fit the viewport, and keyboard and
screen-reader state must match the visible state.

For multi-tenant behavior, prove both allowed access and denied cross-tenant
access. Attempt direct URLs, stale tabs, identifiers belonging to another
tenant, searches, exports, and mutation endpoints where applicable. Never place
another tenant's sensitive fixture content in the report.

## Handoff

State report paths, decision, score, blocking/high findings, fixed findings,
tenant-isolation result, screenshot coverage, exact verification, baseline
change, unresolved limitations, and the next authorized action. Do not claim
approval when a critical journey, screenshot inspection, real persistence path,
or tenant boundary lacks evidence.
