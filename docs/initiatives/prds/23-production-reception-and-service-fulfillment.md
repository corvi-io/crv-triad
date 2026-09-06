# 23 Production Reception And Service Fulfillment

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: Not started
- Owner: CRV Triad
- Last updated: 2026-09-05
- Approved by/date: User / 2026-09-05

## Summary

Persist the reception-to-completed-service journey for scheduled clients and walk-ins. Reception
can admit, call, start, and finish a visit; the performed services, responsible professionals,
operational timestamps, and history survive reloads and concurrent sessions. Agenda, Clients,
professional detail, and Dashboard consume these facts without duplicating their ownership.
Completion records work performed, independently of payment. Initiative 24 consumes the immutable
completed-service handoff to register receipts and operate cash.

Execution plan: [23-production-reception-and-service-fulfillment.md](../tasks/23-production-reception-and-service-fulfillment.md).
Successor: [24 Production Checkout And Cash Operations](24-production-checkout-and-cash-operations.md).

## Context

- Initiative 19 established persistent tenant-owned Clients. Initiative 21 supplies production
  catalogs and invited, IDP-backed professionals; Initiative 22 supplies availability and scheduling.
  On 2026-09-05 their local documents still contain final verification gates. This plan does not
  certify their completion or overwrite concurrent work; executable integration depends on their
  accepted final contracts and evidence.
- Service Desk and Revenue Operations currently expose development memory ports and are disabled
  in production. Their interaction models are useful evidence, not production business authority.
- Reception cannot reliably follow an arrived client through service execution with persistent data.
  A scheduling event is not proof of a visit, and a finished visit is not proof of payment.
- The user's repeated delivery problem is inconsistent behavior between modules, including copy,
  fields, masks, feedback, and lost work during competing edits. Consistency is a delivery contract.
- There is no pilot observation or measured conversion baseline in this research. Workflow choices
  below are explicit proposals for approval, grounded in existing product work rather than invented
  customer interviews.

### Repository Evidence And Authority

Paths are relative to the workspace root; observations describe the inspected worktree, not a release.

| Source | Finding and consequence |
| --- | --- |
| `apps/studio/AGENTS.md`, `apps/api/AGENTS.md` | Inline field errors, recoverable `409 version_conflict`, shared form composition and no silent stale overwrite are mandatory. |
| `docs/studio/client-management.md`, `apps/studio/src/modules/clients/client-form.tsx`, `client-schema.ts`, `client-edit-drawer.tsx` | Canonical client creation, name/contact rules, exact duplicate warnings, phone mask, view/edit separation and example placeholders are the baseline. |
| `apps/studio/src/modules/shared/components/forms/{form-layout,rhf-form-fields,masked-input,date-picker}.tsx` | Shared field anatomy, masks and canonical date-only values already exist. |
| `apps/studio/src/modules/shared/components/overlays/action-drawer.tsx`, `docs/studio/component-system.md`, `docs/studio/theme-system.md` | Drawer sizing, inset ownership, fixed actions, tokens, themes and scrolling must be reused. |
| `docs/initiatives/evidence/22-production-availability-and-scheduling/ui-inventory.md` | Cross-module consistency was specified, but the inventory explicitly is not final browser evidence. |
| `docs/api/availability-and-scheduling.md`, `apps/api/src/modules/scheduling/application/scheduling-service.ts` | `transitionFromFulfillment` is internal and opens its own transaction; merely calling it after a queue write would not provide atomicity. |
| `apps/api/src/modules/scheduling/domain/appointment.ts` | Trusted progression is arrived → waiting → in-progress → completed. Existing `occupies` retains completed reservation intervals. |
| `apps/studio/src/modules/service-desk/{contracts,walk-in-schema}.ts`, `docs/studio/service-desk.md` | Prototype walk-ins use temporary contacts; unit IDs and browser-clock conversion must not enter production. Prototype payment owns appointment completion; this proposal deliberately changes that coupling. |
| `apps/studio/src/modules/clients/queries.ts`, `client-form.tsx` | Some keys omit explicit tenant identity; a conflict path uses toast/page reload and form reset follows incoming data. Do not copy these mechanisms as the required safety contract. Verify the surrounding tenant boundary and preserve dirty drafts. |

Authority order: approved product contract and root/app instructions, shared component contracts,
then representative implementation. Where code diverges, record and fix only the shared behavior
needed by this journey with regression coverage; do not redesign or normalize unrelated modules.
Older skill references mentioning FastAPI, site port 3001 or generic soft deletion are superseded by
current root instructions and the explicit lifecycle below: Bun/Elysia, site 3004, no hard deletion.

## Actors And Workflows

- Owner/admin: performs reception and service operations, including exceptional closure of an
  interrupted service, and manages existing catalog/availability dependencies.
- Member/receptionist: performs ordinary reception and service execution within the active tenant.
  Being a professional does not create a new identity role or self-service authorization policy.
- Client: an existing tenant-owned record, or a temporary walk-in identity explicitly limited to
  this visit. A walk-in identity does not silently create or update a Client.

### Target Journeys

