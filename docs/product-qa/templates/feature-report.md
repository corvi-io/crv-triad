# Feature QA Report: <initiative or feature>

## Run Metadata

| Field | Value |
| --- | --- |
| Date | `<yyyy-mm-dd>` |
| Branch / commit | `<branch>` / `<sha>` |
| Worktree | `<clean or dirty; relevant scope>` |
| Environment / ports | `<local stack and ports>` |
| Data / database safety | `<synthetic fixtures; isolated target proof>` |
| Initiative | `<PRD and task links>` |
| Baseline | `<previous report or none>` |
| Evaluator | `<agent/person>` |

## Scope And Product Contract

- Intended outcome:
- Personas and tenants:
- Affected apps/modules:
- Adjacent regressions:
- Trust/data boundaries:
- Out of scope:

## Journey Matrix

| ID | Persona/tenant | Journey/state | Apps | Viewport/input | Expected persisted outcome | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Screenshot Inspection

| Checkpoint | Viewport/state | Artifact | Visual assessment | Result |
| --- | --- | --- | --- | --- |

Record alignment, overflow, hierarchy, copy, controls (including selected
values), focus, responsive behavior, and accessibility observations.

## Tenant And Access Matrix

| Actor | Resource tenant | Vector | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- | --- |

## Findings And Correction Cycles

| ID | Type | Severity | App/module | Persona/route | Expected vs observed | Evidence | Fix/owner | Recheck | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Scores

| Dimension | Score | Weight | Evidence/rationale |
| --- | ---: | ---: | --- |
| Product outcome |  | 25% |  |
| Functional reliability and persistence |  | 20% |  |
| UX and visual integrity |  | 15% |  |
| Access, privacy, and tenant isolation |  | 20% |  |
| Accessibility |  | 10% |  |
| Operability and regression protection |  | 10% |  |
| **Weighted total** |  | 100% |  |

## Verification

| Command/manual check | Result | Exact count or observation |
| --- | --- | --- |

- Browser console/network:
- API/persistence evidence:
- Skipped evidence and environment limitations:

## Baseline Comparison And Decision

- Score and coverage change:
- Resolved, new, and regressed findings:
- Decision: `Approved | Approved with reservations | Not approved`
- Demonstration readiness:
- Internal acceptance readiness:
- Controlled production readiness:
- External/production gates:
- Next action:
