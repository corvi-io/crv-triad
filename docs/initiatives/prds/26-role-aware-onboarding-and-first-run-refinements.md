# 26 Role-Aware Onboarding And First-Run Refinements

## Status

- Planning state: Ready
- Approval state: Approved
- Delivery state: Complete (local testable branch)
- Owner: CRV Triad
- Last updated: 2026-09-06
- Approved by/date: User / 2026-09-06

## Summary

Deliver a role-aware, non-blocking first-run experience that moves a tenant owner or administrator
from accepted access to an Agenda that is ready for the first real appointment, while moving an
invited professional or member from a trustworthy, contextual invitation to the correct workspace
without exposing implementation vocabulary. The initiative replaces the designer handoff's
blocking, session-only modal concept with a server-derived activation path embedded in the real
Studio surfaces, and also fixes the connected Agenda defect so today's board initially opens near
the current-time marker without taking control away from the user. A deliberately authored delight
system makes the invitation threshold, progress, and `schedule_ready` milestone feel exceptional:
one restrained TRIAD gold thread visually carries confirmed context into an operational Agenda,
while routine use remains quiet, fast, and trustworthy.

Execution plan:
[26-role-aware-onboarding-and-first-run-refinements.md](../tasks/26-role-aware-onboarding-and-first-run-refinements.md).

Required predecessor:
[25 Production Business Profile, Commissions And Management Reporting](25-production-business-profile-commissions-and-management-reporting.md).
Implementation may begin only after Initiative 25's profile, logo, and setup-readiness contracts
are complete and their final shape has been reconciled with this PRD.

## Context

- Current state:
  - Invite-gated email/password access is production-backed. A valid invitation resolves only its
    identity role, expiration, and whether an account exists; the email and acceptance screen do
    not identify the barbershop, unit assignment, professional role, or inviter.
  - After accepting an invitation, Studio currently routes the user to the setup overview without
    distinguishing an owner/admin configuration journey from a member/professional entry journey.
  - The setup overview is intentionally an ongoing guide, but its complete readiness projection is
    still partly prototype-owned. Initiative 25 is expected to productionize business profile,
    logo, and setup readiness while Initiative 21/22 already provide real catalogs and scheduling.
  - Agenda renders an `Agora HH:mm` marker for today when the current time is inside the projected
    range, but `.agenda-grid-scroll` always keeps its initial vertical position and has no
    one-time current-marker positioning behavior.
  - The connected designer package proposes a five-step onboarding modal for business data,
    units, professionals, services, payments, and review. It uses a `new-business` development
    scenario and `sessionStorage` completion flag, permits skipping individual steps, omits
    availability from the modal, and blocks access to the underlying setup surface.
- Problem:
  - A first-time owner sees configuration as a large inventory of product areas instead of a short
    path to an operational outcome, and a member is sent toward business configuration that may be
    irrelevant or forbidden for their role.
  - Generic invitation copy weakens trust at the highest-risk first touch and forces recipients to
    accept access without confirming the organization, unit, or job context they expect.
  - Local/session completion cannot represent durable tenant readiness, does not survive devices,
    and can disagree with real configuration after records are archived or changed.
  - Opening today's Agenda far from the current time creates immediate navigation work precisely
    when the user expects an operational view of the day.
- Why now:
  - Initiatives 21–24 establish the real catalogs, availability, appointments, reception, service,
    checkout, and cash facts needed for a truthful activation path.
  - Initiative 25 is defining the remaining business-profile and readiness facts. Initiative 26
    can consume that completed contract instead of inventing another setup state model.
  - The designer handoff and connected product note provide a concrete hypothesis to critique
    before its older architecture is accidentally transplanted into the current product.
- Related docs/issues:
  - [Initiative 08](08-triad-authentication-invitation-password-and-email-hardening.md)
  - [Initiative 16](16-triad-studio-first-mlp-completion-visual-prototype.md)
  - [Initiative 21](21-production-barbershop-catalogs-and-client-preferences.md)
  - [Initiative 22](22-production-availability-and-scheduling.md)
  - [Initiative 25](25-production-business-profile-commissions-and-management-reporting.md)
  - [Studio barbershop setup](../../studio/barbershop-setup.md)
  - [Studio scheduling](../../studio/scheduling.md)
  - [Studio theme system](../../studio/theme-system.md)
  - Connected Maestri note `Dependência — convite personalizado da barbearia`
  - Designer reference package
    `/Users/marcusgabrields/Downloads/TRIAD-Studio-refinamentos-20260905.zip`
- Repository evidence:
  - `apps/studio/src/modules/barbershop-setup/setup-page.tsx` and
    `completion-sections.tsx` implement the current resumable setup surface without a production
    first-run orchestrator.
  - `apps/studio/src/modules/auth/components/accept-invitation-screen.tsx` currently displays
    generic copy such as `conta existente` and `vínculo` and routes accepted users to setup.
  - `apps/studio/src/modules/auth/services/auth-client.ts` and
    `apps/api/src/modules/idp/http/routes/invitations.ts` prove that the public resolution contract
    does not yet carry safe business context.
  - `apps/api/src/modules/professionals/database/schema.ts` links a business-owned professional
    invitation to an identity invitation and stores professional role plus unit assignments.
  - `apps/api/src/modules/services/application/catalog-service.ts` creates that paired invitation,
    providing a composition point without moving professional rules into IDP.
  - `apps/studio/src/modules/scheduling/agenda-board.tsx` owns the internal grid scroller and the
    current-time marker but contains no initial `scrollTop` coordination.