1. Reception opens `Atendimentos` in a real unit. Arrived appointments appear in an arrivals list;
   `Adicionar à fila` atomically creates one visit and advances arrived → waiting. Arrivals require
   no second check-in. Selecting an appointment without check-in offers the existing check-in action.
2. `Novo atendimento` selects an existing client or explicitly chooses `Sem cadastro`. Canonical
   `Cadastrar cliente` preserves the visit draft, validates existing Client rules, and returns its ID.
   A temporary walk-in requires a name but no contact; it is visibly labeled `Sem cadastro`.
3. The queue shows `Aguardando`, `Chamados`, and `Em atendimento`, with a list alternative. Calling
   does not reserve a professional. Starting explicitly selects or confirms an eligible professional
   and reserves the planned interval against appointments and other service work.
4. The focused service page records performed items sequentially. One professional performs one
   active item at a time. Additional services are queued explicitly; they do not silently change
   the current item or reserve an entire staff team.
5. Staff finishes each item, then finishes the visit. The server seals the service handoff and
   advances a linked appointment to completed in the same transaction. Clients gain a factual last
   visit; no payment is manufactured.
6. The completed visit remains discoverable in history. Before 24 is enabled the page shows
   `Atendimento concluído` and `Voltar aos atendimentos`, with no dead checkout action. With 24
   enabled, a separately authorized `Registrar pagamento` action opens that same visit's checkout.

### Recovery Journeys

- A client who leaves before service is removed from the active queue with a reason; a linked
  waiting appointment is canceled through a narrow trusted command, never marked as a no-show.
- `Voltar para espera` reverses a call, not an appointment lifecycle. Queue ordering retains arrival.
- An interrupted service can be closed by an owner/admin with a reason. Completed items are retained
  for checkout; an active uncompleted item is canceled and does not become a performed charge.
  A visit with no completed items is canceled and produces no checkout handoff or last-visit fact.
- Two operators opening the same visit do not acquire an editor lock. The second stale write gets
  a recoverable conflict, including commands from another tab of the same person.
- A request whose response is lost is retried with the same command key. It never creates a second
  queue entry, active service item, or completed-service handoff.

## Goals

- Make scheduled reception and walk-in service execution usable independently of financial delivery.
- Preserve one coherent vocabulary and interaction contract across Clientes, Agenda and Atendimentos.
- Protect working drafts and prevent double admission, overlapping work, and duplicate completion.
- Supply immutable performed-service facts and a narrow successor contract for Initiative 24.

### Cross-Module State Contract

| Reception/service fact | Linked appointment | Billing fact |
| --- | --- | --- |
| Checked in, not admitted | arrived | None |
| Visit waiting or called | waiting | None |
| Visit in service | in-progress | None |
| Visit completed, including interrupted closure with completed items | completed | No registration implied; sealed handoff available |
| Left before service, or interrupted with no completed items | canceled through trusted command | No handoff |
| Payment later registered, canceled or replaced in 24 | Remains completed | Separate revenue projection only |

Walk-ins do not create appointments. A canceled visit is terminal; readmission/reopening is not an
implicit recovery action. An operational mistake after completion requires a separately approved
correction policy, not financial editing of performed items.

## Non-Goals

- Payment registration, payment status mutation, cash, commissions, fiscal/accounting documents,
  inventory, products, tips, packages, refunds, and provider integrations.
- Automatic professional allocation, priority optimization, drag-based queue reordering, public
  booking, customer messaging, notification infrastructure or a professional self-service app.
- Client contact policy changes, automatic guest-to-client conversion, client merge, editing a
  completed service, or inferring visit history from canceled/missed appointments.
- Broad Clientes cleanup or a new design system. Realtime transport is deferred; bounded refresh
  and transactional write checks provide the accepted first delivery.

## Requirements

### Functional

- REQ-001: Every request derives tenant and actor from the authenticated server context and uses
  the existing active-tenant, membership, subscription and entitlement decision pipeline. Introduce
  `service_desk.read` and `service_desk.manage` for owner/admin/member, and
  `service_desk.correct` for owner/admin only. No cross-tenant support browsing or new IDP role.
- REQ-002: Persist tenant-owned UUIDv7 visits, items, lifecycle events and command receipts with
  integer versions, timezone-aware server timestamps and compound tenant foreign keys. One visit
  has one unit, optional appointment and optional client; source is scheduled or walk-in. Preserve
  history; do not expose hard delete.
- REQ-003: Scheduled admission requires an arrived appointment and atomically creates its unique
  visit plus trusted waiting transition. Enforce unique tenant/appointment admission in PostgreSQL;
  competing callers receive the existing visit or a recoverable conflict, never two admissions.
- REQ-004: Walk-in admission chooses either an active canonical client or a temporary name snapshot
  (2–100 trimmed characters) and optional valid Brazilian phone using the shared normalization.
  No dummy client or mandatory fake contact. Selecting a canonical client suppresses copied editable
  name/contact fields; the canonical create flow keeps its current name-and-contact requirements.
- REQ-005: Admission requires an active unit with confirmed timezone, one eligible service and
  either a specific eligible professional or `Sem preferência`. The latter never automatically
  assigns. Arrival defaults to server now; optional correction uses the unit's current local date
  and HH:mm, must not be future, and stores submitted local time plus resolved UTC/timezone.
  Temporary contact and arrival can be edited only before start, with version checks.
