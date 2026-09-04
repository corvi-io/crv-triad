# 20 Studio Shell, Navigation And Feedback Refinement

## Status

- Planning state: Draft
- Approval state: Changes requested
- Delivery state: Not started
- Owner: CRV Triad
- Last updated: 2026-09-04
- Approved by/date: User / 2026-09-04

## Summary

Refine the shared TRIAD Studio experience so authenticated users can enter and move through their
workspace without a disruptive full-screen access check, select a barbershop with one deliberate
action, understand their current location immediately, and manage account or barbershop concerns
from one coherent user menu. The initiative also turns profile, preferences, transient feedback,
and operational notifications into calmer, more direct, accessible surfaces while preserving the
existing navy-and-gold visual system and current notification data source.

Execution plan: [20-studio-shell-navigation-and-feedback-refinement.md](../tasks/20-studio-shell-navigation-and-feedback-refinement.md)

## Context

- Current state:
  - `AuthGate` replaces every authenticated route with a full-page `PageStatus` titled
    `Verificando acesso` while Better Auth resolves or refreshes the session.
  - The initial `/select-workspace` route is intended to select and open a tenant in one action, but
    the observed journey sometimes completes only after a second click.
  - The workspace switcher uses a separate two-step confirmation flow after sign-in.
  - Breadcrumbs always begin with a linked `TRIAD Studio` item before the current route.
  - `Barbearia` and `Configurações` occupy a secondary sidebar block even though related account
    actions already live in the user menu.
  - Profile is a read-only definition list. Preferences and profile do not use the centered,
    scroll-owned module composition used elsewhere in Studio.
  - The root Sonner toaster is centered at the top and gives every feedback type nearly the same
    neutral presentation.
  - Notification cards expose category, severity, read state, lifecycle, summary, detail, and
    several actions at once. The bell preview and full notification center reuse this dense card.
- Problem: repeated access interruption, redundant hierarchy, distributed settings, weak feedback
  semantics, and visually dense notifications make routine use feel heavier than the actions
  require. The shell asks users to interpret the interface instead of keeping their attention on
  daily barbershop work.
- Why now: Initiative 19 established real multi-tenant context and made the rough edges observable
  in authenticated journeys. Refining the shared shell now prevents these patterns from spreading
  to later Studio modules.
- Related docs/issues:
  - [Studio authentication](../../studio/authentication.md)
  - [Studio theme system](../../studio/theme-system.md)
  - [Studio component system](../../studio/component-system.md)
  - [Initiative 19](19-multi-tenant-client-foundation-and-platform-operations.md)
- Repository evidence:
  - `apps/studio/src/modules/auth/components/auth-gate.tsx` owns the blocking access screen.
  - `apps/studio/src/routes/_authenticated/route.tsx` composes auth, workspace, access summary,
    shell, and notifications at the private route boundary.
  - `apps/studio/src/routes/_authenticated/select-workspace/index.tsx` already models one-action
    tenant entry and owns pending/error state.
  - `apps/studio/src/modules/workspace/context-switcher.tsx` owns tenant switching and cache-safe
    context selection.
  - `apps/studio/src/modules/shared/components/workspace-shell/**` and
    `module-registry.ts` own breadcrumbs, sidebar navigation, the user menu, and shell metadata.
  - `apps/studio/src/modules/profile` and `apps/studio/src/modules/preferences` own the affected
    account surfaces; Better Auth already exposes account update behavior through `/api/auth/*`.
  - `apps/studio/src/modules/shared/components/ui/sonner.tsx` owns global toast placement and style.
  - `apps/studio/src/modules/operational-notifications/**` owns the existing development/evaluation
    notification presentation, queries, rules, and bounded source.

## Actors And Workflows

- Primary actors:
  - Authenticated tenant owner, administrator, or member completing daily work in Studio.
  - A user with two or more active barbershop memberships selecting the current workspace.
