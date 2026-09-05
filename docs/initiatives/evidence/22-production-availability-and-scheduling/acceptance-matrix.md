# Initiative 22 Acceptance Evidence Matrix

This matrix records observed evidence, not deployment approval. The threshold-bearing Studio coverage command and post-correction gates passed; local acceptance is approved.

| Criteria | Evidence | Result |
| --- | --- | --- |
| AC-001 isolation | API route authorization/foreign-ID tests; PostgreSQL tenant FKs; live member/foreign-ID test; same-user tenant-switch script | Passed |
| AC-002 timezone | Nullable additive unit migration, explicit confirmation, domain gap/fold rejection, local migration rehearsal | Passed |
| AC-003 rule authorization/lifecycle | Owner/admin/member API cases; recurring/one-off create, archive/restore PostgreSQL cases; real occurrence restore after refresh | Passed |
| AC-004 bounded recurrence | Date/DST domain tests, 42-date guards, opening-hour clipping, negative precedence, recurring scopes/exclusions and component day/week/month cases | Passed |
| AC-005 canonical booking | Real client/unit/service/professional create; relationship/share-lock validation; immutable snapshots and live HTTP booking | Passed |
| AC-006 races/retries | PostgreSQL overlapping command race and direct exclusion constraint; stable-key replay; live offline recovery and stale version draft/reload | Passed |
| AC-007 lifecycle | API public transition allowlist, future no-show guard, trusted fulfillment seam; real confirm/check-in/cancel; no public arbitrary status command | Passed |
| AC-008 read projections | Bounded range, server-paginated list, private occupancy, archived snapshot names; set-based client next appointment and query plans | Passed |
| AC-009 quick client | Canonical ClientForm and HTTP repository; real child cancel/create preserves parent draft; component failure/retry plus duplicate advisory tests | Passed |
| AC-010 preferences | Pinned option hydration, archived labels, no implicit selection, server eligibility recheck; component and real browser evidence | Passed |
| AC-011 consumers | Query invalidation, real Dashboard/client history/professional upcoming, tenant switch clearing; `lastVisitAt` remains unavailable | Passed |
| AC-012 source | Explicit HTTP default, disabled/source failure presentation, no memory fallback; production build, 95-file artifact scan and 11 browser tests | Passed |
| AC-013 parity | `ui-inventory.md`; shared drawer/fields/table/menu reuse and documented temporal-grid specialization | Passed |
| AC-014 labels/copy | Required field associations/focus, DatePicker ARIA correction, Portuguese safe errors, no synthetic production service fallback | Passed |
| AC-015 layout | Responsive r2 Agenda/availability/Dashboard 320px light/dark; inspected drawer/footer/overflow captures | Passed |
| AC-016 interaction/a11y | Live keyboard focus restoration, WCAG 2.2 scans, forced colors/reduced motion/equivalent 200% reflow; touch-journey real API recheck with zero axe/page errors | Passed |
| AC-017 recovery | Source denial/retry, missing timezone/dependencies, empty/filter-empty, conflicting/stale/network commands, recoverable drafts; component/state tests | Passed |
| AC-018 URLs | Typed allowlists, month-to-list normalization, filtered-out appointment direct link, stale foreign link; route/list pagination and sort tests | Passed |
| AC-019 metadata | Route templates and correlation/actor/entity/version/result/range/timing; sensitive-sentinel tests; no command/search payload logging | Passed |
| AC-020 migration | Empty local install and representative-existing unit rehearsal; repeated migrate, old columns compatible, additive rollback retains data; HTTP source failure smoke | Passed locally |
| AC-021 aggregate gates | API coverage/build passed; Studio production build/browser/boundary passed; complete Studio threshold command and ordinary check passed (678 tests) | Passed |
| AC-022 continuation | Dependency audit, source HEAD, preserved concurrent work, explicit checkpoint and repeated safe resumption; final checkpoint and completion ledger recorded | Passed |
| AC-023 durable docs | API/Studio scheduling guides, README and existing setup/client/Dashboard/testing/deployment/component guides updated; final metrics/status synchronized | Passed |

Primary command logs are under `/tmp/initiative22-*`; local browser and DB artifacts are under
`apps/studio/.artifacts/initiative22` and `apps/api/.artifacts/initiative22`. These are intentionally
ignored, contain only local QA data, and are available in the current workspace. The report records
exact paths and limitations; screenshots are not treated as inspected merely because they exist.