- REQ-006: Queue order is ascending arrival instant then opaque ID within each stage. Scheduled
  versus walk-in and `Encaixe` are visible descriptors, not hidden priority or collision overrides.
  Authorized staff can select any waiting visit to call; arbitrary rank mutation is not exposed.
- REQ-007: Lifecycle is waiting → called → in-service → completed, with called → waiting and
  pre-service → canceled recovery. Active visit state and read-only events are server-owned;
  no generic status selector. `Registrar saída` requires a 3–160-character reason.
- REQ-008: Start requires called status and explicit professional confirmation. The API rechecks
  unit hours, active membership/professional, service assignments, positive availability, negative
  blocks, appointments across units and service occupancy before creating the first active item.
  The interval begins at server now for the catalog duration, not an invented historical start.
- REQ-009: Persist one scheduling-owned occupancy projection shared by appointment and service
  writes, with a database exclusion invariant for tenant/professional/time and a unique live-service
  claim per tenant/professional. Do not rely on two independent table constraints or only UI checks.
  Scheduled start consumes/replaces its own booking reservation atomically, excludes only that
  reservation when checking conflict, and preserves original booking snapshots. All booking,
  availability and service paths participate in the same transaction lock order.
- REQ-010: Active service items have a planned end and actual start/end. Explicit `Estender horário`
  uses a positive 15-minute increment and rechecks collisions atomically. At planned end without
  completion show `Tempo previsto excedido`; do not silently mark free or finish. The live-service
  claim prevents another service start. While overdue, reject new booking/reschedule commands for
  that professional until the active item is finished or a conflict-free extension establishes a
  new planned end; this conservative rule avoids promising an unknown release time. Already
  reserved next appointments remain visible with conflict guidance; staff resolves them explicitly.
- REQ-011: A visit contains 1–20 service items. Additional items snapshot current eligible service
  ID/name, duration and price in integer cents when added, start as pending, and allow professional
  assignment changes only while pending. One active item per visit; start-next repeats availability
  checks. Initial scheduled item uses the accepted booking service/price/duration snapshot, while
  current catalog eligibility is still required. Pending items may be removed explicitly.
- REQ-012: Completing an active item records actual end, releases its live claim and releases unused
  future occupancy; performed item identity, professional, label and price become immutable.
  A scheduled reservation retained while pending is released at the latest when the visit closes.
  Booking historical ranges must not be rewritten to simulate execution history.
- REQ-013: Finish requires at least one completed item, no active or pending items, and expected
  version. Seal one immutable completed-service handoff and update linked appointment, lifecycle
  event and client last-visit projection atomically. Handoff contains tenant/unit/timezone, visit
  and optional client/appointment IDs, completed item IDs, professional/service snapshots, prices,
  finish timestamp and version, plus customer-display and unit-name snapshots for authorized
  business reads. Contact values and operational notes are excluded. It exposes no revenue or
  commission assertion.
- REQ-014: Owner/admin interrupted closure cancels remaining pending/active items with a private
  3–160-character reason, releases claims, and seals completed items if any. With none, cancel the
  visit and linked appointment without a performed-visit fact. Trusted cancel transitions from
  waiting/in-progress are exposed only to this use case, never generic scheduling REST.
- REQ-015: Operational notes are optional plain text up to 500 characters, private to the tenant,
  editable while open, immutable after closure and excluded from the financial handoff. No health,
  card, credential or document data is requested. UI warns in helper copy, not repeated toasts.
- REQ-016: Arrival lists, queue stages, completed/canceled history, service detail and client history
  use bounded tenant/unit reads. Active visits carry across midnight until explicitly closed;
  the default active queue must not hide yesterday's unfinished work. History uses bounded local
  date ranges up to 31 days and 10/20/50-row server pages; stage cursors use 50 records maximum.
- REQ-017: Completing a linked-client visit updates `lastVisitAt` from performed-service finish
  facts and bounded client history without N+1 queries. Guests do not update Clients. Agenda,
  Dashboard and professional detail consume the same service/scheduling projections; occupancy
  is shown without exposing filtered-out client details.
- REQ-018: Normal routes use HTTP-backed Service Desk repositories with opaque real IDs, no memory
  fallback, no scenario/reset controls and no real/fixture hybrid. Source composition and module
  registry expose only authorized complete flows. Completed history is functional before 24.
- REQ-019: Define a server-only completed-handoff read port for 24 and a separate optional billing
  projection. Billing cannot mutate the operational completed state or its timestamps. Enabling 24
  makes earlier completed unregistered visits discoverable without generating payment records.

### Consistency, Safety And Delivery

- REQ-020: Apply every row of the Consistency Contract below; each changed surface must identify
  its reference component/source, deliberate domain specialization, implementation and browser
  evidence. Copying a known baseline defect is not parity. Freeze the inventory before UI changes.
- REQ-021: Every form uses domain-owned RHF/Zod schema/defaults, shared shell/fields/controls and
  explicit submit intents. API field errors map allowlisted `error.details.field` to linked inline
  errors and first-invalid focus; unknown fields map to a form alert. Expected failures are not
  toast-only and do not close the form.
