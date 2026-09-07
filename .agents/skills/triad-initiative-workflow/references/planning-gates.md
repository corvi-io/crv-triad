# Initiative Planning Gates

Use these gates to turn an idea into an executable contract without forcing
irrelevant work. Every standards row must be classified; only applicable rows
need detailed design and evidence.

## Project Standards Applicability Matrix

For each concern, record `Applicable`, `Not applicable`, or `Deferred` and a
short rationale. A deferred concern must have an owner or follow-up condition.

| Concern | Required review when applicable |
| --- | --- |
| Product workflow | Actors, trigger, main journey, alternate journeys, business rules, failure and recovery behavior |
| Architecture | Owning app/module, cross-boundary contracts, prohibited coupling, durable documentation impact |
| API | Routes/contracts, validation, errors, auth, pagination/query bounds, idempotency, rate limits, OpenAPI |
| Identity and authorization | Session impact, roles/permissions, invitation rules, tenant isolation, business rules kept outside IDP |
| Persistence | Schema, IDs, constraints, indexes, transactions, concurrency, migration, backfill, rollback, retention |
| Studio UI | Information architecture, component patterns, forms, states, responsive behavior, theme, Portuguese UX copy |
| Site UI | Static-first behavior, forms, campaign links, public env safety, analytics privacy, Portuguese UX copy |
| Accessibility | Keyboard and focus flow, semantic structure, accessible names, announcements, contrast, reduced motion |
| Performance and scale | Expected growth, hot paths, payload/query bounds, N+1, caching, concurrency, external limits, million-record behavior |
| Security and privacy | Threats, abuse/spam, PII/secrets, input/output exposure, audit needs, data not to log |
| Observability | Structured events, metrics, traces, alerts, correlation, operational diagnosis |
| Reliability and delivery | Timeouts/retries, partial failure, compatibility, feature flags, rollout, rollback, provider/deployment requirements |
| Testing and QA | Unit/integration/E2E boundaries, access-policy tests, browsers/viewports/roles, regression coverage, manual journeys |
| Documentation | README, durable docs, AGENTS, skills, env schema, operational/runbook changes |

Route applicable concerns through the relevant Triad and framework skills; do
not copy their complete rules into the initiative documents.

## Definition of Ready

An initiative is ready for implementation only when:

- the current state, target users/actors, problem, desired outcome, goals, and
  non-goals are explicit;
- repository evidence and linked source material support important current-state
  claims;
- requirements and acceptance criteria have stable IDs and observable wording;
- assumptions are labeled, blocking questions are resolved, and non-blocking
  questions have a resolution path;
- at least one credible alternative and the cost of doing nothing were assessed;
- the recommendation and affected product boundaries are explicit;
- every standards-matrix concern is classified with rationale;
- security, privacy, accessibility, performance/scale, observability, data, and
  delivery implications are designed when applicable;
- success signals and regression guardrails are defined or their absence is
  explicitly justified;
- rollout, compatibility, migration/backfill, and rollback are addressed when
  runtime behavior or persisted data changes;
- every acceptance criterion has planned implementation and verification
  coverage;
- the execution plan is ordered by dependencies, uses concrete tasks, and
  contains no unresolved design work disguised as implementation.

If a criterion cannot be satisfied yet, mark the initiative `Draft` or
`Blocked`; do not weaken or silently omit the gate.

Passing Definition of Ready means the initiative can be submitted for approval;
it does not authorize implementation. Approval must be an explicit user decision
recorded after the approval handoff.

## Approval Gate

- `Draft`: analysis or specification is incomplete.
- `Awaiting approval`: Definition of Ready passes and the decision brief has been
  presented to the user.
- `Changes requested`: the user requested revision; update both documents and
  present a new handoff.
- `Approved`: the user explicitly authorized this version for implementation.
- `Rejected`: the user declined this initiative; do not implement it.

Material scope, architecture, risk, or acceptance-criteria changes invalidate the
previous approval. Return the initiative to `Awaiting approval` after revising and
revalidating it. Editorial corrections that do not change the contract do not
require reapproval.

## Traceability

Use stable IDs:

- `REQ-###` for functional and non-functional requirements;
- `AC-###` for acceptance criteria;
- `TASK-###` for execution tasks.

The execution plan must map tasks to requirement/acceptance IDs and verification
evidence. Keep the mapping concise; a requirement may map to several tasks and a
task may cover several related requirements.

## Definition of Done

An initiative is done only when:

- the currently implemented version of the initiative was explicitly approved;
- all in-scope acceptance criteria have evidence and all planned checks pass;
- relevant automated tests, type checks, lint/checks, and builds pass;
- applicable accessibility, responsive, role, tenant, failure-state, and browser
  journeys have been exercised;
- migrations/backfills and rollback paths are validated when applicable;
- observability needed to operate the behavior exists without prohibited data;
- rollout/configuration/env requirements are documented and verified;
- documentation affected by runtime behavior or conventions is updated, or the
  no-update decision is recorded with rationale;
- deviations from the PRD, skipped checks, residual risks, and follow-ups are
  recorded with an owner or destination;
- the final evidence can be reviewed without relying on an unsupported claim.
