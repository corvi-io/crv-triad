# Initiative 22 Product QA — approved for local testing

Decision: **approved**. All acceptance gates passed for the implemented local version. This does not
publish or deploy the application. The API and Studio remain running for local testing.

## Environment and scope

Studio `http://localhost:3102`, API `http://localhost:8102`, PostgreSQL 16 at loopback 55442.
Real Better Auth and HTTP persistence with synthetic QA A/B accounts. The default app ports and
remote database configuration were preserved. Use `qa22-a-owner@example.invalid`; the ignored
credential file is `apps/api/.artifacts/initiative22/credentials.json`. The Agenda has usable QA data
on 2026-09-07. Restart with `bun scripts/scheduling-local-qa.ts` when the stack is stopped.

Initiative 21 was confirmed complete by the user. This work preserves the shared checkout, including
concurrent deployment, profile-image, service-desk and initiative 23/24 changes. Source HEAD:
`685fa22855fd313b5add072f189bd872b058bee9` on `feat/backstage-deployment`.

## Verified journeys

- J01: Configure timezone and weekly availability; create, refresh, confirm and cancel booking — **passed**. Evidence: `apps/studio/tests/live/scheduling.spec.ts; /tmp/initiative22-live-final.log`.
- J02: Quick client creation preserves parent draft and updates history — **passed**. Evidence: `apps/studio/.artifacts/initiative22/quick-create.mjs`.
- J03: Conflict, offline retry with stable idempotency key, stale-version reload — **passed**. Evidence: `apps/studio/.artifacts/initiative22/recovery.mjs`.
- J04: Archive and restore one occurrence; verify after refresh — **passed**. Evidence: `/tmp/initiative22-additional-live.log`.
- J05: Same-user tenant switch, stale tab and old unit URL — **passed**. Evidence: `/tmp/initiative22-tenant-switch.log`.
- J06: Responsive themes, invalid fields, reduced motion and forced colors — **passed**. Evidence: `apps/studio/.artifacts/initiative22; /tmp/initiative22-regression-focused.log`.
- J07: Real touch recurring save, booking creation, rescheduling and cancellation — **passed**. Evidence: `/tmp/initiative22-touch-journey2.log`.

## Verification

- API coverage: **passed**. /tmp/initiative22-api-coverage-latest.log: 89.76 statements / 81.68 branches / 90.22 functions / 91.63 lines.
- API build: **passed**. /tmp/initiative22-api-build-latest.log.
- PostgreSQL integration: **passed**. /tmp/initiative22-postgres-final.log: 4 files / 18 tests.
- Migration rehearsal: **passed**. apps/api/.artifacts/initiative22/migration-rehearsal.json.
- Performance fixture observations: **passed**. apps/api/.artifacts/initiative22/performance.json.
- Studio coverage >=80 all metrics: **passed**. /tmp/initiative22-studio-coverage8.log: threshold-bearing command passed 69 files / 678 tests; 84.62 statements / 80.13 branches / 83.00 functions / 86.06 lines.
- Production browser boundary: **passed**. /tmp/initiative22-production-final-confirmation.log: 11 passed against the final build; /tmp/initiative22-studio-check-final.log: 95-file boundary passed.
- Real HTTP browser: **passed**. /tmp/initiative22-live-latest.log: 2 tests; real API and PostgreSQL.
- Adjacent browser regression: **passed**. /tmp/initiative22-adjacent-final.log: 44 passed; one keyboard activation race corrected and rechecked in /tmp/initiative22-keyboard-final.log (1 passed).
- Real touch lifecycle and accessibility: **passed**. /tmp/initiative22-touch-journey2.log: recurring rule save, create, reschedule, cancel, zero WCAG 2.2 violations and zero page errors.
- Final Studio aggregate check: **passed**. /tmp/initiative22-studio-check-final.log: Biome, types, 69 files / 678 tests, production build and 95-file boundary passed.

## Corrective review and visual inspection

The screenshots listed in `product-qa.json` were opened and inspected, including responsive forms,
forced colors, equivalent 200% reflow, professional upcoming appointments, a foreign-unit link after
tenant switching, restored availability and the final touch-rescheduled list. The corrected reflow
capture replaces a discarded CSS-zoom simulation. The one Impeccable detector run returned no findings.

Corrections cover offline queueing/draft recovery, timezone/month bounds, private occupancy, another
professional's negative interval, missing professional read-only history, stale reload, unsupported
ARIA, hover/theme contrast, archived service snapshot labels and transient success-toast contrast.
The final touch WCAG 2.2 scan has zero violations and zero page errors. `qa-findings.md` retains the
before/correction/recheck record. No unresolved product defect remains within Initiative 22 scope.

The expanded adjacent browser batch passed 44 cases. Its remaining keyboard case now waits for the
DnD activation announcement before sending a second Space; the focused recheck passed. All 678 unit
and component tests passed in both coverage and the final ordinary Studio check.

## Scores and limitations

Product outcome 9, functional reliability/persistence 9, UX 9, access/privacy/isolation 9,
accessibility 9, operability/regression protection 9; weighted total **9.0/10**.

This is local acceptance with synthetic data. Touch uses Playwright mobile/touch emulation against
the real stack; no physical-device or manual screen-reader certification is claimed. Performance fixtures (10k rows and 1k recurring rules)
prove observed query plans and bounded execution, not production capacity. No deployment, publication,
remote migration or destructive rollback was performed. PostgreSQL-only coverage is not the API's
unit coverage metric. Queue/fulfillment transitions remain owned by Initiative 23.

See `acceptance-matrix.md` for AC-001–AC-023, `ui-inventory.md` for Client parity and the execution plan
for the completed task ledger and restart/checkpoint instructions.