- REQ-022: All mutations carry expected aggregate version and UUID idempotency key. Exact retries
  are deduplicated before stale-version rejection; changed payload under the same key returns
  `idempotency_conflict`. Different actors/keys still obey domain uniqueness. Receipt fingerprints
  are keyed hashes; persist no request payload in receipts or logs and do not expire receipts in v1.
- REQ-023: Capture version at edit start. Background refresh, query invalidation and tenant cache
  updates must not reset a dirty draft or silently adopt a newer version. `version_conflict` keeps
  the draft visible and offers explicit latest-data review; replacing the draft requires discard
  confirmation. No automatic retry with a new version and no `window.location.reload()` recovery.
- REQ-024: Cancel, Escape, backdrop and route departure share dirty-draft confirmation. During
  submission, block duplicate command and unsafe dismissal with stable button text. Tenant switch
  requires the existing confirmation, cancels old requests, clears old tenant drafts/results and
  rejects late responses; private drafts never enter URL or browser storage. Reauthentication
  requires a fresh authorized read before submission can resume.
- REQ-025: Query keys include tenant/unit scope where applicable, including option hydration.
  Mutations invalidate only related tenant visit, queue, appointment, client and Dashboard keys.
  Active queue refreshes at most every 15 seconds while visible, on focus/reconnect and explicitly;
  background/hidden tabs pause polling. Editing never discards draft for refresh. Failed refresh
  retains marked stale data, displays last successful update and disables unsafe actions until
  fresh data is obtained. Server write checks remain authoritative.
- REQ-026: Every form and page distinguishes skeleton, first-empty, filtered-empty, missing
  dependency, permission/subscription denial, loading options, options failure, stale record,
  version/occupancy conflict, saving, unknown outcome, success and closed read-only states.
- REQ-027: Preserve shared navy/gold tokens, Geist, light/dark/system, 320 CSS-pixel reflow, 200%
  actual browser zoom, keyboard alternatives, visible focus, non-color-only status, reduced motion,
  forced colors and at least 24×24 CSS-pixel targets. Automatic updates do not steal focus.
- REQ-028: Introduce no broad IDP changes, frontend secrets, cross-tenant record support, PII in
  telemetry or new package solely for Studio reuse. Public URLs allow only typed technical IDs,
  bounded filters, dates, stage/view and view/edit intent; strip defaults and exclude free text.
- REQ-029: Writes commit visit/items, scheduling projections, events and receipts in one database
  transaction. Adapt existing self-transactional scheduling ports to accept an explicit transaction
  at the internal boundary; never coordinate by sequential network calls. Constraint/deadlock
  failures map to safe errors and leave no partial effects.
- REQ-030: Generate additive migrations preserving Initiative 21/22 data. Backfill the unified
  occupancy projection from existing occupying appointments, verify counts/ranges before cutover,
  and make old booking writers compatible before enabling service starts. Do not reset baseline.
- REQ-031: Instrument metadata-only operations and query/conflict/refresh latency, failed handoffs
  and live-claim age. Events record actor/tenant, opaque IDs, action, changed field names, result,
  request ID and timestamp; never values, notes, contacts, prices or command keys. Audit writes are
  atomic with business mutations.
- REQ-032: Keep list/option/payload limits, tenant-leading indexes and lock order explicit; validate
  critical SQL, migration, cross-unit collision and retries on disposable PostgreSQL. No unbounded
  board/history load, per-record fetching, infinite recurrence or throughput claim from small data.
- REQ-033: Each continuation reads both plans, current predecessor status, applicable instructions
  and overlapping diffs; records task, changes, decisions, migrations, tests, failures and exact next
  action. Scope/permission/state changes require PRD revision, not a hidden implementation shortcut.
- REQ-034: Completion requires traceable browser and database evidence, all applicable app checks
  and at least 80% statements/branches/functions/lines coverage. Update durable module, source,
  access, deployment and testing docs; record every remaining defect or skipped manual check.

## Consistency Contract

This is normative for both 23 and 24. Initiative 24 adds its money-specific field inventory.
The reference is the existing operational product, with explicit domain specialization rather than
pixel-identical tables for every task. Operate mode prioritizes task completion and consistency.

