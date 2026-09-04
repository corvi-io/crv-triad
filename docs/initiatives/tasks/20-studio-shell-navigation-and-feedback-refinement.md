# 20 TRIAD Authentication, Studio Shell, Navigation And Feedback Refinement - Execution Plan

## Source

- PRD: `docs/initiatives/prds/20-studio-shell-navigation-and-feedback-refinement.md`
- Related issue/PR:
- Approval state: Awaiting approval
- Approved PRD version/date: Previous scope approved 2026-09-04; revised version awaiting approval

## Implementation Principles

- Do not begin implementation until the linked PRD version is explicitly approved.
- Follow the accepted recommendation from the PRD.
- Keep scope bounded to the acceptance criteria.
- Use relevant Triad skills before implementation.
- Prefer simple designs that can scale to near-term needs without obvious bottlenecks.
- Preserve server-authoritative authentication, authorization, and tenant isolation while removing
  only the blocking access-check presentation.
- Preserve current notification contracts and production boundaries; this plan changes presentation,
  not persistence or delivery.

## Traceability

| Requirement / acceptance criterion | Tasks | Verification |
| --- | --- | --- |
| REQ-001–REQ-003 / AC-001–AC-002 | TASK-001, TASK-002, TASK-010 | Auth component tests, session-outcome E2E, existing access-policy evidence |
| REQ-004–REQ-005 / AC-003–AC-004 | TASK-003, TASK-010 | Single-flight component test and multi-tenant Playwright journey |
| REQ-006–REQ-007 / AC-005–AC-006 | TASK-004, TASK-010 | Shell/menu component assertions and keyboard E2E |
| REQ-008–REQ-011 / AC-007–AC-009 | TASK-005, TASK-006, TASK-010 | Layout/disclosure tests, Better Auth integration, profile E2E |
| REQ-012–REQ-013 / AC-010–AC-011 | TASK-007, TASK-010 | Toaster stories/tests, call-site review, visual/theme evidence |
| REQ-014–REQ-016 / AC-012–AC-013 | TASK-008, TASK-009, TASK-010 | Notification component and existing scenario E2E tests |
| REQ-017–REQ-020 / AC-014–AC-015 | TASK-001–TASK-010, TASK-012 | Accessibility, privacy, performance, production-boundary, build, detector evidence |
| REQ-001–REQ-029 / AC-016 | TASK-011, TASK-012 | Documentation review and final traceability audit |
| REQ-021–REQ-029 / AC-017–AC-023 | TASK-013–TASK-016 | Art-direction proof, optimized assets, auth-family tests, app builds, visual evidence |

## Dependency Order

TASK-001 reproduces and records the critical defects and establishes a reliable test harness.
TASK-002 and TASK-003 then correct session entry and workspace activation independently. TASK-004
updates shared navigation metadata before profile/preferences navigation work is finalized. TASK-005
and TASK-006 share layout and account concerns and should be sequenced if they edit the same route
shell or test fixture. TASK-007 may proceed independently after shared-component inventory review.
TASK-008 establishes the notification interaction hierarchy before TASK-009 applies it to both
surfaces. TASK-010 consolidates cross-surface accessibility and browser regression coverage after
the Studio UI tasks settle. TASK-013 establishes the family art direction before TASK-014 produces
optimized artwork and TASK-015 integrates it in each app. TASK-016 validates the authentication
family across both apps. TASK-011 documents the durable result after operational and authentication
work, and TASK-012 performs the final bounded verification and evidence audit.

## Tasks

### TASK-001 — Reproduce critical shell regressions and establish behavioral harnesses

- Status: Pending
- Covers: REQ-001–REQ-005, REQ-019, AC-001–AC-004
- Depends on: None
- Can parallelize with: TASK-004, TASK-007
- Relevant skills/docs: `triad-studio-development`, Vitest, Playwright,
  `docs/studio/authentication.md`, Initiative 19
- Expected artifacts:
  - Focused tests or deterministic fixtures for pending/authenticated/unauthenticated/forbidden/
    transient session outcomes.
  - A deterministic reproduction of the reported tenant second-click behavior, including mutation
    and navigation counts.
- Implementation notes:
  - Inspect the Better Auth session lifecycle, authenticated route composition, workspace provider,
    context gate, selection mutation, cache invalidation, and navigation ordering.
  - Record the root cause before changing the selection flow. Do not mask duplicate mutations with
    arbitrary delays or repeated navigation.
