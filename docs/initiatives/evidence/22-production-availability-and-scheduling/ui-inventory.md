# Initiative 22 UI Integration Inventory

Date: 2026-09-05. TASK-002 implemented parity contract; confirmed by local browser and component evidence.
Authority: approved PRD 22, Studio AGENTS, existing Client form/drawers and shared components.
Visual mode: Operate. Preserve existing navy/gold tokens, Geist, themes and temporal board.

## Shared anatomy

| Pattern | Decision | Existing owner / application |
| --- | --- | --- |
| Page inset | Reuse | WorkspaceShellContent; no extra feature outer padding |
| Module scrolling | Reuse | ModuleLayout; temporal board may own bounded horizontal overflow |
| Primary command | Reuse | PageHeader.actions: Novo agendamento / Adicionar bloco |
| Drawer | Reuse | ActionDrawer header/body/footer; primary right, secondary left |
| Form grouping | Reuse | FormSection and existing shared RHF field compositions |
| Validation | Reuse | RHF/Zod, noValidate, linked field errors, required labels, focus first invalid |
| Dates | Reuse | DatePicker, canonical YYYY-MM-DD; no native date field |
| Time | Reuse | Existing shared composed time selection; canonical HH:mm |
| Client creation | Reuse | Canonical ClientForm inside existing create flow; preserve parent draft |
| Temporal board | Deliberate specialization | Day/week time axis, professional columns and private occupancy |
| Dense alternative | Reuse | DataTable with server pagination and existing row context actions |
| Loading | Reuse | Named layout-shaped Skeleton |
| Mutation feedback | Reuse | Inline recoverable failure plus concise Sonner success; stable button label |
| Record detail | Reuse | Explicit view/edit mode, existing drawer tabs and sections |

## Appointment field inventory

| Field | Label | Prompt / canonical value | Rules |
| --- | --- | --- | --- |
| unitId | Unidade | Selecione uma unidade | Required, active, explicit timezone; context may prefill |
| clientId | Cliente | Buscar por nome, telefone ou e-mail | Required active canonical client; search stays out of URL |
| serviceId | Serviço | Selecione um serviço | Required, eligible for selected unit and professional |
| professionalId | Profissional | Selecione um profissional | Required active linked professional; valid assignment |
| date | Data | Shared DatePicker | Required; contextual date is reviewable |
| start | Horário | Selecione um horário | Required 15-minute starts, eligible server interval |
| notes | Observações | Optional supporting example only | Bounded; never copied to events, telemetry or URL |
| cancellationReason | Motivo do cancelamento | Selecione um motivo | Required only in cancellation command |
| cancellationNote | Observação do cancelamento | Optional | Bounded and private |
| price/duration | Valor / Duração | Read-only resolved catalog values | Server-owned; never editable payload authority |
| preferences | Preferências do cliente | Sugestões do cliente | No automatic selection; archived unavailable for new booking |

Copied customer name/phone, generated client IDs, payment, rating, tags and generic editable status
must leave the production appointment form. Future service/checkout transitions are not user commands.

## Availability field inventory

| Field | Label | Prompt / canonical value | Rules |
| --- | --- | --- | --- |
| unitId | Unidade | Selecione uma unidade | Required active unit with confirmed timezone |
| professionalId | Profissional | Selecione um profissional | Required active unit assignment |
| kind | Tipo de bloco | Disponível / Intervalo / Bloqueio / Ausência | Explicit semantic text and icon |
| start/end | Início / Término | Shared time controls | Ordered interval within opening hours |
| recurrence | Repetição | Sem repetição / Semanal | Explicit choice |
| date | Data | Shared DatePicker | Required for one-off occurrence |
| weekdays | Dias da semana | Persistent labels | Required for weekly recurrence |
| effectiveFrom | Data inicial | Shared DatePicker | Required; canonical local date |
| effectiveUntil | Data final | Shared DatePicker | Optional, not earlier than start |
| scope | Alterar | Somente esta ocorrência / Toda a série | Required for existing recurring occurrence command |
| timezone | Fuso horário | Confirmed unit value | Visible; missing configuration links to unit edit |

## Recovery and state contract

- Initial empty: explain first configuration or booking; expose the authorized primary command.
- Filtered empty: retain context and expose clear filters.
- Missing timezone: explain explicit confirmation; link to unit editing.
- Missing catalog relationship: identify configuration dependency; do not manufacture options.
- Permission or plan denial: preserve selection and expose existing actionable denial pattern.
- Source failure: inline retry, preserve date/unit/filter and editor draft, no fixture fallback.
- Collision: keep draft, refresh effective availability, focus date/time selection.
- Stale version: keep draft and offer explicit reload-latest; never overwrite silently.
- Stale appointment link: keep range/filter context and explain unavailable record.
- Saving: prevent duplicate command with stable label and shared loading state.
- Success: close or refresh the command surface, announce result and invalidate all affected
  tenant-scoped scheduling projections.

## Required next evidence

Inspect actual Client/catalog screens in a live browser at desktop and 320px, both themes.
Freeze exact field copy and dependency clearing against final HTTP contracts, then record keyboard,
focus, zoom, forced colors and reduced-motion behavior. This inventory alone does not pass TASK-002.


## Confirmed parity and specialization evidence

- Shared ActionDrawer, FormSection, RHF fields, DatePicker, client form, DataTable and row menus are
  reused in the HTTP scheduling surfaces. The canonical quick-create form owns client validation;
  the parent draft survives child cancellation, offline failure and client creation.
- Day/week time-axis boards retain bounded horizontal scrolling as a deliberate specialization;
  the list alternative uses server pagination. Month/custom periods use the list rather than an
  unbounded time grid. Unit and professional filter labels remain visible at 320px.
- `responsive.mjs` r2 captures cover Agenda, Dashboard and availability in light/dark at 320px;
  `availability-recovery.mjs` covers invalid-form keyboard focus, forced colors, reduced motion and
  equivalent 200% reflow. Inspected checkpoints are enumerated in `product-qa.json`.
- The one Impeccable detector run returned `[]` in `/tmp/initiative22-impeccable.json`; no repeated
  detector or context-generation loop was used. Later corrections addressed observed functional or
  accessibility defects (offline requests, invalid ARIA, hover/theme contrast, private occupancy).
- Scope selectors are explicit: occurrence or whole series, and cancellation category with optional
  note. Client preferences and archived labels are advisory; selected IDs remain server-validated.
- There is no new visual language, outer-inset convention, payment control, financial metric or
  generic fulfillment transition in production scheduling. Fulfillment remains Initiative 23.

Final aggregate automated approval remains tracked separately in TASK-015 and `product-qa.md`.
