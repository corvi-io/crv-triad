# 20 TRIAD Authentication, Studio Shell, Navigation And Feedback Refinement

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: Complete
- Owner: CRV Triad
- Last updated: 2026-09-04
- Approved by/date: User / 2026-09-04

## Summary

Create a distinctive authentication entrance for TRIAD Studio and TRIAD Backstage, then refine the
shared TRIAD Studio experience so authenticated users can enter and move through their
workspace without a disruptive full-screen access check, select a barbershop with one deliberate
action, understand their current location immediately, and manage account or barbershop concerns
from one coherent user menu. The initiative also turns profile, preferences, transient feedback,
and operational notifications into calmer, more direct, accessible surfaces. Authentication uses a
shared family art direction with product-specific scenes, restrained ambient motion, and equivalent
reduced-motion presentation while preserving the navy-and-gold visual system and current
notification data source.

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
  - Studio and Backstage share the same two-column `AuthShell`: the form occupies the left half and
    the right half contains only a very large stacked TRIAD logo over a gradient surface.
  - Login, invitation acceptance, password recovery, and password reset all reuse `AuthShell`, so
    one product-specific branded surface can improve the complete authentication journey.
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
  7. The profile presents display name and email as clearly read-only account data. A separate
     local-only avatar preview supports visual evaluation without an identity mutation.
  8. Toasts appear in the upper-right and distinguish success, error, information, and warning with
     semantic icon, restrained color, direct copy, and equivalent light/dark legibility.
  9. The bell preview shows a short title and concise preview for the most relevant notifications.
     Selecting an item reveals its full content and necessary action with progressive disclosure;
     the full notification center follows the same hierarchy with less badge and action noise.
  10. Every Studio authentication screen pairs the focused form on large viewports with an
      expressive scene about orchestrating a barbershop: chair, mirror, people, schedule, client,
      and business signals converge into one calm operating rhythm rather than depicting a literal
      software dashboard.
  11. Every Backstage authentication screen uses the same TRIAD family grammar but presents a
      system observatory: connected product and tenant signals, governed access, platform health,
      and a protected operational core, without hacker, server-rack, or surveillance clichés.
  12. Each scene uses subtle ambient layer motion and, where pointer precision exists, an optional
      low-amplitude response to the pointer. Reduced-motion preference receives a composed static
      equivalent, not an empty or degraded panel.
- Alternate/failure/recovery flows:
  - Session refresh failure caused by connectivity does not erase the session or cached user input.
  - Workspace selection failure clears the busy state, preserves the previous confirmed context,
    announces the failure, and permits one-click retry.
  - Duplicate tenant activation while selection is pending is ignored.
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
- Make authentication a memorable product entrance with one recognizable TRIAD family language and
  a product-specific story for Studio and Backstage.
- Establish art-direction and motion rules that can later extend to TRIAD Barber without creating
  or pretending that the future app exists now.

## Non-Goals

- Removing server-side authentication, session revalidation, tenant authorization, or API access
  enforcement.
- Showing protected business records before their own authorized request succeeds or retaining
  tenant-bound data after a context switch.
- Creating notification persistence, delivery services, polling, WebSockets, push notifications,
  email/SMS delivery, notification preferences, or new operational notification rules.
- Editing email, role, memberships, barbershop data, or other future profile attributes.
- Uploading or persisting profile images; this initiative includes only a local, session-bound avatar
  preview used to validate the future interaction design.
- Redesigning the product brand, primary operational modules, authentication forms, or authenticated
  Backstage workflows beyond the new branded shell.
- Changing authentication validation, identity contracts, or route behavior merely to accommodate
  artwork.
- Implementing TRIAD Barber, creating Barber runtime assets, or adding a shared cross-app package
  before real reuse exists.
- Using autoplay video, remote runtime imagery, heavy 3D/WebGL, or motion required to understand or
  complete authentication.
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
- REQ-010: An authenticated user shall see their display name and email as read-only account data;
  Studio shall not expose an identity mutation for either field.
- REQ-011: The profile shall keep the local-only avatar preview visually separate from read-only
  account data and shall not imply that the preview is persisted by a general save action.
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
- REQ-021: Studio and Backstage authentication shells shall replace the oversized stacked-logo
  panel with product-specific visual scenes derived from one documented TRIAD family art direction.
