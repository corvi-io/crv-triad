# 13 TRIAD Studio Service Fulfillment Visual Prototype

## Summary

Extend the authenticated TRIAD Studio `Atendimentos` experience with the next
frontend-first MLP slice: operate an in-progress service from `Em atendimento`
until `Pronto para pagamento`.

The prototype lets the team review the service session, add and remove service
items, attribute each item to an eligible professional, change that attribution,
record bounded operational notes, understand elapsed time, and finish service.
It uses deterministic resettable data and stops before command-tab finance,
discounts, price editing, payment, commissions, cash, or daily closing.

## Context

- Current state:
  - ENG-46 and PR #27 establish `/service-desk`, the `Atendimentos` navigation
    entry, the service-desk repository, scheduled/walk-in queue entries, the
    shared scheduling catalogs, and the transition to `in-service`.
  - ENG-46 is in `Ready To Merge`; this initiative cannot be implemented until
    it is merged to `staging`.
  - The official UX note defines an in-progress visit as a small command tab
    whose performed services and professionals evolve during service.
  - The visual MLP tracker identifies service fulfillment as the next delivery.
- Problem:
  - The visual journey currently ends when service starts.
  - The team cannot yet validate how the operator records what was actually
    performed or hands a truthful completed service to a future payment flow.
- Why now:
  - This is the smallest coherent slice after queue/check-in.
  - It unlocks later command-tab/payment and commission initiatives without
    prematurely combining their unresolved financial rules.
- Related sources:
  - Official Maestri UX note: `triad-studio-o-triad-stud`, section 9.
  - Visual MLP tracker: `triad-studio-acompanhament`.
  - ENG-46: `Build the TRIAD Studio front-desk queue and check-in visual prototype`.
  - PR #27: `feat(studio): add front-desk queue and check-in`.
  - `docs/initiatives/prds/12-triad-studio-front-desk-queue-and-check-in-visual-prototype.md`.
  - `docs/studio/service-desk.md` after ENG-46 merges.
