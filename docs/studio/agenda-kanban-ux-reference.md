# TRIAD Studio Agenda Kanban UX Reference

## Purpose

This document preserves the approved UX intent from
`TRIAD_STUDIO_AGENDA_KANBAN_SPEC.md`, supplied on 2026-07-21, as a durable
repository reference for Initiative 06. Technical prose is normalized to
English while exact Brazilian Portuguese labels and fixture content remain in
Portuguese.

This is a product/visual reference, not an architecture override. The accepted
Triad boundaries, component source policy, theme contract, status vocabulary,
mock runtime, accessibility requirements, and production safeguards in the
Initiative 06 PRD take precedence where this source conflicts with established
project decisions.

## Closed Scope

- Implement only the Agenda Kanban experience in the existing authenticated
  Studio application.
- Desktop-first operational view for barbershop owners, managers, and reception
  staff.
- Reuse the existing shell, navigation, identity/profile area, theme tokens,
  scheduling module, drawers, and shared components.
- Do not create unrelated routes or product modules.
- Preserve the approved order of filters, columns, card information, units, and
  the lower summary.
- Primary visual review uses the dark navy-and-gold theme.

## Page Composition

The source organizes the screen as:

1. Existing Studio sidebar and authenticated shell.
2. Page heading with title `Agenda`, supporting text, and `Novo agendamento`.
3. Primary search and filter container.
4. View and scenario controls.
5. Six-column Kanban board.
6. Lower operational summary.
7. Existing right-side appointment drawer for create/view/edit flows.

The shell must come from the current WorkspaceShell and module registry. The
reference must not be used to create a duplicate sidebar or profile component.

## Header And Creation Drawer

- Title: `Agenda`.
- Primary CTA: `Novo agendamento`.
- The CTA opens the existing right-side drawer without leaving the route.
- Minimum creation needs:
  - cliente;
  - barbeiro;
  - serviço;
  - data;
  - horário;
  - duração;
  - valor;
  - observações;
  - status inicial;
  - unidade.
- The selected unit and accepted initial status supply defaults.
- Validation, pending, error, and success feedback use the existing Studio form
  and Sonner conventions.

## Search And Filters

The approved order is:

1. Global search.
2. `Barbeiro`.
3. `Cliente`.
4. `Serviço`.
5. `Período`.
6. `Unidade`.
7. Clear-filter action when any filter is active.
8. Canonical view selector.

### Global Search

- Search synthetic appointment, client, service, and professional presentation
  values.
- Debounce typing by approximately 200-300 ms.
- Search and filters compose rather than replace each other.
- An empty search result differs from an empty day.

### Filter Visual States

- Rest state uses the normal outline/control treatment and the base label.
- Active state uses the approved semantic accent, shows the selected value or
  selection count, and exposes a clear action.
- Keyboard and screen reader state must be explicit; color is supplemental.
- Clearing one filter preserves the others. Global clear restores approved
  defaults, including unit `Centro`.

### Filter Contents

- `Barbeiro`: multi-select professionals, internal search when the catalog is
  long, selected count/concise label, and clear/apply behavior.
- `Cliente`: multi-select synthetic clients with internal search.
- `Serviço`: multi-select synthetic services.
- `Período`:
  - `Hoje`;
  - `Amanhã`;
  - `Esta semana`;
  - `Próximos 7 dias`;
  - `Este mês`;
  - `Personalizado`, with validated start/end dates.
- `Unidade`: exactly `Centro` and `Artesão`; `Centro` is the initial value.

## View And Auxiliary Controls

- The source shows two visual view toggles. Initiative 06 normalizes them to one
  canonical state to avoid contradictory controls.
- Canonical labels proposed by the PRD are `Kanban` and `Grade diária` because
  the accepted alternate implementation is a time grid, not a list.
- Scenario controls remain available only for deterministic prototype review.
- Unit state must have one source of truth even if it is displayed in more than
  one responsive location.
- Display settings may control presentation only; they must not expose
  unsupported product behavior.

## Kanban Columns