- REQ-022: The Studio scene shall communicate coordinated barbershop ownership and operation through
  an original visual composition, without reproducing a dashboard screenshot or relying on generic
  stock photography.
- REQ-023: The Backstage scene shall communicate the governed system behind the TRIAD product family
  through an original observatory/network composition, without hacker, surveillance, or generic
  infrastructure clichés.
- REQ-024: The new branded surface shall apply consistently to login, invitation acceptance,
  password recovery, and password reset in both Studio and Backstage while leaving each form's
  existing functional behavior and Portuguese copy intact unless an accessibility issue requires a
  focused correction.
- REQ-025: Authentication artwork shall use locally owned, production-optimized assets with explicit
  provenance and no runtime request to a third-party image service. Each app shall own its assets
  until a real third consumer justifies extraction.
- REQ-026: Authentication motion shall be ambient, bounded, non-blocking, and implemented with
  lightweight composited properties. Pointer response, if retained after QA, shall be optional and
  unavailable input modes shall lose no meaning.
- REQ-027: `prefers-reduced-motion: reduce` shall disable non-essential motion and present an
  intentional static composition with the same product identity and contrast.
- REQ-028: At widths where the two-column composition cannot remain useful, the form shall retain
  priority and the branded scene shall collapse or crop intentionally without causing horizontal
  overflow, obscuring controls, or increasing task length.

### Non-Functional

- REQ-017: All changed surfaces shall meet WCAG 2.2 AA expectations for keyboard operation,
  visible and unobscured focus, semantic headings and groups, accessible names, live announcements,
  non-color-only states, contrast, reduced motion, and 200% zoom.
- REQ-018: The experience shall remain usable at 320 CSS pixels and across light, dark, and system
  themes; overlays shall keep actions and focused content within the viewport.
- REQ-019: Session revalidation and notification presentation shall not add polling, duplicate
  network calls, route-wide render churn, or new unbounded queries.
- REQ-020: Authentication errors, profile data, tenant identifiers, notification details,
  credentials, tokens, and private request data shall not be added to logs, analytics, URLs, or
  traces by this initiative.
- REQ-029: Authentication artwork and motion shall not delay form interactivity, produce material
  layout shift, trap focus, enter the accessibility tree as redundant content, or regress Studio or
  Backstage production build boundaries.
- REQ-030: Profile shall offer a clearly labeled local-only avatar preview for PNG, JPEG, and WebP
  files up to 2 MB, allow replacement/removal, and revoke temporary object URLs; no upload or
  persistence shall occur.
- REQ-031: The in-shell barbershop switcher shall reuse the selection page's hierarchy and require
  an explicit confirmation naming the destination before changing the active tenant.
- REQ-032: Sign-out shall require an explicit confirmation dialog; cancel shall preserve the
  session, while confirmation shall expose the existing pending state and invoke sign-out once.

## Brainstorm

### Problem Framing

- This is not eight unrelated cosmetic requests. It is one shared-shell problem: the Studio gives
  too much visual weight to internal state and too little hierarchy to the user's immediate task.
- The affected user is either entering a known TRIAD product through authentication or resuming
  authenticated work. The entrance should build product recognition without slowing the task;
  inside the product, speed, context confidence, and recovery outweigh decorative novelty.
- Success is observable when routine refresh/navigation no longer flashes an access page, one tenant
  activation works once, administrative destinations are predictable, and feedback can be scanned
  without decoding multiple visual labels.

### Gaps And Unknowns

- Product gaps: no measured baseline exists for selection retries, auth interstitial exposure, or
  notification comprehension time. Authentication art has no existing product-specific narrative
  beyond the shared logo.
- Technical gaps: the exact cause of the reported second-click selection must be reproduced before
  choosing whether the defect is in event handling, provider state, session propagation, or route
  redirection.
- Data/model gaps: none for notifications because persistence is explicitly outside scope. Profile
  name uses the existing identity record and account update contract.
- Operational gaps: there is no frontend-wide response interceptor today; implementation must choose
  a central session-invalid signal compatible with Better Auth and current repository adapters
  without inventing a broad networking framework.
