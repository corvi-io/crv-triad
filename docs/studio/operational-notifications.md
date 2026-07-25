# TRIAD Studio Operational Notifications Prototype

ENG-54 activates the authenticated workspace bell and adds `/notifications`.
The frontend-only source is available for local/configured `dev` evaluation and
fails closed in `hml` and `prd`. There is no sidebar entry, API, persistence,
provider, polling, realtime transport, external delivery, dismiss, snooze, or
manual operational resolution.

## Source And Ownership

`src/modules/operational-notifications` owns contracts, pure projection rules,
safe typed destinations, repository/query vocabulary, and presentation.
`src/dev/operational-notifications` owns deterministic source facts, explicit
appointment event snapshots, scenarios, read-state memory, and the development
repository. `virtual:studio-operational-notifications-source` is the only
composition seam. Production presentation never imports `src/dev`.

The authenticated route provides one repository instance to the shell,
Dashboard, and notification center. The header preview and history are bounded
independently. The Dashboard `Atenção necessária` projection uses the same
active IDs and ordering rather than its former scheduling-derived attention
fixtures. A future production implementation must consume tenant/unit-bounded
scheduling, service, payment, and event contracts through an authorized API.

## Categories And Rules

The source covers:

- excessive queue wait at 15 minutes;
- an appointment inside the next 10 minutes;
- an accepted scheduling conflict fact;
- an open service past estimated duration plus 15 minutes;
- a ready-for-payment unpaid session;
- a relevant blocked slot;
- an explicit appointment changed/canceled event snapshot.

Stable dedupe keys collapse repeated source facts. Active ordering uses
severity, occurrence time, then stable notification ID. Read/unread is
presentation state only. Resolution is derived from the current source fact and
never occurs when a user marks an item read or follows its destination.
Resolved items appear only in bounded history.

Destinations are an allowlisted union for Agenda, Service Desk, checkout, and
the notification center. Only opaque stable identifiers enter route paths or
search. Invalid or missing targets render a bounded recovery link to Agenda.
Names, contact data, notes, financial values, and arbitrary URLs are excluded.

## Scenarios And Generation Safety

The deterministic source includes normal, empty, duplicate, over-99 unread,
resolved, missing-target, slow load/read, fail-next-read, persistent-error, and
long-content scenarios. The `scenario` search value exists only for test and
review reproducibility; ordinary product chrome exposes no scenario picker.

Scenario selection and reset increment a generation, reconstruct source/read
state, and re-arm one-shot failure. Delayed reads and mark-read mutations verify
their captured generation before returning or writing. Reload reconstructs the
URL-selected scenario and never persists read state.
Scenario and reset controls are not rendered in ordinary product chrome.

## Accessibility And Responsive Contract

The bell is a 40px native button. Its visible count caps at `99+`, while its
accessible name preserves the exact active/unread count. The Base UI popover
opens by keyboard, has a title/description, and restores focus on Escape.
Severity, read state, and lifecycle always include text/icon rather than color
alone. Mark-read outcomes use a concise polite live region without business
payload.

The center uses source-ordered headings, native links/buttons, shared
`ModuleLayout`, `PageHeader`, `Alert`, `Empty`, `Skeleton`, `Badge`, `Button`,
and semantic theme tokens. It reflows at 320 CSS pixels, keeps controls at
least 24px, supports 200% CSS-zoom simulation, forced colors, reduced motion,
and light/dark/system themes without document overflow.

## Verification And Residual Manual Work

Focused Vitest covers every category, dedupe, ordering, bounds, read/resolution
separation, empty/error/reset/reload semantics, fail-next behavior,
generation-stale work, destinations, exact over-99 count, popover content,
center feedback, and missing-target recovery. Playwright covers the authenticated
shell/Dashboard/center journey, keyboard popover focus restoration, seven
categories, read state, axe WCAG 2.2 A/AA, light desktop, dark 320px, forced
colors, reduced motion, minimum targets, and CSS 200% zoom simulation.

Automated semantics and screenshots do not prove VoiceOver/NVDA behavior,
physical coarse-pointer behavior, or native browser 200% zoom. Those remain
manual review risks until exercised on the corresponding platforms.
