# Initiative 26 Delivery Evidence

## Predecessor reconciliation

- Integrated Initiative 25 `3fd7568` in merge commit `459f522` without conflicts.
- `business_profiles` owns identity, primary unit, and logo metadata; logo is not an activation gate.
- Readiness uses the active primary unit/timezone/hours, active professional/user/member, eligible
  service assignments, and a real bounded availability interval.
- IDP imports only its narrow context type; provider implementation is business-owned.
- Agenda/auth were untouched by Initiative 25. Designer source was not copied.

## Automated evidence

- API focused onboarding/invitation/email: 5 files, 58/58 passed after cross-review fixes.
- API check: 45 files, 397 tests passed; API build passed.
- PostgreSQL isolated loopback `idp26_test`, one worker: 9 files, 45 tests passed.
- Studio invitation/activation/Agenda focused unit suites: 39/39 passed.
- Studio check/coverage: 80 files, 804 tests passed; production-boundary verification and build
  passed. Coverage: 84.52% statements, 80.20% branches, 82.66% functions, and 86.22% lines.
- Focused Playwright invitation/Agenda recheck: 25/25 passed with one worker, including axe,
  narrow layout, themes, forced colors, reduced motion, focus, horizontal bounds, and replay.
- Full Playwright sweep: 101/101 passed with four workers. Legacy reporting and notification
  harnesses now mock Initiative 25 `/api/contexts` and `/api/access/summary`; fixture-clock tests are
  deterministic, and the drawer verifies its real 200 ms transition without relying on a racy
  `transitionrun` event.
- Merge coverage gates passed above the repository 80% thresholds.

## Quality and delivery

- Terminal tokens call neither context nor logo provider; context has at most 50 ordered unit names
  and no raw logo key or permanent URL. Logo bytes require a valid POST proof with shared limits;
  email enrichment is separate and capped at 100,000 bytes. Queries are tenant-qualified and the
  readiness window is bounded to 14 days/2,001 series.
- Status/alert/progress semantics, native keyboard actions, 44px primary targets, and reduced-motion
  fallbacks are present. Motion never delays navigation.
- Client analytics remains absent pending consent governance; operational events are low-cardinality
  and exclude invitation/business payloads.
- Aureo's final cross-review approved readiness cardinality, safe logo, fallback, terminal-state,
  unit ordering, and Agenda boundaries with no blockers.
- Deploy API before Studio. Trigger.dev/R2/Resend hml provider validation remains the non-blocking
  Initiative 25 provisioning residual. Manual screen-reader, contextual-email client rendering, and
  hml pending-invitation smoke remain release checks.