| Concern | Required contract | Reference / verification |
| --- | --- | --- |
| Page anatomy | `WorkspaceShellContent` owns outer inset; `ModuleLayout` owns body scroll; `PageHeader.actions` owns primary command. No duplicated padding or bottom strips. | Client directory, shared layout; computed spacing and full-height screenshots. |
| Drawer anatomy | `ActionDrawer size="form"`, contextual header, fixed footer, primary right/secondary left; one body inset owner. Child forms do not add a second shell. | Client edit drawer, ActionDrawer; desktop and narrow screenshots. |
| Form grouping | Shared initially-open `FormSection` and field compositions. Standard controls retain shared height (currently h-10); compact form density is an explicit whole-group variant. | `form-layout.tsx`, shared Input/RHF controls; no local height overrides. |
| Labels | Same concept uses the same noun; required indicator belongs to label. Placeholders never replace labels. Helpers describe constraints and consequences without duplicating label. | Client name/contact, Agenda catalog selectors. |
| Placeholders | Text examples use `Ex.:`; selects use `Selecione…`; searches use `Buscar…`. No real/synthetic populated default pretending to be data, TODO, demo/debug or future claims. | Field inventory below; rendered and accessible-name assertions. |
| Masks | Shared `MaskedInput`, canonical value separate from display, correct inputMode, paste/delete/caret behavior. Do not use display punctuation as stored phone or money. | Shared mask tests plus browser keyboard/paste journey. |
| Dates and time | Shared `DatePicker` with YYYY-MM-DD; unit-local time controls and explicit timezone. No native date input, date-text mask or UTC date slicing. | Agenda/availability; midnight and timezone tests. |
| Selectors | Bounded async options, hydrate selected IDs, show failure/retry separately from empty. Changing unit/service invalidates incompatible selections with explanation; do not silently pick the first option. | Catalogs and production appointment drawer. |
| Client reuse | Reuse canonical client create flow, validation, duplicate inspection and masks. Keep parent draft; return persisted ID; cancellation leaves original selection intact. | ClientForm and Agenda quick-create journey. |
| Errors | Field error plus first-invalid focus; form-level alert for non-field failures; request ID available safely. Concise success toast is supplementary. | App AGENTS and `FormSubmissionError`; not the toast-only baseline path. |
| Concurrent editing | Capture original version; retain dirty draft; latest-data review is explicit; no overwrite, polling reset or claim that another person necessarily edited it. | Two tabs, two users, stale response and refocus tests. |
| Confirmation | Name the command and consequence; reversible cancel differs from leaving unsaved work. Primary verb never generic `Sim`/`OK`; retain focus on cancellation. | Shared ConfirmationDialog. |
| Loading and submission | Named layout-shaped skeleton; stable labels with shared loading indicator; disable duplicate click/Enter. Unknown outcome uses same-key retry. | Clients skeleton and shared Button. |
| Lists and filters | Shared compact search and filter components; server search/filter/sort over full dataset; distinguish first-empty/filtered-empty. No `Ações` column. | Client directory; search beyond current page test. |
| Pagination | 10/20/50 with `DataTablePagination` for numbered history; separate cursor controls for live stages, never pretend cursor results have page counts. | Shared pagination; last-page removal and filter reset. |
| Row actions | Primary click/tap plus keyboard-accessible menu/button. Right-click is an accelerator; mobile must not require hover or context-click. | Client table context actions plus touch equivalent. |
| URL and navigation | Typed technical state, defaults stripped, private search/drafts excluded. Back/forward restores scope and view intent; invalid/deleted IDs show bounded unavailable state. | Client and scheduling search contracts. |
| Read-only/history | `-` for missing table data, explicit view/edit mode, immutable history with factual timestamps. No fake zero amount, duration, visit or paid state. | DataTableCell, client profile and future revenue read model. |
| Freshness and context | Tenant-safe queries and late-response discard; stale banner with retry; refresh must not move focused rows or close the editor. | Active-context boundary and two-session browser journeys. |
| Visual/accessibility | Existing token colors, typography, focus, icon suffixes, themes, zoom, non-color-only statuses; no decorative dashboard redesign. | `docs/studio/theme-system.md`, actual computed contrast and screenshots. |

### Reception And Service Field Inventory

| Field / action | Label or copy | Control, default and rule |
| --- | --- | --- |
| unitId | Unidade / Selecione uma unidade | Active context may prefill; required confirmed timezone. |
| clientId | Cliente / Buscar por nome, telefone ou e-mail | Bounded selector; `Cadastrar cliente` and explicit `Sem cadastro` choice. |
| guestName | Nome / Ex.: Gabriel Silva | Required only without Client; empty initial value; 2–100 characters. |
| guestPhone | Telefone / (81) 99999-9999 | Optional shared brPhone mask; no parallel phone component. |
| serviceId | Serviço / Selecione um serviço | Required eligible option; no fake service default. |
| preference | Preferência de profissional | `Sem preferência` default / `Profissional específico`; helper: `Escolha o profissional ao iniciar o atendimento.` |
| professionalId | Profissional / Selecione um profissional | Required for specific preference and service start; preference is not reservation. |
| arrivalTime | Horário de chegada | Server-derived unit-local time; editable before start; no future instant. |
| priority | Tipo de entrada | `Normal` default / `Encaixe`; helper: `O encaixe não reserva um horário.` |
| notes | Observações / Ex.: Confirmar o acabamento antes de finalizar | Optional, 500 characters; helper: `Não inclua senhas, dados de cartão, documentos ou informações de saúde.` |
| exitReason | Motivo da saída / Ex.: Cliente não poderá aguardar | Required 3–160; private, never in toast. |
| interruptionReason | Motivo da interrupção / Ex.: Atendimento encerrado antes do previsto | Required owner/admin command; completed items retained. |
| item action | Concluir serviço | Ends only current item, not visit/payment. |
| visit action | Concluir atendimento | Confirmation: `Os serviços concluídos serão salvos e não poderão ser editados.` |
| version conflict | Este atendimento foi atualizado desde que você abriu esta tela. Suas alterações ainda não foram salvas. | Inline `Revisar dados atuais`; discard replacement explicitly confirmed. |
| occupied professional | Este profissional está ocupado no período selecionado. Escolha outro profissional ou revise o horário. | Field/command alert; refresh options, keep draft. |
| unknown outcome | Não foi possível confirmar o resultado. Verifique o atendimento antes de tentar novamente. | Read latest and same-key retry; do not claim failure or duplicate success. |
| queue empty | Nenhum cliente aguardando nesta unidade. | Authorized `Novo atendimento`; arrivals remain a separate truthful section. |
| filtered empty | Nenhum atendimento encontrado com esses filtros. | `Limpar filtros`; retain unit scope. |
| refresh failure | Não foi possível atualizar os atendimentos. | Show last update and `Tentar novamente`; distinguish from empty. |