## Actors And Workflows

- Primary actors:
  - New tenant owner or administrator: needs to make the barbershop schedulable without learning
    every Studio module or completing financial/reporting configuration first.
  - Invited professional or member: needs to verify who and what the invitation is for, establish
    access, and land in the correct tenant context with a next action allowed by their capabilities.
  - Returning owner/admin: needs the activation path to remain truthful and resumable when required
    setup facts are incomplete, without repeated welcome ceremony.
  - Returning Agenda user: needs today's board to start near operational time and then respect all
    manual scrolling.

### Owner/Admin Activation Journey

1. After accepting access and selecting the tenant when necessary, the user enters `/overview` in
   the server-confirmed organization context.
2. If the tenant is not schedulable and the user can manage the missing facts, a bounded
   `Comece por aqui` activation card explains the outcome, shows completed versus remaining
   essentials, estimates no unsupported duration, and offers one primary `Continuar configuração`
   action to the next unmet dependency.
3. The action opens the existing real configuration surface, not a tutorial or modal copy. The
   checklist derives from current server facts: business identity, an active primary unit with
   timezone/opening hours, at least one active professional, an eligible active service assignment,
   and availability capable of producing an appointment slot.
4. Each completed mutation refreshes the same readiness projection. The user may leave at any time,
   use other authorized areas, and resume later; missing prerequisites block only the dependent
   operation, not the whole product.
5. Once the Agenda can accept a real appointment, the card marks the first-value milestone and
   offers `Abrir agenda`. The first completion earns one authored focal sequence: the checklist rail
   resolves into a restrained gold thread that leads to the Agenda action and continues as the
   current-time line on entry. It never delays navigation or repeats during ordinary use. Payments,
   commissions, reports, advanced catalogs, and additional units remain contextual follow-ups rather
   than activation gates.

### Invited Member/Professional Journey

1. The invitation email names the barbershop in its subject and content and, for a professional
   invitation, presents assigned unit names and professional role. It names the inviter only when
   the value is safely available and useful.
2. Opening a valid opaque invitation repeats the same safe context on the acceptance screen. A
   business logo from Initiative 25 may appear through an authenticated/signed safe representation;
   initials or the TRIAD identity provide a stable fallback.
3. Existing-account and new-account flows use direct user language: `Entrar e aceitar convite` or
   `Criar acesso e aceitar convite`. They never reveal internal account/linkage vocabulary or allow
   the response shape to enumerate whether an arbitrary email is registered.
4. After acceptance, Studio enters or selects the invited organization. A compact confirmation
   names the active barbershop, unit scope, and professional role where available, then directs the
   user to the first capability they can actually use. The confirmed barbershop identity receives a
   brief threshold reveal using its logo/initials, navy containment, and scarce gold emphasis before
   yielding to the workspace; the effect does not hold the route transition. Users without setup
   permission never receive the owner activation checklist as their primary task.
5. Invalid, expired, revoked, superseded, mismatched, or partially completed invitations disclose no
   barbershop context beyond what was already securely resolved for the valid token and offer a
   safe recovery action.

### Agenda Initial Positioning Journey

1. After today's Agenda data, marker, and scroll viewport dimensions exist, the internal board
   positions `Agora HH:mm` approximately at the vertical center, clamped to valid bounds and with no
   visible smooth-scroll jump.
2. The one-time key includes at least the selected local date and unit/context identity. Normal
   minute ticks, appointment refreshes, and rerenders do not reposition the board after the user
   scrolls.
3. Switching from another day to today applies the behavior again. Non-today dates retain their
   normal beginning, and a current time outside the projected range uses the configured opening
   boundary rather than fabricating a marker.
4. Horizontal scroll, page scroll, keyboard focus, reduced-motion behavior, and the existing marker
   announcement remain unchanged.

### Alternate, Failure, And Recovery Journeys

- A readiness request failure preserves the workspace and presents retry; it never redirects into
  a loop or marks incomplete facts complete.
- A stale checklist link resolves against current capability and data. If another user completed the
  step, the projection advances; if access was revoked, Studio explains the denial without exposing
  hidden configuration.
- A tenant can regress from ready to incomplete when a required record is archived or availability
  is removed. Dependent scheduling behavior remains authoritative; the activation guidance becomes
  available again without replaying a welcome screen.
- Multi-tenant users see readiness only for the confirmed active tenant. Switching context clears
  the prior projection before rendering the destination.
- Bootstrap or non-professional identity invitations use a truthful generic TRIAD fallback and do
  not fabricate units, role, logo, or inviter.

## Goals

- Reach first operational value through real work rather than a tutorial: a new responsible user
  can make the Agenda ready for its first appointment.
