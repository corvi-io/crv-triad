# Production scheduling

Normal Agenda, availability and Dashboard routes use the tenant-scoped HTTP API. Set
`VITE_SCHEDULING_SOURCE=http`, `VITE_BARBERSHOP_SETUP_SOURCE=http` and
`VITE_CLIENT_MANAGEMENT_SOURCE=http`. HTTP is the scheduling default; failures never substitute
memory records. Explicit memory configuration is retained for deterministic local QA only and is
excluded from hml/prd artifacts.

## Daily operation

Units without a timezone show a contextual two-step introduction: confirm the local time,
then configure professional availability. The selector uses Brazilian city/region labels
mapped to IANA identifiers. A recognized device timezone is a visible suggestion only;
saving always requires confirmation. Unsupported device regions leave the selection empty.
Failures preserve the selection, and switching units resets the form. Members see an
explanation directing them to the responsible administrator instead of mutation controls.

Design references: [Calendly timezone setup](https://calendly.com/help/time-zones-overview)
and [NN/g contextual onboarding](https://www.nngroup.com/articles/onboarding-tutorials/).
The flow preserves Studio tokens and uses the existing accessible Select component.

Choose an active unit in Agenda. If it has no confirmed timezone, open Disponibilidade and confirm
its IANA timezone before configuring working rules. Unit selection is explicit; a single available
unit may be selected automatically. A professional must be active, assigned to the unit and eligible
for the chosen service. The API rechecks all catalog relationships and available time when saving.

Availability supports day/week/month, four labeled rule types, weekly recurrence, inclusive bounds,
series/occurrence scope, archive and restore. Members can inspect rules; owners/admins with the
commercial capability can change them. Missing setup explains the next action. Recurring exceptions
remain visible as restorable occurrences; archived series retain a restore command.

Availability defaults to all professionals in the selected unit. The optional professional filter
narrows the projection; clearing it restores the complete view. Day/week use an hourly grid with
named, separately reachable overlapping blocks and additional width for busy day columns. Mouse
dragging selects a 15-minute-aligned interval in either direction and opens the existing editor;
Escape/pointer cancellation discards the preview. Touch retains vertical scrolling and tap-to-create.
Day headers and keyboard activation remain alternatives to dragging. With no professional filter,
the editor requires a professional selection; an existing rule retains its original professional.
Repetition remains an explicit choice between a single date and a weekly series. No selection alone
persists a record. Month remains a compact overview with block editing.

Interaction references: [Google Calendar interval creation](https://support.google.com/calendar/answer/72143?hl=en)
and [recurring events](https://support.google.com/calendar/answer/37115?hl=en).

Agenda day/week boards use the same records as the server-paginated list. Negative rules and private
occupancy prevent a filtered-out appointment from appearing as a free slot. Month/custom periods
longer than seven days use the list. Search text remains component state, never URL state. URLs
contain only validated dates, opaque unit/filter/appointment IDs, view/scope, page/sort and drawer
intent (`create`, `view`, `edit`, `reschedule`, `cancel`).

The appointment drawer searches canonical clients and active services/professionals. It never asks
for a copied client name/phone, editable price, payment or arbitrary status. Preferences are labeled
suggestions, including historical archived selections, and never select options automatically.
`Cadastrar cliente` opens the canonical ClientForm; closing it preserves the appointment draft and
successful creation returns the real client ID. Date/time use the shared composed controls.

View shows server snapshots and paginated lifecycle history with actor, action and time. Confirm,
check-in and no-show ask for confirmation; cancellation requires a reason and optional note. Editing
and rescheduling carry an expected version. A collision, offline request or stale version preserves
the draft. Explicit reload replaces the draft with the latest version for review; no silent overwrite
or production optimistic mutation is used. A network retry retains the same idempotency key.

## Connected consumers and UI ownership

Agenda mutations invalidate tenant-scoped Agenda, availability, Dashboard, Client and professional
projections. Client history/next appointment and professional upcoming appointments link back to the
same appointment. Dashboard reads the same range/list endpoints and presents only supported
appointment counts. `lastVisitAt`, revenue and fulfillment outcomes are not inferred from bookings.

WorkspaceShellContent owns the page inset; ModuleLayout owns page scrolling; ActionDrawer owns
header/body/footer. The primary action stays in PageHeader, which wraps at narrow widths. Tables and
calendars may scroll horizontally inside their bounded surface. Every mutation has a keyboard/click
alternative to drag. Required dates use supported button accessibility descriptions, and primary
button hover preserves the contrast of the solid token color. Light/dark, 320px, forced colors,
reduced motion and zoom-equivalent screenshots are part of local acceptance.

## Running locally

From the root:

```bash
bun scripts/scheduling-local-qa.ts
```

Open `http://localhost:3102`. The isolated API is `http://localhost:8102`, PostgreSQL is loopback
55442, and synthetic credentials are in `apps/api/.artifacts/initiative22/credentials.json`.
Accounts include `qa22-a-owner@example.invalid`, `qa22-a-admin@example.invalid`,
`qa22-a-member@example.invalid` and `qa22-b-owner@example.invalid`. The runner seeds relationships
and access, preserves existing QA bookings, and does not read the normal app database URL. On a
fresh database, confirm timezone and create availability through the UI. Stop with Ctrl-C; Docker
data remains available for the next run.

The checked-in real integration journeys run against this prestarted stack:

```bash
cd apps/studio
bunx playwright test --config playwright.live.config.ts
```

These tests use real Better Auth, API and PostgreSQL, without request interception. The separate
`tests/e2e` suite uses explicit memory sources and mocked identity for deterministic legacy UI
regression; it is not proof of persisted business behavior.

See [API contracts](../api/availability-and-scheduling.md),
[execution and evidence](../initiatives/tasks/22-production-availability-and-scheduling.md), and
[historical prototype grammar](schedule-prototype.md). Future queue/fulfillment work owns the
trusted waiting/in-progress/completed transitions; this slice exposes no generic public status write.

## Production Dashboard and accepted calendar refinements

The production Dashboard reuses WorkspaceOverview and its original card layout. Scheduling,
cancellations, service scheduled values and net capacity use the HTTP source. Completion,
paid values and reception stages remain explicitly unintegrated, with no fixture fallback.
Period queries are split into at most five seven-day requests; filters retain canonical IDs.
Net capacity excludes overlapping negative blocks once. Comparison metrics are omitted until
a complete comparison source is queried.

Availability supports edge auto-scroll during pointer selection and focuses the saved recurrence
period after creation. Appointment client, service and professional selection uses the existing
searchable combobox with canonical IDs; arbitrary text does not constitute a selected record.