## Brainstorm

### Problem Framing

Reception needs to know who is present and which work actually happened. The smallest useful slice
ends with an immutable completed visit, not a demo queue or an unbacked payment button.

### Gaps And Unknowns

- Requirements diagnosis: problem and actors are known; hidden workflow and consistency constraints
  were the main gap. Temporary identity, transaction composition, overlap, interruption and payment
  independence are resolved as explicit proposed decisions above.
- Final 21/22 worktree is moving. Reconciliation is an execution prerequisite, not an assumption of
  an unchanged prototype. Any contradictory accepted contract returns this plan to revision.
- No measured need for simultaneous multi-professional services, optimized priority or realtime.
  Sequential performed items and bounded refresh minimize ambiguity for the first production flow.

### Counterpoints

- Forcing client registration would reuse one identity but prevents contactless walk-ins under the
  current mandatory-contact Client rule. Preserve an explicit visit-only guest instead.
- A queue-only initiative is simpler but leaves no reliable service history or successor handoff.
- Copying prototype completion-on-payment would keep completed work occupying an operational state
  until payment exists. Separate operational completion and registration of receipts.
- A universal schema-rendered form could standardize fields but obscures domain dependencies.
  Reuse shell and controls while keeping explicit domain forms.
- Doing nothing preserves a bookable product with no persistent execution of the appointment.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Persist reception only | Small delivery | No completed-service facts; another partial journey | Only if queue validation were the sole product goal |
| B | Reception plus sequential fulfillment | Useful standalone workflow and stable checkout input | Requires transactional scheduling occupancy integration | Recommended |
| C | Reception, finance, commissions and realtime together | Broad operational coverage | Large coupled acceptance surface and delayed feedback | After validating the first two production slices |

### Recommendation

Option B, with the detailed consistency contract as an acceptance gate. Financial operations remain
the separate, dependent Initiative 24; visual and behavioral parity is shared across both.

## Architecture And Boundaries

- Site and Backstage: no new runtime surface or privileges.
- API: new sibling `apps/api/src/modules/service-desk` owns visits/items/handoffs; scheduling owns
  appointments and unified occupancy; availability owns working rules; clients owns client records.
  Reuse current `database` folders for consistency with inspected sibling modules.
- Proposed REST: `/api/service-desk/arrivals`, `/visits`, `/visits/:id`, and explicit command
  subroutes under `/api/service-desk/visits/:id` (`call`, `return-to-waiting`, `start`, `finish`,
  `cancel`, `interrupt`, `notes`, `items`, `items/:itemId/start|finish|extend|cancel`). Resolve
  metadata edits through versioned PATCH; all paths are module-prefixed and no generic status PATCH.
  Publish exact schemas, field allowlists, capabilities and error responses in local OpenAPI.
- Public failures: 400 `invalid_request` with optional safe field, 401/403 existing access reasons,
  safe 404, 409 `version_conflict`, `invalid_transition`, `professional_occupied`,
  `idempotency_conflict`, `active_dependency`; 429 existing rate-limit envelope; generic 500.
- Internal transaction-aware ports coordinate visit and scheduling facts under the existing
  tenant schedule lock, then visit/item rows in stable ID order. Catalog archive dependency readers
  reject removing active service dependencies; completed snapshots remain readable after archive.
- IDP: unchanged identity and invitation rules; capabilities belong to access/business policy.
- Studio: existing service-desk routes/ports, explicit HTTP composition, narrow Client/Agenda/history
  projections and shared primitives. No presentation-to-presentation imports or duplicated models.