Render these columns in this exact order:

| Order | Label | Canonical scheduling status |
| --- | --- | --- |
| 1 | `Confirmados` | `confirmed` |
| 2 | `Check-in` | `arrived` |
| 3 | `Em espera` | `waiting` |
| 4 | `Em atendimento` | `in-progress` |
| 5 | `Finalizados` | `completed` |
| 6 | `Cancelados / No-show` | `canceled` or `no-show` |

Each heading contains a semantic text/icon marker and visible count. Semantic
color may reinforce the status but never carries the meaning alone. Empty
columns remain visible and explain that no appointments match that state.

The source used `checked_in`, `in_service`, and `cancelled`. These are UX-source
aliases only. The existing Triad values above remain canonical.

## Appointment Card Anatomy

Cards are large and operationally scannable. Preserve this information order:

1. Client identity, optional avatar/initials, optional synthetic rating, time,
   and contextual menu.
2. Service name.
3. Professional name and optional avatar/initials.
4. Duration and price.
5. Optional note.
6. Status, payment, timing, and relationship badges as relevant.
7. Quick actions appropriate to the current status.

Card actions may include:

- `Ver detalhes`;
- `Editar agendamento`;
- `Alterar barbeiro`;
- `Alterar serviço`;
- `Reagendar`;
- `Registrar pagamento`;
- `Cancelar atendimento`;
- `Marcar como no-show`;
- `Finalizar atendimento` when applicable;
- `Alterar status` as the complete non-drag fallback.

Hide or disable actions that are invalid for the current state. The footer may
expose phone and note affordances, but synthetic PII-shaped values must not be
placed in URLs, logs, or durable browser storage.

## Approved Synthetic Fixture Set

These records capture the visual density and content from the UX source. They
are fixtures, not backend schemas or real people. Implementation may assign
stable IDs and make the smallest collision correction needed for deterministic
tests.

| Column | Client | Rating | Time | Service | Professional | Duration | Price | Note | Badges |
| --- | --- | ---: | --- | --- | --- | ---: | ---: | --- | --- |
| Confirmados | João Vitor | 4.5 | 09:30 | Cabelo & Barba | Carlos Lima | 45 min | R$ 65 | Prefere pompadour com volume | VIP; Confirmado; Em 20 min |
| Confirmados | Pedro Henrique | 4.6 | 10:15 | Corte degradê | Bruno Rocha | 35 min | R$ 45 | Degradê alto, transição suave | Em 1h |
| Confirmados | Guilherme Souza | 4.8 | 11:00 | Cabelo & Barba | Ana Clara | 50 min | R$ 75 | Barba alinhada na navalha | VIP; Confirmado; Em 1h30 |
| Check-in | Carlos Lima | 4.6 | 09:50 | Cabelo & Barba | Bruno Rocha | 40 min | R$ 55 | Laterais baixas, topo texturizado | Novo; Check-in |
| Check-in | Matheus R. | 4.7 | 10:20 | Corte degradê | Ana Clara | 35 min | R$ 45 | Risco na sobrancelha | Check-in; Pago |
| Check-in | Lucas Silva | 4.6 | 10:50 | Cabelo & Barba | Carlos Lima | 45 min | R$ 65 | Degradê médio | Check-in; Pago |
| Em espera | Felipe Andrade | 4.8 | 09:20 | Corte & Barba | Ana Clara | 45 min | R$ 65 | Prefere volume no topo | Retorno; Atrasado 10 min |
| Em espera | Carian R. | 4.7 | 09:50 | Cabelo & Barba | Carlos Lima | 45 min | R$ 65 | Barba cheia bem alinhada | Em 10 min |
| Em espera | Gabriel Lima | 4.7 | 10:20 | Corte degradê | Carlos Lima | 35 min | R$ 45 | Degradê médio | Em 20 min |
| Em atendimento | André Silva | 4.8 | 09:10 | Corte & Barba | Carlos Lima | 45 min | R$ 65 | Acabamento com máquina 0 alta | Em atendimento |
| Em atendimento | Paulo Henrique | 4.7 | 09:30 | Cabelo & Barba | Bruno Rocha | 45 min | R$ 65 | Topo texturizado | Em atendimento |
| Em atendimento | Gustavo Oliveira | 4.9 | 09:50 | Corte degradê | Carlos Lima | 35 min | R$ 45 | Topo texturizado | Em atendimento |
| Finalizados | Marcos Paulo | 4.8 | 08:30 | Cabelo & Barba | Carlos Lima | 45 min | R$ 65 | — | Finalizado; Pago |
| Finalizados | Felipe Andrade | 4.6 | 08:50 | Corte simples | Bruno Rocha | 30 min | R$ 35 | — | Finalizado; Pago |
| Finalizados | Gustavo Oliveira | 4.7 | 09:20 | Corte degradê | Ana Clara | 45 min | R$ 65 | — | Finalizado; Pago |
| Cancelados / No-show | Paulo Henrique | 4.7 | 09:15 | Cabelo & Barba | Carlos Lima | 45 min | R$ 65 | Cliente cancelou | Cancelado |
| Cancelados / No-show | Gustavo Oliveira | 4.6 | 11:30 | Corte degradê | Bruno Rocha | 35 min | R$ 45 | Não compareceu | No-show |
| Cancelados / No-show | Bruno Rocha | 4.6 | 12:00 | Corte degradê | Bruno Rocha | 35 min | R$ 45 | — | Cancelado |