- Verification:
  - Run focused Vitest and Playwright tests and demonstrate that the regression fails before the fix.
- Evidence required before completion:
  - Root-cause note and deterministic red test for each reproduced critical behavior, or explicit
    evidence that the double-click defect requires a live integration condition covered by the E2E
    fixture rather than a unit test.

### TASK-002 — Replace blocking auth presentation with resilient session handling

- Status: Pending
- Covers: REQ-001–REQ-003, REQ-017, REQ-019–REQ-020, AC-001–AC-002
- Depends on: TASK-001
- Can parallelize with: TASK-003, TASK-007
- Relevant skills/docs: `triad-studio-development`, `react-useeffect`,
  `docs/studio/authentication.md`, Initiative 19
- Expected artifacts:
  - Updated auth/session boundary and authenticated route composition.
  - Central, testable classification of confirmed unauthenticated, forbidden, and transient
    failures using existing contracts.
  - Content-shaped loading behavior at protected data owners where needed.
- Implementation notes:
  - Remove the visible full-page `Verificando acesso` branch.
  - Do not interpret generic Better Auth/network errors as confirmed logout.
  - Do not expose or retain cross-tenant records while identity or active context is unresolved.
  - Prefer router/query/provider lifecycle APIs over new effect-driven synchronization.
- Verification:
  - Component tests for every session outcome and Playwright refresh/navigation journeys.
- Evidence required before completion:
  - No visible access interstitial; correct redirect/denial/recovery behavior; no duplicate session
    request introduced; server authorization tests remain green.

### TASK-003 — Make tenant selection a deterministic single action

- Status: Pending
- Covers: REQ-004–REQ-005, REQ-017–REQ-019, AC-003–AC-004
- Depends on: TASK-001
- Can parallelize with: TASK-002, TASK-004, TASK-007
- Relevant skills/docs: `triad-studio-development`, Impeccable, accessibility, Initiative 19
- Expected artifacts:
  - Corrected `/select-workspace` activation flow and any necessary workspace provider/context-gate
    coordination.
  - Refined selector hierarchy and direct Portuguese copy within the incumbent navy/gold system.
  - Focused component and E2E coverage.
- Implementation notes:
  - One row/action activation must select and open the tenant; do not add a redundant confirmation
    step to the post-login selector.
  - Keep the separate in-session context-switch confirmation where unsaved work may be lost.
  - Keep the selected action label stable while using shared loading and `aria-busy` behavior.
  - Preserve the prior confirmed tenant and typed/visible state on failure.
- Verification:
  - Pointer and keyboard activation with one, multiple, and long-name tenant fixtures; assert one
    mutation and one navigation.
- Evidence required before completion:
  - Desktop/mobile screenshots and passing failure/retry, focus, long-name, light/dark tests.

### TASK-004 — Flatten route location and consolidate administrative navigation

- Status: Pending
- Covers: REQ-006–REQ-007, REQ-017–REQ-018, AC-005–AC-006
- Depends on: TASK-001
- Can parallelize with: TASK-002, TASK-003, TASK-007
- Relevant skills/docs: `triad-studio-development`, Impeccable, accessibility,
  `docs/studio/component-system.md`
- Expected artifacts:
  - Updated workspace route metadata, header location component, sidebar composition, and grouped
    user menu.
  - Removed persistent secondary sidebar navigation where no longer used.
  - Updated unit/component and navigation E2E tests.
- Implementation notes:
  - Render the current label only; retain semantic current-location labeling without fake hierarchy.
  - Group menu items with visible or accessible labels for account and barbershop administration.
  - Keep notification bell preview for rapid access and add the durable notification destination to
    the account group.
  - Hide tenant-switch action when fewer than two selectable tenants exist if current contracts
    expose that fact without extra querying.
- Verification:
  - Assert labels and destinations across every registered authenticated route, collapsed/expanded
    sidebar, desktop dropdown, and mobile menu placement.
- Evidence required before completion:
  - No `TRIAD Studio` ancestor, no secondary sidebar block, and complete keyboard-accessible menu
    grouping in automated and manual checks.

### TASK-005 — Recompose preferences as centered collapsible management sections