- External providers: none. Proposed read port is an internal application dependency, not public PII.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Scheduled/guest journeys, interruption, completion | requirements-analysis, this PRD |
| Architecture | Applicable | Service Desk plus scheduling transaction boundary | triad-architecture, triad-api-development |
| API | Applicable | Versioned commands, access/errors/bounds, OpenAPI | triad-api-development |
| Identity and authorization | Applicable | Existing sessions; new business capabilities | business-context-and-access.md |
| Persistence | Applicable | Visits, occupancy migration, idempotency and audit | API conventions, triad-testing |
| Studio UI | Applicable | Existing routes made persistent; parity matrix | triad-studio-development, impeccable, ux-copy |
| Site UI | Not applicable | No public flow or marketing work | Root boundaries |
| Accessibility | Applicable | Queue, forms, focus, live updates | Studio AGENTS, accessibility skill during QA |
| Performance and scale | Applicable | Active queue, history, locks and indexes | REQ-016, REQ-025, REQ-032 |
| Security and privacy | Applicable | Private contacts/notes and tenant isolation | REQ-001, REQ-028 |
| Observability | Applicable | Conflicts, stale reads and live claims | REQ-031 |
| Reliability and delivery | Applicable | Atomicity, compatibility and source cutover | REQ-022–REQ-030 |
| Testing and QA | Applicable | Real PostgreSQL and browser acceptance | triad-testing, triad-product-qa during execution |
| Documentation | Applicable | Persistent module and predecessor contract updates | Task plan documentation task |

## Performance And Scalability

Visits/items/events grow with actual services; active queue is smaller than retained history but
must not be assumed tiny. Index tenant/unit/state/arrival for live lists, tenant/client/finish for
history, and tenant/professional/range for occupancy. Request bounds: 20 items per visit, 50 results
per options/stage request, 10/20/50 history rows, 31 local dates per history query. Counts are computed
server-side, not from loaded cards. Search/filter applies before pagination. A board loads bounded
stage pages and communicates more results; it never silently drops overflow.

With millions of visits, queries must seek through tenant-leading indexes and aggregate only the
selected scope. Record `EXPLAIN (ANALYZE, BUFFERS)` on generated safe datasets; small fixtures prove
correctness, not capacity. Tenant-wide lock serialization is inherited and an acknowledged hot-tenant
limit: measure lock wait and transaction duration before introducing finer locks. Realtime and
retention/partitioning remain follow-ups owned by future measured operational demand.

## Security, Privacy, And Abuse

Use existing session/CORS/origin protection and rate-limit behavior; writes must not bypass existing
authenticated protections. Bound bodies, free text, page sizes and range searches, cancel superseded
searches, and return safe 429/retry feedback. Guests do not create public signup or contact spam paths.
Unknown foreign IDs never reveal tenant existence. Preserve app access revocation semantics on every
command, including retries. Existing authenticated throttling is inherited; record measured needs
before adding module-specific numeric thresholds. No secrets or record payload in browser storage.

## Accessibility And UX

The consistency and field tables define implementation. Ordered named queue regions and list rows
offer equivalent keyboard/tap commands; no drag is required. Focus returns to a meaningful list or
next command after mutation, and removed focused cards do not strand keyboard users. Announcements
summarize changes without reading the whole queue on every refresh. Forms link helper/error IDs,
focus hidden-section errors by expanding the owning section, and restore parent focus after client
creation. Long names, 20 items, zero options, permission loss and pending dismissal are QA cases.

## Logging And Observability

Use existing request correlation. Trace reception commands, schedule-lock wait, occupancy checks,
transaction outcome and bounded projection duration. Count conflict classes, stale refreshes,
duplicate-admission rejection and finish failures. Alert on sustained server errors and occupancy
invariant failures using the existing telemetry destination; provide a runbook for live claims older
than expected and do not auto-close them. Record configured operational thresholds during rollout;
do not claim a monitoring system exists merely because a logging statement was added.

## Delivery And Rollback

1. Verify 21/22 acceptance and inventory current overlapping changes. Apply additive schema and
   compatible scheduling writers before Service Desk enablement; validate occupancy backfill and
   no double booking while old/new instances overlap.
2. Enable HTTP Service Desk only after migration/API/browser gates. Follow central env parsing and
   existing source composition; no frontend secret or extra deployment variable is required unless
   separately declared in `env-schema.yaml`. Preserve all normal local ports.
3. Rollback disables new commands and restores the last compatible application build while retaining
   visits, claims and occupancy. Do not deploy a pre-occupancy booking writer after service starts:
   pause scheduling/service mutations until a compatible fix is available. Reads and history remain
   available when safe. Rehearse this sequence, not just a destructive down migration.
4. Before enabling 24, verify the sealed handoff, earlier completed-history retrieval and no financial
   side effects. Deployment and release publication are separate from approving these documents.

## Success Measures

- Acceptance: one scheduled client and one guest reach completed service after reload and across
  two authorized sessions; exactly one handoff exists per completed visit.
- Guardrails: no duplicated admission/start/finish, no cross-tenant data, no stale overwrite, no
  lost draft on validation/conflict/refocus, and consistent Agenda/Client/Dashboard facts.
- During the first pilot week, review aggregate command failure/conflict rate, abandoned recoverable
  forms, refresh failures and task observations with the product owner. No numeric adoption claim;
  establish baseline during pilot and collect no contact/notes analytics.

## Acceptance Criteria

- [ ] AC-001: Owner/admin/member and denied/foreign-tenant requests obey the capability matrix;
  support context gains no new access and revocation prevents subsequent commands. (REQ-001, REQ-028)
- [ ] AC-002: Concurrent admission of one arrived appointment produces one visit and one waiting
  transition; a failed transaction leaves both unchanged. (REQ-002, REQ-003, REQ-022, REQ-029)