- Current workflow:
  - Refreshing or navigating can replace the current surface with an access-validation page.
  - Multi-tenant sign-in may require selecting the same barbershop twice before navigation settles.
  - Account, appearance, security, barbershop, and notification destinations are distributed across
    the sidebar, user menu, and header without a clear grouping model.
  - Notifications require parsing several badges and controls before understanding the event.
- Target workflow:
  1. A private Studio route renders its shell without a full-screen access-validation interstitial.
     Session revalidation remains active in the background; protected data surfaces own their
     normal skeleton or loading states.
  2. A confirmed `401` ends the local authenticated experience and redirects to login. A `403`
     preserves the session and displays the relevant access-denial state. Network and server
     failures provide recovery without being treated as proof of logout.
  3. After sign-in, a multi-tenant user activates one barbershop with one click or keyboard
     activation, sees progress on that same action, and reaches the overview once selection succeeds.
  4. The header displays only the current route label, such as `Dashboard`, `Agenda`, `Caixa`, or
     `Clientes`, without a redundant `TRIAD Studio` ancestor.
  5. The sidebar contains only primary operational destinations. The user menu contains clearly
     separated account actions (`Meu perfil`, `Preferências`, `Notificações`, and tenant switching)
     and barbershop administration (`Configuração da barbearia`), followed by sign-out.
  6. Profile and preferences use a centered, responsive, standard scroll-owned layout. Preferences
     group `Aparência` and `Segurança e acesso` into accessible collapsible sections.
  7. The user edits their display name through a validated profile form; email remains visible and
     read-only. Successful saving refreshes the session so the new name appears in the shell.
  8. Toasts appear in the upper-right and distinguish success, error, information, and warning with
     semantic icon, restrained color, direct copy, and equivalent light/dark legibility.
  9. The bell preview shows a short title and concise preview for the most relevant notifications.
     Selecting an item reveals its full content and necessary action with progressive disclosure;
     the full notification center follows the same hierarchy with less badge and action noise.
- Alternate/failure/recovery flows:
  - Session refresh failure caused by connectivity does not erase the session or cached user input.
  - Workspace selection failure clears the busy state, preserves the previous confirmed context,
    announces the failure, and permits one-click retry.
  - Duplicate activation while selection or profile saving is pending is ignored.
  - Invalid profile names show a field-level Portuguese reason and focus the invalid field.
  - Profile save failure preserves the typed name and provides a retry path.
  - Toasts and notifications remain understandable without color, animation, pointer input, or an
    icon being perceived.
  - Notification loading, empty, error, long-copy, missing-destination, unread, read, resolved, and
    overflow scenarios remain supported by the current source.

## Goals

- Remove avoidable full-screen auth interruptions while preserving server-authoritative session
  and access enforcement.
- Make workspace selection deterministic, single-action, and recoverable.
- Reduce navigation redundancy and group account and barbershop administration by user intent.
- Make profile and preferences feel like extensible management surfaces rather than static rows.
- Establish a reusable, semantic, theme-safe transient feedback vocabulary.
- Reduce notification cognitive load through progressive disclosure and direct Brazilian
  Portuguese copy.

## Non-Goals

- Removing server-side authentication, session revalidation, tenant authorization, or API access
  enforcement.
- Showing protected business records before their own authorized request succeeds or retaining
  tenant-bound data after a context switch.
- Creating notification persistence, delivery services, polling, WebSockets, push notifications,
  email/SMS delivery, notification preferences, or new operational notification rules.
- Editing email, avatar, role, memberships, barbershop data, or other future profile attributes.
- Redesigning the product brand, primary operational modules, login screen, or Backstage.
- Adding a generic settings framework or a new shared package.

## Requirements

### Functional

- REQ-001: Private Studio navigation shall not replace the entire surface with the visible
  `Verificando acesso` status while a session is being revalidated.
- REQ-002: The session boundary shall centrally distinguish authenticated, unauthenticated,
  authorization-denied, and transient-error outcomes: confirmed `401` redirects to login, `403`
  preserves the session, and connectivity or server failure does not automatically sign out.
- REQ-003: Protected business content shall remain server-authorized and use content-shaped loading
  states where its data is not yet available; removing the auth interstitial shall not expose stale
  data from a different tenant.
