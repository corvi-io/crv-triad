# 27 Typed Report Catalog And Email Delivery

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: In progress
- Owner: Product and Engineering
- Last updated: 2026-09-06
- Approved by/date: Product owner / 2026-09-06

## Summary

Replace the ambiguous generic export control in Studio with a catalog of six named, decision-oriented barbershop reports. A card opens a two-step flow: report-specific configuration, then a clear confirmation. Confirming creates a durable request, processes it asynchronously with Trigger.dev, stores the private artifact in Cloudflare R2, and emails the authenticated requester a short-lived secure download link.

The normal local development path must use real Trigger.dev development runs and a real R2 development bucket. Test doubles remain allowed only in automated tests or an explicitly selected test harness; the product must never present a fake local run as a successful real delivery.

## Context

- Current state: Initiative 25 provides on-screen management aggregates, a generic PDF/CSV export request, request/attempt/artifact persistence, Trigger and local fake dispatch adapters, private artifact storage adapters, and export history.
- Problem: the current interface does not tell a barber which question a report answers, what data it contains, or how to configure it. A generic snapshot is technically exportable but has weak product meaning.
- Why now: the underlying reporting lifecycle exists, and product feedback has identified the missing report-selection experience and real local provider validation.
- Related docs/issues: `docs/initiatives/discovery/barbershop-management-reports.md`; Initiatives 24, 25, and 26.
- Repository evidence: reporting code lives under `apps/api/src/modules/reporting` and `apps/studio/src/modules/reporting`; deployment inputs are declared in `env-schema.yaml` and values belong in Infisical.

## Actors And Workflows

- Primary actors: authenticated barbershop owner or authorized manager; support/operator access remains outside this workflow.
- Current workflow: choose filters on a generic analytics page, choose PDF/CSV, and request a generic management report.
- Target workflow: browse named report cards, select one, configure only relevant filters and format, review a confirmation summary and masked destination email, confirm once, track progress in history, then receive an email with a secure download link.
- Alternate/failure/recovery flows: validation errors stay on step one; duplicate confirmation returns the same durable request; processing, storage, and email failures expose distinct recoverable states; expired artifacts can be regenerated from a new immutable request; unavailable real local providers fail explicitly.

## Goals

- Make every offered report understandable before generation.
- Deliver trustworthy report-specific PDF/CSV artifacts asynchronously and privately.
- Make the full Trigger.dev, R2, and email path testable in the normal local environment.
- Preserve tenant isolation, bounded queries, idempotency, accessibility, and operational evidence.

## Non-Goals

- A free-form report builder, scheduled recurring reports, arbitrary email recipients, or email attachments.
- “Active clients”, SLA, capacity/utilization, inventory, tax, or accounting reports until their business definitions and source data are approved.
- Replacing the interactive on-screen analytics with downloadable documents.
- Public R2 objects or permanent object URLs.

## Requirements

### Functional

