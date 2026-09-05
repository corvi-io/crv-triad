# Studio Client Management

Client unit, professional, and service preferences are persisted as tenant-scoped catalog IDs.
The form uses bounded catalog option endpoints, does not create arbitrary labels, and keeps archived
selections readable. Legacy service labels remain read-only during the compatibility period.

## Scope

`/clients` is an authenticated product-evaluation module owned by Studio. It provides a bounded
client directory, responsive client profile, appointment summaries, service preferences, internal
notes, reversible archive/restore, and factual possible-duplicate warnings. It does not establish a
business API, canonical aggregate, tenancy, authorization, persistence, consent, communications,
payments, files, health data, analytics, or synchronization with Agenda.

All current identities and activity are deterministic synthetic data. The feature is a visual and
interaction prototype, not production capacity or privacy evidence.

## Architecture

- `src/modules/clients` owns presentation contracts, URL parsing, repository/query vocabulary,
  validation, forms, directory, and profile UI.
- `src/dev/clients` owns the deterministic scenarios and session-memory repository.
- `virtual:studio-client-management-source` is the only composition seam used by the authenticated
  route. Production module code does not import `src/dev`.
- `VITE_CLIENT_MANAGEMENT_SOURCE` accepts `disabled` or `memory` through central Studio env parsing.
- The source resolves to memory only for `local` or `dev`; `hml` and `prd` always resolve the
  disabled shim, including when memory is requested.

The repository applies search, filters, allowlisted sorting, and pagination to the complete bounded
scenario before returning a page. Presentation uses TanStack Query and invalidates only client
keys. Mutation failures occur before writes, and archive/restore cache changes roll back to the
captured snapshot on error. Scenario generations discard delayed results after a source change.

## Route And URL Contract

`/clients` runs under `_authenticated`, `AuthGate`, and `WorkspaceShell`. `Clientes` appears in
expanded, collapsed, and mobile primary navigation.

Safe URL values are page, page size, sort field/direction, bounded filters, and `scenario`. Free-text
search, names, phones, emails, notes, and form values stay in component memory and never enter the
URL. Invalid values fall back to bounded defaults. The accepted scenario identifiers are:

- `typical`
- `empty`
- `dense`
- `incomplete-contact`
- `duplicate-candidates`
- `slow`
- `next-failure`
- `persistent-error`

The identifiers are technical inputs and do not appear in ordinary product chrome. A full reload
constructs a new repository, restores the selected scenario, deterministic IDs, records, notes,
appointments, and one-shot failure state, and removes session mutations.

Default list state is omitted from generated URLs: page `1`, page size `20`, active status,
name/ascending sorting, unfiltered controls, and the typical scenario. `client` identifies an open
client drawer. View is implicit when `mode` is absent; `mode=edit` restores the separate edit drawer.
Closing either drawer removes both parameters, so copied links preserve intentional overlay state
without serializing the entire default list configuration.

## Interaction And Privacy

The directory supports repository-backed search, state/contact/duplicate filters, allowlisted
sorting, and 10/20/50-row pages. A client name is the primary row action; right-click and
`Shift+F10` expose contextual view, edit, and archive/restore commands without an `Ações` column.
The tag filter loads its bounded option catalog from the active barbershop through
`GET /api/clients/tags`; it does not use hard-coded choices or infer facets from the visible page.

The focus-managed, read-only profile drawer exposes `Resumo`, `Agendamentos`, and `Notas`; editing
uses a separate form drawer so each surface keeps one clear intent. Appointment lists are bounded
and progressively expanded. Create/edit requires a name and phone or email, uses the shared
Brazilian phone mask, a one-at-a-time removable tag input, React Hook Form, Zod, linked errors, and
first-invalid focus. Duplicate
warnings identify only exact normalized email or phone matches and allow candidate inspection; no
merge command exists. Note removal and archive/restore require confirmation. Notes explicitly warn
against credentials, payment cards, documents, health data, and other sensitive data.
Table, profile, and edit-form loading states use layout-shaped skeletons with accessible status
names instead of visible loading copy.

Service preferences remain compatible with the current client contract during Initiative 19. When
the tenant-scoped service catalog is available, the free-text field must be replaced by a
multi-select populated from the active barbershop's real services. The form must persist stable
service references defined by that API, avoid hard-coded Studio options, and preserve a readable
state when a previously selected service is later archived.

The implementation sends no network requests, stores nothing in browser storage, intercepts no
authentication traffic, emits no analytics, and logs no record or form payload.

## Production Boundary

`STUDIO__VITE_CLIENT_MANAGEMENT_SOURCE` is the Infisical `/studio` source forwarded as
`VITE_CLIENT_MANAGEMENT_SOURCE`. Deploy targets `hml` and `prd` fail closed regardless of its
requested value. Production-boundary builds explicitly set the source to `disabled`, and artifact
scans reject the memory repository, scenario identifiers, and representative synthetic identities.

Before enabling real data, a separate initiative must accept the API, tenant/unit scope,
authorization, normalized-contact rules, persistence, audit history, privacy lifecycle, merge
recovery, migration, indexes, bounded server search, concurrency, and measured capacity.

## Verification

Focused Vitest covers URL allowlists, form schemas, contact normalization, duplicate warnings,
repository-side bounds, CRUD, notes, archive/restore, deterministic reload reset, atomic one-shot
failure behavior, persistent errors, and delayed-operation isolation. Playwright covers private
navigation, desktop/collapsed/mobile active state, representative scenarios, directory controls,
keyboard context actions, duplicate inspection, mutations, validation/focus, reload reset, axe,
dark theme, reduced motion, 320 CSS-pixel reflow, focus return, and internal table overflow.

Physical VoiceOver/NVDA and real-device coarse-pointer checks remain manual release evidence; axe
does not replace them.