- Status: Pending
- Covers: REQ-008–REQ-009, REQ-017–REQ-018, AC-007–AC-008
- Depends on: TASK-004
- Can parallelize with: TASK-006, TASK-007, TASK-008
- Relevant skills/docs: `triad-studio-development`, Impeccable, accessibility,
  `docs/studio/theme-system.md`
- Expected artifacts:
  - Preferences route using `ModuleLayout` and the shared scroll owner.
  - Accessible disclosure composition for `Aparência` and `Segurança e acesso`.
  - Preserved theme, password, Google account, loading, success, and error behavior.
- Implementation notes:
  - Check the existing shared component inventory and official shadcn/Base UI disclosure before
    adding a primitive.
  - Use useful summaries and sensible initial open state; do not collapse an active error, callback
    result, or in-progress action out of view.
  - Avoid decorative empty space and nested scrolling.
- Verification:
  - Component tests for disclosure semantics/state and existing preference actions; responsive,
    theme, keyboard, zoom, and focus review.
- Evidence required before completion:
  - Both categories remain understandable and fully operable expanded or collapsed, with no
    regression to authentication/account-linking behaviors.

### TASK-006 — Add production-backed display-name editing to profile

- Status: Pending
- Covers: REQ-008, REQ-010–REQ-011, REQ-017–REQ-020, AC-007, AC-009
- Depends on: TASK-004
- Can parallelize with: TASK-005, TASK-007, TASK-008
- Relevant skills/docs: `triad-studio-development`, Better Auth contract, Vitest, accessibility,
  `docs/studio/authentication.md`
- Expected artifacts:
  - Verified narrow Studio auth-client wrapper for Better Auth self-update behavior.
  - Centered profile management form with editable display name and read-only email.
  - Zod/RHF validation, mutation/query invalidation or session refresh, semantic feedback, and tests.
- Implementation notes:
  - Validate pinned Better Auth self-update support before UI implementation.
  - Do not use the administrative `/users/:userId` contract or add identity administration to
    Studio.
  - Keep the label stable during saving, focus the first invalid field, preserve typed input on
    failure, and refresh every shell presentation after success.
- Verification:
  - Client integration test plus component/E2E success, validation, duplicate activation, server
    failure, refreshed shell, and reload persistence journeys.
- Evidence required before completion:
  - Persisted self-name update is visible in profile and user menu without sign-out/sign-in; email
    cannot be edited; no private value is logged.

### TASK-007 — Establish semantic top-right toast presentation

- Status: Pending
- Covers: REQ-012–REQ-013, REQ-017–REQ-020, AC-010–AC-011
- Depends on: TASK-001
- Can parallelize with: TASK-002–TASK-006, TASK-008
- Relevant skills/docs: `triad-studio-development`, Impeccable, accessibility, UX copy,
  `docs/studio/theme-system.md`, Sonner
- Expected artifacts:
  - Updated shared Sonner toaster with upper-right placement and semantic type presentation.
  - Theme-safe styling, icons, accessible dismiss/action behavior, reduced-motion treatment, and
    representative tests or deterministic showcase fixture.
  - Reviewed affected auth, workspace, profile, and existing action toast copy.
- Implementation notes:
  - Use semantic tokens and icon/text structure; do not communicate state by color alone.
  - Keep copy short: outcome first, recovery only when useful. Do not insert entity names or payload
    data merely to personalize a toast.
  - Avoid oversized cards, saturated fills, excessive shadows, or competing motion.
- Verification:
  - Render information/default, success, warning, and error variants in light/dark/system, desktop,
    320px, 200% zoom, keyboard, forced-colors, and reduced-motion checks.
- Evidence required before completion:
  - Position, semantics, contrast, dismissal, action behavior, and reviewed call-site copy satisfy
    AC-010 and AC-011.

### TASK-008 — Define and test the progressive notification item hierarchy

- Status: Pending
- Covers: REQ-014–REQ-016, REQ-017–REQ-019, AC-012–AC-013
- Depends on: TASK-001
- Can parallelize with: TASK-005–TASK-007
- Relevant skills/docs: `triad-studio-development`, Impeccable, accessibility, UX copy,
  `docs/studio/component-system.md`
- Expected artifacts:
  - One shared notification summary/detail composition or explicit preview/center variants with a
    common information hierarchy.
  - A documented decision between in-place disclosure, popover detail, or shared drawer based on
    long-content, mobile, and focus evidence.
  - Component tests covering every severity, lifecycle, read state, destination, and content range.