- [ ] AC-003: Existing client, canonical quick-create, canceled quick-create and contactless guest
  admission all preserve the correct parent draft and identity rules. (REQ-004, REQ-005)
- [ ] AC-004: Arrival order, call/return, pre-service exit, midnight carryover and paginated history
  behave as specified; no hidden automatic priority exists. (REQ-006, REQ-007, REQ-016)
- [ ] AC-005: Competing start/book/reschedule/block requests across units cannot double occupy a
  professional; a scheduled start excludes only its own reservation. (REQ-008, REQ-009, REQ-029)
- [ ] AC-006: Overrun, extension conflict, early item finish and live-claim release leave correct
  availability and do not silently move an existing next booking. (REQ-010, REQ-012)
- [ ] AC-007: Pending/active/completed item rules, maximum count, assignments, price snapshots,
  notes and interrupted closure are enforced, including zero performed items. (REQ-011–REQ-015)
- [ ] AC-008: Finish is atomic and replay-safe; completed service and linked appointment are final
  without payment, and lastVisitAt reflects only performed linked-client facts. (REQ-013, REQ-017)
- [ ] AC-009: History works before 24, no dead checkout/commission control ships, and 24 reads the
  sealed handoff without changing service state. (REQ-018, REQ-019)
- [ ] AC-010: Every consistency/field inventory row has source and actual UI evidence; Clientes and
  Agenda regressions are covered for any touched shared primitive. (REQ-020, REQ-034)
- [ ] AC-011: Invalid fields, unknown error fields, stale versions, background refresh, same-user
  tabs, double submit and lost response preserve the draft and correct version/key. (REQ-021–REQ-023)
- [ ] AC-012: Escape/backdrop/navigation, nested client creation, reauthentication, tenant switch
  and late responses satisfy focus, discard and tenant isolation rules. (REQ-024, REQ-028)
- [ ] AC-013: Two sessions reconcile queue changes within the configured visible refresh interval;
  stale-data and option failure are distinct from empty and never reset editing. (REQ-025, REQ-026)
- [ ] AC-014: Desktop and 320px in light/dark, actual 200% zoom, keyboard, forced colors and reduced
  motion pass recorded journeys; manual screen-reader checks are reported honestly. (REQ-027)
- [ ] AC-015: Real PostgreSQL queries, bounds, historical search beyond page one, migration backfill
  and old/new writer compatibility pass without resetting predecessor data. (REQ-030, REQ-032)
- [ ] AC-016: Sentinel tests show no private values in errors/logs/events/receipts; metadata enables
  diagnosing a failed finish and orphan/live-claim concern. (REQ-028, REQ-031)
- [ ] AC-017: Compatible rollback and HTTP production-boundary build preserve operational records
  and never reactivate fixtures or a booking writer unaware of live service. (REQ-018, REQ-030)
- [ ] AC-018: Applicable checks, coverage, live QA, durable docs and continuation checkpoint have
  linked evidence; no unchecked manual test is reported as passed. (REQ-033, REQ-034)

## Verification Plan

Unit: transition/item/identity/time policies, masks/schema/copy/error mapping and idempotency intent.
Integration: real Elysia routes and disposable PostgreSQL for uniqueness, cross-unit occupancy,
atomic rollback, safe errors, migration and late competing writes. Browser: scheduled and guest
journeys, client quick-create, partial interruption, two sessions, stale forms, missing dependencies,
source disablement and every consistency row. Exact commands and evidence ownership are in the plan.
This planning pass inspected source and docs; it did not run the application or certify runtime QA.

## Open Questions

### Blocking

None for the proposed contract. Approval includes the explicit guest policy, sequential item model,
completion independent of payment, role matrix and occupancy integration; alternatives require
revising both documents before implementation.

### Non-Blocking

- Realtime and finer schedule locks — product/API owners revisit after measured refresh/lock load.
- Guest retention and later conversion — product/privacy owners define a separate policy before
  adding automated expiry or conversion; v1 provides no automatic deletion or merge.
- Parallel service execution — product owner revisits after observing a pilot need, not during build.

## Assumptions

- Existing Client mandatory-contact policy remains unchanged; explicit guests serve contactless
  walk-ins. Validate this choice at approval and in pilot observation.
- A member can run reception/ordinary service, but only owner/admin can interrupt it. Validate at
  approval; no self-service-only professional permissions are implied.
- Final 21/22 contracts can support the transaction-aware occupancy extension. TASK-001 verifies
  compatibility before mutations; a material contradiction requires plan revision.

## Definition of Ready

- [x] Problem, evidence, alternatives, actors, proposed decisions, scope and standards are explicit.
- [x] Requirements, acceptance and dependency-ordered tasks are traceable.
- [x] Data, concurrency, accessibility, privacy, scale, observability and rollback are designed.
- [x] No unresolved product choice is delegated to an implementation task.
- [x] Approved; predecessor acceptance and runtime evidence remain execution gates.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-05 | Awaiting approval | Pending user decision | Requested planning only; no runtime implementation authorized by this document. |
| 2026-09-05 | Approved | User | Explicitly approved both initiatives: “pode aprovar as 2”. Scope unchanged; implementation has not started. |