## Status Transition Behavior

All cards support valid cross-column transitions through drag-and-drop and a
non-drag `Alterar status` action.

On an accepted transition:

1. Change the canonical appointment status.
2. Update the visual column and relevant badges.
3. Update column counts.
4. Update the lower summary.
5. Preserve a predictable visual/order position.
6. Show concise Portuguese success feedback, for example:
   `Status atualizado para “Em atendimento”.`

During pointer drag, show an elevated drag overlay, reduced source opacity,
highlighted valid destination, visible placeholder/position, and the appropriate
grab/grabbing cursor. Respect reduced-motion preferences.

For keyboard and screen reader use:

- announce card selection and source column;
- announce the current destination and whether it is valid;
- announce success, cancellation, failure, and rollback;
- restore focus to the moved card or a stable equivalent;
- make the complete operation available without drag.

### Cancellation And No-show Decision

Entering `Cancelados / No-show` requires the prompt `Qual o motivo?` with:

- `Cliente cancelou` -> status `canceled`, reason `client`;
- `Barbearia cancelou` -> status `canceled`, reason `barbershop`;
- `Não compareceu` -> status `no-show`, reason `no-show`.

The reason is separate from status so the two cancellation actors remain
distinguishable.

### Completion And Payment Decision

Entering `Finalizados` sets status `completed`. If payment is not already
confirmed, require one of:

- `Marcar como pago`;
- `Manter pagamento pendente`.

This prototype changes presentation state only and does not capture or settle a
real payment.

### Optimistic Feedback

- Prevent repeated/conflicting transitions for one pending appointment.
- Capture the previous complete appointment state before optimistic movement.
- On simulated failure, restore the card, status, counts, and summary together.
- Provide visible Portuguese error feedback and an assistive announcement.

## Lower Summary

The lower summary contains:

- selected date or period, with the reference example `21/07/2026`;
- count chips for all six columns;
- `+ Adicionar agendamento`;
- visible total, with reference copy such as `Total do dia` and
  `54 atendimentos`.

Update the summary when search, filters, drag/status action, creation, editing,
cancellation, deletion, scenario, or unit changes. Appointment values must not
be labeled as paid or settled revenue.

## Loading, Empty, And Error States

- Loading: preserve the page shell and controls; use representative board/card
  skeletons without layout shift.
- Empty day: explain that there are no appointments for the bounded date/unit
  and offer the add action where appropriate.
- Filtered empty: explain that no appointments match and offer filter reset.
- Empty column: keep the column visible with a concise local message.
- Error: preserve current context and offer retry/reset.
- Slow/failure scenarios: deterministic and development-only.