- Implementation notes:
  - Lead with what happened and why it matters. Treat severity/read/lifecycle as supporting state,
    not three equal badges.
  - Keep only the primary next action in full detail and avoid generic `Abrir destino` when the
    destination can be named directly.
  - Preserve destination resolution and marking read; do not change notification rules or storage.
- Verification:
  - Test collapsed and expanded keyboard/focus behavior, announcements, long content, missing
    destinations, unread/read/resolved states, and narrow width.
- Evidence required before completion:
  - Selected pattern and rationale recorded; a user can identify the event from the collapsed item
    and reach full content/action without badge overload.

### TASK-009 — Apply the notification hierarchy to preview and center

- Status: Pending
- Covers: REQ-014–REQ-016, REQ-017–REQ-020, AC-012–AC-013
- Depends on: TASK-008
- Can parallelize with: None
- Relevant skills/docs: `triad-studio-development`, Impeccable, accessibility,
  existing operational-notification scenarios
- Expected artifacts:
  - Refined bell trigger/popover and full notification center.
  - Updated direct Portuguese copy, section summaries, empty/loading/error states, read controls,
    and destinations.
  - Updated component and Playwright coverage using the current source.
- Implementation notes:
  - Keep preview queries bounded and the full center within current source limits.
  - Ensure selecting/expanding one item does not trigger unrelated mutations or lose focus.
  - Preserve scenario parameters used for evaluation without exposing them as product UI.
- Verification:
  - Run normal, overflow, failure, missing-target, unread/read, history, reload, light/dark, 320px,
    zoom, forced-colors, keyboard, and production-preview scenarios.
- Evidence required before completion:
  - All current notification behavior remains functional with measurably reduced simultaneous labels
    and controls; production boundary remains unchanged.

### TASK-010 — Complete integrated accessibility and critical-journey regression coverage

- Status: Pending
- Covers: REQ-001–REQ-020, AC-001–AC-014
- Depends on: TASK-002–TASK-009
- Can parallelize with: TASK-011 after test names and behavior settle
- Relevant skills/docs: `triad-studio-development`, accessibility, Playwright, axe,
  Impeccable audit guidance
- Expected artifacts:
  - Focused integrated Playwright specifications and screenshot evidence.
  - Automated axe coverage on changed primary states.
  - Manual QA record for keyboard, focus, zoom, responsive, theme, forced-colors, and reduced motion.
- Implementation notes:
  - Exercise realistic authenticated owner/member and multi-tenant flows.
  - Verify focus after route change, disclosure expansion, notification detail, failed mutations, and
    successful profile save.
  - Batch desktop and mobile visual review into one pass, fix findings together, and confirm once.
- Verification:
  - Run focused component/E2E suites and inspect desktop/mobile screenshots in light and dark.
- Evidence required before completion:
  - AC-001 through AC-014 have reviewable automated or manual evidence with residual limitations
    recorded.

### TASK-013 — Resolve the TRIAD authentication family art direction

- Status: Pending
- Covers: REQ-021–REQ-024, REQ-026–REQ-028, AC-017–AC-021
- Depends on: None
- Can parallelize with: TASK-001, TASK-004, TASK-007
- Relevant skills/docs: Impeccable new-work/shape, `triad-architecture`,
  `triad-studio-development`, `triad-backstage-development`, Studio/Backstage `PRODUCT.md` and
  `DESIGN.md`
- Expected artifacts:
  - A production-facing design brief for **Three Forces, One Rhythm** covering shared family grammar,
    Studio barbershop-operation scene, Backstage system-observatory scene, and future Barber
    extension constraints.
  - A bounded set of visual concept variants for Studio and Backstage with desktop, crop, theme,
    and reduced-motion intent.
  - Selected concepts and rejection rationale recorded before production asset creation.
- Implementation notes:
  - Preserve navy/gold, Geist, restrained depth, and product truth while allowing authentication to
    be more expressive than operational screens.
  - Studio should feel human and operational; Backstage should feel systemic and governed. Avoid
    dashboards, generic stock scenes, hacker motifs, literal server racks, text baked into art,
    gradients without structure, and unrelated product worlds.
  - Define a still composition first; motion enhances hierarchy and must not rescue weak artwork.