- REQ-004: The initial multi-workspace selector shall activate the chosen tenant and navigate to
  `/overview` from one pointer click or keyboard activation, prevent duplicate submissions, and
  restore an actionable state after failure.
- REQ-005: The selector shall retain the established Studio identity while strengthening heading,
  supporting copy, tenant identity, role, focus, selected/loading feedback, error recovery, long-name
  handling, and narrow-viewport composition.
- REQ-006: The authenticated header shall expose only the current route label as the location
  indicator and shall not render `TRIAD Studio` as a breadcrumb ancestor.
- REQ-007: `Barbearia` and `Configurações` shall be removed from the persistent secondary sidebar
  block. The user menu shall present distinct account and barbershop-administration groups with
  `Meu perfil`, `Preferências`, `Notificações`, `Trocar de barbearia`, and
  `Configuração da barbearia`, plus a separate sign-out action.
- REQ-008: Profile and preferences shall use a centered responsive content width inside the shared
  Studio module layout and standard scroll ownership, without nested page-level scrolling.
- REQ-009: Preferences shall present `Aparência` and `Segurança e acesso` as keyboard-operable,
  semantically named collapsible sections with useful summaries; content shall remain reachable and
  state changes understandable when sections are collapsed.
- REQ-010: An authenticated user shall edit and persist their own non-empty display name through
  the existing Better Auth account contract. Email shall remain visible and read-only, and a
  successful update shall refresh all current-session name presentations.
- REQ-011: Profile editing shall prevent duplicate submission, preserve input after recoverable
  failure, expose field-level Portuguese validation, and communicate save success or failure.
- REQ-012: The shared toaster shall appear in the upper-right and support default/information,
  success, warning, and error semantics with stable labels, appropriate icons, restrained semantic
  color, dismiss behavior, and readable light/dark presentation.
- REQ-013: Existing toast call sites in the affected journeys shall use concise, outcome-oriented
  Brazilian Portuguese copy and the correct semantic variant without exposing private data.
- REQ-014: The notification preview shall prioritize a short event title, concise preview, time or
  useful context, and unread emphasis; full detail and the primary destination/action shall be
  progressively disclosed after selection rather than competing in every collapsed item.
- REQ-015: The notification center shall reuse the preview hierarchy, reduce redundant badges and
  simultaneous controls, retain active/history distinction and read actions, and support direct
  reading with minimal interpretation.
- REQ-016: Notification redesign shall preserve the current module contracts, bounded scenario
  source, destination behavior, read mutations, and production boundary; it shall not introduce a
  backend or background delivery mechanism.

### Non-Functional

- REQ-017: All changed surfaces shall meet WCAG 2.2 AA expectations for keyboard operation,
  visible and unobscured focus, semantic headings and groups, accessible names, live announcements,
  non-color-only states, contrast, reduced motion, and 200% zoom.
- REQ-018: The experience shall remain usable at 320 CSS pixels and across light, dark, and system
  themes; overlays shall keep actions and focused content within the viewport.
- REQ-019: Session revalidation and notification presentation shall not add polling, duplicate
  network calls, route-wide render churn, or new unbounded queries.
- REQ-020: Authentication errors, profile changes, tenant identifiers, notification details,
  credentials, tokens, and private request data shall not be added to logs, analytics, URLs, or
  traces by this initiative.

## Brainstorm

### Problem Framing

- This is not eight unrelated cosmetic requests. It is one shared-shell problem: the Studio gives
  too much visual weight to internal state and too little hierarchy to the user's immediate task.
- The primary affected user is already authenticated or attempting to resume authenticated work;
  speed, context confidence, and recovery matter more than decorative novelty.
- Success is observable when routine refresh/navigation no longer flashes an access page, one tenant
  activation works once, administrative destinations are predictable, and feedback can be scanned
  without decoding multiple visual labels.

### Gaps And Unknowns

- Product gaps: no measured baseline exists for selection retries, auth interstitial exposure, or
  notification comprehension time.
