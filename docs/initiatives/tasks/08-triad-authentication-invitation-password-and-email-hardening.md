# 08 TRIAD Authentication Invitation, Password, And Email Hardening - Execution Plan

## Source

- PRD: `docs/initiatives/prds/08-triad-authentication-invitation-password-and-email-hardening.md`
- Linear initiative: [TRIAD Authentication Invitation, Password, and Email Hardening](https://linear.app/corvi-io/initiative/triad-authentication-invitation-password-and-email-hardening-f68e02806af2)
- Related issue: [ENG-42](https://linear.app/corvi-io/issue/ENG-42/harden-triad-invitation-acceptance-password-policy-and-authentication)
- Related completed issue: [ENG-38](https://linear.app/corvi-io/issue/ENG-38/complete-triad-studio-authentication-lifecycle-and-google-sign-in)
- Deferred delivery follow-up: [ENG-39](https://linear.app/corvi-io/issue/ENG-39/add-durable-queue-for-idp-transactional-authentication-emails)

## Implementation Principles

- Deliver invitation proof, password policy/guidance, and authentication email
  templates as one coherent identity hardening task.
- Keep Better Auth authoritative for password hashing, credential creation,
  reset/verification tokens, accounts, and sessions; add only the smallest
  TRIAD invitation-proof seam proven safe by the initial spike.
- Keep invitation lifecycle, password enforcement, and email rendering in IDP;
  keep routes, forms, and user feedback in Studio; do not involve `apps/api` or
  `apps/site`.
- Keep public self-registration closed. Email/password first access requires a
  valid invitation token; verified Google first access retains the ENG-38
  pending-invitation proof path.
- Persist only invitation token digests. Never record passwords, raw tokens,
  token-bearing URLs, recipients, cookies, sessions, provider keys, or rendered
  email bodies in logs, snapshots, docs, or handoff evidence.
- Enforce 15 to 256 Unicode characters and a reviewed whole-password blocklist
  without composition rules; preserve paste, autofill, password managers,
  spaces, and Better Auth's existing native hash.
- Treat IDP policy as authoritative. Mirror only stable public guidance in
  Studio and protect parity with tests/documentation rather than adding a
  password-policy fetch to every form.
- Adapt the selected React Email Studio visual hierarchy to TRIAD transactional
  messages; do not copy marketing imagery, social links, tracking, or
  unsubscribe content.
- Preserve the existing Resend REST provider boundary, bounded retries,
  idempotency behavior, and ENG-39 durable-queue follow-up.
- Keep code, routes, filenames, tests, and docs in English; keep Studio/email
  user-facing copy in Brazilian Portuguese.

## Tasks

- [x] Confirm scope and traceability:
  - [x] Link the final Linear initiative and single implementation issue in
        this plan and the PRD.
  - [x] Re-read ENG-38 implementation and ENG-39 boundaries before changing
        invitation or email behavior.
  - [x] Record any MFA, passkey, organization invitation, provider change, or
        durable-queue request as a follow-up instead of expanding this task.
- [x] Prove the Better Auth integration seam before schema implementation:
  - [x] Pin the installed Better Auth contract used by IDP and Studio during
        the spike.
  - [x] Verify whether a supported before hook/plugin can receive and validate
        request-scoped invitation proof for `/sign-up/email` without persisting
        it as user data or exposing it in returned types.
  - [x] Verify whether invitation validation and consumption can share a safe
        transaction/conditional-update boundary with native credential/user
        creation under concurrent submissions.
  - [x] If that seam is insufficient, design one narrow IDP-owned exchange or
        acceptance route that delegates credential creation to Better Auth and
        does not duplicate hashing, account, session, or reset behavior.
  - [x] Record the chosen seam, rejected alternative, request shape, atomicity
        evidence, and OpenAPI impact in this plan before continuing.
- [x] Add secure invitation-token persistence:
  - [x] Generate at least 256 bits of entropy with a cryptographically secure
        source and encode the raw token URL-safely.
  - [x] Store only a deterministic digest plus issuance/lifecycle metadata in
        `idp_invitations`; add a unique digest lookup index and preserve the
        `idp_` prefix and UUIDv7 entity IDs.
  - [x] Generate and review the Drizzle migration without schema push or
        destructive database shortcuts.
  - [x] Define migration behavior that invalidates legacy pending invitations
        without tokens and requires secure reissue.
  - [x] Keep raw tokens out of repository return types after the immediate
        create/send boundary wherever practical.
- [x] Implement the invitation lifecycle:
  - [x] Issue an invitation secret only for a new pending invitation and bind
        it to that invitation's normalized email, role, expiry, and status.
  - [x] Resolve a token through a bounded digest lookup and return only the
        minimum Studio presentation data.
  - [x] Require valid proof on email/password first access; an editable email
        alone must never authorize credential creation.
  - [x] Atomically consume one pending token, activate the Better Auth user with
        the invitation role, mark mailbox proof, and record acceptance.
  - [x] Do not auto-sign in after acceptance; return a stable success outcome
        that directs the user to normal login.
  - [x] Rotate the secret on resend and invalidate the previous link before the
        replacement is usable.
  - [x] Ensure revoke, expiry, prior use, supersession, malformed input, and
        provider failure cannot create or recover a credential.
  - [x] Preserve verified-Google first access and existing active-user login as
        regression-tested separate proof paths.
- [x] Harden invitation routes and browser handling:
  - [x] Add only the smallest required IDP route/contract and document custom
        routes in non-production OpenAPI.
  - [x] Use configured, allowlisted absolute Studio/IDP origins; never derive
        action links from untrusted request host headers.
  - [x] Apply bounded rate limits to resolve, acceptance, resend, and affected
        signup endpoints without creating account enumeration responses.
  - [x] Add no-referrer handling for the acceptance surface and verify tokens
        are excluded from logs, analytics, error capture, screenshots, and
        browser persistence.
  - [x] Ensure the bootstrap-admin invitation follows the same secure send path
        and never prints a raw link/token.
- [x] Establish the authoritative password policy:
  - [x] Set the IDP minimum to 15 and keep the maximum at 256 for signup, reset,
        and change-password paths.
  - [x] Accept Unicode, spaces, paste, autofill, and password-manager input
        without trimming or truncating secrets.
  - [x] Select a maintained/reviewed source for a bounded local blocklist,
        document its license/update process, and load it once per process.
  - [x] Add TRIAD/context-specific expected values and compare only the complete
        proposed password, never substrings.
  - [x] Enforce the blocklist before Better Auth hashes a new password on every
        password-setting endpoint, with no remote provider call.
  - [x] Preserve the existing Better Auth hash and add no custom migration in
        this task.
  - [x] Map policy rejection to safe actionable errors without echoing password
        content or revealing whether an account exists.
- [x] Build reusable Studio password guidance:
  - [x] Inspect and reuse existing auth field, password input, field error, and
        auth shell components before adding a new shared composition.
  - [x] Add one focused password-guidance composition when reuse does not fit;
        document it in the Studio component inventory if it becomes shared.
  - [x] Show objective status for at least the 15-character minimum and matching
        confirmation, plus non-rule guidance against common/predictable values.
  - [x] Keep any strength meter explicitly advisory and unable to override
        server acceptance/rejection.
  - [x] Use text/icon as well as color, associated descriptions/errors, stable
        button labels with loading state, first-error focus, and non-chatty
        screen-reader announcements.
  - [x] Apply the same guidance and Portuguese terminology to invitation reset,
        password reset, and preferences change-password forms.
  - [x] Preserve `autocomplete="new-password"`, paste, reveal/hide, keyboard
        flow, 200% zoom, narrow-screen behavior, light/dark/system themes, and
        browser password-manager compatibility.
- [x] Add the Studio invitation-acceptance route:
  - [x] Create `/accept-invitation` as a dedicated TanStack Router leaf using
        the existing login/auth visual shell.
  - [x] Parse the opaque token without putting email or identity PII into the
        URL, storage, or analytics state.
  - [x] Render explicit validating, form, invalid, expired, revoked, used,
        superseded, submitting, provider/network failure, and success states.
  - [x] Keep invited identity context read-only/minimized and never treat a
        client-edited email or role as authorization.
  - [x] Prevent duplicate submission in the UI while relying on server-side
        one-time/idempotent behavior for actual safety.
  - [x] On success, clear token-bearing route state where practical and direct
        the user to login without creating a session.
- [x] Introduce the IDP React Email foundation:
  - [x] Add React Email/React dependencies to `apps/idp` with Bun and configure
        TypeScript/JSX without changing unrelated packages.
  - [x] Inspect the current official Studio welcome and password-reset examples,
        record the source/license, and copy only the layout patterns needed.
  - [x] Create an IDP-owned `AuthEmailLayout` with email-safe literal TRIAD
        colors, preview text, bounded container, semantic hierarchy, one CTA,
        visible fallback URL, and quiet security footer.
  - [x] Avoid browser CSS variables, unsupported selectors, third-party remote
        images, tracking pixels, marketing sections, social links, and raw HTML
        injection.
  - [x] Create dedicated invitation, verification, and password-reset templates
        with Brazilian Portuguese subject, preview, expiry, fallback, and
        non-request guidance.
  - [x] Validate all action URLs against configured trusted origins before
        rendering and keep token values only in required CTA/fallback links.
  - [x] Render HTML and plain text from the same trusted component props using
        React Email render/plain-text utilities.
  - [x] Keep the existing Resend REST payload, timeout, retry, idempotency, and
        sanitized delivery-failure boundary unchanged except for rendered body
        integration.
- [x] Add safe template preview and test fixtures:
  - [x] Add a Bun-driven local preview command scoped to `apps/idp`.
  - [x] Use fixed synthetic non-deliverable recipients, roles, dates, and
        clearly fake action URLs/tokens in preview props.
  - [x] Ensure preview tooling cannot load production secrets or send messages
        by default.
  - [x] Preserve required MIT attribution if substantial example source is
        copied.
- [x] Add focused IDP tests:
  - [x] Token entropy/format, digest-only persistence, unique lookup, expiry,
        revocation, rotation, one-time use, legacy invalidation, and resend
        failure behavior.
  - [x] Valid, invalid, replayed, and concurrent acceptance with exactly one
        accepted outcome and no duplicate user/account/credential records.
  - [x] Active-user and verified-Google regression behavior.
  - [x] Password min/max, Unicode/spaces, blocklist, no composition rule, and
        consistent signup/reset/change enforcement.
  - [x] Template subject/preview/HTML/plain text, escaping, trusted URLs,
        fallback links, no forbidden content, and synthetic-only snapshots or
        semantic assertions.
  - [x] Resend request body, timeout, retry, idempotency, and sanitized failure
        observer behavior with deterministic fakes.
  - [x] Env parsing, OpenAPI, rate-limit, and migration/schema contract tests
        for every touched IDP boundary.
- [x] Add focused Studio tests:
  - [x] Acceptance route loading and all terminal/result states.
  - [x] Password guidance, confirmation, server rejection, retry, and success
        parity across invitation, reset, and preferences.
  - [x] Accessible labels/descriptions/live regions, keyboard order, focus on
        first error, reveal button names, paste/autocomplete, duplicate-submit
        prevention, and stable loading labels.
  - [x] Responsive and theme coverage plus production-boundary regression.
  - [x] Playwright coverage for valid acceptance, expired/replayed link, strong
        password creation, login after success, and existing reset/Google
        first-access regressions where the local harness supports them.
- [x] Update durable documentation:
  - [x] Update `docs/idp/authentication.md` for invitation proof, password
        policy, React Email ownership, token handling, and migration behavior.
  - [x] Update `apps/idp/README.md` for preview/test commands and any route or
        runtime configuration impact.
  - [x] Update `docs/studio/authentication.md` and `apps/studio/README.md` for
        the acceptance route and password UX.
  - [x] Update `docs/studio/component-system.md` only if a new active shared
        password-guidance component is added.
  - [x] Update `env-schema.yaml` and CI/CD docs only if a truly target-specific
        deployment input changes; do not add secrets for templates or a remote
        password provider.
  - [x] Preserve ENG-39 as the durable queue/worker/alerting follow-up.
- [ ] Run verification and record evidence:
  - [x] `bun --filter idp db:generate`
  - [x] Review generated SQL and migration metadata; do not apply or schema-push
        without explicit environment authorization.
  - [x] `bun --filter idp check`
  - [x] `bun --filter idp build`
  - [x] `bun --filter idp test`
  - [x] `bun --filter studio routes:generate`
  - [x] `bun --filter studio check`
  - [x] `bun --filter studio build`
  - [x] `bun --filter studio test:production-boundary`
  - [x] `bun --filter studio test:e2e -- tests/e2e/auth-lifecycle.spec.ts`
  - [x] `bun run test:ci` when env/deployment mappings change
  - [x] `git diff --check`
  - [ ] Manually test keyboard, screen reader, 200% zoom, narrow viewport,
        password manager, expired/revoked/replayed invitations, resend rotation,
        and no-referrer/token-redaction behavior.
  - [ ] Preview invitation, verification, and reset messages in Gmail, Outlook,
        and Apple Mail or available provider tooling, with images disabled and
        plain-text fallback inspected.

## Verification Evidence

Record evidence only after implementation. Use synthetic identities and redact
all credentials, tokens, action URLs, cookies, sessions, provider data, private
headers, and rendered message bodies.

- Better Auth invitation-proof spike:
  - Installed contract: both apps resolve `better-auth@1.6.23` through
    `bun.lock`.
  - Selected seam: keep Better Auth mounted at `/api/auth/*` and submit one
    request-scoped `invitationToken` extension to native `/sign-up/email`.
    Better Auth `1.6.23` parses that endpoint as its required body intersected
    with an additional-field record. A database `user.create.before` hook reads
    the request body, resolves the digest through the current transaction
    adapter, and supplies only server-owned email-verification, role, status,
    and neutral display-name values to native user creation. The proof is not a
    user field, response field, session field, or persisted Better Auth model.
  - Atomicity evidence: installed `sign-up.mjs` wraps password hashing, user
    creation, and credential-account linking in `runWithTransaction`. The
    public `getCurrentAdapter` export returns that active transaction adapter
    inside database hooks. The credential `account.create.before` hook performs
    one conditional invitation update matching digest, bound normalized email,
    `pending` status, and future expiry. A zero-row update aborts the Better
    Auth transaction; success records acceptance with the native user ID before
    the credential insert. Concurrent attempts therefore have one database
    winner, and a later failure rolls back both invitation consumption and
    native user/account writes.
  - Rejected alternative: an endpoint `hooks.before` proof check is supported
    for request validation but runs before the endpoint handler opens the native
    transaction, so consuming there could strand a token or credential after a
    later failure. A post-create hook runs after commit and cannot roll back the
    native credential. A custom IDP endpoint that persisted a hash or credential
    directly was also rejected because it would duplicate Better Auth security
    primitives.
  - Fallback decision: no custom acceptance endpoint is required. The narrow
    IDP-owned fallback remains documented only as a contingency if the pinned
    Better Auth transaction or hook contract changes.
  - OpenAPI impact: no new IDP acceptance route is introduced; the mounted
    Better Auth route remains native. TRIAD's non-production OpenAPI adds only
    the token-resolution contract used before form display. The request proof
    is documented as an opaque write-only extension and never appears in a
    response schema.
- Migration review: `bun --filter idp db:generate` reported no schema drift after generating
  `0002_kind_giant_man.sql`. SQL and Drizzle snapshot/journal were reviewed; the migration adds
  digest/issuance columns, expires legacy pending rows, and creates the unique digest index. It was
  not applied or schema-pushed.
- IDP tests/check/build: `bun --filter idp check`, `bun --filter idp build`, and
  `bun --filter idp test` passed; Vitest reported 13 files and 93 tests passing.
- Studio tests/check/build: `bun --filter studio routes:generate`, `bun --filter studio check`,
  `bun --filter studio build`, and `bun --filter studio test:production-boundary` passed; Vitest
  reported 30 files and 180 tests passing after rebasing onto the current `staging` base.
- Playwright: `bun --filter studio test:e2e -- tests/e2e/auth-lifecycle.spec.ts` passed 6 Chromium
  tests, including valid acceptance, replay rejection, reset, verified-Google regressions, and
  no-session success behavior.
- Accessibility/responsive/password-manager checks: the focused Playwright flow passed Axe WCAG
  A/AA rules and a 320-pixel viewport assertion. Unit/browser tests cover keyboard focus, labels,
  descriptions, stable loading text, paste, reveal controls, and `autocomplete="new-password"`.
  VoiceOver or another real screen reader, 200-percent browser zoom, and an actual password-manager
  extension were unavailable locally and remain manual QA checks.
- Email preview/client checks: the synthetic-only React Email preview server started successfully
  and returned HTTP 200 at its local index without sending. Semantic HTML/plain-text, escaping,
  allowlisted URLs, fallback text, retry, timeout, and idempotency have automated coverage. Gmail,
  Outlook, and Apple Mail rendering were unavailable locally and remain manual release checks.
- Token/log/analytics redaction inspection: focused tests verify no-referrer/no-store headers, query
  removal before form display, minimal resolve/signup responses, digest-only persistence, and
  sanitized observer behavior. A scoped source/diff scan found no ENG-41 changes or new sensitive
  logging; `git diff --check` passed.
- Environment verification: `bun run test:ci` passed 19 tests with 240 expectations. No
  deployment-target mapping changed.
- Documentation review: IDP/Studio app READMEs, durable authentication docs, PRD, and this plan are
  updated. The password-guidance composition remains auth-module-owned, so the shared Studio
  component inventory did not change. ENG-39 remains the durable-delivery follow-up.

## Risks And Follow-Ups

- [ ] Better Auth may not expose a safe request-scoped proof seam with the
      required transaction semantics; the initial spike must choose the narrow
      fallback without reimplementing credential security.
- [ ] Migration invalidates legacy pending invitations; operations must reissue
      them and communicate the change without exposing old addresses/tokens.
- [ ] A local blocklist needs an explicit source, license, update cadence, and
      bounded memory/startup behavior.
- [ ] Email-client CSS support can diverge from browser previews; major-client
      rendering remains a manual release check.
- [ ] Durable enqueueing, workers, retries across process failure, provider-
      independent response timing, metrics, and alerts remain ENG-39.
- [ ] Future hash changes, MFA/passkeys, remote compromised-password checks, or
      organization invitation workflows require separate accepted initiatives.
