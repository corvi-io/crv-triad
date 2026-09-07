# 25 Production Business Profile, Commissions And Management Reporting

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: Not started
- Owner: CRV Triad
- Last updated: 2026-09-06
- Approved by/date: User / 2026-09-06

## Summary

Complete the first production management layer of TRIAD after Initiatives 23 and 24. Owners and
admins will maintain a durable barbershop profile and logo, configure complete commission rules,
and analyze tenant-authorized operational, customer, revenue, cash and commission results. The
interactive report experience remains bounded and responsive; requested PDF summaries and CSV
detail exports run asynchronously through Trigger.dev, are recorded in PostgreSQL, and are stored
privately in Cloudflare R2 with authenticated, short-lived download access.

Execution plan:
[25-production-business-profile-commissions-and-management-reporting.md](../tasks/25-production-business-profile-commissions-and-management-reporting.md).

Required predecessors:
[23 Production Reception And Service Fulfillment](23-production-reception-and-service-fulfillment.md)
and [24 Production Checkout And Cash Operations](24-production-checkout-and-cash-operations.md).

## Context

- Current state:
  - Initiative 21 productionized units, professionals and services, but explicitly left the
    barbershop profile, payment settings, commission policies and setup completion outside its
    scope.
  - The Studio setup prototype models only display name, email, phone and primary unit for the
    business profile. Its business, payments, commission and full completion projections remain
    memory-only or disabled in deployed environments.
  - The professional catalog already persists a percentage-shaped `commissionBasisPoints` field,
    but this is not yet a complete policy, immutable financial snapshot or correction contract.
  - Initiative 24 intentionally excludes commissions and requires reporting not to fabricate zero
    commission metrics.
  - `/reports` already validates a coherent interactive experience and seven report families over
    deterministic data, but it has no production API, persistence, role enforcement, export,
    polling or external storage.
  - The IDP already has an R2-compatible private storage adapter for user profile images. Business
    media and report artifacts need business-owned storage contracts and must not be placed under
    the IDP merely because the provider is shared.
- Problem:
  - Owners cannot complete or persist the barbershop identity shown throughout their workspace.
  - Commission agreements remain implicit or prototype-only, so checkout cannot seal a truthful
    amount owed to each professional and management reports cannot reconcile commission expense.
  - Owners and admins cannot answer historical operating questions from production data or retain
    a generated report for later download.
  - Running unbounded report generation inside an interactive HTTP request would create timeout,
    retry and memory risks as tenant history grows.
- Why now:
  - Initiatives 23 and 24 establish immutable performed-service, receipt, tender, reversal and cash
    facts. This is the first point at which commission snapshots and management reporting can be
    truthful.
  - The accepted Studio setup and reporting prototypes provide tested information architecture,
    copy vocabulary, visual states and deterministic projection rules to refine instead of
    inventing a new interface.
  - Previous production integrations removed accepted fields and behaviors when replacing memory
    sources. In this initiative the existing frontend is a product contract, not disposable
    scaffolding: backend contracts adapt to it unless a documented hard constraint makes one
    specific deviation unavoidable.