- Linear task:
  [ENG-47: Build the TRIAD Studio service fulfillment visual prototype](https://linear.app/corvi-io/issue/ENG-47/build-the-triad-studio-service-fulfillment-visual-prototype).

## Goals

- Continue an existing `in-service` queue entry inside the accepted
  `Atendimentos` module.
- Provide a focused service-session workspace that supports itemized services,
  per-item professional attribution, bounded notes, and truthful duration.
- Finish the operational service atomically and move it to
  `ready-for-payment`.
- Keep scheduled, walk-in, Agenda, Dashboard, and service-desk state truthful
  inside the same deterministic browser session.
- Provide normal, edge, loading, failure, and reset scenarios for visual and
  interaction validation.
- Preserve the production boundary: local/configured-`dev` memory only,
  disabled in `hml`/`prd`, with no backend or identity behavior.

## Non-Goals

- Editing catalog prices or service-item prices.
- Discounts, add-ons as a financial concept, tips, fees, or surcharges.
- Command-tab totals, payment methods, payment registration, receipts, refunds,
  settlement, commissions, cash movement, or daily closing.
- Marking a scheduled appointment as paid or financially completed.
- Backend routes, OpenAPI, database tables, migrations, browser persistence,
  fake HTTP, polling, WebSockets, or realtime.
- Production authorization, role enforcement, tenancy, audit history, or
  identity administration.
- Inventory, product sales, consumption, stock, or package rules.
- Customer-history or Client-record mutation.
- Automatic professional assignment, workload optimization, or scheduling.
- Reopening a session after it reaches `ready-for-payment`.
- A new top-level navigation module, design system, palette, or component
  library.

## Brainstorm

### Problem Framing

- The user is the professional, receptionist, or manager recording what
  happened after a customer entered service.
- The improved workflow is:
  1. open an `Em atendimento` entry;
  2. confirm the initial service and professional;
  3. add additional performed services when needed;
  4. attribute each service to the professional who performed it;
  5. record concise operational notes;
  6. review elapsed time and completeness;
  7. finish service;
  8. hand the visit to a future payment initiative as
     `Pronto para pagamento`.
- This is a visual/behavioral evaluation surface, not a production command tab
  or accounting record.

### Gaps And Unknowns

#### Product Gaps

- The UX source mentions price changes, authorized discounts, and extras during
  service, but their permissions and financial semantics are not defined.
  They remain outside this slice.
- Final rules for removing the original booked service are not defined. The
  prototype keeps the initial item and allows only added items to be removed.
- The UX source does not define reopening after service completion. The
  prototype does not offer it.
- The final ownership of service notes versus Client history is not defined.
  Notes remain a service-session snapshot and do not update the Client record.
- Product sales are mentioned only indirectly as extras. This task supports
  service catalog items only.

#### Technical Gaps

- ENG-46 is not merged yet. The implementing agent must start from a
  `staging` revision that contains PR #27 and verify its actual contracts.
- The current service-desk repository ends at `start`. This initiative should
  extend that same lifecycle instead of adding a disconnected repository.
- Scheduled appointments know `in-progress`, but not
  `ready-for-payment`. That state belongs to the service session. The
  appointment must not be mislabeled as completed or paid.
- The future production model still needs canonical visit identity,
  authorization, concurrency, audit, and persistence.

#### Data And Model Gaps

- A service session needs:
  - stable session ID and source queue-entry ID;
  - source type and optional appointment ID;
  - customer snapshot;
  - unit ID;
  - start time and lifecycle status;
  - ordered service items;
  - bounded operational notes;
  - injected source clock.
- A service item needs:
  - stable item ID;
  - service ID and label/duration snapshot;
  - professional ID;
  - source kind: initial or added;
  - added-at timestamp.
- Catalog prices may be present in scheduling data, but this task does not edit,
  total, discount, charge, or claim payment from them.

#### Operational Gaps

- Scenario, reset, latency, and failure controls must remain outside ordinary
  product chrome.
- A full reload must restore the selected deterministic scenario.
- Stale delayed mutations must not write after scenario/reset generation
  changes.

### Counterpoints

- A drawer would reuse the current service-desk page, but the combination of
  multiple service items, professional attribution, notes, duration, completion,
  errors, and narrow-screen behavior is too dense for a transient overlay.
- A dedicated top-level `Comandas` route would anticipate finance, but would
  create navigation and terminology before the payment contract exists.
- Combining service fulfillment with payment would complete a longer demo, but
  it would mix operational truth with unresolved discounts, values, methods,
  settlement, and commission rules.
- A new `service-fulfillment` source would isolate code quickly, but would
  duplicate the visit lifecycle and make cross-surface state drift likely.
- Marking the appointment `completed` when service finishes would be easy, but
  the MLP journey still has payment and commission steps. It would make
  Dashboard completion/revenue claims premature.

### Options

| Option | Description | Pros | Cons | Decision |
| --- | --- | --- | --- | --- |
| A | Use a dense service drawer over the board | Minimal routing | Poor fit for the itemized workflow and narrow screens | Reject |
| B | Add a dedicated child workspace under `Atendimentos` | Deep-linkable, focused, keeps navigation ownership | Adds a child route and explicit return flow | Accept |
| C | Build fulfillment and payment together | Demonstrates a longer journey | Too large and financially ambiguous | Reject |
| D | Build API and production model now | Durable concurrency and audit | Premature before visual validation | Future |

### Recommendation

Choose Option B. Add a dedicated authenticated service-session child route
under `/service-desk`, with `Atendimentos` remaining the active primary module.
Use a stable opaque synthetic session ID, not customer data, in the URL.

Extend the accepted service-desk repository and memory coordinator from ENG-46.
Do not introduce a parallel source or a new public environment variable.
Transition the service session to `ready-for-payment` while leaving the
scheduled appointment operationally `in-progress` and financially unpaid until
the later finance initiative defines the real completion contract.

## Product And Interaction Contract

### Route And Navigation

- Keep `/service-desk` as the queue/board route.
- Add `/service-desk/$sessionId` as the service-session workspace.
- Keep `Atendimentos` active in expanded, collapsed, and mobile navigation.
- Use breadcrumb copy equivalent to `Atendimentos / Atendimento`.
- Never put customer name, phone, notes, service names, or other PII/free text
  in the path or query string.
- Invalid, missing, or no-longer-available session IDs show a bounded not-found
  state with `Voltar para atendimentos`.

### Workspace Hierarchy

- Header:
  - customer snapshot;
  - source signal: `Agendado` or `Sem agendamento`;
  - status `Em atendimento` or `Pronto para pagamento`;
  - truthful `Iniciado às …` and elapsed time;
  - `Voltar para atendimentos`.
- Main content:
  - ordered `Serviços realizados` items;
  - one service and one attributed professional per item;
  - explicit `Adicionar serviço`;
  - remove action only for added items;
  - bounded `Observações do atendimento`.
- Completion:
  - a concise completeness summary;
  - primary `Finalizar atendimento`;
  - confirmation that explains the transition to
    `Pronto para pagamento`;
  - no payment or financial action.

### Service Item Rules

- An `in-service` session starts with one immutable initial item from the queue
  entry's selected service.
- The initial item's professional is the professional selected at service
  start.
- Added service items come from the existing scheduling service catalog.
- Every item requires an active professional who is eligible for that service.
- The professional may differ per item.
- A professional attribution can be changed while the session is
  `in-progress`.
- Added items may be removed before service completion.
- The initial item cannot be removed in this prototype.
- Duplicate services are allowed because the UX may need to record repeated
  work, but each item has a distinct ID and performer.
- Mutations are explicit, pending-safe, atomic, and idempotent at the memory
  source boundary.
- Price fields, totals, discounts, or payment claims are not rendered.

### Notes

- Notes are optional, bounded, and stored only on the service-session snapshot.
- Copy must discourage credentials, card data, documents, health information,
  or other sensitive personal data.
- Notes never enter URL state, logs, toasts, or error telemetry.

### Time And State

- Use the same injected source clock established by the service-desk source.
- Elapsed time is calculated from `startedAt` only while the source clock is at
  or after the start boundary.
- Do not use scattered `Date.now()` calls or independent ticking clocks.
- `Finalizar atendimento` requires:
  - session status `in-progress`;
  - at least the immutable initial item;
  - one valid eligible professional for every item;
  - no item mutation currently pending.
- Successful completion changes the service-session/queue lifecycle to
  `ready-for-payment`.
- The board must expose `Pronto para pagamento` truthfully as the next
  operational handoff without adding payment actions.
- A linked scheduled appointment remains `in-progress`; it must not become
  `completed`, `paid`, or revenue-bearing in this task.

### Feedback And Recovery

- Initial loading uses shared `Skeleton` anatomy without layout shift.
- Missing sessions use the shared `Empty` composition.
- Recoverable load/mutation failures use `Alert`, concise pt-BR copy, and
  `Tentar novamente` where retry is valid.
- Failed mutations preserve the complete previous snapshot.
- Completion confirmation uses the existing accessible confirmation primitive,
  with an outcome-specific primary action.
- Successful add/remove/attribution/note/completion actions use restrained
  Sonner feedback without PII.
- Button labels stay stable while the shared `isLoading` state communicates
  pending work and prevents duplicate submission.

## Architecture And Boundaries

- Site impact: none.
- API impact: none.
- IDP impact: none. Business lifecycle and prototype permissions do not enter
  identity.
- Studio impact:
  - extend `src/modules/service-desk/**` with service-session contracts, pure
    rules, query keys/hooks, schemas, and presentation;
  - extend `src/dev/service-desk/**` with deterministic service sessions,
    generation-safe mutations, and scenarios;
  - add the authenticated service-session child route;
  - reuse the existing `virtual:studio-service-desk-source` composition seam;
  - reuse the scheduling service/professional/unit catalogs and the same
    source clock;
  - update service-desk and component/testing documentation.
- Data/persistence impact: browser-session memory only in accepted
  local/configured-`dev`; no storage or API.
- External provider impact: none.

### Repository Extension

The accepted service-desk repository should grow with narrow methods equivalent
to:

- `getSession(sessionId)`;
- `addServiceItem(input)`;
- `removeServiceItem(input)`;
- `assignServiceItemProfessional(input)`;
- `updateSessionNotes(input)`;
- `finishSession(input)`.

The implementing agent may refine names after inspecting merged ENG-46, but
must keep one lifecycle owner and must not expose the memory adapter to
presentation.

## Component, Visual, And Copy Standards

- Read root/Studio AGENTS and the required skills before implementation:
  `triad-initiative-workflow`, `triad-architecture`,
  `triad-studio-development`, `accessibility`, `shadcn`,
  `tailwind-design-system`, `vercel-composition-patterns`,
  `vercel-react-best-practices`, `react-useeffect`, and `ux-copy`.
- Inventory existing Studio components first; inspect official shadcn through
  Bun before creating any primitive.
- Use current Vite/Tailwind v4/Base UI/base-nova/Geist/Lucide conventions and
  Base UI `render`, not Radix `asChild`.
- Reuse `ModuleLayout`, `PageHeader`, Card anatomy, Avatar fallback, Badge,
  Alert, Empty, Skeleton, Separator, Sonner, shared confirmation, shared form
  anatomy, and the project `Button` `isLoading` behavior.
- Use raw `Select`/combobox controls for service and professional form data;
  shared list filters remain reserved for list filtering.
- Use React Hook Form and Zod where a form is warranted. Every min/max and
  validation path needs explicit Brazilian Portuguese copy.
- Use `noValidate`, `data-invalid`, `aria-invalid`, linked errors, required
  labels, and first-invalid focus.
- Use semantic tokens and existing component variants. No raw feature colors,
  manual dark overrides, manual overlay z-index, or parallel badges/skeletons.
- Use `gap-*`, `size-*`, `truncate`, `cn()`, direct owner imports, and
  `Icon`-suffixed icon imports.
- Prefer explicit variants, child composition, and provider interfaces over
  boolean-prop proliferation.
- Derive totals, completeness, enabled actions, elapsed state, and labels
  through pure projections/render. Do not synchronize derived state or user
  actions through effect chains.
- UI vocabulary:
  - `Atendimentos`;
  - `Em atendimento`;
  - `Serviços realizados`;
  - `Adicionar serviço`;
  - `Profissional responsável`;
  - `Observações do atendimento`;
  - `Finalizar atendimento`;
  - `Pronto para pagamento`;
  - `Voltar para atendimentos`;
  - `Tentar novamente`.

## Deterministic Scenarios

At minimum, support:

- typical single-service session;
- multiple services with one professional;
- multiple services with different professionals;
- long-running session;
- long labels and bounded notes;
- no eligible professional for a selected service;
- already ready-for-payment session;
- slow initial load/mutation;
- next mutation failure;
- persistent load failure.

Scenario/reset controls remain in the established technical QA path. Full reload
restores the selected fixture, and reset/scenario generation invalidates stale
delayed operations.

## Performance And Scalability

- Prototype collections remain bounded and deterministic.
- Build maps for repeated service/professional lookup instead of repeated nested
  scans where useful.
- Start independent catalog/session reads together if the merged repository
  keeps them separate.
- Invalidate only service-session, service-desk, and directly affected
  scheduling query keys.
- Avoid whole-app rerenders and broad query invalidation.
- Do not add polling, realtime, background timers, or browser persistence.
- A production API must use tenant/unit-bounded reads and optimistic
  concurrency or equivalent conflict protection.
- At millions of historical sessions, the production UI must query a single
  session by stable ID and paginate history; this prototype is not capacity
  evidence.

## Security, Privacy, And Abuse

- Reuse the existing authenticated Studio shell and session gate.
- Do not invent production roles. Prototype availability does not imply
  authorization.
- Do not log customer names, phones, notes, service-session payloads,
  credentials, tokens, or request headers.
- Keep PII and free text out of URLs and telemetry.
- Error and toast copy must not echo private data.
- Completion and item mutations require duplicate-submit prevention.
- Production work must define tenant/unit authorization, audit actor,
  idempotency, concurrent edits, retention, and data-subject handling.

## Accessibility And UX

- Use semantic heading order and named regions for the service list, notes, and
  completion summary.
- All item actions are keyboard operable with visible, unobscured focus.
- Icon-only actions have explicit accessible names and at least 24 by 24 CSS
  pixel targets.
- Service/professional controls have programmatic labels, errors, and
  descriptions.
- Status meaning uses text plus icon/badge; color is never the only signal.
- Dynamic add/remove/update/finish outcomes are announced through restrained
  live feedback without moving focus unexpectedly.
- The confirmation dialog traps/restores focus and has an accessible title.
- At 320 CSS pixels and 200% zoom, the workspace reflows without document-level
  horizontal scrolling; item actions remain reachable.
- Light, dark, system, forced-colors, reduced-motion, keyboard, coarse-pointer,
  axe, and manual VoiceOver/NVDA residuals require recorded evidence.

## Logging And Observability

No runtime telemetry is added by this prototype. Tests should prove that private
fields do not enter URL state or ordinary diagnostic output.

A future production implementation should define privacy-safe event names such
as session opened, item added/removed, performer changed, and service finished;
latency/error metrics; mutation traces; conflict/error alerts; and actor/session
identifiers that are authorized, pseudonymous where possible, and never contain
notes or customer contact data.

## Acceptance Criteria

- [ ] Implementation starts from `staging` after ENG-46/PR #27 is merged.
- [ ] An authenticated `/service-desk/$sessionId` workspace opens from an
      `Em atendimento` entry and keeps `Atendimentos` active.
- [ ] The initial service item and selected starting professional are preserved.
- [ ] Users can add service catalog items and attribute each item to an eligible
      professional.
- [ ] Users can change a service item's professional while service is active.
- [ ] Users can remove added items, but not the initial item.
- [ ] Users can edit bounded service-session notes with explicit pt-BR
      validation and sensitive-data guidance.
- [ ] Elapsed-time and state labels use the injected source clock and exact
      boundaries.
- [ ] Finishing validates completeness, confirms intent, is pending-safe, and
      atomically transitions the session to `ready-for-payment`.
- [ ] `Pronto para pagamento` is visible as an operational handoff, with no
      payment action, price editing, discount, commission, or cash behavior.
- [ ] A linked appointment remains `in-progress` and is not presented as paid,
      completed, or revenue-bearing.
- [ ] Normal, edge, slow, failure, ready, reset, and reload scenarios are
      deterministic.
- [ ] Failed or stale mutations preserve coherent prior state.
- [ ] No new source, public environment variable, API, IDP, persistence,
      polling, or realtime behavior is added.
- [ ] `hml`/`prd` remain fail-closed and production artifacts exclude
      service-session fixtures/scenarios/adapter markers.
- [ ] Existing Studio components/tokens and pt-BR UX copy are used consistently.
- [ ] Keyboard, focus, screen-reader semantics, contrast, forced colors,
      reduced motion, 24px targets, 200% zoom, 320px reflow, coarse pointer, and
      axe evidence are recorded.
- [ ] Focused service-session tests, service-desk regressions, Agenda/Dashboard
      truthfulness, production boundary, build/check, Playwright, root check,
      and diff checks pass or isolate a pre-existing baseline.
- [ ] Durable Studio and initiative documentation is updated.
- [ ] Preflight passes, the PR targets `staging`, and Linear status changes are
      evidence-based.

## Verification Plan

- Unit tests:
  - session creation from scheduled and walk-in `in-service` entries;
  - item add/remove/attribution invariants;
  - eligibility and initial-item protection;
  - exact elapsed-time boundaries;
  - completion preconditions and `ready-for-payment` transition;
  - failure rollback, idempotency, and stale-generation behavior;
  - URL privacy and not-found behavior.
- Integration/component tests:
  - repository/provider/query composition;
  - exact query-key invalidation;
  - shared component anatomy and pt-BR validation;
  - linked scheduled appointment remains truthful.
- Playwright:
  - queue entry to workspace;
  - add service, change performer, remove added item, edit notes;
  - finish to `Pronto para pagamento`;
  - no eligible professional;
  - failure/retry;
  - ready and missing session;
  - reset/reload;
  - light/dark/system, keyboard/focus, 320px, axe, reduced motion, and
    production disablement.
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
bun run check
git diff --check
```

## Accepted Decisions And Follow-Ups

- [x] This delivery begins at `Em atendimento`.
- [x] This delivery ends at `Pronto para pagamento`.
- [x] It extends the existing service-desk lifecycle and source.
- [x] It uses a dedicated child workspace, not a new top-level module.
- [x] The initial item is immutable; added items are removable.
- [x] Professional attribution is per service item.
- [x] Price editing, discounts, and all payment behavior are excluded.
- [x] Scheduled appointments remain `in-progress` at the handoff.
- [ ] The next initiative must define command-tab values, discounts, payment
      methods, payment registration, and the appointment completion boundary.
- [ ] A later initiative must define commissions.
- [ ] Production work must define canonical visit identity, API/persistence,
      tenant/unit authorization, actor permissions, audit, concurrency,
      idempotency, retention, realtime, and observability.