- Technical gaps: the exact cause of the reported second-click selection must be reproduced before
  choosing whether the defect is in event handling, provider state, session propagation, or route
  redirection.
- Data/model gaps: none for notifications because persistence is explicitly outside scope. Profile
  name uses the existing identity record and account update contract.
- Operational gaps: there is no frontend-wide response interceptor today; implementation must choose
  a central session-invalid signal compatible with Better Auth and current repository adapters
  without inventing a broad networking framework.

### Counterpoints

- Removing all client-side session gating would produce avoidable unauthenticated shell flicker and
  could start protected requests unnecessarily. The selected approach removes the blocking visual
  state but retains a central auth boundary and server-authoritative data requests.
- Treating every request failure as logout is unsafe and frustrating because offline, timeout, and
  `5xx` conditions do not prove session invalidity. Only a confirmed authentication failure ends the
  local session; authorization denial remains a distinct state.
- A literal breadcrumb with only one item has little hierarchical navigation value. It remains a
  compact route-location label in the header, with correct current-page semantics, because that is
  the user's requested role for the component.
- Moving the bell exclusively into the user menu would reduce notification visibility. The selected
  direction keeps the bell preview as the fast operational entry point and also provides a clear
  `Notificações` destination in the grouped user menu.
- Fully redesigning notification rules or storage would delay the usability outcome and cross into
  backend/product behavior the current request explicitly excludes.
- Doing nothing preserves repeated interruption, makes tenant selection feel unreliable, and lets
  inconsistent feedback patterns spread to future modules.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Cosmetic-only pass over current components | Smallest code change | Does not solve auth interruption, tenant-selection defect, information architecture, or profile editing | Use only if runtime behavior cannot change |
| B | Targeted shared-shell and feedback refinement with existing contracts | Solves the observed workflows, creates reusable UI patterns, avoids new backend scope | Touches several shared components and requires broad regression coverage | Selected for Initiative 20 |
| C | New shell plus notification platform and generalized settings system | Strong long-term expansion surface | Premature abstraction, new persistence/API/ops scope, substantially higher risk | Reconsider when delivery channels and real settings inventory are defined |

### Recommendation

Choose Option B. Treat the work as one Operate-mode refinement of the incumbent TRIAD Studio visual
world: make internal validation quiet, actions deterministic, navigation flatter, administration
grouped by intent, and feedback progressively disclosed. Preserve existing contracts wherever
possible; use the existing Better Auth self-update capability for display name and keep operational
notifications presentation-only.

## Architecture And Boundaries

- Site impact: none.
- API impact: no new business API. Existing protected endpoints remain authoritative and continue
  returning authentication and authorization failures.
- IDP impact: the existing Better Auth `/api/auth/*` account update contract persists the user's
  display name. No custom identity-administration route, schema change, or new IDP policy is planned.
- Studio impact: primary scope. Changes belong to auth/session presentation, the authenticated route
  composition, workspace context selection, shared shell navigation, profile, preferences, Sonner
  feedback, and operational-notification presentation.
- Data/persistence impact: existing IDP user `name` changes through Better Auth. No migration,
  backfill, notification persistence, or business schema change.
