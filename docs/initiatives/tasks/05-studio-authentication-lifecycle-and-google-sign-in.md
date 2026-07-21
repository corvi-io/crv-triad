# 05 TRIAD Studio Authentication Lifecycle And Google Sign-In - Execution Plan

## Source

- PRD: `docs/initiatives/prds/05-studio-authentication-lifecycle-and-google-sign-in.md`
- Depends on: [ENG-36](https://linear.app/corvi-io/issue/ENG-36/fix-dev-login-when-the-browser-blocks-the-idp-session-cookie)
- Linear initiative: [TRIAD Studio Authentication Lifecycle and Google Sign-In](https://linear.app/corvi-io/initiative/triad-studio-authentication-lifecycle-and-google-sign-in-0d0dc88ddf75)
- Related issue: [ENG-38](https://linear.app/corvi-io/issue/ENG-38/complete-triad-studio-authentication-lifecycle-and-google-sign-in)
- Backlog follow-up: [ENG-39](https://linear.app/corvi-io/issue/ENG-39/add-durable-queue-for-idp-transactional-authentication-emails), related to ENG-38

## Implementation Principles

- Follow the accepted hybrid recommendation from the PRD: trusted verified
  same-email Google auto-linking plus explicit connected-method controls.
- Keep account creation and sessions invite-gated for Google and credentials;
  never open public self-registration.
- Keep Better Auth mounted directly at `/api/auth/*` and use its native
  verification, password, social, and account methods.
- Treat Better Auth/IDP capabilities and secure defaults as authoritative.
  Custom auth behavior requires a documented, approved vendor-gap record and
  must use the smallest supported hook, adapter, or plugin extension point.
- Keep Better Auth `1.6.23` native `idToken` persistence in ENG-38; do not add
  custom stripping, encryption, adapter wrapping, or vendor-internal handling.
- Do not detach verification email in process. ENG-39 owns future durable,
  provider-independent asynchronous IDP transactional-email delivery.
- Do not create parallel auth endpoints, password/token/session primitives,
  account-linking logic, or user/account persistence already owned by Better
  Auth.
- Keep identity/access/provider behavior in IDP and user-facing auth/preferences
  composition in Studio. Do not add business rules to IDP or auth routes to API.
- Reuse one auth visual shell while keeping login, forgot-password, and
  reset-password routes/forms independently addressable and testable.
- Keep Google to identity scopes and same-email linking; do not request offline
  access, refresh-token-dependent APIs, or different-email linking.
- Require email verification before password-created access can establish a
  session and preserve enumeration-safe reset/resend behavior.
- Keep OAuth, password, reset, verification, session, email, and provider
  secrets/PII out of logs, fixtures, Linear, screenshots, and browser-visible
  env.
- Treat Google sign-in and transactional auth email as mandatory baseline
  capabilities in local development and every deployed environment. Do not add
  runtime feature flags or a Google-disabled production mode.
- Namespace the complete Better Auth cookie family through
  `advanced.cookiePrefix`: `triad-auth` for standard topology and
  `triad-auth-partitioned` only when partitioned storage is required. Preserve
  the Better Auth-applied, browser-enforced `__Secure-` prefix and Better Auth
  cookie suffixes.

## Tasks

- [ ] Confirm prerequisites and current contracts:
  - [x] Confirm ENG-36 is merged and record the accepted deployed cookie,
        CORS, origin, and callback topology.
  - [x] Confirm the ENG-36 transitional behavior: the active partitioned `dev`
        cookie ignores the legacy `__Secure-better-auth.session_token` cookie.
  - [x] Re-read the active Better Auth v1.6 Google, users/accounts, and
        email/password contracts at implementation time.
  - [x] Produce a native-capability map for every in-scope operation, naming the
        Better Auth configuration, client/server API, hook, adapter, generated
        schema contract, or plugin that owns it.
  - [x] Record the final decisions for the two reviewed Better Auth `1.6.23`
        limitations: accept native `idToken` persistence and defer durable,
        provider-independent auth-email delivery to ENG-39 without custom
        ENG-38 workarounds.
  - [x] Align IDP and Studio on the same resolved Better Auth version and run a
        generated schema diff before editing persistence.
  - [ ] Inventory existing users by verification/provider state using safe
        aggregate evidence only; do not export email or identity rows.
  - [x] Record Marcus Gabriel as owner for Google Cloud OAuth apps, exact
        callbacks, consent metadata, and target variables/secrets/keys.
  - [x] Confirm Marcus Gabriel provided the OAuth apps and required Google
        GitHub Environment values for `dev`, `hml`, and `prd`.
  - [ ] Confirm the product/legal owner supplies or approves any provider-
        required public homepage, privacy-policy, and support content.
- [x] Define and migrate the environment contract:
  - [x] Require the Google client ID and client secret in IDP parsing; reject
        absent or partial configuration at startup.
  - [x] Replace invitation-specific email enable/from/app URL names with the
        accepted shared auth-email runtime contract.
  - [x] Remove auth email enable/disable flags and require email from, Studio
        URL, and provider credential while preserving a safe Resend API URL
        default.
  - [x] Update `apps/idp/.env.example` with mandatory non-secret placeholders.
  - [x] Declare required target settings and `INFRA__*` provider
        identifiers/credentials in `env-schema.yaml`, without a Google switch.
  - [x] Update env tests and deployment mappings without automatically unsetting
        existing Fly secrets.
  - [x] Normalize `IDP_STUDIO_URL` and every trusted origin, then fail startup
        unless the Studio origin is included in `AUTH_TRUSTED_ORIGINS`.
- [x] Consolidate IDP transactional authentication email:
  - [x] Create one narrow IDP-owned transport for invitation, verification, and
        password-reset templates without moving product workflows into IDP.
  - [x] Keep invitation delivery status behavior explicit for administrator
        operations.
  - [x] Use Better Auth background tasks for automatic reset/verification sends;
        document that manual resend still awaits the provider in `1.6.23` and
        that ENG-39 owns durable provider-independent delivery.
  - [x] Build all email links from the configured trusted Studio origin and
        Better Auth URLs; never infer them from an arbitrary Host header.
  - [x] Add deterministic fake transport tests for sent, failed, and retry
        behavior; test fakes are dependency seams, not runtime disable flags.
  - [x] Keep email content in Brazilian Portuguese with no password/token value
        copied into logs or test snapshots.
- [ ] Complete email verification and credential lifecycle in IDP:
  - [x] Configure Better Auth verification email delivery and
        `requireEmailVerification` for password-created access.
  - [x] Define the ENG-38 resend contract: safe generic Studio feedback plus
        native token expiry/rate limiting, while provider-independent response
        timing is explicitly deferred to ENG-39.
  - [ ] Preserve the invitation role and define/test when an invitation becomes
        accepted for password and Google first access.
  - [ ] Implement the staged behavior for existing unverified credential users,
        including sign-in guidance and resend/recovery.
  - [x] Configure Better Auth reset-token expiry, single-use behavior,
        `revokeSessionsOnPasswordReset`, password length policy, and native
        current-password proof for `changePassword`.
  - [ ] Test unknown, invited, existing active, existing disabled, verified,
        unverified, credential-only, Google-only, and linked users.
- [ ] Configure Google and account linking in IDP:
  - [x] Configure `socialProviders.google` unconditionally with the required
        validated client ID/secret and exact `BETTER_AUTH_URL` callback
        derivation.
  - [x] Request only identity scopes and do not enable offline access or extra
        Google APIs.
  - [x] Configure Google as the only social/linking provider, preserve native
        verified same-email linking, and keep provider-name trust bypass,
        different-email/profile-overwrite/unlink-all behavior disabled.
  - [x] Enable Better Auth `1.6.23` native encryption for persisted access and
        refresh tokens, and accept its native persisted `idToken` behavior
        without custom handling or an all-token encryption claim.
  - [x] Verify database/session hooks apply the existing active-user or pending-
        invitation policy to Google user creation, and transactionally revoke a
        user's persisted sessions when an administrator disables that user.
  - [x] Map provider/callback failures to safe stable categories without
        exposing upstream error payloads.
  - [ ] Add access/linking tests for user creation, same-email existing user,
        pending invitation, unknown email, disabled user, missing/unverified
        provider email, different email, repeated callback, and cancellation.
- [ ] Standardize the Better Auth cookie namespace:
  - [x] Configure `advanced.cookiePrefix` as `triad-auth` for local HTTP and
        standard HTTPS topology.
  - [x] Configure `triad-auth-partitioned` only when the accepted browser
        topology requires `Partitioned`; do not embed environment names in the
        stable namespace.
  - [x] Preserve `HttpOnly`, `Secure`, accepted `SameSite`, exact path/domain,
        and conditional `Partitioned` attributes. Keep the Better Auth-applied,
        browser-enforced `__Secure-` prefix for HTTPS.
  - [x] Verify resulting session-cookie names are `triad-auth.session_token`,
        `__Secure-triad-auth.session_token`, and
        `__Secure-triad-auth-partitioned.session_token` for their respective
        topologies.
  - [x] Ensure temporary Google OAuth state/callback cookies and other Better
        Auth cookies use the same selected TRIAD family; do not override only
        `session_token` or parse cookies manually.
  - [x] Add tests proving legacy `better-auth` and transitional
        `triad-dev-partitioned` cookies are ignored after cutover without
        reading, copying, comparing, or logging their values.
  - [ ] Add session migration tests for fresh sign-in, session refresh,
        verification/reset, Google callback, account actions, sign-out, and
        full-release rollback under standard and partitioned topology.
- [ ] Execute the cookie namespace migration safely:
  - [ ] Inventory only aggregate active-session counts per environment; never
        export session tokens or cookie values.
  - [ ] Revoke/expire affected database-backed sessions before deploying the
        new namespace so restoring an older prefix cannot revive a legacy
        browser session.
  - [ ] Expire exactly the known legacy cookie names for the matching IDP
        origin/path where browser policy permits; do not broadly clear cookies.
  - [ ] Require fresh authentication after cutover and communicate the planned
        sign-out impact.
  - [x] Document full-release rollback as another coordinated revoke/cleanup;
        do not implement client-side HttpOnly token copying or indefinite
        dual-read compatibility.
- [ ] Verify and migrate persistence integrity:
  - [x] Generate/compare the Better Auth v1.6 Drizzle schema with the existing
        `idp_` schema.
  - [x] Add only required provider/account indexes or uniqueness constraints;
        preserve current rows, prefixes, foreign keys, and UUIDv7 generation.
  - [x] Generate a reviewed Drizzle migration rather than using schema push.
  - [ ] Test migration forward behavior against disposable PostgreSQL with
        credential-only and already-linked fixtures.
  - [ ] Test simultaneous OAuth callbacks and explicit link attempts cannot
        create duplicate users/provider accounts.
  - [x] Record full-release rollback and credential-rotation behavior; do not
        delete linked provider rows or create a runtime Google-disable path.
- [x] Refactor the Studio auth shell and route model:
  - [x] Extract the current split login/brand structure into a shared auth shell
        without duplicating layout, token, theme, or responsive behavior.
  - [x] Keep `/login` responsible for email/password, Google initiation,
        invite-gated first access, verification notices, and safe callback
        errors.
  - [x] Add `/forgot-password` with email validation, generic sent state, retry,
        and return-to-login navigation.
  - [x] Add `/reset-password` with token parsing, invalid/expired/reused states,
        password/confirmation validation, success state, and return to login.
  - [x] Add verification resend/result states without placing email/token values
        in the URL or persistent browser storage.
  - [x] Map native `INVALID_TOKEN` and `TOKEN_EXPIRED` verification callbacks to
        safe verification copy, suppress contradictory success/provider copy,
        and replace the consumed `verified` query marker.
  - [x] Use stable labels with shared button loading state, prevent duplicate
        submissions, and preserve autofill/paste/password-manager behavior.
  - [x] Regenerate TanStack routes and update auth route/unit coverage.
- [x] Extend the narrow Studio Better Auth client:
  - [x] Add only thin typed adapters that delegate one-to-one to Better Auth for
        Google sign-in, password reset completion, verification resend,
        password change, list accounts, link Google, and unlink Google.
  - [x] Keep token creation/validation, cookies, sessions, account-linking
        decisions, CSRF/origin enforcement, and auth persistence inside Better
        Auth/IDP; Studio owns UI orchestration and safe error presentation only.
  - [x] Build absolute callback/redirect URLs from the browser origin and
        accepted fixed paths only.
  - [x] Keep Better Auth/IDP clients inside `src/modules/auth/services`; do not
        generate a broad IDP client or add manual auth endpoints.
  - [x] Test method payloads, callback URLs, error mapping, and absence of
        browser-visible provider secrets.
- [x] Add security and access preferences:
  - [x] Add a bounded `Segurança e acesso` section alongside appearance without
        turning preferences into identity administration.
  - [x] Show `E-mail e senha` and `Google` as connected/available methods from
        the current user's bounded Better Auth account list.
  - [x] Let authenticated users connect Google and return to preferences with a
        safe success/error result.
  - [x] Claim Google-link success only after `listAccounts` confirms the provider
        and replace the consumed callback result query marker.
  - [x] Let users disconnect Google only when another usable method exists and
        keep the server as the final lockout guard.
  - [x] Let credential users change password with current-password proof and
        other-session revocation by default.
  - [x] Let Google-only users initiate the verified email recovery flow to
        establish a password.
  - [x] Add loading, empty, provider unavailable, conflict, stale state,
        cancellation, duplicate-submit, and retry behavior.
- [ ] Complete accessibility and responsive verification:
  - [x] Focus the route heading or first invalid field after navigation/submit
        and restore focus after non-navigation actions.
  - [x] Use appropriate status/alert announcements for redirects, delivery,
        invalid tokens, success, and connection changes.
  - [x] Verify keyboard-only operation, visible focus, accessible names,
        password visibility controls, Google branding, and non-color method
        status.
  - [ ] Verify all auth/preferences states at 320 CSS pixels, 200% zoom-
        equivalent width, light/dark/system, reduced motion, and forced colors.
  - [x] Run axe and record screen-reader/manual checks or explicit skips.
- [ ] Complete security, abuse, and operations checks:
  - [x] Revoke only the target user's persisted Better Auth sessions in the same
        transaction that changes the user status to `disabled`; preserve the
        self-disable guard and unrelated sessions.
  - [ ] Verify Better Auth origin/CSRF/OAuth state behavior, secure cookies,
        exact callbacks, and trusted redirect handling.
  - [ ] Configure/test bounded rate limits for sign-in, first access, reset,
        resend, and OAuth without account lockout.
  - [x] Confirm the accepted OAuth storage boundary: minimal identity scopes and
        native encryption for access/refresh tokens; persisted `idToken` follows
        Better Auth `1.6.23` native behavior.
  - [x] Confirm logs, test output, screenshots, Linear, and provider evidence
        contain no credentials, PII, authorization codes/state, tokens,
        cookies, or private headers.
  - [x] Confirm cookie namespace evidence records names and attributes only,
        never values.
  - [x] Document provider outage/cancellation, email delivery failure, full-
        release rollback, credential rotation, and mandatory environment
        configuration behavior.
  - [x] Document standard/partitioned TRIAD cookie names, legacy cleanup,
        forced reauthentication, and rollback session revocation.
- [ ] Update durable documentation and delivery evidence:
  - [x] Update `apps/idp/README.md`, `docs/idp/conventions.md`,
        `docs/idp/deployment.md`, and `docs/idp/operations.md` for providers,
        verification, recovery, env, email, and runbooks.
  - [x] Update `apps/studio/README.md`, `docs/studio/conventions.md`, testing
        docs, and component inventory when the auth shell/preferences contract
        changes.
  - [x] Update root README/AGENTS/skills only if a broad durable convention or
        contributor workflow changes.
  - [ ] Deliver required `apps/site` provider-policy surfaces in this initiative
        if the current public site is insufficient; use approved copy and do not
        invent legal text.
  - [ ] Verify the full mandatory capability in order: local/test fakes, `dev`,
        `hml`, and `prd`. This order sequences evidence and does not enable or
        disable Google.
  - [ ] Run `triad-preflight-review` before PR creation and hand off Linear/GitHub
        evidence through the accepted workflows.
- [ ] Run final verification:
  - [x] `bun --filter idp db:generate`
  - [ ] `bun --filter idp db:migrate`
  - [x] `bun --filter idp check`
  - [x] `bun --filter idp build`
  - [x] `bun --filter idp test`
  - [x] `bun --filter studio routes:generate`
  - [x] `bun --filter studio check`
  - [ ] `bun --filter studio test:e2e`
  - [ ] `bun --filter studio test:e2e:production`
  - [ ] `bun run check`

## Accepted Native Limitations And Follow-Up

These are final ENG-38 product/engineering decisions. No workaround is implemented in ENG-38.

### Persisted Google `idToken`

- Installed evidence: Better Auth `1.6.23` applies `setTokenUtil` to persisted access and refresh
  tokens when `account.encryptOAuthTokens` is enabled, but callback, linking, and refresh paths pass
  `idToken` directly to the account adapter.
- Accepted ENG-38 boundary: keep that native behavior. Do not strip, encrypt, wrap the adapter, or
  introduce vendor-internal `idToken` handling.
- At-rest implication: access and refresh tokens are encrypted; persisted `idToken` is not covered
  by that native transform. ENG-38 must not claim all-token encryption.
- Maintenance rationale: accepting the vendor contract avoids custom ciphertext/versioning,
  key-rotation, adapter-read compatibility, and Better Auth upgrade coupling in this initiative.

### Manual verification resend delivery

- Installed evidence: Better Auth `1.6.23` uses `runInBackgroundOrAwait` for automatic
  verification/reset sends, but `/send-verification-email` awaits `sendVerificationEmail`; provider
  latency/failure can therefore affect the native response.
- Accepted ENG-38 boundary: do not detach verification delivery in process. ENG-38 provides generic
  Studio feedback but does not claim durable delivery or provider-independent timing.
- Follow-up: Linear ENG-39, `Add durable queue for IDP transactional authentication emails`, is a
  Backlog issue related to ENG-38. It owns durable enqueueing, workers, retries, shutdown safety,
  idempotent delivery, provider-independent response timing, and operational visibility for
  invitation, verification, and reset email.

## Verification Evidence

Record evidence only as tasks are completed. Redact identity/provider values and
never paste live authorization codes, OAuth state, reset/verification tokens,
cookies, sessions, email addresses, or private headers.

- Command: `bunx auth@1.6.23 generate --config <temporary IDP config> --output <temporary schema> --yes`
- Result: PASS; generated Better Auth core schema matched existing `idp_` fields after table mapping.
- Notes: The temporary config/output were removed. The generated contract did not add a native
  provider-account uniqueness constraint.
- Command: `bun --filter idp db:generate`
- Result: PASS; generated `0001_blushing_lily_hollister.sql` and Drizzle metadata.
- Notes: Migration was generated only. It was not applied or schema-pushed.
- Command: focused IDP env/auth/email/cookie/access/schema tests
- Result: PASS.
- Notes: Tests use deterministic fakes and placeholder-only identities/credentials.
- Command: `bun --filter idp check`
- Result: PASS; Biome, TypeScript, and 64 IDP tests passed.
- Command: `bun --filter idp build`
- Result: PASS.
- Command: `bun --filter idp test`
- Result: PASS; 64 tests.
- Command: `bun run test:ci`
- Result: PASS; 19 CI/env-management tests.
- Command: `git diff --check`
- Result: PASS.
- Command: focused Studio auth client, login, recovery, preferences, and theme tests
- Result: PASS; 5 files and 17 tests.
- Notes: Native payloads use fixed browser-origin callbacks and synthetic non-deliverable identities.
- Command: `bun --filter studio check`
- Result: PASS; route generation, Biome, TypeScript, 24 test files/110 tests, production build,
  and the 36-file production-boundary scan passed.
- Command: `bun --filter studio build`
- Result: PASS; 3,583 modules transformed and route-specific auth chunks emitted.
- Command: `bun --filter studio test:production-boundary`
- Result: PASS; production build and boundary scan passed across 36 files.
- Command: `bun --filter studio test:e2e -- tests/e2e/auth-lifecycle.spec.ts`
- Result: PASS; 3 Chromium tests.
- Notes: Local request fakes covered route focus, keyboard navigation, show-password semantics,
  320 CSS-pixel reflow, reduced motion, focused axe scans, forgot/reset composition, duplicate
  submission, and the Google-only last-method guard. No provider or deployed IDP was called.
- Command: `bun --filter idp check`
- Result: PASS; Biome, TypeScript, and 10 files/65 tests.
- Notes: The configured background-task handler observes rejected promises without logging context;
  OAuth initiation asserts the exact configured IDP callback URI.
- Command: `bun run test:ci`
- Result: PASS; 19 CI/environment-management tests.
- Command: Phase B `git diff --check`
- Result: PASS.
- Command: focused IDP env and user-route tests
- Result: PASS; 2 files and 33 tests.
- Notes: Trusted origins are normalized before membership validation. The user-route fake compiles
  the Drizzle predicate and proves both target-session removal and preservation of unrelated
  persisted sessions within one transaction.
- Command: focused Studio login and security/preferences unit tests
- Result: PASS; 2 files and 14 tests.
- Notes: Invalid/expired verification callbacks never render success or Google failure copy;
  Google-link success requires confirmed account state, and consumed one-shot markers are replaced.
- Command: `bun --filter idp check`
- Result: PASS; Biome, TypeScript, and 10 files/67 tests.
- Command: `bun --filter studio check`
- Result: PASS; route generation, Biome, TypeScript, unit tests, production build, and the
  production-boundary scan completed successfully.
- Command: `bun --filter studio test:e2e -- tests/e2e/auth-lifecycle.spec.ts`
- Result: PASS; 5 Chromium tests using only local request fakes.
- Command: `bun run test:ci`
- Result: PASS; 19 CI/environment-management tests.
- Command: normal-fix `git diff --check`
- Result: PASS.
- Manual accessibility evidence
- Result: SKIPPED in this non-interactive pass for VoiceOver/NVDA, real browser 200% zoom, and a
  complete forced-colors/light/dark/system matrix. Focused axe, keyboard, reduced-motion, and 320px
  automated coverage passed; the broader manual matrix remains unchecked.

## Risks And Follow-Ups

- [x] ENG-36 is merged and the deployed callback/origin topology is the basis for this work.
- [ ] Existing unverified credential users can be stranded by an abrupt
      verification requirement; inventory aggregate state and provide staged
      resend/recovery behavior.
- [ ] Implicit linking is safe only for the intended trusted Google same-email
      case; keep different-email/provider expansion out of this initiative.
- [ ] Concurrent callbacks can create duplicate rows without adapter-compatible
      constraints and conflict tests.
- [ ] Renaming the cookie prefix makes existing browser sessions unreadable and
      can revive legacy sessions after rollback unless database sessions and
      exact old cookie names are handled as a coordinated migration.
- [x] Provider-independent transactional-email delivery is explicitly deferred
      to Backlog follow-up ENG-39; until it lands, provider timing, quotas, spam
      placement, and outages remain accepted operational limitations.
- [x] Marcus Gabriel created the Google OAuth apps, registered the exact callbacks, and supplied the
      required Google target values. Their values were not read or copied into evidence.
- [ ] Complete production functionality requires valid credentials, verified
      domains, consent branding, and approved public home/privacy/support URLs;
      these are delivery requirements, not a feature-toggle gate.
- [ ] Future MFA/passkey/session-management work will need its own recovery and
      account-linking threat model; do not infer it from this initiative.