- Asset gaps: no approved Studio or Backstage hero artwork exists. Final composition, layer split,
  crop, and measured media budget must be validated during the bounded concept/asset task.

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
- Reusing exactly the same illustration in every product would create consistency but erase the
  reason each application exists. Completely unrelated scenes would weaken the TRIAD family. The
  selected direction shares composition grammar, materials, color, light, and motion behavior while
  giving every product a distinct subject.
- A single generated background image would be easy to ship but difficult to animate meaningfully
  and adapt across themes or crops. Heavy 3D or video would provide spectacle at disproportionate
  performance and accessibility cost. The selected approach uses an optimized hero asset plus a
  small number of independently composited foreground and ambient layers.
- Doing nothing preserves repeated interruption, makes tenant selection feel unreliable, and lets
  inconsistent feedback patterns spread to future modules while authentication remains visually
  interchangeable and disconnected from each product's purpose.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A | Cosmetic-only pass plus one shared auth background | Smallest code and asset change | Does not solve workflow defects and makes Studio/Backstage visually interchangeable | Use only if runtime behavior and product distinction cannot change |
| B | Targeted shell/feedback refinement plus one family grammar with product-specific auth scenes | Solves observed workflows, gives authentication meaning, avoids new backend and heavy media scope | Touches two apps and requires art, performance, accessibility, and broad regression review | Selected for Initiative 20 |
| C | Shared auth package, real-time 3D/video scenes, notification platform, and generalized settings | Maximum reuse and spectacle | Premature abstraction, high runtime cost, new persistence/ops scope, substantially higher risk | Reconsider only after Barber exists and delivery requirements are real |

### Recommendation

Choose an expanded Option B. Treat operational work as an Operate-mode refinement of the incumbent
TRIAD Studio world, while treating authentication as the expressive threshold where brand can
become more memorable. Make internal validation quiet, actions deterministic, navigation flatter,
administration grouped by intent, and feedback progressively disclosed. Replace the empty auth
brand panel with a shared visual grammar named **Three Forces, One Rhythm**: layered paths and three
coordinated focal elements converge around a protected center. Studio interprets the grammar as
barbershop operation; Backstage interprets it as the system observatory; future Barber can later
interpret it as the professional at the point of service. Preserve existing auth contracts, use
identity data read-only in Studio, and keep notifications presentation-only.

## Architecture And Boundaries

- Site impact: none.
- API impact: no new business API. Existing protected endpoints remain authoritative and continue
  returning authentication and authorization failures.
- IDP impact: none. Studio does not mutate account identity and no custom identity-administration
  route, schema change, or new IDP policy is planned.
- Studio impact: primary scope. Changes belong to the complete authentication shell, auth/session
  presentation, the authenticated route
  composition, workspace context selection, shared shell navigation, profile, preferences, Sonner
  feedback, and operational-notification presentation.
- Backstage impact: the complete authentication shell and its local branded assets/styles. Operator
  authorization, tenant operations, and authenticated Backstage workflows do not change.
- Data/persistence impact: none. No migration, backfill, identity mutation, notification
  persistence, or business schema change.
- External provider impact: image generation may be used during implementation to create original
  source artwork. Final runtime assets are reviewed, optimized, stored locally, and do not depend on
  the generation provider.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Eight observed concerns form one authenticated-shell workflow with explicit failure and recovery states | `requirements-analysis`, `spec-writer`, Impeccable `shape` |
| Architecture | Applicable | Work spans Studio and Backstage while keeping each app and asset owner independent | `triad-architecture`, root/Studio/Backstage `AGENTS.md` |
| API | Applicable | Existing `401`/`403` contracts must remain correctly interpreted; no new route or identity mutation | `triad-studio-development`, `docs/studio/authentication.md` |
| Identity and authorization | Applicable | Session revalidation affects identity presentation while account data stays read-only and server authorization remains unchanged | `triad-studio-development`, Initiative 19 |
| Persistence | Not applicable | No schema, index, migration, backfill, or identity update is introduced | Initiative 19 |
| Studio UI | Applicable | This includes the full Studio auth family plus authenticated shell, settings, feedback, and notification refinement | `triad-studio-development`, Impeccable, theme/component docs |
| Backstage UI | Applicable | The full Backstage auth family receives its own system-observatory scene without changing operator workflows | `triad-backstage-development`, Impeccable, Backstage design contract |
| Site UI | Not applicable | No public-site surface changes; Backstage is an independent internal React app | `AGENTS.md` |
| Accessibility | Applicable | Menus, disclosures, overlays, async status, form validation, toast, and notification semantics change | `accessibility`, WCAG 2.2 AA |
| Performance and scale | Applicable | Auth and notification work must avoid duplicate requests, polling, and route-wide churn | `triad-studio-development` |
| Security and privacy | Applicable | Auth failure classification, stale tenant data, read-only identity, and private notification content require review | `AGENTS.md`, Studio product contract |
| Observability | Applicable | Client-side failures need diagnosable categories without logging payloads or identity data | Studio authentication docs |
| Reliability and delivery | Applicable | Shared-shell behavior requires compatibility, retry, rollback, and production-boundary checks | Studio validation commands |
| Testing and QA | Applicable | Critical auth, context selection, responsive, theme, keyboard, and notification journeys need automation and browser evidence | Vitest, Playwright, axe |
| Documentation | Applicable | Durable auth/session, shell navigation, component, feedback, and notification contracts change | `docs/studio/**`, component inventory |