- Related docs/issues:
  - [Studio barbershop setup](../../studio/barbershop-setup.md)
  - [Studio reporting prototype](../../studio/reporting.md)
  - [Initiative 15](15-triad-studio-management-insights-visual-prototype.md)
  - [Initiative 16](16-triad-studio-first-mlp-completion-visual-prototype.md)
  - [Initiative 21](21-production-barbershop-catalogs-and-client-preferences.md)
  - [Initiative 24](24-production-checkout-and-cash-operations.md)
  - [Trigger.dev tasks](https://trigger.dev/docs/tasks/overview)
  - [Trigger.dev idempotency](https://trigger.dev/docs/idempotency)
  - [Trigger.dev queues and concurrency](https://trigger.dev/docs/queue-concurrency)
  - [Cloudflare R2 S3 API](https://developers.cloudflare.com/r2/api/s3/)
  - [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
  - [Cloudflare R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- Repository evidence:
  - `apps/studio/src/modules/barbershop-setup/contracts.ts` defines the current profile and
    commission-shaped prototype contracts.
  - `apps/studio/src/modules/barbershop-setup/completion-sections.tsx` owns the accepted business
    data surface.
  - `apps/studio/src/modules/revenue-operations/contracts.ts` defines percentage, fixed and no-
    commission prototype rules plus immutable item commission snapshots.
  - `apps/studio/src/modules/reporting` contains the accepted filters, projections, tables, charts
    and states; `apps/studio/src/dev/reporting` is explicitly non-production.
  - `apps/api/src/modules/barbershop-catalogs` persists professional commission basis points but has
    no complete commission policy lifecycle.
  - `apps/api/src/modules/idp/profile/profile-image-storage.ts` proves R2 S3 compatibility in the
    runtime while remaining an identity-specific implementation that business modules must not
    import.
  - `env-schema.yaml` and app-local env files do not yet declare Trigger.dev or business artifact
    storage inputs.

## Actors And Workflows

- Primary actors:
  - Tenant owner: maintains the business profile, configures commission rules, views all management
    reports and requests exports.
  - Tenant admin: has the same operational management capabilities unless a later role revision
    explicitly narrows them.
  - Tenant member/receptionist: may see the barbershop identity in the shell but cannot change the
    profile, view management financial reports, configure commissions or download their artifacts.
  - Professional: is the beneficiary of commission facts but receives no self-service financial
    portal in this initiative.
  - Background report worker: receives opaque identifiers, reads authorized tenant facts through a
    server-owned application contract, creates an artifact and reports a terminal outcome.

### Business Profile Journey

1. Owner/admin opens `Configuração da barbearia > Dados` and sees the current server-confirmed
   profile rather than a fixture.
2. The user edits display name, contact email, business phone, optional WhatsApp, optional short
   description, optional website, optional Instagram handle and primary unit. Unit addresses and
   hours remain owned by the unit catalog.
3. The user may upload, replace or remove one logo. The UI validates type and size before upload;
   the API validates the bytes again, owns the randomized object key and never trusts a filename.
4. The API commits profile metadata only after required validation and a successful object write.
   Replacing a logo never removes the prior object before the new reference is committed; cleanup
   is retryable.
5. Saved identity is reflected in setup and appropriate shell identity surfaces without inventing
   a public page or publishing private contact data.

### Commission Configuration And Snapshot Journey

1. Owner/admin opens `Configuração da barbearia > Pagamentos e comissões` and sees the active
   professional defaults and service/professional exceptions with their effective state.
2. Each professional has exactly one default rule: percentage or no commission. An optional
   professional/service override may be percentage, fixed BRL amount or no commission.
3. Changes apply only to future receipt registrations. Preview copy states the effective rule and
   never suggests that past commissions will be recalculated.
4. When Initiative 24 registers a receipt, the API resolves the rule for every performed line,
   calculates exact integer-cent commission over that line's final net allocation, and seals rule,
   base, commission, barbershop share, professional identity and labels in the same transaction.
5. Full receipt reversal produces an immutable reversing commission fact. A replacement receipt
   creates fresh snapshots under the policy effective at replacement registration; historical
   facts are never edited.
6. Owners/admins inspect commission totals and drill into a bounded list of contributing and
   reversing facts. This initiative records amounts owed; it does not mark payouts.

### Interactive Reporting Journey

1. Owner/admin opens `Relatórios`; the current calendar month and all units are selected by
   default in the tenant's confirmed unit timezones.
2. One shared filter set covers an inclusive range of at most 366 days plus optional unit,
   professional, service and payment method. Applying filters issues bounded aggregate and ranked
   queries; the browser never downloads raw tenant history to calculate the page.
3. The page presents a calm management narrative: summary, revenue, attendance by professional,
   top services, ticket, commissions, cancellations/no-shows, customers and cash reconciliation.
4. Each chart is supplementary to a textual takeaway and semantic table. Partial identity or cash
   coverage is labeled as unavailable/partial rather than coerced to zero.
5. Empty, loading, refreshing, stale, permission-denied and failed states preserve the active
   filter context and offer a direct recovery action.

### Saved Report And Export Journey

1. Owner/admin selects `Gerar relatório`, confirms the current filters, chooses `Resumo em PDF` or
   `Dados detalhados em CSV`, and submits once.
2. The API validates access and filters, records a tenant-owned report request in PostgreSQL, and
   triggers one idempotent Trigger.dev run. The response returns immediately with a report ID and
   `Na fila` status.
3. Studio shows the request in `Relatórios gerados` and polls a bounded status endpoint only while
   queued/running and the page is visible. The user may leave and return without losing it.
4. The worker loads the report request by opaque ID, uses server-owned queries, writes one private
   R2 object, records checksum/size/content type and atomically marks the request `Pronto`.
5. A currently authorized owner/admin requests download. The API revalidates tenant access and
   returns a short-lived, single-object R2 GET URL; the URL is never stored in application data,
   analytics or logs.
6. Failures become `Falhou` with a safe reason and `Tentar novamente`. Retry reuses the logical
   request or creates one explicitly linked attempt and never publishes two active artifacts.
7. Report metadata remains visible after artifact expiry. Expired items say `Arquivo expirado` and
   may be generated again with the original filters if the actor remains authorized.

### Alternate And Recovery Journeys

- Stale profile or commission writes return a version conflict and preserve the local draft for
  comparison/reload; they never overwrite a concurrent change silently.
- If R2 is unavailable during a logo replacement, the previous logo/profile remains intact.
- If Trigger.dev accepts a run but the HTTP response is lost, the API's stable idempotency key and
  persisted request prevent duplicate logical jobs.
- If artifact upload succeeds but the final database update fails, retry checks the deterministic
  object key/checksum before writing and converges on one ready artifact.
- Disabling the report provider prevents new exports with a clear unavailable state; interactive
  reports continue to work.
- Revoked membership or capability immediately blocks report reads and downloads, including files
  generated earlier by the same actor.

## Goals

- Persist a useful business profile and private logo with explicit tenant ownership and safe media
  lifecycle.
- Make commission rules complete, auditable and immutable at receipt-registration time.
- Replace the production-disabled report source with tenant-authorized aggregate APIs over real
  scheduling, fulfillment, revenue, cash, client and commission facts.
- Support durable asynchronous PDF and CSV report generation without holding interactive requests
  open or exposing R2 credentials.
- Preserve the accepted Studio visual language while improving management hierarchy, progressive
  disclosure and mobile/table accessibility.
- Establish reliable provider configuration, idempotency, observability, retention and recovery
  before report volume grows.

## Non-Goals

- Public barbershop pages, public booking, SEO, public logo URLs or changes to `apps/site`.
- Legal/fiscal registration, CNPJ validation, invoices, tax/accounting books, DRE, bank settlement,
  gateway reconciliation or accounting integrations.
- Commission payout, payroll, advances, tips, chair rental, goals, tiers, bonuses, negative
  commission, split commission for one performed item or professional self-service statements.
- Editing commission snapshots, retroactively recalculating history, attaching commission to cash
  movements or treating a registered commission as paid.
- Arbitrary report builders, custom formulas, scheduled/emailed reports, report sharing links,
  cross-tenant Backstage reporting, BI warehouse, OLAP cube or realtime streaming analytics.
- Browser-side raw dataset scans, asynchronous jobs for normal dashboard/report page reads, or
  storing generated artifacts in PostgreSQL.
- More export formats than one accessible PDF summary and one UTF-8 CSV detail artifact.
- Image gallery, cover photos, cropping editor, AI image processing or reusing the IDP module as a
  business-media owner.

## Requirements

### Functional

- REQ-001: Persist one versioned business profile per tenant with display name (2–80 characters),
  business email, Brazilian business phone, optional WhatsApp, optional description (up to 500
  characters), optional HTTPS website, optional Instagram handle and optional active primary unit.
  Normalize contact and URL inputs, enforce tenant ownership, and never duplicate unit address or
  hours in the profile.
- REQ-002: Add `business_profile.read` for active tenant members and `business_profile.manage` for
  owner/admin. Reads and writes derive actor and tenant exclusively from server context and use the
  existing capability/subscription pipeline.
- REQ-003: Accept one JPEG, PNG or WebP logo after client and server validation, with a documented
  conservative byte and dimension limit selected during implementation from existing image-policy
  conventions. Decode/inspect content rather than trusting extension or `Content-Type`, strip
  unsafe metadata through normalization, use randomized tenant-scoped keys, and preserve the prior
  logo on replacement failure.
- REQ-004: Store business logos through a business-owned object-storage port. Local development
  may use an app-local filesystem adapter; `hml`/`prd` must fail configuration startup unless the
  R2 adapter is complete. Logo reads remain authenticated in this initiative; no public bucket or
  permanent bearer URL.
- REQ-005: Persist versioned commission policies with one professional default (`percentage` or
  `none`) and at most one professional/service override (`percentage`, `fixed` or `none`). Validate
  percentage as 0–10,000 basis points, fixed BRL as non-negative safe integer cents, active same-
  tenant references and uniqueness. Zero percentage normalizes to `none`; fixed zero is rejected
  in favor of `none`.
- REQ-006: Add `commissions.read` and `commissions.manage` for owner/admin only. Members cannot read
  aggregate/detail commission amounts or mutate policies through crafted requests. Existing
  professional catalog reads must not leak commission policy to roles lacking this capability.
- REQ-007: Resolve commission policy at receipt registration using override then professional
  default then `none`. Allocate checkout discount/surcharge to lines with Initiative 24's exact
  integer-cent rule; percentage commission rounds deterministically to cents and fixed commission
  is capped at the line net so barbershop share never becomes negative. Persist the rule source,
  rule values, net base, amount, barbershop share, professional/line labels and policy version as
  immutable snapshots in the same transaction as the receipt.
- REQ-008: A full receipt reversal appends equal-and-opposite commission facts linked to the
  original snapshots. Replacement registration uses the policy effective at replacement time.
  Reports show gross, reversals and net commission without modifying earlier facts.
- REQ-009: Provide bounded, paginated commission detail by inclusive date range, unit,
  professional and service, plus aggregate totals. Default to the current month and cap one query
  at 366 local calendar days. Stable sorting includes a unique tiebreaker; no unbounded export or
  N+1 catalog lookup.
- REQ-010: Replace the production-disabled reporting source with authenticated aggregate/facet
  endpoints supporting one inclusive range of at most 366 days and optional unit, professional,
  service and tender method. Apply the same filter to all result sections and return explicit data
  coverage/partial-state metadata.
- REQ-011: Preserve the accepted report definitions: registered net revenue; distinct active
  receipt ticket; performed item counts; top-service quantity and net value; immutable commission
  facts; appointment cancellation/no-show rates with visible denominator; identifiable new versus
  returning clients; and cash expected/counted/difference by closing revision. Reversals and
  replacement receipts reconcile without double counting.
- REQ-012: Reporting API queries use server-derived tenant context, bounded ranked results,
  aggregate SQL and stable facets. They never return client names, contacts, notes or the raw
  event/ledger dataset used to calculate the screen.
- REQ-013: Add `reports.read` and `reports.export` for owner/admin only. Every interactive query,
  report-status read, retry and download rechecks current authorization. No cross-tenant Backstage
  access is introduced.
- REQ-014: Create a tenant-owned UUIDv7 report request with format, normalized filters, requested
  timezone context, status (`queued`, `running`, `ready`, `failed`, `expired`), requester ID,
  attempts, provider run reference, artifact metadata, safe failure code and timestamps. Enforce
  optimistic state transitions and one active logical request per idempotency key.
- REQ-015: Starting an export persists the request before invoking Trigger.dev and uses a stable,
  non-PII idempotency key. Trigger payloads contain only opaque request/tenant identifiers and
  schema version. Provider run references are correlation metadata, never authorization.
- REQ-016: Trigger.dev handles PDF/CSV generation with explicit queue concurrency, timeout, bounded
  retry/backoff and a dead-letter-equivalent terminal failure state. A task must be safe to rerun,
  verify the current report-request state, and converge after partial database/R2/provider failure.
- REQ-017: Store generated artifacts in a private R2 bucket through an API-owned object-storage
  port. Use opaque tenant/report prefixes and deterministic attempt keys; persist content type,
  byte size, checksum and expiry metadata. Configure lifecycle deletion for report artifacts while
  separately retaining database metadata. Default retention is 30 days and remains an explicit
  product constant until measured usage justifies configuration.
- REQ-018: Provide authenticated short-lived download access for one ready object. The API must
  verify current tenant/capability and object metadata before issuing a presigned GET URL with a
  conservative expiry. Never expose list, PUT or DELETE access to Studio.
- REQ-019: Generate an accessible PDF summary matching the selected filters and a UTF-8 CSV detail
  export with a stable English machine header plus Brazilian Portuguese human labels documented
  per column. Spreadsheet-formula-leading cells must be neutralized without corrupting legitimate
  data. Both formats include generation time, timezone/filter context and a report reference.
- REQ-020: List report requests with cursor pagination and bounded status/format filtering, newest
  first. Studio polls only non-terminal visible rows, pauses when hidden/offline, backs off after
  errors and invalidates on focus/reconnect without realtime infrastructure.
- REQ-021: The business profile, commission settings, interactive reports and generated-report
  list must expose stable loading, saving/generating, empty, filtered-empty, partial, stale,
  permission, provider-unavailable, failure, retry, ready and expired states in Brazilian
  Portuguese. Drafts and selected filters survive recoverable errors.

### Non-Functional

- REQ-022: All money uses non-negative integer BRL cents and signed reversal facts only in typed
  internal projections. All rates use integer basis points. Intermediate arithmetic must reject
  overflow and report aggregates must reconcile to the immutable source facts.
- REQ-023: Use UUIDv7 application IDs, tenant-qualified foreign keys, indexes matching documented
  filters/sorts, database constraints for policy/request uniqueness and transactions for profile,
  policy, receipt-snapshot and report-state invariants. No hard deletion of financial facts.
- REQ-024: Interactive report endpoints must be bounded independently from asynchronous export.
  Explain query plans for high-cardinality paths and prove no N+1 behavior. For millions of facts,
  exports stream/page source rows and output rather than retaining the full dataset in memory;
  aggregate optimization or rollups may be introduced later only from measured evidence.
- REQ-025: External calls use explicit timeouts and classified retry behavior. API success never
  claims a report is ready before artifact metadata is committed. Provider outages degrade exports
  without disabling profile, commissions, checkout or interactive reporting.
- REQ-026: Logs, traces, analytics, Trigger.dev payloads and object keys exclude profile contact
  values, report contents, client PII, financial row payloads, presigned URLs, credentials and
  private headers. Audit metadata records actor, tenant, action, target, filter dimensions without
  values, outcome, request ID and provider run ID where relevant.
- REQ-027: Studio follows the existing restrained navy/gold `Operate` direction. Reports prioritize
  a single filter context, textual conclusions and tabular numerals; charts remain secondary.
  Profile and commission forms use progressive disclosure, one clear primary action and the
  existing shared field/drawer/dialog vocabulary rather than a new dashboard or design system.
- REQ-028: All flows meet WCAG 2.2 AA expectations: semantic heading/table structure, keyboard and
  focus recovery, status/alert announcements, non-color-only charts, accessible PDF structure,
  320 CSS-pixel reflow, 200% zoom, forced colors, reduced motion and light/dark/system themes.
- REQ-029: Provider secrets remain server-only and use Infisical `dev`, `hml`, `prd` app paths.
  Deployment inputs are declared in `env-schema.yaml` with `API__*` source names and runtime-shaped
  `apps/api/.env.example` values. Missing deployed credentials fail readiness for exports/storage,
  while local adapters and deterministic task fakes support development and tests.
- REQ-030: Ship behind independently controllable profile, commission, interactive-report and
  export capability/feature gates. Migration/rollout order preserves Initiative 24 compatibility;
  checkout records created before commission enablement carry an explicit unavailable commission
  state rather than invented zero, and rollback never deletes snapshots or artifacts.
- REQ-031: Before changing production code, create a versioned parity inventory of every accepted
  field, action, state, validation, filter, calculation, chart/table, responsive behavior and
  accessibility interaction in the current setup, revenue and reporting frontend. The HTTP-backed
  result must preserve that inventory. A removal, semantic change or replacement is allowed only
  when an externally verified security, correctness, accessibility or provider constraint makes
  preservation infeasible; it requires an explicit PRD scope change, before/after evidence and
  renewed product approval. Backend convenience, schema preference and implementation cost are not
  sufficient reasons.
- REQ-032: Keep the current memory adapters and deterministic scenarios as development/test
  characterization sources until HTTP parity is proven. Production builds continue excluding
  fixtures. Integration tests must run the same accepted behavior suite against memory and HTTP
  adapters wherever behavior is source-independent; every intentional source-specific difference
  must be listed and approved.

## Brainstorm

### Problem Framing

- The job is not “add Trigger.dev and R2.” Owners need trustworthy answers and retained exports
  after the operational loop closes; async execution and object storage solve the reliability and
  retention constraints of that job.
- The three surfaces form one management layer: business identity supplies report branding,
  commission policies create missing financial facts, and reports turn the resulting facts into
  decisions.
- Combining them is justified by the shared checkout/report dependency and accepted setup/report
  prototypes, but delivery remains phased so profile work does not block core commission truth.

### Gaps And Unknowns

- Product gaps: no measured export demand, preferred retention or pilot report format exists.
  Defaults are therefore PDF summary, CSV detail and 30-day artifact retention, measured after
  pilot usage.
- Technical gaps: Trigger.dev projects/environments and R2 business buckets/credentials are not
  provisioned. The user will create them when available; local fakes and provider ports permit
  implementation before integrated `hml` verification.
- Data/model gaps: Initiative 24 implementation may adjust final table names and exact net-line
  allocation contracts. This PRD fixes behavior, not premature table coupling.
- Operational gaps: provider quotas, cost baselines and alert thresholds are unknown. Metrics ship
  first; numeric alerts require observed baselines.

### Counterpoints

- Making every report request asynchronous would add queue latency to routine management work and
  weaken the accepted interactive page. Keep bounded aggregates synchronous and reserve jobs for
  file generation.
- Storing precomputed reports indefinitely appears convenient but raises privacy, cost and stale-
  data risks. Retain metadata, expire private artifacts after 30 days and allow explicit regeneration.
- Reusing the IDP image module would reduce initial code but violate the business/identity boundary.
  Reuse only a proven S3-compatible pattern through a business-owned storage port.
- A warehouse or generalized analytics platform would scale further but is premature without
  production volume evidence. Correct indexed PostgreSQL aggregates plus streamed exports are the
  simplest credible first production design.
- Doing nothing leaves commission totals fabricated or absent, prevents truthful reports, and
  forces owners to reconstruct management results outside TRIAD.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A — synchronous everything | Build UI aggregates and files inside API requests | Few providers and concepts | Timeouts, duplicate work, poor large-export recovery | Only for tiny throwaway pilots |
| B — bounded UI plus async artifacts | PostgreSQL aggregate endpoints; Trigger.dev PDF/CSV generation; private R2 artifacts | Fast UI, durable retry, clear ownership, scalable export path | Provider provisioning and state machine required | Recommended now |
| C — analytics warehouse | Replicate events into a dedicated analytical store and job platform | Strong future analytical scale | High complexity, consistency and operational cost | After measured PostgreSQL limits |

### Recommendation

Choose Option B. It preserves the reviewed report UX, makes commission facts authoritative at the
financial boundary, uses asynchronous infrastructure only where it provides real value, and keeps
the future warehouse option open. Implement through explicit ports so missing provider credentials
block only integrated export/media validation, not domain/UI development.

## Architecture And Boundaries

- Site impact: none; no public profile or booking surface.
- API impact:
  - Extend a business-owned barbershop profile capability rather than IDP.
  - Add a commission-policy/snapshot boundary coordinated with Initiative 24 revenue registration.
  - Add a reporting module for aggregates, report requests, artifact metadata and download grants.
  - Compose Trigger.dev tasks as explicit worker entrypoints that call application services; tasks
    must not become an alternative public API or bypass tenant-qualified repositories.
  - Add an API-owned object-storage abstraction with separate logo and report namespaces/policies.
- IDP impact: none beyond consuming the existing authenticated identity and tenant context. No IDP
  table, role or image route owns business data.
- Studio impact: productionize setup `Dados` and `Pagamentos e comissões`; adapt `/reports` to HTTP;
  add generated-report status/download UI. Preserve the shell and component system.
- Backstage impact: none; aggregate platform finance/report browsing remains prohibited.
- Data/persistence impact: business profile/logo metadata, commission policies, immutable
  commission/reversal facts, report requests/attempts and artifact metadata in PostgreSQL; private
  logo/report objects in R2; no financial facts stored only in objects.
- External provider impact: Trigger.dev for export execution and R2 through its S3-compatible API.
  PostgreSQL remains the authoritative state machine. Provider resources are provisioned separately
  for `dev`, `hml` and `prd` with least-privilege credentials.
  Trigger.dev configuration lives with `apps/api`, uses its Bun runtime, and discovers named task
  exports from an API-owned trigger directory. REST code triggers by task ID with a type-only import
  so worker code is not bundled into the server. R2 uses the existing S3-compatible client pattern
  through a business-owned port; server-side generation requires no browser CORS policy.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Three owner/admin journeys and recovery paths are user-visible | `requirements-analysis`, `spec-writer` |
| Architecture | Applicable | API/Studio/worker/storage boundaries and IDP exclusion are material | `triad-architecture` |
| API | Applicable | New bounded aggregates, policies, job status and download contracts | `triad-api-development`, `elysia` |
| Identity and authorization | Applicable | Tenant isolation and owner/admin financial capability checks | `triad-api-development`, business access docs |
| Persistence | Applicable | Financial snapshots, job state, constraints, migrations and retention | `postgres-drizzle` |
| Studio UI | Applicable | Existing setup/report surfaces become production workflows | `triad-studio-development`, `impeccable`, `ux-copy` |
| Site UI | Not applicable | Public profile and booking are out of scope | `triad-architecture` |
| Accessibility | Applicable | Charts, tables, forms, job status and PDF need equivalent access | `accessibility`, `impeccable` |
| Performance and scale | Applicable | Historical aggregates and streamed exports are data-heavy | `triad-api-development`, `postgres-drizzle` |
| Security and privacy | Applicable | Financial facts, contact data, private objects and bearer URLs | security requirements in this PRD |
| Observability | Applicable | Cross-system report state requires correlation and safe diagnostics | `observability-guidelines`, `logging-best-practices` |
| Reliability and delivery | Applicable | Trigger/R2 partial failure, retry, readiness, rollout and rollback | provider docs, deployment docs |
| Testing and QA | Applicable | Domain/API/provider/UI/E2E and accessibility evidence required | `triad-testing`, `vitest`, `triad-product-qa` |
| Documentation | Applicable | API, Studio, env, provider and runbook contracts change | `triad-initiative-workflow` |

## Performance And Scalability

- Expected data growth: financial and commission facts grow with performed items and corrections;
  report requests/artifacts grow with explicit owner/admin exports; one logo is current per tenant.
- Critical paths: receipt registration with commission snapshots must remain transactional;
  interactive report aggregates must remain bounded; export creation must return without waiting.
- Query bounds/pagination: 366-day interactive range, capped rankings/facets, cursor-paginated
  commission details and report history, stable indexed sorts and no raw-browser aggregation.
- Concurrency risks: simultaneous policy edits, receipt registration during policy change, duplicate
  export submission, task retry, upload/commit gaps and artifact expiry during download.
- External limits: Trigger.dev environment concurrency and R2 operations/credentials will be
  measured after provisioning; a named export queue plus tenant concurrency keys, timeouts and
  backoff prevent provider/database saturation. Global-scope hashed Trigger.dev idempotency keys
  derive from the internal logical request ID and never from user data.
- Millions of records/items: aggregates must use tenant/date/filter indexes and explain-plan
  evidence; exports page/stream reads and writes. If measured latency exceeds the agreed product
  budget, introduce incremental rollups through a follow-up migration, not an unverified warehouse.

## Security, Privacy, And Abuse

- Auth/session impact: no new authentication method; current session, active membership and server-
  resolved tenant remain authoritative on every user request.
- Roles/access: members read the displayed business identity; only owner/admin manage profile,
  commissions, management reports, exports and downloads.
- PII/secrets: contact fields and financial details remain tenant private. Trigger/R2 credentials,
  private keys and presigned URLs are server-only and excluded from logs/analytics.
- Abuse vectors: repeated expensive filters, export spam, oversized/malicious images, guessed report
  IDs and leaked presigned URLs. Use bounds, capability/quota decisions, MIME decoding, random IDs,
  short URL expiry and per-tenant export throttling.
- Rate limiting: enforce a conservative per-tenant/user creation limit and one active duplicate
  request; define the initial numeric limit in configuration only after provider quotas are known.

## Accessibility And UX

- Visual direction: extend TRIAD Studio's `Confirmed Context` world in Operate mode. Use restrained
  navy/gold, solid surfaces, tabular numerals and scarce emphasis. Do not add gradients, decorative
  charts, KPI theater or a second reporting navigation system.
- Information architecture: setup keeps one resumable maintenance surface. Reports use one sticky/
  persistent filter context, a concise factual summary, then progressive-detail sections. Generated
  files live in a bounded history region rather than a separate “downloads dashboard.”
- Focal moments: after filter application, a one-sentence textual conclusion precedes visual
  evidence; after export request, the row appears immediately with `Na fila` and progresses without
  blocking the page.
- Keyboard flow: logical filter → apply → summary → sections → export/history order; drawers and
  dialogs trap/return focus correctly; status updates do not steal focus.
- Screen reader states: named charts plus semantic table equivalents, polite queue/running/ready
  announcements, assertive actionable failures and accessible PDF headings/tables.
- Responsive behavior: at 320 CSS pixels filters collapse into a named drawer/sheet, summary values
  reflow, tables own local horizontal scrolling and primary actions remain visible and named.
- Loading/error/empty states: retain filters and prior safe results while refreshing; distinguish no
  business data, no results for filters, partial source coverage, provider outage and expired file.
- Duplicate submission prevention: disable only the initiating export action while accepted state is
  unknown; recover through idempotency/status lookup rather than clearing the user's context.
- Core UX copy:
  - Primary export CTA: `Gerar relatório`.
  - Async acceptance: `Relatório na fila. Você pode continuar usando o TRIAD.`
  - Running: `Preparando relatório…`.
  - Ready CTA: `Baixar relatório`.
  - Failure: `Não foi possível gerar o relatório. Tente novamente sem alterar os filtros.`
  - Expired: `Arquivo expirado. Gere uma nova versão com os mesmos filtros.`
  - Commission history helper: `Alterações valem para os próximos pagamentos registrados.`
  - Report truth helper: `Os valores representam pagamentos registrados no TRIAD; não confirmam
    liquidação bancária.`
- Preservation rule: the current frontend topology, fields, behaviors, feedback states and visual
  hierarchy remain the baseline. Design work may clarify or add the minimum provider/job states,
  but cannot silently simplify the accepted product while replacing its data source.

## Logging And Observability

- Useful structured events: profile saved/logo stored/logo cleanup failed; commission policy
  changed; commission snapshot/reversal committed; report requested/triggered/started/uploaded/
  ready/failed/expired/download-authorized.
- Metrics: interactive report latency/error by section; export queue/run/upload duration; request
  outcomes/retries; artifact bytes; download authorization outcomes; orphan cleanup count;
  commission reconciliation failures. Dimensions remain bounded and exclude tenant/user IDs where
  the telemetry backend would create high cardinality.
- Traces/spans: correlate API request ID, internal report ID, Trigger run ID and R2 operation without
  report filters or object URLs. Trace aggregate query groups and task phases separately.
- Alerts: configuration/readiness failures and sustained terminal/cleanup/reconciliation failures;
  numeric thresholds are set after baseline observation.
- Sensitive data that must not be logged: business contact/description, image bytes/metadata,
  client facts, report rows/content, amounts per identifiable person, policy reasons, object keys
  containing user input, credentials, tokens and presigned URLs.

## Delivery And Rollback

- Compatibility strategy: add schemas/contracts before consumers; Initiative 24 works with an
  explicit commission-unavailable state until snapshot writing is enabled. Existing catalog
  percentage data may seed professional defaults only through an explicit reviewed migration.
- Frontend compatibility strategy: capture current behavior with an inventory, screenshots and
  source-independent characterization tests before changing adapters. Run memory and HTTP journeys
  side by side, preserve the memory source until parity passes, and treat any inventory delta as a
  product change requiring the exception process in REQ-031.
- Feature flag/rollout: database → profile → commission policy → commission snapshot → interactive
  reports → async export. Enable by environment/tenant; exports remain off until Trigger/R2
  readiness succeeds.
- Migration/backfill: do not invent historical commissions. Existing registered receipts remain
  `commission unavailable`; reports disclose incomplete coverage. Profile prototype fixtures are
  never migrated. Any conversion of existing professional percentages must be previewed and
  tenant-qualified.
- Rollback: disable UI/capabilities and task triggering; preserve additive tables, immutable facts
  and artifact metadata; stop new workers; keep ready artifacts downloadable until retention or
  explicitly expire them through the application lifecycle.
- Operational readiness: user provisions Trigger.dev projects and private R2 resources/credentials
  for each environment when available. Before enabling `hml`, verify least privilege, bucket CORS
  posture (none required for server-generated files), lifecycle, task deployment, webhook/API
  authentication if applicable, readiness checks, retry/cleanup runbook and restore behavior.

## Success Measures

- Success signals: an owner/admin can complete the profile, configure commission, register a
  receipt with reconciled immutable commission, answer every accepted report question from real
  data, leave/revisit an export and download the correct private artifact.
- Baseline or measurement plan: no production baseline exists. Capture report usage, successful
  completion, latency distribution, export terminal outcomes, retries and artifact downloads during
  the first pilot without recording filter values or business payloads.
- Regression guardrails: checkout correctness/latency, tenant isolation, access denial, report
  reconciliation, production fixture exclusion, accessibility and operation without export
  providers must not regress.
- Evaluation window: review qualitative owner feedback and operational metrics after the first
  complete pilot reporting cycle; do not invent numeric adoption targets before that baseline.

## Acceptance Criteria

- [ ] AC-001: Owner/admin can persist, reload and concurrently update the full in-scope barbershop
  profile; members can read its workspace identity but cannot mutate it.
- [ ] AC-002: Valid logo upload/replace/remove works through local and R2 adapters, rejects invalid
  content, preserves the prior logo on failure and never exposes storage credentials/permanent URLs.
- [ ] AC-003: Owner/admin can configure professional defaults and service/professional overrides;
  invalid, duplicate, foreign-tenant and stale mutations fail atomically and members see no
  unauthorized commission facts.
- [ ] AC-004: Receipt registration and reversal create reconciled immutable commission facts using
  exact cents and snapshotted rule provenance; policy changes never rewrite history.
- [ ] AC-005: The production `/reports` experience answers all defined report families from real,
  tenant-isolated facts with coherent filters, explicit coverage and no browser raw-data scan.
- [ ] AC-006: Report revenue, ticket, service, professional, commission, customer, cancellation and
  cash totals reconcile under split tenders, discounts, surcharges, reversals and replacement
  receipts.
- [ ] AC-007: An authorized export request returns immediately, progresses through persisted states,
  survives navigation/reload/provider retry and converges on at most one ready artifact per logical
  attempt.
- [ ] AC-008: PDF and CSV artifacts represent the normalized filters, contain required context,
  resist CSV formula injection, are private in R2 and download only after current authorization via
  a short-lived grant.
- [ ] AC-009: Failed, unavailable and expired artifacts have actionable Portuguese recovery; report
  metadata remains bounded/paginated and private artifacts expire after the documented retention.
- [ ] AC-010: Profile, commission and reporting journeys work with keyboard and screen reader
  semantics, at 320 CSS pixels/200% zoom, in light/dark/system themes and without color-only meaning.
- [ ] AC-011: Logs/traces/metrics/audit prove cross-system outcomes and tenant isolation without
  leaking PII, financial rows, credentials, object contents or presigned URLs.
- [ ] AC-012: Local provider fakes support deterministic development; deployed export/media gates
  fail readiness when required configuration is absent; rollout/rollback preserve existing 23/24
  behavior and immutable data.
- [ ] AC-013: A reviewed parity matrix proves that every pre-integration setup, commission and
  reporting field, action, validation, state, responsive behavior and accessibility interaction is
  preserved in the HTTP-backed experience; every approved exception links its hard constraint,
  before/after evidence and product decision.

## Verification Plan

- Unit tests: profile normalization; image inspection; commission policy precedence/calculation/
  rounding/capping/reversal; report definitions/reconciliation; CSV neutralization; report state
  machine; retry/idempotency and UX copy/state projections.
- Integration/API tests: PostgreSQL constraints/indexed tenant queries, access matrix, concurrent
  policy/profile writes, receipt snapshot transaction, report aggregates, job creation/status/
  retry/download, fake Trigger/R2 partial failures and cross-tenant object denial.
- UI tests: HTTP source boundaries, forms, logo states, policy table/drawer, filter normalization,
  chart/table equivalence, generated-report history/polling, draft preservation, permission and
  provider-degraded states.
- Parity tests: pre-change UI inventory and screenshots; shared adapter conformance suite; paired
  memory/HTTP Playwright journeys; explicit field/action/state diff with zero unexplained removals.
- Manual/browser checks: owner/admin/member journeys; desktop and 320px mobile together; keyboard,
  focus, zoom, dark mode, forced colors, reduced motion; one manual VoiceOver or NVDA report and
  export journey; inspect generated PDF tags/order and CSV in common spreadsheet software.
- Build/check commands: `bun run check`, affected package Vitest suites, API PostgreSQL integration
  suite, Studio Playwright/axe suites, production-boundary build, migration verification and the
  repository preflight command current at implementation time.

## Open Questions

### Blocking

- None. Product defaults are deliberately reversible and provider secrets are not required to
  approve or begin implementation.

### Non-Blocking

- [ ] Confirm Trigger.dev project IDs/API keys and private R2 bucket credentials per `dev`, `hml`
  and `prd` before integrated export/media verification — owner: user/platform operations.
- [ ] Measure whether 30-day artifact retention matches pilot behavior before production rollout —
  owner: product; changing retention is a product/data-policy revision.
- [ ] Decide whether XLSX, scheduled delivery or professional statements deserve separate
  initiatives after observing PDF/CSV usage — owner: product.

## Assumptions

- Initiatives 23 and 24 will be approved and their final sealed-service/receipt contracts will
  preserve the behavioral facts referenced here; validate during TASK-001 and revise this PRD if
  their review materially changes them.
- Owner/admin are the only current management-finance actors; validate against the final access
  matrix before migrations.
- R2's S3-compatible API, private objects, short-lived presigned GET URLs and lifecycle rules remain
  available; verify against current official documentation during implementation.
- Trigger.dev supports task idempotency, queues/concurrency, retry and run correlation required by
  the selected design; pin and verify the current SDK contract before adding dependencies.
- Trigger.dev is configured inside `apps/api` with Bun runtime and API-owned task discovery; validate
  this monorepo layout with the installed `trigger-setup` skill before scaffolding.
- The existing R2 S3-compatible implementation pattern can support conditional writes, `HEAD`
  verification and presigned GET access through a business-owned port; validate exact SDK/R2
  compatibility at implementation time.
- A single accessible PDF summary and UTF-8 CSV detail export are sufficient for the first pilot.

## Definition of Ready

- [x] All mandatory gates in `planning-gates.md` pass.
- [x] Requirement-to-acceptance-to-task traceability is complete.
- [x] The planning state is `Ready` before requesting approval.

Provider provisioning is an explicit pre-`hml` execution dependency, not a missing product or
architecture decision. The initiative is ready for approval and can begin with local provider ports,
domain contracts and migrations.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-06 | Awaiting approval |  | Initial product, UX and architecture proposal |
| 2026-09-06 | Approved | User | Approved without further changes |