- Verification:
  - Side-by-side design review against product purpose, incumbent tokens, form hierarchy, 320px crop,
    light/dark, reduced motion, and asset feasibility.
- Evidence required before completion:
  - One selected, implementable scene per current app with shared grammar and distinct subject; all
    implementation-critical visual decisions resolved.

### TASK-014 — Produce and optimize original authentication artwork

- Status: Pending
- Covers: REQ-021–REQ-023, REQ-025–REQ-029, AC-017–AC-022
- Depends on: TASK-013
- Can parallelize with: None
- Relevant skills/docs: `imagegen`, Impeccable, app theme systems, accessibility
- Expected artifacts:
  - Original high-quality Studio and Backstage source artwork generated or composed from the
    selected concepts.
  - Locally owned responsive runtime assets and layers in each app's public asset boundary.
  - Asset provenance, generation prompts/decisions where appropriate, dimensions, formats, and
    measured optimized sizes recorded in durable design documentation or an asset manifest.
- Implementation notes:
  - Use image generation for original visual material, inspect it at source resolution, and remove
    artifacts before acceptance.
  - Prefer a stable hero layer plus a small bounded set of transparent/composited layers. Do not ship
    an animation format merely because the source tool can generate it.
  - Use available image conversion tooling for efficient browser formats and retain only necessary
    source/runtime files. Do not place text, credentials, customer data, or fake product metrics in
    imagery.
- Verification:
  - Inspect source and optimized assets at desktop, narrow crop, light/dark surfaces, standard and
    high-density displays; confirm alpha edges, compression, color, no artifacts, and no remote URLs.
- Evidence required before completion:
  - Accepted product-specific assets satisfy the selected direction, have recorded provenance, and
    meet a measured performance decision without unsupported numeric claims.

### TASK-015 — Integrate the expressive auth surface in Studio and Backstage

- Status: Pending
- Covers: REQ-021–REQ-029, AC-017–AC-022
- Depends on: TASK-014
- Can parallelize with: None
- Relevant skills/docs: `triad-studio-development`, `triad-backstage-development`, Impeccable,
  accessibility, React best practices
- Expected artifacts:
  - Product-specific AuthShell visual compositions and local styles/assets in Studio and Backstage.
  - Lightweight ambient layer motion, optional bounded pointer response if validated, and a designed
    reduced-motion/static fallback.
  - Preserved login, invitation, recovery, and reset form integration in both applications.
- Implementation notes:
  - Keep form DOM, input interaction, focus, feedback, and route behavior independent of artwork load.
  - Use transform/opacity-based motion, avoid continuous React state/render loops, and ensure pointer
    layers cannot receive input or obscure focus.
  - Keep product-owned implementations separate; extract only stable non-visual logic if real
    duplication already meets repository sharing rules.
  - Collapse or crop the scene intentionally below the useful split-layout breakpoint; do not force
    the form below a decorative mobile hero.
- Verification:
  - Component tests and manual inspection for media load/failure, motion/reduced motion, focus,
    desktop/narrow crop, light/dark/system, zoom, forced colors, and route-family reuse.
- Evidence required before completion:
  - Both apps show the correct scene across all four auth journeys, forms remain immediately usable,
    and animation produces no accessibility or interaction regression.

### TASK-016 — Validate the cross-product authentication family

- Status: Pending
- Covers: REQ-021–REQ-029, AC-017–AC-023
- Depends on: TASK-015
- Can parallelize with: TASK-011 after behavior and asset names settle
- Relevant skills/docs: `triad-testing`, `triad-product-qa`, Impeccable detector,
  `triad-studio-development`, `triad-backstage-development`
- Expected artifacts:
  - Focused Studio and Backstage auth component/E2E results.
  - Batched desktop/mobile screenshots for all auth journey types and selected themes/states.
  - Performance/media-load inspection and final side-by-side family review.
- Implementation notes:
  - Review desktop and mobile together in one visual pass, batch corrections, then confirm once.
  - Exercise form error, success, disabled/loading, media failure, offline where relevant, reduced
    motion, keyboard, zoom, and theme behavior without changing accepted identity contracts.
  - Run the Impeccable detector once over all changed UI targets after integration is complete.
- Verification:
  - `bun --filter studio check`
  - `bun --filter backstage check`
  - Focused auth Playwright suites for both apps
  - Production builds and boundary scans for both apps
  - Impeccable detector over changed Studio and Backstage targets