## Performance And Scalability

- Expected data growth: user-menu, profile, preference, and toast content is constant-size.
  Notification item counts remain bounded by the existing source contracts.
- Critical paths: private-route entry, session refresh, tenant activation, shell render, opening the
  notification preview, authentication form interactivity, and largest visual asset delivery.
- Query bounds/pagination: no new queries. The preview retains its small active limit. The current
  notification center limits remain unchanged; a production pagination contract is deferred until a
  real backend exists.
- Concurrency risks: repeated tenant-selection and profile-save activation must be suppressed while
  pending. A late session result must not restore a logged-out or superseded tenant context.
- External limits: no new external dependency or polling.
- Authentication media budget: final assets shall be responsive and optimized, avoid autoplay
  video/WebGL, lazy-load non-critical decorative layers where compatible with stable composition,
  and keep the form usable before artwork finishes loading. Exact byte budgets must be established
  from measured incumbent builds during implementation rather than invented in planning.
- What happens with millions of records/items: no changed surface loads business records. A future
  persistent notification system must use server pagination and cannot reuse the evaluation source's
  bounded in-memory list as capacity evidence.

## Security, Privacy, And Abuse

- Auth/session impact: session checks remain active and protected requests remain server-authorized.
  The UI distinguishes `401`, `403`, and transient failure rather than weakening enforcement.
- Roles/access: account identity remains read-only in Studio. Tenant and module permissions do not
  change.
- PII/secrets: display name, email, tenant identity, notification detail, tokens, cookies, and request
  bodies must not be logged or added to analytics.
- Spam/abuse vectors: duplicate-submit suppression prevents repeated context mutations.
  No messaging or notification creation surface is introduced.
- Rate limiting or throttling needs: existing Better Auth and API protections remain sufficient for
  the bounded session calls; no new client retry loop is allowed.

## Accessibility And UX

- Keyboard flow: tenant rows/actions, user-menu groups, disclosures, profile fields, notification
  items, toast actions, and dismiss controls are reachable in logical order with native semantics.
- Screen reader states: async operations expose named busy/status states; errors use alerts; success
  and notification read-state changes use polite announcements; current route and grouped menu
  relationships are named.
- Authentication art is decorative unless a short adjacent product statement conveys unique
  meaning. Decorative layers stay outside the accessibility tree; meaningful text is real HTML, not
  baked into imagery.
- Responsive behavior: centered content uses fluid widths; menus, selector, notification detail, and
  toast remain within 320 CSS pixels without page-level horizontal scrolling.
- Loading/error/empty states: route content uses shaped skeletons where needed. Profile, workspace,
  notifications, and session failure paths preserve actionable recovery and do not use generic
  visible loading text as their primary presentation.
- Duplicate submission prevention: tenant activation keeps a stable label, shows the shared loading
  treatment, exposes `aria-busy`, and ignores repeated activation while pending.

## Logging And Observability

- Useful structured events: existing request diagnostics may classify session refresh failure,
  confirmed unauthenticated response, and context-selection failure by operation and safe error
  code. Adding analytics events is not required.
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
- Feature flag/rollout: no flag is required. Studio and Backstage auth visuals may ship in the same
  release train but remain independently revertible application builds after critical-route browser
  validation.
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
  - Profile identity fields remain visibly read-only and expose no Studio mutation.
  - User-menu destinations, preference sections, semantic toast variants, and notification detail
    are operable by keyboard and readable in supported themes and widths.
  - Studio and Backstage authentication journeys are immediately distinguishable without losing
    shared TRIAD family recognition, and form interaction is available regardless of media load or
    motion preference.