- External provider impact: none.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Eight observed concerns form one authenticated-shell workflow with explicit failure and recovery states | `requirements-analysis`, `spec-writer`, Impeccable `shape` |
| Architecture | Applicable | Work spans Studio UI and the existing IDP account contract without changing product ownership | `triad-architecture`, root and Studio `AGENTS.md` |
| API | Applicable | Existing `401`/`403` and Better Auth self-update contracts must remain correctly interpreted; no new route | `triad-studio-development`, `docs/studio/authentication.md` |
| Identity and authorization | Applicable | Session revalidation and self-name update affect identity presentation; server authorization remains unchanged | `triad-studio-development`, Initiative 19 |
| Persistence | Applicable | Only the existing IDP user name is updated; no schema, index, migration, or backfill | Better Auth contract, Initiative 19 |
| Studio UI | Applicable | This is an authenticated Studio shell, settings, feedback, and notification refinement | `triad-studio-development`, Impeccable, theme/component docs |
| Site UI | Not applicable | No public-site surface changes | `AGENTS.md` |
| Accessibility | Applicable | Menus, disclosures, overlays, async status, form validation, toast, and notification semantics change | `accessibility`, WCAG 2.2 AA |
| Performance and scale | Applicable | Auth and notification work must avoid duplicate requests, polling, and route-wide churn | `triad-studio-development` |
| Security and privacy | Applicable | Auth failure classification, stale tenant data, self-update, and private notification content require review | `AGENTS.md`, Studio product contract |
| Observability | Applicable | Client-side failures need diagnosable categories without logging payloads or identity data | Studio authentication docs |
| Reliability and delivery | Applicable | Shared-shell behavior requires compatibility, retry, rollback, and production-boundary checks | Studio validation commands |
| Testing and QA | Applicable | Critical auth, context selection, responsive, theme, keyboard, and notification journeys need automation and browser evidence | Vitest, Playwright, axe |
| Documentation | Applicable | Durable auth/session, shell navigation, component, feedback, and notification contracts change | `docs/studio/**`, component inventory |

## Performance And Scalability

- Expected data growth: user-menu, profile, preference, and toast content is constant-size.
  Notification item counts remain bounded by the existing source contracts.
- Critical paths: private-route entry, session refresh, tenant activation, shell render, and opening
  the notification preview.
- Query bounds/pagination: no new queries. The preview retains its small active limit. The current
  notification center limits remain unchanged; a production pagination contract is deferred until a
  real backend exists.
- Concurrency risks: repeated tenant-selection and profile-save activation must be suppressed while
  pending. A late session result must not restore a logged-out or superseded tenant context.
- External limits: no new external dependency or polling.
- What happens with millions of records/items: no changed surface loads business records. A future
  persistent notification system must use server pagination and cannot reuse the evaluation source's
  bounded in-memory list as capacity evidence.

## Security, Privacy, And Abuse

- Auth/session impact: session checks remain active and protected requests remain server-authorized.
  The UI distinguishes `401`, `403`, and transient failure rather than weakening enforcement.
- Roles/access: any authenticated user may edit only their own display name. Tenant and module
  permissions do not change.
- PII/secrets: display name, email, tenant identity, notification detail, tokens, cookies, and request
  bodies must not be logged or added to analytics.
- Spam/abuse vectors: duplicate-submit suppression prevents repeated context and profile mutations.
  No messaging or notification creation surface is introduced.
- Rate limiting or throttling needs: existing Better Auth and API protections remain sufficient for
  the bounded self-update and session calls; no new client retry loop is allowed.

## Accessibility And UX

- Keyboard flow: tenant rows/actions, user-menu groups, disclosures, profile fields, notification
  items, toast actions, and dismiss controls are reachable in logical order with native semantics.
- Screen reader states: async operations expose named busy/status states; errors use alerts; success
  and notification read-state changes use polite announcements; current route and grouped menu
  relationships are named.
- Responsive behavior: centered content uses fluid widths; menus, selector, notification detail, and
  toast remain within 320 CSS pixels without page-level horizontal scrolling.
- Loading/error/empty states: route content uses shaped skeletons where needed. Profile, workspace,
  notifications, and session failure paths preserve actionable recovery and do not use generic
  visible loading text as their primary presentation.
- Duplicate submission prevention: tenant activation and profile save keep stable labels, show the
  shared loading treatment, expose `aria-busy`, and ignore repeated activation while pending.

## Logging And Observability

- Useful structured events: existing request diagnostics may classify session refresh failure,
  confirmed unauthenticated response, context-selection failure, and self-profile update failure by
  operation and safe error code. Adding analytics events is not required.
- Metrics: no product telemetry is introduced. Test evidence records whether a single activation
  produces one selection mutation and one successful navigation.
- Traces/spans: preserve existing server request correlation; do not create browser spans containing
  display names, emails, tenant names, notification copy, or tokens.