- REQ-001: Studio shall show a persistent catalog of six cards: “Vendas e faturamento”, “Desempenho por profissional”, “Comissões por profissional”, “Clientes novos e recorrentes”, “Cancelamentos e ausências”, and “Caixa e formas de pagamento”. Each card shall state the decision it supports and its principal contents.
- REQ-002: The catalog shall remain visible when the selected period has no operational data; data emptiness shall not be confused with feature availability.
- REQ-003: Selecting a card shall open an accessible two-step dialog: “Configurar” and “Confirmar”. Step one contains only filters applicable to that report plus PDF/CSV format; returning from confirmation shall preserve the configuration draft.
- REQ-004: Report filters shall be: sales/revenue—period, unit, professional, service, payment method; professional performance—period, unit, professional, service; commissions—period, unit, professional; new/returning clients—period, unit, professional, service; cancellations/no-shows—period, unit, professional, service; cash/payments—period, unit, payment method.
- REQ-005: Step two shall summarize the report, period, filters, format, 30-day retention, and masked verified account email. The destination is not editable in V1.
- REQ-006: Closing or canceling before submission shall dismiss the dialog without a destructive confirmation. While submission is in flight, duplicate submission shall be prevented and the UI shall expose an honest pending/error outcome.
- REQ-007: A request shall persist an immutable, tenant-qualified snapshot containing typed report identifier, normalized filters, format, requester identity, destination-email identity reference, and idempotency key.
- REQ-008: Confirmation shall dispatch a schema-validated Trigger.dev task with global idempotency and tenant-scoped concurrency. Replayed API calls or worker retries shall not create duplicate requests, artifacts, or emails.
- REQ-009: Each report type shall have an explicit column/section definition shared by its PDF and CSV renderers. Labels and explanatory copy are Brazilian Portuguese; technical identifiers remain English.
- REQ-010: Generated artifacts shall be private R2 objects with content type, integrity/HEAD verification, tenant/request namespacing, 30-day retention metadata, and idempotent cleanup. Download access shall use an authenticated API grant or short-lived signed URL and never expose storage credentials or a durable public URL.
- REQ-011: After the artifact is ready, the reporting module shall send the authenticated requester an email containing report name, filter summary, expiry, and a short-lived secure download link. Reporting owns the use case and template; IDP supplies only the narrow verified account-email fact.
- REQ-012: Generation status and email-delivery status shall be modeled separately. Retrying email delivery shall reuse the ready artifact; retrying generation shall not duplicate a previously verified artifact.
- REQ-013: Studio history shall expose queued, running, ready, generation failed, delivery pending, delivered, delivery failed, and expired outcomes with safe retry/download actions appropriate to each state.
- REQ-014: Existing reporting capabilities shall authorize listing, requesting, retrying, and downloading. Requests may target only the authenticated active tenant and the requester’s verified account email.
- REQ-015: Local development shall use a dedicated real Trigger.dev development environment, private R2 development bucket, and configured email sandbox/approved recipient path. `bun dev` or a documented companion command shall start/register the Trigger task. Missing provider configuration shall fail explicitly.
- REQ-016: Provider values shall be declared in `env-schema.yaml`, stored in Infisical `dev`/`hml`/`prd`, and mapped to runtime-shaped `apps/api/.env`; secrets shall never reach Studio or the repository.
- REQ-017: The implementation shall preserve the existing 366-day maximum period and enforce bounded, tenant-qualified aggregation queries.
- REQ-018: The full request-to-email lifecycle shall emit privacy-safe structured events, correlation identifiers, durations, retry counts, and terminal outcomes.

### Non-Functional

- REQ-019: Dialog, cards, history, loading, empty, error, and success states shall be keyboard accessible, screen-reader understandable, usable at 320px and 200% zoom, respect reduced-motion preferences, and remain valid in light/dark themes. Status polling shall run only while the document is visible and the browser is online.
- REQ-020: Large report generation shall page or stream source rows and artifact output where practical, avoid loading unbounded tenant history in the browser, and honor provider size/rate limits.
- REQ-021: Trigger.dev SDK/build/CLI versions shall remain aligned, native dependencies such as `sharp` shall be configured for Trigger builds, and the dependency security gate shall pass before staging.

## Report Definitions

| Report | Core measures | Primary question |
| --- | --- | --- |
| Vendas e faturamento | completed services, gross/net revenue, refunds, average ticket, period comparison | How much did the shop sell and retain? |
| Desempenho por profissional | completed appointments, service revenue, average ticket, cancellations/no-shows | How is each professional performing operationally? |
| Comissões por profissional | immutable commission facts, reversals, net commission, shop share | What is owed and why? |
| Clientes novos e recorrentes | new clients, returning clients, unique served clients, recurrence mix | Is the client base growing and returning? |
| Cancelamentos e ausências | cancellations, no-shows, rates over scheduled outcomes, affected value when derivable | Where is schedule loss occurring? |
| Caixa e formas de pagamento | receipts, reversals, net collected, totals by payment method | How did money enter and leave the cash operation? |

Every metric must have a durable formula and denominator documented beside its query tests. “Professional performance” does not imply productivity, retention, or utilization until those source contracts exist.

