# TRIAD Studio

Multi-tenant context routing and the production client HTTP source are documented in
[`docs/studio/multi-tenant-contexts.md`](../../docs/studio/multi-tenant-contexts.md). Operational
provisioning, ownership recovery, support, rollout, and rollback are documented in
[`docs/operations/multi-tenant-access-runbook.md`](../../docs/operations/multi-tenant-access-runbook.md).

Authenticated barbershop-management frontend for CRV Triad.

## Development

The local development server exposes one unified TanStack Devtools launcher in the lower-right
corner, with dedicated Query and Router panels. Query Devtools lets developers inspect query keys,
cache state, fetch status, stale state, and mutations. The unified shell is hidden from preview-only
surfaces and production builds. Studio owns the visible `TS` launcher and delegates its action to
the unified shell because the upstream alpha trigger is not reliable across authenticated layouts.

```bash
bun --filter studio dev
bun --filter studio check
bun --filter studio build
```

Routes:

- `/login`
- `/accept-invitation` (one-time invite validation and native credential creation)
- `/forgot-password`
- `/reset-password` (consumes Better Auth's native query-token contract)
- `/workspace-preview` (development-only visual shell preview; no login required)
- `/workspace-preview/sandbox` (development-only neutral component/data sandbox)
- `/workspace-preview/agenda` (development-only Agenda board/list interaction and QA surface)
- `/agenda` (authenticated Agenda visual prototype with default temporal board and alternate list)
- `/service-desk`, `/service-desk/$sessionId`, and `/service-desk/$sessionId/checkout`
  (authenticated queue, service fulfillment, exact payment registration, and commission
  evaluation)
- `/cash` (authenticated cash count, daily close, and bounded read-only closing history)
- `/reports` (authenticated bounded historical operation and revenue reports)
- `/notifications` (authenticated operational notification center; intentionally absent from the
  primary sidebar)
- `/barbershop-setup` (authenticated barbershop setup module)
- `/overview` (authenticated operational Dashboard derived from the scheduling source)
- `/profile`
- `/preferences`

TRIAD Studio intentionally exposes only the authenticated shell and account-local preferences.
Identity administration remains outside the Studio surface. New business domains require an
accepted initiative and explicit authorization, API, and persistence contracts.

Authentication remains IDP-owned. Studio delegates email/password sign-in, token-proven first
access, Google sign-in, verification resend, forgot/reset/change password, account listing,
Google linking/unlinking, session resolution, and sign-out directly to the Better Auth browser
client at `VITE_AUTH_BASE_URL`. `/preferences` exposes the bounded `Segurança e acesso` controls;
it does not expose identity administration. See `docs/studio/authentication.md` for safe redirects,
UI states, provider-error handling, accessibility, and test boundaries.

Invitation acceptance removes the opaque query proof from browser history before form entry,
uses a no-referrer policy, never accepts editable identity or role data, prevents duplicate submit,
creates a session, and redirects directly to the authenticated overview. Invitation, reset, and
preference password forms share the same 8–256-character composition guidance in Portuguese while
the IDP remains authoritative.

The preview and sandbox redirect to `/login` in production. The sandbox is deterministic and
resettable, persists nothing, and never mocks authentication. Verify it with
`bun --filter studio test:e2e:sandbox`; verify both production routing and bundle exclusion with
`bun --filter studio test:production-boundary` and `bun --filter studio test:e2e:production`.
The focused auth browser flow is available through
`bun --filter studio test:e2e -- tests/e2e/auth-lifecycle.spec.ts`; it uses local network fakes and
never calls Google, Resend, or a deployed IDP.

The Agenda prototype uses one canonical `Quadro`/`Lista` selector, a 15-minute time axis with barber
columns, deterministic session-memory fixtures, button-trigger filters, a date-range calendar,
mouse/touch/keyboard allocation drag, drawer-based non-drag rescheduling, non-drag status changes,
and atomic optimistic rollback. Temporal drag changes start/barber only, never status. It is
intentionally unavailable in `hml`
and `prd`; see `docs/studio/schedule-prototype.md` for the visual contract, runtime boundary, and
residual manual accessibility checks.

The operational Dashboard at `/overview` derives filters, KPIs, upcoming work, attention, flow,
professional occupancy, capacity, supported finance, services, cancellations/no-show, and
completed-client counts from the same local/dev scheduling repository used by Agenda. Unsupported
financial and client facts remain explicit unavailable states, and `hml`/`prd` fail closed. See
`docs/studio/dashboard.md` for formulas, URL safety, accessibility, and future API boundaries.

The front-desk evaluation module at `/service-desk` projects scheduled arrivals from the same
session-memory scheduling repository, keeps `called` as reception-only state, and transitions the
original appointment to `in-progress` when service starts. Walk-ins remain temporary queue
snapshots, require human assignment for `Primeiro disponível`, and create neither Clients nor
Agenda appointments. It follows the scheduling source boundary, fails closed in `hml`/`prd`, and
adds no environment variable. The child workspace keeps performed services, professional
attribution, bounded notes, and the ready-for-payment handoff in the same session-memory lifecycle.
See `docs/studio/service-desk.md`.

The checkout child route consumes the accepted ready-session handoff, calculates every amount in
integer cents and commission rate in basis points, registers Pix/cash/debit/credit or exact mixed
tenders, and atomically snapshots one immutable paid sale. Scheduled payment completes the linked
appointment; walk-in payment creates none. Supported Dashboard finance facts use the same paid-sale
source. The top-level `/cash` route derives its exact unit/date summary from those paid sales and
scheduling outcome facts, records counted cash, and atomically stores one immutable closing
snapshot with bounded read-only history. This remains a local/configured-`dev` visual prototype
with no gateway, sensitive payment field, persistence, production authorization, reopen, or
provider reconciliation. See
`docs/studio/revenue-operations.md`.

The authenticated `Relatórios` module at `/reports` applies one canonical
inclusive URL filter set to seven bounded management projections. It reconciles
integer-cent paid revenue, ticket, and immutable commission facts; states
cancellation/no-show denominators; and excludes unknown customer identity from
new/returning ratios. Every chart has a textual takeaway and table equivalent.
The deterministic source is composed through accepted public repository seams
only for `local`/configured `dev`, fails closed in `hml`/`prd`, adds no public
environment variable, and exposes no API, persistence, export, polling,
forecasting, or production role claim. See `docs/studio/reporting.md`.

The workspace notification bell, Dashboard `Atenção necessária`, and
authenticated `/notifications` center share one bounded operational notification
repository. It covers seven accepted categories with stable dedupe, severity
ordering, read state separate from source resolution, typed safe destinations,
resolved history, exact accessible unread counts, and deterministic
load/error/reset/reload scenarios. Classification derives from raw scheduling,
service, and payment source-port snapshots with explicit thresholds; Dashboard
rows preserve their typed destination and their loading/error/unavailable/empty
states. Its visible count caps at `99+`; `hml` and `prd` fail closed without a
new environment variable. See
`docs/studio/operational-notifications.md`.

The authenticated barbershop setup module presents a guided overview, fill-height
unit/professional/service catalogs, structured unit opening hours, and a dated block-based
availability calendar. The calendar supports day, week, and month views, URL-backed temporal
navigation, pointer selection plus click/keyboard alternatives, bounded weekly recurrence, exact
one-offs, per-date exclusions, explicit occurrence/series scope, conflict feedback, retry, and
atomic batch rollback. Local and configured deployed `dev` builds compose a deterministic
session-memory source; the normal UI does not expose scenario or reset controls. `hml` and `prd`
resolve the source as disabled and exclude fixtures; no API, persistence, tenancy, or authorization
contract is accepted. See `docs/studio/barbershop-setup.md`.

Component placement, exhaustive inventory, public and internal-only decisions, token layers,
adapter boundaries, and manual accessibility checks are documented in English at
`docs/studio/component-system.md`. Focused Vitest and Playwright coverage verifies behavior without
a separate component-catalog runtime.

The shipped Studio theme is dark-first navy/gold with deliberate light, dark, and system
preferences. `src/index.css` owns the primitive, semantic, and component token layers, while the
document-head `public/theme-init.js` resolves the saved/system preference before React paint. The
durable token, contrast, status, gradient, and contribution contract lives in
`docs/studio/theme-system.md`.

Runtime env:

- `VITE_APP_NAME`
- `VITE_AUTH_BASE_URL`
- `VITE_BARBERSHOP_SETUP_SOURCE` (`disabled` or `memory`; defaults to `disabled`)
- `VITE_CLIENT_MANAGEMENT_SOURCE` (`disabled` or `memory`; defaults to `disabled`)
- `VITE_DEPLOY_TARGET` (`local`, `dev`, `hml`, or `prd`; defaults to `local`)
- `VITE_SCHEDULING_SOURCE` (`disabled` or `memory`; defaults to `disabled`)

`bun --filter studio dev` explicitly composes memory scheduling, barbershop setup, and client
management for local UX
work. Remote `dev` builds require `VITE_DEPLOY_TARGET=dev` plus `memory` in the relevant source
variable. The composition boundary ignores memory for `hml` and `prd`, and production checks reject
synthetic markers.