- Alerts: none added for a presentation-focused initiative.
- Sensitive data that must not be logged: credentials, cookies, tokens, request headers, display
  names, emails, tenant identifiers/names, notification content, and business payloads.

## Delivery And Rollback

- Compatibility strategy: preserve existing routes and notification repository contracts. Introduce
  shared presentation changes behind current component APIs where practical.
- Feature flag/rollout: no flag is required. The work ships as a Studio frontend refinement after
  critical-route browser validation.
- Migration/backfill: none.
- Rollback: revert the Studio presentation changes as one frontend release. Existing Better Auth,
  API, and persistence contracts remain compatible.
- Operational readiness: production-boundary checks must prove that the notification evaluation
  source stays disabled where currently required and no dev source enters production.

## Success Measures

- Success signals:
  - No visible `Verificando acesso` interstitial during authenticated refresh or route navigation.
  - One tenant activation produces one selection mutation and one navigation to `/overview`.
  - All authenticated route headers show only their current route label.
  - Profile display-name changes persist and update the open shell without sign-out/sign-in.
  - User-menu destinations, preference sections, semantic toast variants, and notification detail
    are operable by keyboard and readable in supported themes and widths.
- Baseline or measurement plan: no production analytics baseline exists. Use deterministic component
  and E2E assertions plus manual visual evidence before/after at desktop and 320-pixel widths.
- Regression guardrails: automated tests prohibit the access-validation copy, duplicate tenant
  mutation, redundant breadcrumb ancestor, secondary sidebar block, and production notification
  source leakage.
- Evaluation window: review immediately in local browser QA and again during the first staging smoke
  test after deployment.

## Acceptance Criteria

- [ ] AC-001: Given an authenticated user refreshes or navigates within Studio, the shell remains
  visible without rendering `Verificando acesso`, and protected route content remains covered by its
  own authorized loading/data lifecycle.
- [ ] AC-002: Given session resolution returns confirmed unauthenticated status, Studio redirects to
  login; given `403`, it preserves the session and shows access denial; given network or `5xx`
  failure, it does not automatically sign out and offers recovery.
- [ ] AC-003: Given a user selects a tenant on `/select-workspace`, one pointer click or keyboard
  activation issues no more than one mutation, keeps the action visibly busy, and navigates once to
  `/overview`; failure restores retry without changing the confirmed tenant.
- [ ] AC-004: The selector remains understandable with one, several, and long-named barbershops in
  light/dark themes at desktop and 320 CSS pixels, with correct keyboard, focus, status, and error
  behavior.
- [ ] AC-005: Each authenticated route header displays only its current route label with
  current-location semantics and never prepends `TRIAD Studio`.
- [ ] AC-006: The persistent secondary sidebar group is absent. The user menu groups account actions
  separately from `Configuração da barbearia`, includes notifications and context switching where
  applicable, and keeps sign-out separate.
- [ ] AC-007: Profile and preferences render in centered, responsive shared layouts with one clear
  scroll owner and no inaccessible nested overflow.
- [ ] AC-008: Appearance and security/access preferences are accessible collapsible sections whose
  controls retain current behavior and whose collapsed summaries remain meaningful.
- [ ] AC-009: A user can change their own non-empty display name, submit once, retain typed input on
  failure, see Portuguese validation/feedback, and see the persisted name update in the shell; email
  remains read-only.
- [ ] AC-010: Toasts render in the upper-right with tested information/default, success, warning, and
  error semantics, icons, direct copy, dismissal, reduced-motion behavior, and legible light/dark
  contrast without relying only on color.
- [ ] AC-011: The affected toast call sites use stable, concise Brazilian Portuguese outcome copy
  and do not include private payload values.
- [ ] AC-012: Notification preview items present a short title and concise preview first; selecting
  an item reveals full content and the relevant action without showing the previous badge/action
  overload on every collapsed item.
- [ ] AC-013: The full notification center preserves active/history, unread/read mutations,
  destinations, loading, error, empty, overflow, long-copy, and missing-destination behavior using
  the simplified hierarchy.
