# TRIAD Studio

Authenticated barbershop-management frontend for CRV Triad.

## Development

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
and returns to normal login without creating a session. Invitation, reset, and preference password
forms share the same 15–256-character Portuguese guidance while the IDP remains authoritative.

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