- Make invitation acceptance trustworthy and understandable by preserving safe business context
  from email through workspace entry.
- Tailor first-run guidance to role, capability, tenant, and current server facts.
- Keep onboarding optional, resumable, regression-aware, accessible, responsive, and consistent
  with the established restrained navy/gold Studio design system.
- Open today's Agenda near the current operational time without stealing subsequent scroll control.
- Instrument the activation funnel with non-PII events that can identify drop-off and time to first
  value without logging invitation proofs or business payloads.
- Give first access an unmistakably crafted TRIAD moment through one product-specific visual thread
  that connects trusted invitation context, earned progress, and the live Agenda without decorating
  every click.

## Non-Goals

- Public self-registration, social sign-in changes, a new tenant-creation wizard, billing checkout,
  payment-provider setup, or changes to invitation eligibility.
- A forced product tour, spotlight walkthrough, tutorial sandbox, blocking modal, generic confetti/
  particles/fireworks, continuous celebration, or a second setup/configuration UI.
- Requiring payments, commissions, reports, multiple units, multiple professionals, multiple
  services, client import, or cosmetic profile completeness before scheduling readiness.
- Reusing or overlaying code, CSS, route trees, memory repositories, auth behavior, or generated
  files from the designer package. It is evidence for product intent only.
- Public business logos, permanent bearer URLs, storing business rules in IDP, or duplicating
  Initiative 25's profile/media persistence.
- Changing Agenda business hours, recurrence, appointment rules, or adding an explicit
  `Voltar para agora` action; that command may be considered later if usage evidence supports it.
- Reworking unrelated Dashboard, reporting, notification, cash, checkout, or setup visuals from the
  designer package.

## Requirements

### Functional

- REQ-001: The system shall derive one tenant-scoped activation readiness projection from current
  production facts and server-confirmed capability. It shall not accept browser-provided completion
  flags as authoritative.
- REQ-002: Owner/admin first value shall be `schedule_ready`: a confirmed business identity, one
  active primary unit with timezone and opening hours, one active professional assigned to that
  unit, one active service eligible for that unit/professional, and effective availability capable
  of yielding a schedulable interval. The projection shall return stable step IDs, completion state,
  blocking reason, permitted destination, and one next unmet dependency without scanning unbounded
  records.
- REQ-003: Authorized owners/admins shall see a non-blocking, resumable activation summary on the
  real authenticated overview and a detailed version in the existing setup overview. Users may
  navigate away, and incomplete steps shall block only operations whose server contracts require
  those facts.
- REQ-004: Users without management capability shall not be sent through owner setup. After invite
  acceptance, routing shall use the confirmed tenant context and capabilities to choose an allowed
  landing destination; the UI shall provide a truthful fallback when no operational module is
  currently available.
- REQ-005: Onboarding presentation state may remember non-authoritative UI preferences, but it shall
  never override tenant readiness, leak across organizations, or use `sessionStorage`/`localStorage`
  as proof that onboarding is complete.
- REQ-006: A valid professional invitation resolution shall safely project organization/barbershop
  display name, optional safe logo representation, one or more assigned unit display names,
  professional role, and optional inviter display name by composing IDP token validity with
  business-owned invitation data. Bootstrap and identity-only invitations shall use explicit
  fallbacks.
- REQ-007: Invitation email subject, HTML/text bodies, and Studio acceptance states shall use the
  same contextual facts and Brazilian Portuguese vocabulary. They shall distinguish account actions
  without exposing `conta existente`, `vínculo`, `perfil de membro`, identity roles, or account
  enumeration details.
- REQ-008: Invalid, malformed, expired, revoked, superseded, rate-limited, and mismatched invitation
  requests shall fail closed, keep `no-store`/safe referrer behavior, avoid context disclosure, and
  never log tokens, email addresses, names, unit assignments, roles, or logo URLs.
- REQ-009: Invitation creation and resend shall compose email context from current authoritative
  business facts and the exact invitation being sent. Acceptance shall remain correct if optional
  display data later changes, and resends shall use the current valid token without widening access.
- REQ-010: After successful invitation acceptance, Studio shall invalidate stale session/workspace
  queries, enter or request selection of the invited tenant, and display a one-time contextual
  confirmation before the first allowed destination. Acceptance and professional materialization
  shall remain idempotent and preserve existing transactional behavior.
- REQ-011: Today's Agenda board shall initially position its current-time marker near the vertical
  center of `.agenda-grid-scroll` after data and layout are ready, clamp the offset, preserve
  `scrollLeft`, and avoid page or `ModuleLayout` scrolling.
- REQ-012: Agenda auto-positioning shall execute once per relevant date and unit/context key. Minute
  updates, appointment refreshes, responsive rerenders, and user scrolling shall not recenter it;
  switching from another date to today shall make it eligible again.
- REQ-013: When today is outside the projected Agenda interval, the board shall use the confirmed
  opening boundary as its predictable initial vertical fallback and shall not create a false
  current-time marker. Other dates shall retain their normal initial position.

### Non-Functional