- [ ] AC-014: All changed journeys pass automated accessibility checks and manual keyboard/focus,
  200% zoom, reduced-motion, light/dark/system, desktop, and 320 CSS-pixel review.
- [ ] AC-015: Studio format, lint, typecheck, unit/component tests, production-boundary test, build,
  focused E2E tests, and the Impeccable mechanical detector pass or any exception is recorded before
  completion.
- [ ] AC-016: Durable Studio authentication, component-system, and theme/feedback documentation is
  updated to match the implemented behavior; no README, AGENTS, env-schema, or skill change is made
  unless implementation reveals a durable workflow or convention change.

## Verification Plan

- Unit tests:
  - Session outcome classification and non-blocking auth-gate behavior.
  - Single-flight workspace activation and recovery.
  - Profile name schema, submission, session refresh, and failure preservation.
  - Route-label resolution, menu grouping, disclosure state, toast variants, and notification
    collapsed/detail composition.
- Integration/API tests:
  - Exercise the existing Better Auth self-update client and refreshed session behavior without
    introducing a custom route.
  - Preserve existing `401`/`403` access contract coverage from Initiative 19.
- UI tests:
  - Focused Vitest tests for shared shell, profile, preferences, toaster, and notification components.
  - Playwright journeys for refresh/session outcomes, single-click tenant selection, navigation
    location, user menu, profile update, disclosures, toasts, and notification preview/center.
- Manual/browser checks:
  - Authenticated owner with one and multiple tenants; invalid, forbidden, offline/transient, and
    successful states.
  - Chromium desktop and 320 CSS-pixel mobile viewport, light/dark/system, 200% zoom, keyboard-only,
    reduced motion, forced colors where relevant, and screenshot review.
- Build/check commands:
  - `bun --filter studio routes:generate`
  - `bun --filter studio format`
  - `bun --filter studio lint`
  - `bun --filter studio typecheck`
  - `bun --filter studio test`
  - `bun --filter studio test:production-boundary`
  - `bun --filter studio build`
  - `bun --filter studio check`
  - Focused `bun --filter studio test:e2e -- <spec files>` followed by the full suite when feasible.
  - `node .agents/skills/impeccable/scripts/detect.mjs --json <changed Studio targets>` once after UI
    implementation is complete.

## Open Questions

### Blocking

- None.

### Non-Blocking

- [ ] Confirm during reproduction whether the workspace double activation originates in route,
  provider, or session propagation — implementation owner; the accepted observable behavior does
  not depend on the internal cause.
- [ ] Decide whether notification full detail is best expressed as an in-place disclosure, popover
  detail view, or shared drawer after inspecting realistic long content and mobile focus behavior —
  implementation owner; choose the smallest accessible composition satisfying AC-012 and AC-013.
- [ ] Establish production telemetry baselines only when privacy-safe product analytics for
  authenticated Studio workflows is separately approved — product owner.

## Assumptions

- Better Auth's mounted self-update account contract supports display-name changes in the pinned
  version — validate with an integration test before building the form; if unavailable, return the
  initiative for a material API/IDP scope decision rather than adding an improvised endpoint.
- The header bell remains the primary quick notification entry while the user menu adds a durable
  navigation destination — validate during product QA.
- The current notification data and mutation contracts are product-valid for this visual pass —
  validate against existing notification E2E scenarios.
- No new reusable primitive is needed beyond existing Base UI/shadcn disclosure, scroll, popover,
  drawer, alert, button, and Sonner capabilities — inspect the component inventory before creating
  anything new.

## Definition of Ready

- [x] All mandatory gates in `planning-gates.md` pass.
- [x] Requirement-to-acceptance-to-task traceability is complete.
- [x] The planning state is `Ready` before requesting approval.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-04 | Awaiting approval |  | Initial decision brief presented after product clarification |
| 2026-09-04 | Approved | User | Approved without requested changes |
| 2026-09-04 | Changes requested | User | Reopened to add a cross-product authentication visual and motion direction for Studio and Backstage |