## Brainstorm

### Problem Framing

- We are solving report discoverability and decision usefulness, not merely file export.
- Owners and managers need recognizable business questions, while workers need immutable inputs and deterministic output.
- The improved workflow reduces uncertainty about what will be generated and where it will be delivered.

### Gaps And Unknowns

- Product gaps: future demand for scheduled reports, additional recipients, and attachments is unvalidated.
- Technical gaps: the current generic renderer must become report-typed; delivery needs a separate lifecycle; local real-provider orchestration needs a documented command.
- Data/model gaps: “active client”, SLA, capacity/utilization, and retention cohort definitions are not yet safe to publish.
- Operational gaps: the user must provide the R2 development bucket/configuration and Trigger.dev development project/key; email sandbox constraints must be verified.

### Counterpoints

- A six-card catalog adds maintenance because each report becomes a product contract; this is justified only if formulas and tests remain explicit.
- Keeping the generic export is simpler but fails the user’s discovery and meaning problem.
- A custom builder is more flexible but would increase validation, privacy, performance, and UX risk before report demand is understood.
- Email attachments appear convenient but weaken revocation, retention, size control, and forwarding privacy; a secure link is the safer V1 interpretation of email delivery.
- Doing nothing leaves technically valid infrastructure with low user value and unclear adoption signals.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Keep one generic snapshot export | Minimal change | Unclear purpose and contents | Only as a temporary internal diagnostic |
| B | Six typed preset reports with two-step request and secure email link | Clear, bounded, testable, extensible | Requires metric contracts and typed renderers | Recommended V1 |
| C | Custom report builder | Maximum flexibility | High complexity and abuse/performance risk | After usage validates custom combinations |

### Recommendation

Choose Option B. Preserve the existing interactive analytics and request lifecycle, but make report type a first-class immutable contract. Email a short-lived secure link rather than attaching private operational data. Require real development providers for manual/local acceptance while keeping deterministic doubles for automated tests.

## Architecture And Boundaries

- Site impact: not applicable.
- API impact: reporting contracts, typed aggregation/rendering, request and delivery orchestration, secure downloads, OpenAPI, and provider composition.
- IDP impact: no business logic; expose or inject only an authorized verified account-email lookup.
- Studio impact: report catalog, two-step dialog, typed configuration, confirmation, and expanded history/lifecycle feedback.
- Data/persistence impact: additive migration for report type/version, immutable configuration snapshot, and delivery status/attempt metadata; no destructive backfill. Existing generic requests remain readable as legacy snapshots.
- External provider impact: Trigger.dev development/staging/production projects, private environment-specific R2 buckets, and the existing approved transactional-email provider.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applies | Replaces an unclear user journey | `requirements-analysis`, discovery note |
| Architecture | Applies | Crosses Studio, API, worker, storage, email | `triad-architecture` |
| API | Applies | Typed request and lifecycle contracts | `triad-api-development`, Elysia/OpenAPI |
| Identity and authorization | Applies | Tenant capability and verified recipient | IDP boundary rules |
| Persistence | Applies | Additive request/delivery fields | Drizzle/PostgreSQL conventions |
| Studio UI | Applies | Catalog and accessible dialog | `triad-studio-development`, `impeccable` |
| Site UI | Not applicable | No public-site surface | Product boundary |
| Accessibility | Applies | Modal and async-state interaction | WCAG 2.2 / `accessibility` |
| Performance and scale | Applies | Aggregations and worker output can grow | bounded-query rules |
| Security and privacy | Applies | Private business artifacts and email | security rules, R2 guidance |
| Observability | Applies | Multi-provider asynchronous lifecycle | structured logging conventions |
| Reliability and delivery | Applies | Idempotency, retries, expiry, local parity | Trigger.dev task guidance |
| Testing and QA | Applies | DB/API/provider/browser evidence | `triad-testing`, `triad-product-qa` |
| Documentation | Applies | New runbook, env inputs, metric glossary | repository documentation rules |

## Performance And Scalability