- REQ-014: All new surfaces and states shall meet WCAG 2.2 AA, including logical keyboard order,
  visible/unobscured focus, semantic progress/checklist structure, status/error announcements,
  non-color-only completion, 320 CSS-pixel reflow, 200% zoom, reduced motion, and light/dark/system
  themes.
- REQ-015: Readiness and invitation-context queries shall be bounded and index-supported, avoid N+1
  lookups, return only the minimum projection, and preserve deterministic behavior as tenant catalog
  and invitation history reach millions of rows. No unbounded historical scan or browser-side join
  is permitted.
- REQ-016: The API shall emit low-cardinality structured outcomes and metrics for readiness reads,
  invitation resolution/acceptance, and failure classes. Product analytics may capture anonymous or
  opaque tenant/user correlation, step ID, role class, and milestone timing only after the existing
  consent/governance contract is explicitly confirmed; it shall never contain invitation proof,
  email, names, business payloads, unit IDs/names, professional role text, or logo locations.
- REQ-017: Rollout shall be additive and compatible with invitations already pending. Contextual
  fields are optional for legacy/bootstrap cases; disabling the new onboarding presentation shall
  leave existing authenticated setup and Agenda routes usable. No destructive migration or backfill
  shall be required unless Initiative 25 reconciliation proves otherwise.
- REQ-018: Durable API, IDP, Studio setup/scheduling, and component documentation shall describe the
  activation/readiness contract, invitation-context boundary, redaction rules, and Agenda initial
  position. No AGENTS or skill update is required unless implementation introduces a reusable new
  convention.
- REQ-019: Studio shall implement one cohesive delight thesis—`confirmed context becomes operational
  momentum`—through a restrained gold-thread motif across contextual invitation acceptance,
  activation progress, the first `schedule_ready` milestone, and entry into today's Agenda. The
  motif shall express continuity and earned completion rather than generic decoration.
- REQ-020: Authored motion shall use the existing runtime and favor transform, opacity, clipping,
  and semantic color transitions; add no animation dependency by default, delay no action or route,
  run the focal sequence at most once per earned milestone, stop nonessential work when hidden, and
  provide an intentional reduced-motion equivalent that preserves confirmation without spatial
  travel. Email shall remain static and visually polished.

## Brainstorm

### Problem Framing

- What are we solving? The first authenticated session currently lacks a short, role-correct path
  to value and the invitation lacks the context needed to trust that session.
- Who is affected? New owners/admins, invited professionals/members, returning users whose tenant
  regresses from schedulable readiness, and daily Agenda users.
- What workflow improves? Accept invitation, recognize context, enter the right workspace, complete
  only the prerequisites for a real appointment, and see today's Agenda at the relevant time.
- Aha moments:
  - Owner/admin: `Sua agenda está pronta para o primeiro agendamento` followed by the real Agenda.
  - Invited member/professional: recognizing the expected barbershop/unit/role and arriving in the
    correct, permitted workspace.

### Gaps And Unknowns

- Product gaps:
  - No measured baseline exists yet for invitation abandonment, setup completion, or time to first
    schedulable state.
  - The exact landing destination per member capability must be frozen against the post-Initiative
    25 module registry rather than hard-coded during planning.
- Technical gaps:
  - Initiative 25 is concurrently being built by another agent; its final profile/logo/readiness
    contracts must be reconciled before implementation begins.
  - The existing analytics proxy is site/lead-oriented. Product-event consent and identity policy
    must be confirmed before enabling client analytics; server operational metrics remain required.
- Data/model gaps:
  - The safest business-context composition shape must be implemented without making IDP depend on
    professional-domain tables. An explicit injected projection/provider is the intended boundary.
  - Inviter display name is optional because bootstrap and system-created invitations have no human
    inviter and disclosure may not always improve trust.
- Operational gaps:
  - No baseline dashboard or alert thresholds exist for the new funnel. The implementation task must
    establish measurement definitions before setting targets.

### Counterpoints

- The designer modal is visually direct, but it conflates onboarding with complete configuration,
  blocks exploration, repeats maintenance forms, sends every role through owner work, and records a
  false completion fact in one browser session.
- A static five-step wizard would be faster to build, but it becomes stale as real dependencies
  change and treats skipped steps ambiguously.
- A fully personalized AI coach, template catalog, sample tenant, or guided tour is unnecessary
  before real funnel evidence shows that contextual checklist guidance is insufficient.
- “Stunning” cannot mean spectacle everywhere: confetti, parallax, looping particles, glass effects,
  bounce, and generic reveal-on-scroll would weaken the calm operational identity and become tiring
  after the first session. One earned, product-specific continuity moment creates more distinction.
- Doing nothing preserves generic invitations, role-inappropriate routing, unmeasured setup
  abandonment, and recurring Agenda navigation friction at every first use.

### Options

