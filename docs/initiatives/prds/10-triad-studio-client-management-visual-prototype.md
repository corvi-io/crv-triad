# 10 TRIAD Studio Client Management Visual Prototype

## Summary

Add a product-realistic client-management evaluation module to the authenticated TRIAD Studio at
`/clients`. Barbershop teams should be able to find clients, review a complete profile, inspect
upcoming and past appointments, record service preferences and internal notes, and exercise
create, edit, archive, and restore journeys before backend contracts are accepted.

The module is frontend-first. Local development and the deployed `dev` target may compose a
deterministic session-memory source with synthetic data, repeatable URL scenarios, and reset by
full reload. `hml` and `prd` resolve the source as disabled until API, tenancy, authorization,
persistence, audit, and privacy contracts are accepted.

Execution plan:
[10 TRIAD Studio Client Management Visual Prototype](../tasks/10-triad-studio-client-management-visual-prototype.md)

## Context

- Studio currently has authenticated Agenda and barbershop-setup modules, but no client directory
  or client profile.
- Agenda stores client identity as appointment-local fields and generates a new `clientId` for a
  newly created synthetic appointment. It is not a client system of record.
- Product work is intentionally validating frontend workflows with preloaded, deterministic,
  resettable scenarios before building business APIs.
- The existing Studio memory/scenario engine, module-owned repository pattern, TanStack Query
  composition, tables, drawers, forms, and production-boundary checks can support this evaluation
  without defining a backend schema.