## Responsive Behavior

- `>= 1440px`: aim to show all six columns while keeping card content readable.
- `1200px-1439px`: use bounded horizontal board scrolling with a discoverable
  affordance and stable controls.
- `< 1200px` and 200% zoom: collapse the existing sidebar according to its own
  contract, keep controls usable, preserve readable card width, and ensure the
  non-drag status path works. Do not shrink the desktop board into illegibility.
- The initiative is desktop-first, not desktop-only.

## Accessibility Baseline

- Full keyboard access to search, filters, selectors, menus, cards, dialogs,
  drawers, summary actions, and status changes.
- Strong visible focus in every theme.
- Correct labels for icon-only controls and tooltips for unfamiliar unlabeled
  icons.
- Status and active filter meaning never depends on color alone.
- Column names/counts and card names are understandable to screen readers.
- Live regions cover board mutations and rollback.
- Dialog/drawer focus is trapped appropriately and returns to a stable trigger.
- Reduced motion, readable contrast, touch-sized targets, and 200% zoom are part
  of acceptance.

## Presentation Data Shape

The UX source proposed appointment, payment, unit, and filter interfaces. The
initiative may extend the existing UI-facing contracts with equivalent
presentation fields, but must retain the canonical Triad statuses and repository
boundary.

Possible UI-facing additions:

```ts
type PaymentStatus = "pending" | "paid"
type UnitId = "centro" | "artesao"
type CancellationReason = "client" | "barbershop" | "no-show"

type AgendaView = "kanban" | "daily-grid"
```

This is not an OpenAPI, database, authorization, or event contract. A future
backend design must separately address bounded queries, roles, audit attribution,
version/conflict handling, idempotency, privacy, retention, and realtime
reconciliation.

## Accepted Deviations From The Source

| Source direction | Triad decision | Reason |
| --- | --- | --- |
| Dark-only screen | Dark is the primary visual acceptance surface; light and system remain supported | Initiative 04 established a product-wide accessible theme contract |
| Persist mock appointments in `localStorage` | Keep mock business records in deterministic session memory only | Avoid durable customer-shaped data and preserve production boundaries |
| Recreate the referenced sidebar/header composition | Reuse WorkspaceShell, module registry, and shared page layout | Prevent duplicate navigation and shell behavior |
| Two view toggles | Use one canonical selector; any temporary duplicate mirrors the same state | Avoid contradictory state and redundant keyboard controls |
| Alternate label `Lista` | Use `Grade diária` for the existing time grid unless a real list design is accepted | Do not mislabel existing functionality |
| `checked_in`, `in_service`, `cancelled` | Map labels to `arrived`, `in-progress`, and `canceled` | Preserve the accepted scheduling contract |
| Keyboard drag “when possible” | Require keyboard drag where used plus a complete non-drag status action | Equivalent operation is an accessibility requirement |
| Mock type as implementation model | Treat it only as UI-facing evidence | Avoid prematurely freezing backend schemas and rules |

## Reference Acceptance Checklist

- [x] Existing authenticated Studio shell and Agenda route are reused.
- [x] Search/filter order and active/rest behavior match this reference.
- [x] Unit options are only `Centro` and `Artesão`, with `Centro` initially
      selected.
- [x] Six columns appear in the approved order.
- [x] Cards preserve the approved content hierarchy and synthetic fixture
      density.
- [x] Status changes update card, counts, and summary together.
- [x] Last-column transitions require a cancellation/no-show reason.
- [x] Unpaid completion requires a payment-state choice.
- [x] Contextual actions respect the current status.
- [x] Loading, empty, filtered-empty, empty-column, slow, error, and rollback
      states are represented.
- [x] Pointer, touch, keyboard, screen reader, zoom, narrow viewport, reduced
      motion, and theme behavior meet the Initiative 06 requirements.
- [x] No unrelated screen, durable mock persistence, API, IDP, database, or real
      payment behavior is introduced.