- Baseline or measurement plan: no production analytics baseline exists. Use deterministic component
  and E2E assertions plus manual visual evidence before/after at desktop and 320-pixel widths.
- Regression guardrails: automated tests prohibit the access-validation copy, duplicate tenant
  mutation, redundant breadcrumb ancestor, secondary sidebar block, and production notification
  source leakage.
- Evaluation window: review immediately in local browser QA and again during the first staging smoke
  test after deployment.

## Acceptance Criteria

- [x] AC-001: Given an authenticated user refreshes or navigates within Studio, the shell remains
  visible without rendering `Verificando acesso`, and protected route content remains covered by its
  own authorized loading/data lifecycle.
- [x] AC-002: Given session resolution returns confirmed unauthenticated status, Studio redirects to
  login; given `403`, it preserves the session and shows access denial; given network or `5xx`
  failure, it does not automatically sign out and offers recovery.
- [x] AC-003: Given a user selects a tenant on `/select-workspace`, one pointer click or keyboard
  activation issues no more than one mutation, keeps the action visibly busy, and navigates once to
  `/overview`; failure restores retry without changing the confirmed tenant.
- [x] AC-004: The selector remains understandable with one, several, and long-named barbershops in
  light/dark themes at desktop and 320 CSS pixels, with correct keyboard, focus, status, and error
  behavior.
- [x] AC-005: Each authenticated route header displays only its current route label with
  current-location semantics and never prepends `TRIAD Studio`.
- [x] AC-006: The persistent secondary sidebar group is absent. The user menu groups account actions
  separately from `Configuração da barbearia`, includes notifications and context switching where
  applicable, and keeps sign-out separate.
- [x] AC-007: Profile and preferences render in centered, responsive shared layouts with one clear
  scroll owner and no inaccessible nested overflow.
- [x] AC-008: Appearance and security/access preferences are accessible collapsible sections whose
  controls retain current behavior and whose collapsed summaries remain meaningful.
- [x] AC-009: Display name and email appear as read-only account data, and Studio exposes no control
  or client service that mutates either identity field.
- [x] AC-010: Toasts render in the upper-right with tested information/default, success, warning, and
  error semantics, icons, direct copy, dismissal, reduced-motion behavior, and legible light/dark
  contrast without relying only on color.
- [x] AC-011: The affected toast call sites use stable, concise Brazilian Portuguese outcome copy
  and do not include private payload values.
- [x] AC-012: Notification preview items present a short title and concise preview first; selecting
  an item reveals full content and the relevant action without showing the previous badge/action
  overload on every collapsed item.
- [x] AC-013: The full notification center preserves active/history, unread/read mutations,
  destinations, loading, error, empty, overflow, long-copy, and missing-destination behavior using
  the simplified hierarchy.
- [x] AC-014: All changed journeys pass automated accessibility checks and manual keyboard/focus,
  200% zoom, reduced-motion, light/dark/system, desktop, and 320 CSS-pixel review.
- [x] AC-015: Studio format, lint, typecheck, unit/component tests, production-boundary test, build,
  focused E2E tests, and the Impeccable mechanical detector pass or any exception is recorded before
  completion.
- [x] AC-016: Durable Studio and Backstage authentication, component-system, art-direction, asset,
  and theme/feedback documentation is updated to match the implemented behavior; no README, AGENTS,
  env-schema, or skill change is made unless implementation reveals a durable workflow or convention
  change.
- [x] AC-017: Studio login, invitation, recovery, and password-reset screens replace the oversized
  logo panel with the approved barbershop-operation scene while preserving every existing form
  success, validation, failure, redirect, and keyboard behavior.
- [x] AC-018: Backstage login, invitation, recovery, and password-reset screens use the approved
  system-observatory scene while preserving every existing form and operator-entry behavior.
- [x] AC-019: Side-by-side review identifies Studio and Backstage as members of one TRIAD family
  through shared visual grammar while clearly distinguishing barbershop operation from platform
  governance without explanatory labels being required to tell them apart.