| Option | Description | Pros | Cons | When To Choose |
| --- | --- | --- | --- | --- |
| A — Blocking setup modal | Port the designer's five-step modal and local completion flag | Obvious sequence; visually contained | False readiness, blocks product, wrong for members, duplicates real surfaces, device-local state | Reject |
| B — Server-derived activation path | Embed a role-aware checklist in overview/setup and route each step into real work | Fast path to value, resumable, truthful, capability-aware, no duplicate UI | Requires cross-module projection and Initiative 25 reconciliation | Choose now |
| C — Context-only onboarding | Improve invite/empty states but add no checklist | Smallest code change | Leaves owners without an ordered path and provides no first-value milestone | Choose only if readiness composition proves infeasible |
| D — Guided tour/sandbox | Interactive coach over sample data | Can teach complex concepts | Separate from real work, expensive, high maintenance, delays value | Reconsider only after observed comprehension failures |

### Recommendation

Choose Option B with progressive disclosure. Keep the real setup overview as the single maintenance
surface, add a compact owner/admin activation summary to `/overview`, derive all completion from
bounded server facts, and route invited non-managers directly to permitted work. Treat the package
as a product hypothesis rather than source code: retain its sense of sequence, concise progress, and
reviewability while rejecting its blocking modal, local completion state, payment-first breadth, and
role-agnostic flow. Include contextual invitation continuity and the Agenda current-time positioning
as required first-run refinements. Make the experience memorable through one visual thesis: a scarce
gold thread first confirms who invited the user, advances only with real completed work, and resolves
into the live Agenda time axis. Supporting transitions stay quiet; the milestone may use a bounded
500–800 ms authored sequence, with no navigation delay and a non-spatial reduced-motion equivalent.

## Architecture And Boundaries

- Site impact: None. This is authenticated Studio/API work; no public marketing or lead flow changes.
- API impact:
  - Add a small business-owned onboarding/readiness application boundary (expected under
    `apps/api/src/modules/onboarding`) that composes bounded facts through explicit dependencies
    from business profile, units, professionals, services, and scheduling.
  - Extend professional invitation creation/resend composition to produce a safe invitation-context
    projection. The REST composition root injects that provider into IDP-owned resolve/email
    behavior; IDP must not import business modules or own unit/professional rules.
  - Add or extend explicit OpenAPI contracts for readiness and invitation resolution without `/v1`.
- IDP impact: Preserve token validation, account gate, Better Auth mount, acceptance, rate limits,
  and identity persistence. Accept an injected optional display-context provider and keep legacy/
  bootstrap fallbacks; do not add business columns to `idp_invitations` merely for UI convenience.
- Studio impact: Refine invitation acceptance and post-accept routing; add role-aware activation
  compositions to existing overview/setup surfaces; add one-time internal Agenda scroll positioning.
  Add one reusable, bounded delight/motion composition only if the same gold-thread behavior truly
  spans these surfaces. Reuse established components/tokens and update the component inventory if a
  shared composite is introduced.
- Data/persistence impact: Prefer derived readiness and existing invitation/profile/catalog facts.
  No onboarding-completion table or backfill is planned. Any optional UI-dismissal persistence must
  be non-authoritative, tenant-scoped, and justified during implementation; omission is preferred.
- External provider impact: Existing transactional email and optional Initiative 25 logo storage
  only. No new provider, dependency, analytics vendor, or public image path is required.

## Project Standards Applicability

| Concern | Classification | Rationale | Relevant skills/docs |
| --- | --- | --- | --- |
| Product workflow | Applicable | Two role-specific activation journeys, recovery paths, and two first-value definitions are core | `requirements-analysis`, `impeccable` onboarding playbook |
| Architecture | Applicable | Readiness composes domains and invitation context crosses business/IDP without reversing ownership | `triad-architecture`, boundaries reference |
| API | Applicable | Bounded readiness and extended invitation-resolution contracts require auth, errors, rate limits, and OpenAPI | `triad-api-development`, `elysia` |
| Identity and authorization | Applicable | Invite validation, account gate, post-accept context, capabilities, and tenant isolation are affected | `triad-idp-development`, auth/access references |
| Persistence | Applicable | Existing facts are reused; migration/backfill avoidance and index validation must be explicit | `postgres-drizzle`, Initiatives 21/22/25 |
| Studio UI | Applicable | Auth, overview, setup, and Agenda states/copy/responsive behavior change | `triad-studio-development`, `impeccable`, `ux-copy` |
| Site UI | Not applicable | No public-site surface or browser-public env change | `AGENTS.md` product boundaries |
| Accessibility | Applicable | Progress, auth forms, focus, responsive behavior, and scroll positioning affect operability | `accessibility`, WCAG 2.2 AA |
| Performance and scale | Applicable | Cross-module readiness and invite context must avoid N+1/unbounded scans | `triad-api-development`, `postgres-drizzle` |
| Security and privacy | Applicable | Opaque invitation proofs, business identity, enumeration, logos, and telemetry require minimization | `triad-idp-development`, security rules |
| Observability | Applicable | Funnel and failure outcomes need redacted events/metrics and baseline definitions | `logging-best-practices`, analytics docs |
| Reliability and delivery | Applicable | Pending-invite compatibility, optional context fallback, feature rollback, and Initiative 25 dependency matter | Initiative 25, release conventions |
| Testing and QA | Applicable | Role, tenant, invitation, readiness, layout timing, scrolling, themes, and viewports need layered evidence | `triad-testing`, `triad-product-qa` |
| Documentation | Applicable | Durable onboarding, invitation, setup, scheduling, API, and component contracts change | `docs/studio/*`, `docs/api/*` |