- Expected data growth: report requests and operational facts grow per tenant indefinitely; artifacts live for 30 days.
- Critical paths: tenant-qualified aggregates, document rendering, R2 upload/verification, secure-link issuance, and email delivery.
- Query bounds/pagination: maximum 366 days; composite tenant/time indexes; paginated source reads and bounded history results.
- Concurrency risks: repeated clicks, worker retries, simultaneous reports per tenant, storage-success/DB-failure, and email-success/acknowledgement-failure.
- External limits: Trigger concurrency, R2 request/object limits, and email provider rate/size limits must be documented from provisioned accounts.
- Millions of records/items: aggregate in PostgreSQL, never fetch raw history into Studio, page detailed exports, stream output where supported, and reject output exceeding an explicit measured cap with an actionable state.

## Security, Privacy, And Abuse

- Auth/session impact: authenticated API session and active tenant membership are required for every request/history/download action.
- Roles/access: reuse explicit reporting capabilities; no URL or request ID alone grants access.
- PII/secrets: email is resolved server-side, masked in UI, minimized in provider payloads, and omitted from logs; R2/Trigger/email secrets remain server-side in Infisical.
- Spam/abuse vectors: repeated generation and email requests, recipient manipulation, object-key enumeration, and oversized ranges.
- Rate limiting or throttling: per-user request rate limit, tenant concurrency key, idempotency, email retry ceiling, and non-enumerable expiring download grants.

## Accessibility And UX

- Keyboard flow: logical card focus, dialog focus trap/restore, named step navigation, Escape before submission, and no keyboard trap while pending.
- Screen reader states: dialog title/instructions, current step, validation summaries, pending progress, and lifecycle status announcements.
- Responsive behavior: single-column cards and full-height bounded dialog at narrow widths; usable at 320px and 200% zoom, with reduced motion honored.
- Loading/error/empty states: catalog remains present; failures identify generation versus delivery and provide the safe next action.
- Duplicate submission prevention: disable confirmation while the request is unresolved and reconcile retries by idempotency key.

## Logging And Observability

- Useful structured events: request accepted/deduplicated, Trigger dispatch, generation start/end, R2 put/head, artifact persisted, email attempt/delivered/failed, download grant, expiry/cleanup.
- Metrics: counts and durations by report type and terminal state, retries, duplicate suppression, artifact bytes, delivery success/failure, and expiry cleanup lag.
- Traces/spans: correlate API request, persisted request ID, Trigger run, render, storage, delivery, and download without placing secrets in attributes.
- Alerts: sustained generation/delivery failures, stuck queued/running requests, cleanup lag, or provider authentication failures.
- Sensitive data that must not be logged: email addresses, names, client-level rows, report contents, tokens, provider credentials, private object keys, and signed URLs.

## Delivery And Rollback

- Compatibility strategy: additive/versioned report contracts; legacy generic requests remain readable and downloadable until expiry.
- Feature flag/rollout: keep the typed catalog behind a server-authoritative reporting rollout flag until real-provider smoke tests pass in dev and hml.
- Migration/backfill: additive migration; existing rows receive a `legacy_management_snapshot` type/version without reprocessing.
- Rollback: disable new typed requests while retaining history/download and worker convergence for already accepted requests.
- Operational readiness: provision environment-specific Trigger/R2/email configuration, align Trigger versions, clear the dependency security gate, document local startup, and execute real dev then hml smoke tests.

## Success Measures

- Success signals: users can identify and request the intended report without support; accepted requests reach ready and delivered states; downloads are authorized and artifacts expire as designed.
- Baseline or measurement plan: instrument selection, confirmation, generation outcome, delivery outcome, and download; establish baseline after rollout without inventing target percentages.
- Regression guardrails: tenant isolation, idempotency, 366-day bound, 30-day retention, secure-link expiry, provider-failure recovery, accessibility, and dependency security gates.
- Evaluation window: review after enough real requests exist to compare report selection, completion, and download by type.

## Acceptance Criteria