- Evidence required before completion:
  - AC-017 through AC-023 have reviewable automated/manual evidence and any residual visual,
    accessibility, or performance risk is explicitly recorded.

### TASK-011 — Update durable Studio and Backstage contracts and component inventories

- Status: Pending
- Covers: REQ-001–REQ-029, AC-016
- Depends on: TASK-002–TASK-009, TASK-015
- Can parallelize with: TASK-010 after behavior settles
- Relevant skills/docs: `triad-architecture`, `triad-studio-development`,
  `docs/studio/authentication.md`, `docs/studio/theme-system.md`,
  `docs/studio/component-system.md`
- Expected artifacts:
  - Updated authentication/session behavior documentation.
  - Updated shell navigation, feedback semantics, authentication art direction, asset provenance,
    and exhaustive shared-component contracts in affected apps.
  - Recorded decision on README, AGENTS, env schema, and skill applicability.
- Implementation notes:
  - Document durable behavior and extension rules, not transient implementation mechanics.
  - Update `AGENTS.md` or a Triad skill only if implementation establishes a broadly reusable new
    convention. No env change is expected.
- Verification:
  - Run documentation/component inventory checks and review links/commands.
- Evidence required before completion:
  - Documentation matches shipped behavior, or each considered no-update target has an explicit
    rationale in the execution evidence.

### TASK-012 — Run final verification and initiative evidence audit

- Status: Pending
- Covers: REQ-017–REQ-020, REQ-025–REQ-029, AC-015–AC-016, AC-022–AC-023
- Depends on: TASK-010–TASK-011, TASK-016
- Can parallelize with: None
- Relevant skills/docs: `triad-preflight-review`, `triad-testing`, Impeccable detector,
  planning gates
- Expected artifacts:
  - Complete command results, detector output, manual QA evidence, traceability audit, and recorded
    residual risks or deviations.
- Implementation notes:
  - Run formatting before read-only gates. Do not mark a task complete without its required evidence.
  - Verify every accepted requirement maps to implementation and verification and every task remains
    justified by the PRD.
- Verification:
  - `bun --filter studio routes:generate`
  - `bun --filter studio format`
  - `bun --filter studio lint`
  - `bun --filter studio typecheck`
  - `bun --filter studio test`
  - `bun --filter studio test:production-boundary`
  - `bun --filter studio build`
  - `bun --filter studio check`
  - `bun --filter backstage check`
  - Focused and, when feasible, full `bun --filter studio test:e2e`
  - `node .agents/skills/impeccable/scripts/detect.mjs --json <changed Studio targets>`
- Evidence required before completion:
  - All applicable Definition of Done gates pass; skipped checks, deviations, and follow-ups are
    explicit; the PRD and plan status reflect the actual result.

## Verification Evidence

Record evidence as tasks are completed:

- Command:
- Result:
- Notes:

## Risks And Follow-Ups

- [ ] A non-blocking shell must not expose stale tenant data or convert transient failures into
  accidental logout; retain this as a release-blocking review concern.
- [ ] Validate Better Auth self-name update behavior against the pinned version before UI work.
- [ ] Do not mistake current bounded notification scenarios for a production persistence or scale
  contract.
- [ ] Revisit notification pagination, delivery, preferences, and telemetry only through a future
  initiative with real production requirements.
- [ ] Authentication spectacle must not compete with form completion or regress low-power devices;
  treat measured load and reduced-motion behavior as release-blocking review concerns.
- [ ] TRIAD Barber receives only a future-facing art-direction constraint in this initiative; do not
  create its app, runtime component, or unused assets.

## Scope Changes

- 2026-09-04: After initial approval, the user reopened the initiative to replace the oversized
  authentication logo panels with expressive, animated, product-specific scenes across the full
  Studio and Backstage authentication journeys. Added REQ-021–REQ-029, AC-017–AC-023, and
  TASK-013–TASK-016; the revised version requires new approval.

## Definition of Done

- [ ] The implemented PRD version was explicitly approved.
- [ ] All applicable gates in
      `.agents/skills/triad-initiative-workflow/references/planning-gates.md` pass.
- [ ] Every in-scope AC has reviewable evidence.
- [ ] Deviations, skipped checks, residual risks, and follow-ups are recorded.