## Performance And Scalability

- Expected data growth: Tenant catalog facts remain bounded per tenant, while platform-wide
  invitations and appointment/availability history may reach millions of rows.
- Critical paths: Invitation resolution/acceptance and first authenticated overview must remain
  small, availability-sensitive requests; Agenda positioning and the authored focal sequence must
  not add layout loops, long tasks, layout shift, or navigation delay.
- Query bounds/pagination: Readiness uses existence/aggregate queries with tenant predicates and
  limits, never full catalog pages or appointment history. Invitation context resolves one token and
  one linked business invitation with bounded unit hydration.
- Concurrency risks: Readiness may change between projection and navigation; every target operation
  revalidates authority and prerequisites. Invitation acceptance remains idempotent and transactional.
- External limits: Transactional email and optional logo retrieval use existing adapters, timeouts,
  and failure vocabulary; onboarding readiness never depends on analytics availability.
- Motion budget: Default to CSS and existing primitives, keep routine feedback within 100–300 ms,
  bound the one earned focal sequence to 500–800 ms, isolate any blur/filter usage to a small region,
  and measure on desktop plus representative narrow/mobile hardware. No WebGL, canvas, shader,
  video, or new motion library is planned.
- What happens with millions of records/items: Indexed token digest and identity-invitation joins
  select one invitation; tenant-prefixed existence checks avoid global scans; schedule readiness
  queries a bounded effective interval/window rather than expanding recurrence indefinitely.

## Security, Privacy, And Abuse

- Auth/session impact: No login-method or invitation-eligibility change. Post-accept routing waits
  for confirmed session/membership context and clears stale tenant data.
- Roles/access: Owner/admin guidance is capability-gated. A checklist or hidden navigation never
  authorizes setup mutations. Members see only destinations they can access.
- PII/secrets: Invitation tokens, emails, inviter/user names, unit names, professional role text,
  logo URLs/keys, session cookies, and business payloads are excluded from logs, metrics, analytics,
  URLs beyond the existing transient token entry, traces, and error bodies.
- Spam/abuse vectors: Preserve global/per-token resolve limits and resend limits. Context appears
  only after a cryptographically valid pending token is resolved; malformed/terminal tokens receive
  generic states.
- Rate limiting or throttling needs: Existing invitation limits remain mandatory and must be tested
  after context composition. Readiness is authenticated and may use normal API request protections;
  no polling loop is introduced.

## Accessibility And UX

- Keyboard flow: Activation checklist uses native links/buttons in dependency order; setup remains
  navigable without a modal trap. Agenda positioning changes viewport scroll only and never moves
  focus.
- Screen reader states: Readiness load/error and completion milestone use named status/alert regions;
  checklist semantics announce completed/current/incomplete without color. Invitation context uses
  headings and lists rather than decorative cards alone. Visual effects are aria-hidden and the
  semantic confirmation is available immediately without waiting for animation.
- Responsive behavior: Auth and activation content reflow at 320 CSS pixels; long barbershop/unit/
  role names wrap safely; multiple units use bounded disclosure instead of horizontal overflow.
- Loading/error/empty states: Separate readiness loading, retry, no-permission, complete, regressed,
  and unavailable-source states. Invitation terminal states remain generic. Agenda absence of a
  current marker is a valid state, not an error.
- Duplicate submission prevention: Invitation actions keep stable labels with loading state and
  existing idempotency; activation links are navigation, not completion mutations.
- Motion and attention: The focal sequence runs only after an earned `schedule_ready` transition;
  routine reloads and already-ready tenants receive the settled state. `prefers-reduced-motion`
  removes spatial travel and retains a concise color/opacity/state confirmation. Nothing flashes,
  loops, autoplays sound, traps focus, or requires the effect to understand the next action.

## Logging And Observability

- Useful structured events: `onboarding_readiness_resolved`, `onboarding_readiness_failed`,
  `invitation_context_resolved`, `invitation_acceptance_outcome`, and
  `agenda_initial_position_outcome`, with request ID, opaque tenant/user IDs where server-authorized,
  stable step/outcome codes, duration, and error class only.
- Metrics: Valid invitation resolution-to-acceptance conversion, time from accepted access to
  `schedule_ready`, incomplete-step distribution, readiness request failures, and Agenda positioning
  applied/skipped/fallback outcomes. Baselines precede targets.
- Traces/spans: Bounded readiness composition and optional invitation-context provider may expose
  internal timings with safe low-cardinality labels; DOM scrolling does not need distributed spans.
- Alerts: Sustained invitation resolve/accept failure or readiness endpoint failure above a baseline
  warrants alerting; no threshold is invented before measurement.
- Sensitive data that must not be logged: Tokens/digests, cookies, authorization/private headers,
  email, names, unit IDs/names, role text, business/profile fields, logo paths/URLs, appointment data,
  and raw validation payloads.

## Delivery And Rollback