- Current market products treat client profiles, contact details, internal notes, appointment
  history, tags, and duplicate review as a core operational area:
  - [Fresha client management](https://www.fresha.com/help-center/knowledge-base/clients)
  - [Fresha client history](https://www.fresha.com/help-center/knowledge-base/clients/204-view-client-history)
  - [Square customer profiles](https://squareup.com/help/us/en/article/8401-edit-merge-or-delete-customer-profiles)

Related sources:

- [Linear initiative](https://linear.app/corvi-io/initiative/triad-studio-client-management-visual-prototype-47f9c3e46aec)
- [Linear issue ENG-44](https://linear.app/corvi-io/issue/ENG-44/build-the-triad-studio-client-management-visual-prototype)
- `docs/initiatives/prds/02-triad-studio-component-system-and-mock-runtime.md`
- `docs/initiatives/prds/03-triad-studio-schedule-visual-prototype.md`
- `docs/initiatives/prds/07-triad-studio-barbershop-setup-visual-prototype.md`
- `docs/studio/component-system.md`
- `docs/studio/schedule-prototype.md`
- `docs/studio/barbershop-setup.md`

## Goals

- Add `Clientes` to the authenticated primary navigation and render `/clients` through the normal
  `AuthGate` and `WorkspaceShell`.
- Provide a bounded client directory with URL-backed search, filters, sorting, and pagination.
- Provide a client profile drawer with summary, appointment history, preferences, and timestamped
  internal notes.
- Exercise create, view, edit, archive, restore, and note-management journeys through a
  module-owned repository port and TanStack Query.
- Surface possible duplicate records without implementing irreversible merge behavior.
- Supply deterministic synthetic scenarios for empty, typical, dense, incomplete-contact,
  duplicate-candidate, delayed, recoverable-failure, and persistent-error states.
- Make every scenario repeatable through a stable non-PII URL value and restore its initial state
  on full reload.
- Keep the experience product-realistic without visible prototype, fixture, scenario, latency, or
  failure controls.
- Exclude the memory source and synthetic records from `hml` and `prd` artifacts.

## Non-Goals

- Business API routes, OpenAPI, database tables, migrations, durable storage, browser storage,
  import/export, realtime, polling, background jobs, or external providers.
- Changing Agenda appointment contracts or synchronizing client mutations with Agenda.
- Importing setup-module contracts or treating synthetic unit, professional, or service labels as
  accepted cross-module IDs.
- Client self-service accounts, authentication, invitations, roles, permissions, or other IDP
  behavior.
- Online booking blocks, marketing campaigns, WhatsApp/SMS/email sending, loyalty, referrals,
  reviews, forms, files, health data, payment methods, balances, or sales history.
- Legal consent management, marketing opt-in, data-subject requests, retention policy, or deletion
  policy.
- Automatic deduplication or client merge. Merge is destructive and needs a durable atomic command,
  authorization, audit history, conflict behavior, and recovery decision.
- A risk, loyalty, churn, lifetime-value, or no-show score.
- Enabling create or edit behavior in `hml` or `prd` before real mutation and authorization
  contracts exist.

## Brainstorm

### Problem Framing

Agenda can display who an appointment belongs to, but it cannot answer the operational questions
that persist across appointments: who is this client, how can the team contact them, what services
do they prefer, what should the team remember, and what has happened across visits?

The first useful client-management surface is therefore not a broad CRM. It is a searchable
directory plus a profile that provides factual context for service. Owners, managers, and
receptionists can evaluate this workflow using representative synthetic data before API and
privacy contracts are fixed.

### Gaps And Assumptions

- There is no accepted client API, persistence model, tenant key, authorization matrix, retention
  policy, audit model, or canonical duplicate rule.
- A future customer record will contain PII. This initiative uses synthetic identities only and
  must not normalize the evaluation contract into a production privacy promise.
- It is not yet decided whether a client is global to a barbershop, scoped to one unit, or linked
  to multiple units.
- Agenda currently owns appointment-local client fields. This initiative does not rewrite or share
  those contracts.
- Appointment summaries in the client profile are a bounded synthetic read model owned by this
  module, not imported scheduling entities.
- Preferences are limited to service-context labels and a short internal service note. They are
  not marketing consent, health data, or authorization rules.
- A deployed `dev` build needs deterministic memory data for shared product review.
- A full browser reload may reconstruct the selected scenario and is the accepted easy reset
  mechanism. Stable scenario URLs make repeated demonstrations reproducible without visible debug
  chrome.
- The default scenario is `typical`.

### Counterpoints And Alternatives

- Extending Agenda with a larger client section would touch fewer routes, but it would keep client
  identity appointment-local and make a durable cross-appointment workflow harder to evaluate.
- Building the API first could establish canonical relationships, but it would freeze tenancy,
  authorization, privacy, deduplication, and persistence choices before the product workflow has
  been validated.
- A dashboard could be the next visual module, but useful operational metrics depend on agreed
  definitions. A client directory tests a concrete daily workflow with fewer speculative
  calculations.
- A full CRM with segments, marketing, loyalty, reviews, payments, documents, and automated
  messaging would resemble mature products, but it would combine several legal, provider, billing,
  and domain decisions into one initiative.
- Visible scenario and reset controls would make demonstrations convenient, but would turn the
  normal product route into test tooling. Stable URLs plus reload preserve repeatability while the
  screen remains representative of the intended product.
- Automatically merging exact email or phone matches would make the fixture look complete, but a
  merge can destroy data and requires an accepted atomic backend command and recovery policy.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Keep client details inside Agenda appointments | Smallest implementation | No directory, durable profile, notes, or cross-visit context | Only if clients are permanently appointment-local |
| B | Build an integrated frontend-only client module with a replaceable memory source | Validates the real workflow now, remains isolated, reuses Studio foundations | Does not prove persistence, authorization, or scale | Current recommendation |
| C | Build API, persistence, authorization, and Studio together | Delivers durable behavior | Forces unresolved product, privacy, tenancy, and merge contracts | After frontend validation and explicit backend planning |
| D | Build a broad CRM and retention suite | Covers a large market surface | Excessive scope and substantial consent/provider complexity | After client core, booking, sales, and communication contracts exist |

### Recommendation

Choose option B. Add a normal authenticated `/clients` module with a module-owned port and
deterministic memory adapter for `local` and configured `dev`. Keep the directory and profile
coherent enough for product criticism while explicitly rejecting backend, cross-module, consent,
merge, and communication assumptions.

Use the existing shared table, pagination, status, drawer, tab, form, confirmation, mask, feedback,
and layout contracts when they fit. Inspect official shadcn/ui before adding a missing primitive,
and update the shared-component inventory only when a real shared contract changes.

## Experience Contract

### Route And Navigation

- `/clients` is private and renders under `_authenticated`, `AuthGate`, and `WorkspaceShell`.
- Primary navigation label and page title: `Clientes`.
- Breadcrumb label: `Clientes`.
- Active state works in expanded desktop, collapsed desktop, and mobile sidebar variants.
- The module is lazy-loaded consistently with other private Studio routes.

### Directory

- Page header exposes `Novo cliente` only when the configured source supports memory mutations.
- Search matches client name, synthetic email, and synthetic phone through the repository query.
- Bounded filters cover record state (`Ativo` or `Arquivado`), contact completeness, tags, and
  possible duplicate status.
- Sortable fields are name, last visit, next appointment, and creation date.
- URL state may contain page, page size, sort, filter identifiers, view state, and the technical
  scenario identifier.
- Names, phone numbers, emails, note bodies, and free-text search never enter URL state.
- The shared table fills the available module body and keeps its header and pagination usable.
- Rows open the profile through their primary interaction. Contextual actions use the shared
  right-click or `Shift+F10` menu and do not add an `Ações` column.

### Client Profile

- A client profile drawer has `Resumo`, `Agendamentos`, and `Notas` tabs.
- Summary shows synthetic name, contact methods, record state, tags, service preferences, last
  visit, next appointment, completed-visit count, and possible duplicate warning.
- Appointment history shows bounded upcoming and past summaries with date, time, service,
  professional display label, unit display label, and factual status.
- Notes are internal, timestamped, synthetic service-context notes. Users can create, edit, and
  remove notes in memory with explicit confirmation for removal.
- View and edit are explicit modes. The drawer keeps stable labels, first-invalid focus, and
  predictable cancel/save placement.
- Archive and restore require explicit confirmation and remain reversible within the active
  scenario.
- Possible duplicates explain which exact normalized contact field matched. The user can inspect
  candidates but cannot merge them.

### Creation And Editing

- Required fields are name and at least one contact method: phone or email.
- Phone uses the shared Brazilian phone mask. Email is normalized for comparison without exposing
  normalization details in the UI.
- Optional fields are tags and bounded service preferences. The implementation must not invent
  documents, uploads, birth dates, health attributes, payment data, marketing consent, or custom
  fields.
- React Hook Form and Zod own validation with Brazilian Portuguese messages.
- Forms use application-controlled validation, focus the first invalid field, prevent duplicate
  submission, preserve stable button labels while loading, and show short Sonner feedback.
- Exact normalized phone or email matches produce a duplicate warning before save but do not
  silently block or merge unless the final in-memory validation contract explicitly identifies an
  exact duplicate record ID.

### Development Scenarios And Reset

- Accepted scenario identifiers are `typical`, `empty`, `dense`, `incomplete-contact`,
  `duplicate-candidates`, `slow`, `next-failure`, and `persistent-error`.
- `scenario` is a stable technical non-PII query value. Missing or invalid values resolve to
  `typical`.
- Scenario identifiers and descriptions are not shown in ordinary product chrome.
- A full reload creates a fresh repository from the selected scenario, restoring all records,
  notes, appointments, deterministic IDs, and one-shot failure state.
- Scenario changes and reload invalidate delayed results so stale work cannot overwrite the active
  scenario.
- Synthetic data is deterministic and must not resemble real customers known to the team.

## Architecture And Boundaries

- Studio owns the route, navigation metadata, browser presentation, repository port, query keys,
  view models, validation, and source composition.
- `apps/studio/src/modules/clients` owns directory/profile vocabulary and must not import another
  product module's internals or `src/dev`.
- `apps/studio/src/dev/clients` owns deterministic scenarios and the memory repository.
- `virtual:studio-client-management-source` is the composition seam. A future accepted HTTP adapter
  may implement the same port after its own contract review.
- `VITE_CLIENT_MANAGEMENT_SOURCE` is parsed only through shared Studio env configuration and accepts
  `disabled` or `memory`.
- Local serve and configured deployed `dev` may resolve memory. `hml` and `prd` always resolve the
  disabled source, even if memory is requested.
- API impact: none.
- IDP impact: none; existing Studio authentication gates the route, and business roles are not
  invented.
- Site impact: none.
- Persistence impact: none.
- External provider impact: none.
- No shared package is introduced.

## Performance And Scalability

- Current scenarios are bounded UX inputs and provide no production-capacity evidence.
- The memory repository applies search, filters, sorting, and page bounds before returning a page
  result so presentation does not operate on an already paginated subset.
- Directory queries use a bounded page size. Appointment and note lists use explicit bounded
  initial windows with a controlled `Carregar mais` path when the scenario exceeds them.
- Dense fixtures test layout, interaction, and render behavior only.
- No polling, WebSocket, background refresh, external request, or unbounded recurrence expansion is
  introduced.
- Delayed list and mutation results are generation-guarded across scenario resets.
- A future production API must define tenant-scoped indexes, normalized contact lookup, bounded
  server search, pagination, sort allowlists, appointment-summary aggregation, N+1 prevention,
  optimistic-concurrency behavior, and measured capacity.
- With millions of clients or appointments, the browser must receive bounded pages and summary read
  models. It must not download all clients, derive all visit counts, or perform global duplicate
  discovery locally.

## Security, Privacy, And Abuse

- The route remains behind the existing authenticated Studio boundary, but navigation metadata is
  not authorization.
- All current client identities, contacts, notes, and appointments are synthetic.
- Names, phones, emails, notes, preferences, appointment details, auth/session values, tokens,
  private headers, and form payloads must not be logged or sent to analytics.
- The memory source does not use browser persistence, make network calls, intercept Better Auth, or
  expose secrets.
- Free-text notes must include guidance not to store payment-card, credential, document, health, or
  other highly sensitive data. Current fixtures contain none.
- A future production initiative must define tenant isolation, least-privilege access, audit
  history, encryption, retention, deletion/export obligations, consent ownership, merge recovery,
  rate limits, and abuse controls.
- Duplicate comparison is exact and bounded in memory. No fuzzy identity matching or automated
  decision is accepted.

## Accessibility And UX

- Directory search, filters, sort, pagination, row opening, context actions, drawer tabs, forms,
  note controls, and confirmations are keyboard operable with visible focus.
- Rows and duplicate warnings have accessible names that do not rely on color.
- Loading, delayed, disabled-source, empty, filtered-empty, recoverable-error, persistent-error,
  and mutation-failure states use Brazilian Portuguese product copy.
- Drawers retain content through close animation, restore focus to the opener, and minimize motion
  under `prefers-reduced-motion`.
- Form errors expose `aria-invalid`, linked descriptions, required labels, and first-invalid focus.
- Status announcements use a polite live region or existing toast semantics without moving focus.
- The table uses bounded internal scrolling on narrow viewports; the profile drawer reflows without
  page-level horizontal overflow at 320 CSS pixels and 200% zoom-equivalent conditions.
- Light, dark, system, forced-colors, coarse-pointer, and visible/unobscured focus behavior remain
  supported.
- Dense histories use progressive loading rather than an unbounded tab panel.

## Logging And Observability

- This frontend-only source does not emit production telemetry.
- Development failures are presented through safe product-facing messages and are not logged with
  record payloads.
- A future production implementation may record aggregate directory query duration, returned count,
  mutation outcome class, duplicate-review outcome, and authorization result.
- Future traces should cover the bounded client query and profile-summary request without placing
  PII in span names, attributes, metrics, or error reports.
- Alerts and service-level objectives require measured backend behavior and are not defined here.

## Acceptance Criteria

- [ ] `/clients` is an authenticated route inside the normal workspace shell.
- [ ] `Clientes` is present and active in expanded, collapsed, and mobile primary navigation.
- [ ] Directory search, bounded filters, allowlisted sorting, pagination, empty states, and URL state
      work through the module repository port.
- [ ] A profile drawer exposes summary, bounded appointment history, preferences, notes, and
      factual duplicate warnings.
- [ ] Create, view, edit, archive, restore, add/edit/remove note, validation, retry, and rollback
      journeys work in session memory.
- [ ] No merge, communication, marketing, loyalty, payment, file, health, consent, or real
      cross-module synchronization behavior is exposed.
- [ ] All accepted deterministic scenarios can be selected through stable non-PII URLs.
- [ ] Full reload restores the selected scenario and deterministic IDs while stale delayed work
      cannot overwrite the new runtime.
- [ ] Ordinary UI contains no prototype, scenario, fixture, latency, failure, or reset chrome.
- [ ] Local serve and configured deployed `dev` can compose
      `VITE_CLIENT_MANAGEMENT_SOURCE=memory`.
- [ ] `hml` and `prd` resolve the source as disabled and production artifacts exclude client
      fixtures, scenarios, and the memory adapter.
- [ ] Real and synthetic PII, notes, form values, sessions, tokens, and private headers are absent
      from logs, analytics, URLs, and captured evidence.
- [ ] Focused unit/component coverage proves query bounds, exact duplicate warnings, deterministic
      reset, rollback, delayed-operation isolation, validation, and accessible drawer behavior.
- [ ] Playwright covers authenticated navigation, typical/empty/dense/error scenarios, create/edit,
      archive/restore, notes, duplicate review, reload reset, keyboard operation, axe, dark mode,
      reduced motion, 320px reflow, and internal overflow.
- [ ] Route generation, format, lint, typecheck, Vitest, Playwright, production-boundary, build,
      Studio check, env/workflow tests, root check, and `git diff --check` have recorded evidence.
- [ ] Studio client-management, component-system, testing, and deployment documentation reflects
      the accepted temporary source and production boundary.

## Verification Plan

- Unit tests: search parsing, URL allowlists, query keys, pagination bounds, sorting, form schema,
  normalized contact comparison, duplicate warnings, repository mutations, notes, archive/restore,
  reset, delayed-operation isolation, and production source-target resolution.
- Component tests: directory states, drawer tabs, view/edit modes, validation, focus, confirmation,
  disabled-source feedback, retry, and non-color status.
- UI tests: authenticated navigation, desktop/mobile/collapsed sidebar, representative scenarios,
  CRUD/note journeys, reload reset, failure recovery, keyboard-only flow, axe, themes, reduced
  motion, 320 CSS pixels, 200% zoom-equivalent layout, and bounded history overflow.
- Boundary tests: build `prd` with memory requested and prove disabled resolution; scan artifacts for
  scenario IDs, fixture identities, memory adapter, mock-engine, and development failure markers.
- Commands:

```bash
bun --filter studio routes:generate
bun --filter studio format
bun --filter studio lint
bun --filter studio typecheck
bun --filter studio test
bun --filter studio test:production-boundary
bun --filter studio build
bun --filter studio check
bun --filter studio test:e2e
bun --filter studio test:e2e:production
bun run test:ci
bun run check
git diff --check
```

## Accepted Decisions And Open Questions

- [x] Product surface: authenticated `/clients` module, not an Agenda subpanel or preview page.
- [x] Initial scope: directory, profile, appointment summaries, service preferences, internal
      notes, reversible archive/restore, and possible-duplicate warnings.
- [x] Temporary source: deterministic session memory for local and configured `dev` only.
- [x] Default scenario: `typical`.
- [x] Reset: full reload reconstructs the selected stable URL scenario.
- [x] Production safety: `hml` and `prd` fail closed to a disabled source.
- [x] Backend boundary: no API, schema, tenancy, authorization, audit, or persistence promise.
- [x] Cross-module boundary: client appointment history is a client-owned synthetic read model;
      Agenda and setup internals remain untouched.
- [x] Duplicate behavior: inspect warnings only; no automatic or manual merge.
- [ ] A future initiative must define the canonical client aggregate, tenant/unit scope, API,
      normalized contact rules, persistence, authorization, auditing, privacy lifecycle, migration,
      and capacity before real data is enabled.
- [ ] A future initiative must decide how Agenda selects, creates, and synchronizes durable clients.
- [ ] A future initiative must separately define consent, communications, marketing, loyalty,
      sales, payments, documents, and data-subject workflows if those capabilities are accepted.
