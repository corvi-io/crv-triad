# Initiative 22 Corrective QA Findings

Environment: disposable PostgreSQL 16 at loopback 55442, API 8102, Studio 3102.
Synthetic tenants QA A/B with owner/admin/member personas. Normal HTTP source, real Better Auth.

| Finding | Severity / class | Correction and evidence |
| --- | --- | --- |
| Date picker full width overlapped period controls | Medium / product defect | Bounded date wrapper; selected unit/professional labels now visible; confirmed in responsive r2 light/dark screenshots |
| Time option outside the scroll viewport stalled initial automation | Low / test defect | Scroll option into view before selecting; actual availability save succeeded |
| Drawer Client label also matched background filter | Low / test defect | Scope input targeting to active dialog; real appointment create/refresh/confirm passed |
| Production bundle included legacy Dashboard scenario route value | Medium / product defect | Removed fixed scenario value; production boundary passed (95 files); 11 production browser checks passed |
| List month selection would hit seven-day board API limit | High / product defect | Independently bounded catalog/board fetch and server-paginated list; confirmed by focused components and real local HTTP journeys |
| Weekly free-slot buttons ignored private occupancy/availability | High / product defect | Require available occurrence, no negative period and no private occupancy; confirmed by focused components and real local HTTP journeys |
| Offline submission remained indefinitely queued by TanStack Query | High / product defect | Scheduling mutations now attempt the request with `networkMode: always`, producing actionable offline errors while retaining drafts and idempotency keys; confirmed by focused components and real local HTTP journeys |
| Unknown command path mapped to 500 | Medium / product defect | Explicit safe 404 mapping and route test |

Screenshots are retained in ignored `apps/studio/.artifacts/initiative22`. Screenshots captured during
closing transitions are not accepted as final-state evidence and must be recaptured after animation.

Additional confirmed corrections (2026-09-05):

- Professional read-only detail now exposes the real upcoming appointments section; local browser
  screenshot `professional-upcoming.png` inspected.
- Weekly boards retain an eligible professional slot when a different professional has a break;
  nine occupancy/interaction component cases passed.
- DatePicker no longer places unsupported `aria-required` on a button; 320px invalid-form WCAG 2.2
  scan passed with zero violations.
- Primary-button hover contrast and progress theme transitions retain readable colors; focused
  light/dark/system/coarse-pointer browser regression passed 3/3.
- Three stale catalog browser assertions now match the completed Initiative 21 relationship contract;
  validation, incompatible-selection clearing, and retry preservation passed 3/3.
- One-off archive/restore was exercised in the real browser and confirmed after refresh.
- Two-tenant selection with the same user, a stale tab, foreign client history and an old unit URL
  passed against real authentication/API/PostgreSQL. No first-tenant client appeared in the second.
- Forced-color and equivalent 200% reflow screenshots were inspected. The initial CSS-zoom capture
  was discarded as an invalid simulation; the final capture uses half-size CSS viewport dimensions.

Historical checkpoint: the fourth full run passed 530 tests but branch coverage was 74.54%.
That interim gate was subsequently closed by threshold-bearing run 8, recorded below.


Final coverage confirmation: threshold-bearing Studio run 8 passed 69 files / 678 tests with
84.62% statements, 80.13% branches, 83.00% functions and 86.06% lines. The coverage finding is fixed.

Real touch confirmation: recurrence save, create, reschedule and cancel passed with zero page errors.
The first scan caught a 4.25:1 Sonner success-toast contrast defect. The shared component now uses
existing semantic feedback tokens; the confirmation scan returned zero WCAG 2.2 violations.

The expanded adjacent browser batch passed 44/45. The remaining keyboard test sent a second Space
before DnD activation; it now awaits the visible/live activation state and its focused recheck passed.
No runtime keyboard behavior was weakened or bypassed.