- Compatibility strategy: Extend response/email inputs with optional context so pending legacy,
  bootstrap, and identity-only invitations retain safe generic behavior. Readiness is additive and
  existing setup routes remain canonical.
- Feature flag/rollout: A server/client rollout control may gate the new activation presentation and
  contextual invite rendering if existing project flag infrastructure is available; do not add a
  provider solely for this initiative. API optional fields deploy before Studio consumption.
- Migration/backfill: None planned. Do not snapshot or copy display context into IDP by default.
  Reconcile this decision after Initiative 25 completes; any newly required additive migration must
  return the initiative for material review.
- Rollback: Disable activation presentation and fall back to existing setup overview/generic invite
  copy while retaining additive API compatibility. Revert Agenda positioning independently without
  affecting scheduling data or rules.
- Operational readiness: Initiative 25 completion and contract reconciliation, API-before-Studio
  deploy order, safe email preview fixtures, hml invitation tests, monitoring baselines, and rollback
  rehearsal are required before production promotion.

## Success Measures

- Success signals:
  - Directional reduction in valid-invitation abandonment between resolution and acceptance.
  - Directional reduction in time from first accepted owner/admin access to `schedule_ready`.
  - Increased share of new eligible tenants reaching `schedule_ready` without support intervention.
  - No setup checklist impressions to users without the matching management capability.
  - Today's Agenda applies the intended initial position when eligible and records no repeated
    recenter after manual navigation.
- Baseline or measurement plan: Observe at least one agreed pre-rollout window for existing invite
  outcomes and derive the first readiness baseline from authoritative record creation timestamps or
  a documented milestone start. Do not set numeric improvement targets until this baseline exists.
- Regression guardrails: No increase in invite error/timeout rates, no account-enumeration response
  difference, no cross-tenant context leakage, no extra unbounded queries, no forced onboarding, and
  no Agenda focus/scrollLeft/page-scroll movement.
- Evaluation window: Compare the first agreed post-rollout window with the baseline after enough
  eligible first-run sessions exist; product ownership records the exact window before rollout.

## Acceptance Criteria

- [ ] AC-001: Given a first-time owner/admin in an incomplete tenant, `/overview` shows a
  non-blocking Portuguese activation summary derived from current server facts and links to exactly
  one next permitted real setup task; navigation outside onboarding remains available.
- [ ] AC-002: Given completion or later regression of any required scheduling prerequisite, the
  readiness projection changes from authoritative business/scheduling data without any browser
  completion flag, and the UI reflects the new next step after invalidation/reload.
- [ ] AC-003: Given all required facts, the owner/admin sees the `schedule_ready` milestone and can
  open the real Agenda; payments, commissions, reports, multiple records, and cosmetic fields are
  not required for this milestone.
- [ ] AC-004: Given an invited member/professional without setup capability, acceptance lands in the
  confirmed invited workspace or workspace selection and presents an allowed next action without
  routing the user through owner setup.
- [ ] AC-005: A valid professional invitation email and acceptance page consistently name the
  barbershop, assigned unit name(s), and professional role, optionally name the inviter, and render
  the safe business logo or defined fallback without exposing permanent/private object locations.
- [ ] AC-006: Existing-account and new-account acceptance use direct Brazilian Portuguese copy and
  stable CTAs without the terms `conta existente`, `vínculo`, `perfil de membro`, or technical
  identity roles.
- [ ] AC-007: Malformed, expired, revoked, superseded, mismatched, and rate-limited invitation
  journeys disclose no business context or account existence, preserve security headers/limits,
  and provide a safe recovery state.
- [ ] AC-008: Bootstrap, legacy pending, and identity-only invitations still resolve and accept with
  generic truthful fallback; no backfill is required and resend behavior remains valid.
- [ ] AC-009: Repeated or concurrent invitation acceptance is idempotent, produces at most one
  membership/professional materialization, and post-accept query invalidation never shows the prior
  tenant as the destination.
- [ ] AC-010: On today's Agenda with current time inside the range, the internal board opens with
  `Agora HH:mm` approximately centered and clamped after layout, while `scrollLeft`, page scroll, and
  keyboard focus remain unchanged.
- [ ] AC-011: After the initial Agenda positioning, minute ticks, appointment refreshes, rerenders,
  resize, and manual scrolling do not recenter; switching away and back to today under a different
  eligible date/unit key applies positioning once again.
- [ ] AC-012: On non-today dates the Agenda begins normally; when today is outside the projected
  interval it uses the confirmed opening-boundary fallback and never fabricates an `Agora` marker.
- [ ] AC-013: Invitation, activation, and Agenda flows pass automated keyboard/axe checks plus
  desktop/mobile light/dark, 320 CSS-pixel reflow, 200% zoom, reduced-motion, and manual screen-reader
  journeys with long names and multiple units.
- [ ] AC-014: API tests prove tenant/capability isolation, bounded query behavior, index-supported
  invitation/readiness lookups, safe errors, redaction, and no N+1 hydration under dense fixtures.
- [ ] AC-015: Redacted operational events/metrics distinguish success, fallback, denial, and failure
  without containing any prohibited invitation, identity, business, unit, logo, or appointment data;
  onboarding remains functional when analytics is unavailable.