- [ ] AC-001: The six named report cards remain understandable and selectable with zero matching data.
- [ ] AC-002: Each card opens the two-step accessible flow with exactly its applicable filters and PDF/CSV format.
- [ ] AC-003: Confirmation accurately summarizes configuration, expiry, and the masked verified requester email; the email cannot be changed.
- [ ] AC-004: Cancel/close before submission dismisses directly, while one confirmation creates at most one durable request and dispatch.
- [ ] AC-005: Each typed PDF and CSV matches its documented measures, filters, tenant, and immutable request snapshot.
- [ ] AC-006: Trigger retries and API replays cannot duplicate an artifact or successful email delivery.
- [ ] AC-007: R2 artifacts are private, verified after upload, tenant-namespaced, downloadable only through authorized short-lived access, and cleaned up after 30 days.
- [ ] AC-008: Generation and email delivery expose separate, recoverable lifecycle states in API and Studio history.
- [ ] AC-009: Only an authorized active member can request or retrieve a report for the active tenant and requester’s verified email.
- [ ] AC-010: Normal local development executes a real Trigger.dev development run, stores the artifact in the real dev R2 bucket, sends through the configured email path, and proves an authorized download.
- [ ] AC-011: Missing or invalid Trigger/R2/email development configuration produces an explicit failure and never a simulated success.
- [ ] AC-012: Aggregate/detail queries are tenant-qualified, enforce the 366-day bound, and remain bounded under large seeded datasets.
- [ ] AC-013: Cards, dialog, history, and failure recovery pass keyboard, screen-reader, 320px, 200% zoom, and light/dark checks.
- [ ] AC-014: Logs/traces correlate the lifecycle without exposing PII, report contents, object keys, secrets, or signed URLs.
- [ ] AC-015: Fresh-database migration, API/Studio checks/builds/coverage, provider integration tests, and real browser acceptance pass.
- [ ] AC-016: The dependency security gate passes before staging and real dev/hml provider smoke-test evidence is recorded.

## Verification Plan

- Unit tests: metric definitions, filters, render models, state transitions, masking, idempotency, expiry, and retry policies.
- Integration/API tests: fresh PostgreSQL migration; tenant/capability boundaries; concurrent requests; Trigger loss/retry; R2 put/HEAD and failure recovery; email delivery acknowledgement loss; cleanup.
- UI tests: catalog visibility, report-specific fields, step navigation, summary, pending/error states, history actions, and no duplicate request.
- Manual/browser checks: owner/admin/member permissions, two tenants, empty/data-rich states, PDF/CSV download, email link, 320px, themes, zoom, keyboard, and axe.
- Build/check commands: repository check/build/coverage/security gates plus documented Trigger dev and real-provider smoke commands.

## Open Questions

### Blocking

- None for implementation planning. Real-provider acceptance waits for the user-provided Trigger.dev project/key and R2 development bucket/configuration.

### Non-Blocking

- [ ] Should a later version support attachments in addition to secure links? — validate demand and provider size/privacy constraints after V1.
- [ ] Which report should be the first candidate for scheduling? — decide from observed selection/download data.
- [ ] Should “active clients”, utilization, or SLA be added? — create metric contracts and source-data requirements in a separate initiative.

## Assumptions

- “Receive via email” means receiving a transactional notification with a short-lived secure download link, not a file attachment — validate during approval.
- The recipient is the authenticated requester’s verified account email — validate during approval.
- The existing transactional email provider remains available to the reporting composition root — verify during implementation.
- The user will supply the real dev R2 and Trigger.dev values after provisioning — verify through AC-010.

## Definition of Ready

- [x] All mandatory gates in `planning-gates.md` pass at planning level; provider provisioning is an explicit delivery dependency.
- [x] Requirement-to-acceptance-to-task traceability is complete.
- [x] The planning state is `Ready` before requesting approval.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-06 | Awaiting approval |  | Initial proposal based on product feedback and visual references |
| 2026-09-06 | Approved | Product owner | Explicit instruction to implement immediately; real Trigger.dev and R2 required for normal local development |