- [x] AC-020: Authentication motion remains subtle and smooth on supported desktop browsers, does
  not delay or intercept form input, and becomes an intentional static composition under reduced
  motion or when animation capability is unavailable.
- [x] AC-021: Authentication remains fully usable at 320 CSS pixels, 200% zoom, light/dark/system,
  keyboard-only, forced-colors where relevant, slow media loading, failed media loading, and reduced
  motion, with no horizontal overflow or content obstruction.
- [x] AC-022: Final art assets are original, locally stored per owning app, provenance-recorded,
  responsive, production-optimized, free of embedded UI copy or private data, and introduce no
  runtime third-party image request.
- [x] AC-023: `bun --filter backstage check` and focused Backstage auth E2E/visual checks pass in
  addition to the Studio verification suite, or any exception is recorded before completion.
- [x] AC-024: A user can select, preview, replace, and remove a valid local profile image; invalid
  type/size receives an accessible Portuguese error, reload loses the preview, and no network request
  or persisted identity change occurs.
- [x] AC-025: From the user menu, a user can distinguish the current barbershop, choose another,
  confirm the named destination, and reach `/overview`; cancellation preserves the current tenant.
- [x] AC-026: Selecting `Sair` opens a named confirmation dialog; cancel performs no sign-out and
  confirming performs exactly one sign-out while preventing duplicate submission.

## Verification Plan

- Unit tests:
  - Session outcome classification and non-blocking auth-gate behavior.
  - Single-flight workspace activation and recovery.
  - Read-only profile identity and isolated local avatar-preview behavior.
  - Route-label resolution, menu grouping, disclosure state, toast variants, and notification
    collapsed/detail composition.
- Integration/API tests:
  - Preserve existing `401`/`403` access contract coverage from Initiative 19 and verify no custom
    identity-update route is introduced.
- UI tests:
  - Focused Vitest tests for shared shell, profile, preferences, toaster, and notification components.
  - Playwright journeys for refresh/session outcomes, single-click tenant selection, navigation
    location, user menu, profile update, disclosures, toasts, and notification preview/center.
  - Studio and Backstage auth-shell tests across login, invitation, recovery, reset, media success/
    failure, reduced motion, and responsive presentation.
- Manual/browser checks:
  - Authenticated owner with one and multiple tenants; invalid, forbidden, offline/transient, and
    successful states.
  - Chromium desktop and 320 CSS-pixel mobile viewport, light/dark/system, 200% zoom, keyboard-only,
    reduced motion, forced colors where relevant, and screenshot review.
  - Side-by-side product-family review of Studio and Backstage authentication at desktop; validate
    focal hierarchy, form competition, animation amplitude, crop, and static fallback.
- Build/check commands:
  - `bun --filter studio routes:generate`
  - `bun --filter studio format`
  - `bun --filter studio lint`
  - `bun --filter studio typecheck`
  - `bun --filter studio test`
  - `bun --filter studio test:production-boundary`
  - `bun --filter studio build`
  - `bun --filter studio check`
  - `bun --filter backstage check`
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
- [ ] Choose the exact generated composition from implementation variants after a bounded visual
  review — product owner; the approved story, family grammar, and acceptance criteria remain fixed.

## Assumptions

- Account identity remains read-only in Studio until a future initiative accepts an explicit
  API/IDP mutation, authorization, validation, and audit contract.
- The header bell remains the primary quick notification entry while the user menu adds a durable
  navigation destination — validate during product QA.
- The current notification data and mutation contracts are product-valid for this visual pass —
  validate against existing notification E2E scenarios.
- No new reusable primitive is needed beyond existing Base UI/shadcn disclosure, scroll, popover,
  drawer, alert, button, and Sonner capabilities — inspect the component inventory before creating
  anything new.
- Studio and Backstage can each own optimized copies and layers of their scene without premature
  package extraction — revisit only when TRIAD Barber becomes a real runtime consumer.
- Authentication scenes can be created as original raster artwork plus lightweight DOM/CSS layers;
  validate visual quality, transparent-edge behavior, theme compatibility, and measured build/media
  cost before accepting final assets.

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
| 2026-09-04 | Awaiting approval |  | Revised with the TRIAD family direction and complete auth-journey scope |
| 2026-09-04 | Approved | User | Revised cross-product authentication scope approved without further changes |