- [ ] AC-016: API deploys before Studio, Initiative 25 reconciliation is recorded, pending-invite and
  rollback rehearsals pass, and disabling the presentation leaves existing setup/Agenda operation
  intact.
- [ ] AC-017: Durable docs describe the selected onboarding rationale, invitation-context provider,
  readiness definition, Agenda positioning behavior, monitoring, and why designer source code was
  not reused.
- [ ] AC-018: The contextual invitation, activation progress, first `schedule_ready` milestone, and
  Agenda entry share a recognizable TRIAD gold-thread motif; the milestone is visually distinctive,
  occurs only after real completion, runs once, never delays the primary action, and degrades to a
  fully understandable settled state if motion or scripts are unavailable.
- [ ] AC-019: The delight system adds no default animation dependency, generic confetti, looping
  particles, parallax, autoplay sound, layout-driven animation, or dense-surface gradient. It remains
  smooth on target desktop/mobile viewports, introduces no observable layout shift or long task in
  the tested journey, and its reduced-motion path preserves confirmation without spatial movement.

## Verification Plan

- Unit tests:
  - Readiness state/next-step/capability matrix and regression behavior with bounded fakes.
  - Invitation-context projection/fallback/redaction and Portuguese copy variants.
  - Agenda offset/clamping/key/fallback helpers with controlled time and geometry.
- Integration/API tests:
  - In-process Elysia invitation resolution, acceptance, legacy/bootstrap, rate-limit, and security
    headers with sensitive sentinels absent from bodies/logs.
  - PostgreSQL-backed readiness and invitation-context queries for tenant isolation, indexes,
    existence bounds, multiple units, concurrency, and idempotent acceptance.
- UI tests:
  - Vitest component/router tests for owner/admin/member branches, stale projection recovery,
    destination invalidation, invitation states, and Agenda one-time positioning.
  - Playwright journeys for new owner activation, existing/new invited member acceptance, workspace
    selection, regression/resume, Agenda today/other-day/out-of-range, scroll preservation, themes,
    mobile, gold-thread continuity, one-time milestone playback, settled repeat visits, reduced
    motion, and axe.
- Manual/browser checks:
  - Desktop and 320 CSS-pixel mobile, light/dark/system, 200% zoom, reduced motion, keyboard-only,
    VoiceOver, long barbershop/role/unit strings, multiple units, and slow/error responses.
  - Email HTML/text previews across a contextual professional invite and generic bootstrap fallback.
  - Performance recording of the focal sequence on desktop and representative narrow/mobile
    hardware, checking layout shift, long tasks, interruption, background/hidden behavior, and route
    timing without inventing an unsupported numeric device-capacity claim.
- Build/check commands:
  - `bun --filter api test`
  - `bun --filter api check`
  - `bun --filter api build`
  - `bun --filter studio test`
  - `bun --filter studio test:e2e`
  - `bun --filter studio check`
  - `bun --filter studio build`
  - `bun run check`

## Open Questions

### Blocking

- None for approval. Final implementation waits for Initiative 25 completion and contract
  reconciliation, which is an explicit predecessor gate rather than unresolved product scope.

### Non-Blocking

- [ ] Freeze the capability-to-first-destination map after Initiative 25 merges — owner: Initiative
  26 implementation lead, before TASK-002.
- [ ] Confirm product analytics consent/identity policy before client funnel capture — owner: product
  and privacy, before TASK-008; server operational metrics proceed independently.
- [ ] Decide whether a human inviter name improves trust for every professional invitation type —
  owner: product during contextual email/copy review; omission fallback is already defined.

## Assumptions

- Initiative 25 will finish the production business profile/logo and setup-readiness primitives
  described in its current contract — validate by diffing its final approved/implemented PRD,
  OpenAPI, schema, and Studio adapters before TASK-001 completes.
- Initiative 21/22 catalog and scheduling contracts remain the authoritative definition of active
  unit/professional/service relationships and effective availability — validate with their current
  production tests and docs.
- Most owners/admins understand standard barbershop concepts and need sequencing rather than a
  tutorial; invited members have mixed experience and need role/context confirmation — validate
  through funnel data and bounded usability observation after rollout.
- `schedule_ready` is the smallest useful owner milestone; the first appointment itself may require
  a client and live operational decision and therefore is not fabricated or forced during setup —
  validate with time-to-first-appointment follow-up data.

## Definition of Ready

- [x] All mandatory gates in `planning-gates.md` pass.
- [x] Requirement-to-acceptance-to-task traceability is complete.
- [x] The planning state is `Ready` before requesting approval.

Definition of Ready result: Passed. Initiative 25 completion is a declared execution dependency;
no unresolved product or architecture decision is hidden in implementation work. Product analytics
capture remains optional until its consent policy is confirmed and does not block the core journey.

## Approval History

| Date | Decision | Decided by | Notes / requested changes |
| --- | --- | --- | --- |
| 2026-09-06 | Approved | User | Approved the initial Initiative 26 proposal |
| 2026-09-06 | Approved | User | Expanded approval to include a stunning, effect-rich but bounded onboarding delight system |
