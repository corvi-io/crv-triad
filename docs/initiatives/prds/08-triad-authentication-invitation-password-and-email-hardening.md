# 08 TRIAD Authentication Invitation, Password, And Email Hardening

## Summary

Harden the email/password entry points that remain weak after the broader
authentication lifecycle initiative. This initiative replaces email-only
invitation claiming with a secure link-to-set-password journey, aligns every
credential-creation surface with a modern password policy and accessible
guidance, and standardizes invitation, verification, and password-reset email
through a reusable React Email foundation adapted to the TRIAD identity.

The IDP remains authoritative for invitation proof, password enforcement,
credential creation, identity state, and transactional email rendering and
delivery. Studio owns the browser routes, forms, and user feedback. Better Auth
continues to own password hashing, verification/reset primitives, accounts,
sessions, and its mounted `/api/auth/*` contract.

## Context

- Current state:
  - ENG-38 completed Google sign-in, same-email account linking, email
    verification, password recovery/change, and the TRIAD-owned Better Auth
    cookie namespace.
  - A pending invitation is currently selected by normalized email during
    `signUp.email`; the invitation message links only to `/login` and carries
    no proof token.
  - Anyone who learns an invited email address can attempt to create its
    password before the intended recipient proves mailbox possession.
  - Password length is enforced as 12 to 256 characters by the IDP, while
    Studio repeats parts of that rule in separate schemas and provides only a
    short static hint.
  - Better Auth uses its native password hashing and reset/verification token
    machinery; this initiative must not replace those capabilities.
  - IDP authentication email is assembled as manual HTML and text strings and
    sent through the existing bounded Resend REST transport.
- Problem:
  - Invitation eligibility is being treated as invitation proof.
  - Password feedback is inconsistent across first access, reset, and change
    password, and the requested composition rules would encourage predictable
    transformations instead of stronger passphrases.
  - Transactional authentication messages lack a shared, tested visual and
    content system, making accessibility, plain-text parity, branding, and
    future maintenance harder.
- Why now:
  - These are small but security-sensitive gaps on the same identity journey,
    and a shared delivery prevents three partially compatible solutions.
  - The current email transport and Studio auth shell are stable enough to
    support a focused hardening pass without expanding product scope.
  - The selected React Email Studio template gives a useful visual reference,
    but its marketing content should not be copied into transactional auth
    messages.
- Related sources:
  - [Linear initiative: TRIAD Authentication Invitation, Password, and Email Hardening](https://linear.app/corvi-io/initiative/triad-authentication-invitation-password-and-email-hardening-f68e02806af2)
  - [ENG-42: Harden TRIAD invitation acceptance, password policy, and authentication emails](https://linear.app/corvi-io/issue/ENG-42/harden-triad-invitation-acceptance-password-policy-and-authentication)
  - `docs/initiatives/prds/05-studio-authentication-lifecycle-and-google-sign-in.md`
  - `docs/idp/authentication.md`
  - `docs/studio/authentication.md`
  - [NIST SP 800-63B password requirements](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver)
  - [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
  - [Better Auth email flows](https://better-auth.com/docs/concepts/email)
  - [Better Auth hooks](https://better-auth.com/docs/concepts/hooks)
  - [React Email Studio welcome reference](https://demo.react.email/preview/05-Studio/welcome)
  - [React Email render utility](https://react.email/docs/utilities/render)
  - [React Email Tailwind support](https://react.email/docs/components/tailwind)

## Goals

- Require possession of a valid, unexpired, unrevoked, one-time invitation
  secret before an invited user can create an email/password credential.
- Send invited users directly to a dedicated Studio set-password route with
  safe loading, invalid, expired, revoked, already-used, success, and retry
  states.
- Keep verified Google first access valid under the existing invitation gate;
  Google verification is a separate proof path and does not require the email
  invitation token.
- Enforce one password contract on first access, password reset, and
  authenticated password change, with the IDP as the final authority.
- Adopt a minimum of 15 characters and maximum of 256, allow spaces, Unicode,
  paste, autofill, and password managers, and reject common, expected, or known
  compromised whole-password values without mandatory character-class rules.
- Give Brazilian Portuguese, accessible, non-color-only guidance that shows
  which objective requirements are satisfied and treats any strength meter as
  advisory rather than a security guarantee.
- Create a reusable React Email auth layout and dedicated invitation,
  verification, and password-reset templates based on the selected Studio
  visual language and adapted to TRIAD navy/gold branding.
- Render HTML and plain text from the same template input while preserving the
  existing Resend transport, retry bounds, and sanitized failure behavior.
- Provide deterministic local previews and tests that never require or expose
  real recipients, tokens, passwords, provider keys, or production links.

## Non-Goals

- Public self-registration or weakening the existing active-user/pending-
  invitation gate.
- Replacing Better Auth password hashing, account, session, verification, or
  reset-token implementations.
- Migrating from Better Auth's current native password hash. Any future
  Argon2id migration requires compatibility and rehash-on-login design.
- Mandatory uppercase, lowercase, number, or symbol composition rules;
  periodic password rotation; security questions; or password hints.
- MFA, passkeys, magic links, email OTP, additional social providers, email
  changes, or account deletion.
- A generic notification framework, marketing campaigns, social links,
  unsubscribe controls, remote marketing imagery, or open/click tracking.
- Replacing the current Resend REST transport with a new provider or SDK.
- The durable authentication-email queue, workers, and provider-independent
  async delivery owned by ENG-39.
- Product/business invitations, organization membership, tenancy, or
  authorization rules outside the identity boundary.
- New audit tables, canonical request logs, or broad tracing infrastructure.

## Brainstorm

### Problem Framing

- The real workflow is not merely “send a nicer email.” It is proving that the
  invited person controls the mailbox, letting that person establish a strong
  credential, and communicating each security action consistently.
- The affected user is an invited owner, manager, or staff member completing
  first access, plus any active user resetting or changing a password.
- The operator needs revocation, expiry, resend, and deterministic diagnosis
  without gaining access to raw invitation secrets.
- The implementation must keep invitation policy in IDP, browser presentation
  in Studio, and all password cryptography in Better Auth.

### Gaps And Unknowns

- Product gaps:
  - Final Portuguese subject lines and body copy need review during
    implementation, but the intent and safe fallback copy are defined here.
  - The selected Studio example includes marketing imagery and social/footer
    content that do not belong in transactional authentication messages.
- Technical gaps:
  - The current Better Auth version must be spiked to confirm the narrowest
    supported way to carry request-scoped invitation proof into
    `/sign-up/email` without persisting that proof as a user field.
  - Better Auth database hooks currently find and consume invitations by email;
    implementation must prove request context and transaction/concurrency
    behavior before relying on those hooks for token consumption.
  - The IDP package currently compiles `.ts` only and has no React Email/React
    runtime dependency, so JSX compilation and local preview wiring are new.
  - Password rules are repeated in Studio schemas. A public runtime policy
    endpoint would remove duplication but would add a network dependency to
    every password form.
- Data/model gaps:
  - `idp_invitations` has no token digest, issue timestamp, consumed token
    marker, or unique token lookup index.
  - Existing pending invitations cannot be safely upgraded because their raw
    invitation secret never existed; they need invalidation and reissue.
  - Concurrent acceptance attempts must yield exactly one accepted invitation
    and at most one credential/user outcome.
- Operational gaps:
  - Resending must rotate the secret and make the previous link unusable.
  - Provider failure after invitation creation must not tempt the system to
    store or print a recoverable raw token.
  - Final deliverability and email-client verification require configured test
    environments; automated tests must use deterministic senders.

### Counterpoints

- Keeping email-only first access is simpler, but it proves knowledge of an
  address rather than control of the mailbox and leaves a credential-claiming
  race open.
- Reusing Better Auth email verification after password creation would avoid a
  custom invitation secret, but still creates a credential for an unproven
  claimant and adds a redundant second email/click for the intended recipient.
- A custom endpoint that hashes and persists passwords directly would simplify
  the invitation transaction, but would duplicate Better Auth security and
  migration behavior. The accepted path keeps native credential creation and
  adds only the smallest invitation-proof seam.
- The originally requested uppercase/lowercase/symbol checklist is familiar,
  but NIST explicitly rejects composition requirements and favors length,
  blocklists, rate limiting, and usable guidance. TRIAD should not ship a
  weaker predictable-composition policy for familiarity.
- Calling a remote breach API for every password could provide a larger live
  corpus, but adds a privacy-sensitive external dependency and an availability
  failure to credential creation. A bounded, reviewed server-side blocklist
  loaded once is the safer initial choice.
- Fetching password policy from the IDP would eliminate duplicated display
  constants, but makes rendering forms depend on another request. Keep the IDP
  authoritative, mirror the stable public limits in Studio, and add contract
  parity tests/documentation.
- Copying the full React Email Studio example would be fast, but marketing
  imagery, social links, and unsubscribe content distract from a security
  action. Reuse layout cues, not the marketing message.

### Options

| Option | Description                                                                                                                   | Pros                                                                          | Cons                                                                         | When To Choose                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| A      | Keep email-only invitation lookup and restyle existing strings                                                                | Lowest implementation effort                                                  | Does not close the invitation-claim vulnerability or align policy            | Do not choose                       |
| B      | Add hashed invitation proof, native Better Auth credential creation, modern password policy, and shared React Email templates | Closes the security gap while preserving app boundaries and current transport | Requires one migration, a Better Auth integration spike, and cross-app tests | Recommended                         |
| C      | Replace invite/signup/reset with a custom identity implementation                                                             | Maximum control                                                               | Duplicates vendor security, increases migration and maintenance risk         | Do not choose                       |
| D      | Adopt a hosted identity/email platform for the whole lifecycle                                                                | Could externalize operations                                                  | Large vendor, data, UI, and migration decision beyond these gaps             | Revisit only as a separate strategy |

### Recommendation

Choose Option B as one cohesive delivery.

Generate each email/password invitation secret with a cryptographically secure
random source using at least 256 bits of entropy. Place the URL-safe raw value
only in the outbound `/accept-invitation?token=...` link, persist only a
deterministic cryptographic digest, and compare digests without logging the
raw value. Bind the digest to exactly one pending invitation, expiry, invited
email, role, and lifecycle state. Resend rotates the token; acceptance and
revocation make it unusable.

Start implementation with a focused Better Auth spike. Prefer a supported
before-hook/plugin seam that validates request-scoped proof for
`/sign-up/email`, then let Better Auth perform the native signup and password
hashing. If the installed Better Auth version cannot safely carry that proof,
use one narrow IDP-owned exchange/acceptance route that delegates credential
creation to Better Auth; do not reimplement hashing, verification, session, or
account persistence. Record the chosen seam and concurrency evidence before
the migration is treated as complete.

Treat a successfully consumed invitation link as mailbox proof for password
first access, so the user is not forced through a second verification email.
Do not automatically sign the user in after password creation; show success and
return to normal login. Google first access continues to rely on Google's
verified-email proof and the existing pending-invitation policy.

Use 15 to 256 characters, Unicode and spaces, no mandatory composition, and a
reviewed local whole-password blocklist in the IDP. Keep Better Auth's native
hash unchanged. Studio mirrors the public length limits for immediate feedback,
while server enforcement remains authoritative on every password-setting path.

Create an IDP-owned `AuthEmailLayout` and three focused React Email templates.
Use the selected Studio reference for its centered container, clear hierarchy,
single primary CTA, and quiet footer; replace its marketing content with TRIAD
transactional copy, literal email-safe navy/gold colors, a text/owned-brand
header, and no third-party images. Render both HTML and plain text from the same
component input and keep the current transport/provider boundary unchanged.

## Architecture And Boundaries

- Site impact: none.
- API impact: none. `apps/api` does not proxy or own identity flows.
- IDP impact:
  - Generate, hash, validate, rotate, revoke, expire, and consume invitation
    proof.
  - Enforce password policy on signup, reset, and change-password paths.
  - Keep Better Auth mounted directly at `/api/auth/*` and authoritative for
    credentials and sessions.
  - Own React Email templates, rendering, transport integration, and sanitized
    delivery behavior.
  - Expose only the smallest invitation-resolution/acceptance contract needed
    by Studio, documented in non-production OpenAPI when it is a custom route.
- Studio impact:
  - Add `/accept-invitation` and reuse the existing auth visual shell with a
    dedicated set-password form and outcome states.
  - Add shared password guidance to invitation, reset, and preferences forms.
  - Keep UI copy and validation messages in Brazilian Portuguese.
- Data/persistence impact:
  - Add an invitation token digest and issuance metadata with a unique bounded
    lookup index; never persist the raw secret.
  - Migrate legacy pending invitations to a state that requires secure reissue.
  - Preserve soft lifecycle states and accepted/revoked history.
- External provider impact:
  - Resend remains the delivery provider and existing credentials/env mapping
    remain unchanged unless React Email preview tooling needs a safe local-only
    command.
  - No remote password-check or image provider is added to the request path.

## Invitation Experience Contract

- Invitation messages contain one CTA to a fixed, configured Studio origin and
  `/accept-invitation` path with only the opaque token in the query string.
- The acceptance page validates the token through IDP before showing the form,
  presents the invited account context without exposing unnecessary identity
  data, and never accepts an editable email as proof.
- The set-password form includes password, confirmation, accessible guidance,
  submit loading, and stable error/success states.
- Malformed, expired, revoked, already-used, and superseded links produce safe
  Brazilian Portuguese outcomes with a path to request operator assistance or
  a new invitation; they do not reveal other accounts or invitations.
- Successful acceptance consumes the token once, activates the invited
  identity with the invitation role, records acceptance, marks mailbox proof,
  and returns the user to login without creating an automatic session.
- Repeated or concurrent submissions cannot create duplicate users,
  credentials, accounts, or accepted invitations.
- Resend creates a new secret and invalidates the previous link. Provider
  failure is reported without returning or logging the raw value.
- Link pages and responses use a no-referrer policy where supported; tokens are
  excluded from analytics, breadcrumbs, error reports, logs, screenshots, and
  browser persistence.

## Password Policy And Guidance Contract

- IDP accepts passwords from 15 through 256 Unicode characters and does not
  trim, truncate, or require character classes.
- Paste, autofill, password managers, reveal/hide controls, and spaces remain
  supported; `autocomplete="new-password"` is used when establishing a secret.
- IDP checks the complete proposed password against a reviewed blocklist of
  common, compromised, and TRIAD/context-specific values on signup, reset, and
  change. It never checks or transmits substrings to a remote provider.
- Only objective requirements receive pass/fail indicators. The visible guide
  covers minimum length, non-common/non-predictable guidance, and confirmation
  matching. An optional strength meter is advisory and cannot override server
  policy.
- Status uses icon/text and not color alone, is associated with the password
  field, and avoids announcing every keystroke through an overly chatty live
  region.
- Server messages are mapped to actionable Brazilian Portuguese copy without
  echoing password content or revealing account existence.

## Authentication Email Contract

- One reusable layout defines email-safe colors, typography, spacing, preview
  text, content width, CTA, fallback URL, and quiet security footer.
- Separate invitation, verification, and password-reset templates define only
  their flow-specific subject, preview, body, CTA, expiry/help copy, and URL.
- Every template produces semantic HTML and meaningful plain text from the same
  trusted props; URLs are validated against configured origins before render.
- The message includes a visible fallback URL when the button cannot be used
  and makes expiry/non-request guidance clear.
- The templates contain no password, cookie, session, provider key, raw HTML
  injection, tracking pixel, third-party image, marketing list, social link, or
  unsubscribe treatment.
- Local preview uses fixed synthetic recipients, dates, and non-secret example
  URLs. Copied source retains any required MIT attribution.

## Performance And Scalability

- Expected data growth:
  - Invitations grow with users and resends; lifecycle history remains soft and
    lookup is bounded by token digest or indexed email/status.
  - Password blocklist size is bounded and loaded once per process, not scanned
    from disk or fetched remotely per request.
- Critical paths:
  - Token resolution, signup, reset, and change password are latency- and
    availability-sensitive; password hashing remains the dominant deliberate
    cost and must not be duplicated.
  - Email rendering occurs once per attempted delivery and must not add
    unbounded asset or network fetches.
- Query bounds/pagination:
  - Token lookup returns at most one invitation through a unique digest index.
  - Existing administrative invitation lists retain bounded pagination.
- Concurrency risks:
  - Acceptance uses a transaction/lock or equivalent conditional update so
    only one concurrent claimant can consume a pending invitation.
  - Resend and acceptance races must have a deterministic winner and cannot
    reactivate an older token.
- External limits:
  - Preserve current bounded Resend timeouts/retries and idempotency behavior;
    durable queuing remains ENG-39.
- What happens with millions of records/items:
  - Digest and lifecycle indexes keep acceptance independent of table scans.
  - Expired invitation retention/cleanup may require a future operational
    policy, but no unbounded cleanup is added to the request path.

## Security, Privacy, And Abuse

- Auth/session impact:
  - Invitation possession authorizes only credential establishment for the
    bound invitation; it is not a reusable login or session credential.
  - Password reset continues revoking existing sessions and returning
    enumeration-safe responses.
  - No automatic login follows invite acceptance or password reset.
- Roles/access:
  - Role comes only from the accepted invitation; the client cannot submit or
    override it.
  - Existing users and verified Google identities remain governed by ENG-38.
- PII/secrets:
  - Raw invitation, verification, and reset tokens and password values never
    enter persistence, logs, analytics, telemetry, snapshots, URLs other than
    their required one-time action link, or Linear evidence.
  - Email addresses are not added to invitation URLs and are minimized in UI
    responses.
- Spam/abuse vectors:
  - Preserve or tighten per-route rate limits for invitation resolution,
    acceptance, resend, signup, verification, reset request, and reset submit.
  - Responses do not provide a new account/invitation enumeration oracle.
- Link security:
  - Use HTTPS outside local development, configured allowlisted origins,
    single-use expiry, token rotation, and `Referrer-Policy: no-referrer` on the
    acceptance surface.

## Accessibility And UX

- Keyboard flow:
  - All controls are native or established accessible primitives, work without
    drag/cognitive tests, preserve visible focus, and allow paste/autofill.
- Screen reader states:
  - Labels, requirements, errors, loading, expired-link, and success states are
    programmatically associated; the first invalid field receives focus after
    submit.
  - Password indicators use text/icons in addition to color and avoid
    per-keystroke assertive announcements.
- Responsive behavior:
  - Acceptance and password forms reuse the existing auth shell and remain
    usable at 200% zoom and narrow mobile widths without clipped guidance.
  - Email content uses a bounded responsive container and readable fallback
    links across major clients.
- Loading/error/empty states:
  - Token validation has an explicit loading state; invalid/expired/revoked/
    used links are terminal result states rather than empty forms.
  - Provider-delivery and network failures offer safe retry guidance without
    exposing account existence or tokens.
- Duplicate submission prevention:
  - Buttons retain stable labels, use loading/disabled semantics, and the server
    remains idempotent/single-use under repeat or concurrent requests.

## Logging And Observability

- Useful structured events:
  - Reuse the existing sanitized authentication-email failure event pattern and
    add only bounded outcome categories if needed for invitation operations.
  - Do not add broad canonical request logs, audit tables, or tracing spans.
- Metrics:
  - Track aggregate delivery failures and invitation outcomes only when the
    existing runtime has an accepted sink; otherwise keep testable observer
    seams and defer durable telemetry.
- Traces/spans:
  - None added in this initiative.
- Alerts:
  - Durable provider-delivery alerting remains part of ENG-39; document manual
    verification and failure diagnosis for this task.
- Sensitive data that must not be logged:
  - Passwords, token values/digests, email addresses, cookies, sessions,
    authorization headers, rendered email bodies, full action URLs, provider
    keys, and private request headers.

## Acceptance Criteria

- [ ] A newly created email/password invitation sends a React Email invitation
      with a cryptographically strong opaque link to the dedicated Studio
      acceptance route.
- [ ] IDP persists only a unique token digest and lifecycle metadata; raw
      invitation tokens never appear in persistence or logs.
- [ ] Valid invitation proof is required for email/password first access, bound
      to one invitation/email/role, and consumed exactly once under concurrent
      submissions.
- [ ] Expired, revoked, used, superseded, malformed, and legacy pending
      invitations cannot create credentials; resend rotates the secret.
- [ ] Successful invite acceptance proves mailbox control, creates the
      Better Auth credential through a supported native integration seam,
      records acceptance, and returns to login without auto-sign-in.
- [ ] Existing active-user login and verified-Google invitation acceptance keep
      their ENG-38 behavior without requiring the email invitation token.
- [ ] IDP enforces 15 to 256 characters plus whole-value common/compromised/
      context blocklist checks on signup, reset, and change password, with no
      mandatory composition rule and no password-hash migration.
- [ ] Invitation, reset, and preferences password forms use consistent
      Brazilian Portuguese guidance, accessible objective indicators,
      confirmation feedback, paste/autofill, and password-manager semantics.
- [ ] A reusable React Email layout and invitation, verification, and reset
      templates render safe semantic HTML and matching plain text with TRIAD
      styling and no marketing/tracking content.
- [ ] Local email preview uses synthetic non-secret data; template and sender
      tests cover escaping, URL allowlisting, fallback text, and transport
      payloads without snapshotting live secrets.
- [ ] IDP migration, env parsing, access policy, rate limiting, invitation
      lifecycle, Better Auth integration, Studio route/forms, accessibility,
      responsive behavior, email-client rendering, and production boundaries
      are verified and documented.
- [ ] ENG-39 remains the explicit follow-up for durable async email delivery;
      this task neither duplicates nor silently closes it.

## Verification Plan

- Unit tests:
  - Token generation/digest, expiry, rotation, revocation, one-time
    consumption, blocklist policy, password error mapping, template escaping,
    HTML/plain-text parity, URL validation, and sanitized observer behavior.
- Integration/API tests:
  - Better Auth signup/reset/change paths; valid/invalid/concurrent invite
    acceptance; legacy invitation migration; Google first access regression;
    route rate limits; Resend payload/idempotency/retry behavior with fakes.
- UI tests:
  - Acceptance route states, password indicators and confirmation, loading,
    duplicate submit, focus/error associations, paste/autofill attributes, and
    reset/preferences parity.
- Manual/browser checks:
  - Keyboard-only, VoiceOver or equivalent, 200% zoom, narrow viewport, light/
    dark auth shell, expired/revoked/used links, resend rotation, and no token in
    console/network diagnostics beyond the required request.
  - Preview and test invitation/verification/reset messages in Gmail, Outlook,
    and Apple Mail or the available provider preview tooling, including images
    disabled and plain-text mode.
- Build/check commands:
  - `bun --filter idp db:generate`
  - `bun --filter idp check`
  - `bun --filter idp build`
  - `bun --filter idp test`
  - `bun --filter studio routes:generate`
  - `bun --filter studio check`
  - `bun --filter studio build`
  - `bun --filter studio test:e2e -- tests/e2e/auth-lifecycle.spec.ts`
  - `bun run test:ci` when env schema or deployment mapping changes
  - `git diff --check`

## Open Questions

- [x] Should composition rules be required? No. Use 15-character minimum,
      256-character maximum, whole-password blocklist, rate limiting, and
      accessible guidance per current NIST guidance.
- [x] Should invitation-link possession replace a second verification click?
      Yes, only when the token is valid and atomically consumed for its bound
      invitation.
- [x] Should the selected React Email template be copied wholesale? No. Reuse
      its visual hierarchy and adapt it to focused transactional messages.
- [x] Should a remote compromised-password provider be called in the auth
      request path? No. Start with a bounded reviewed local blocklist and record
      its source/update process.
- [ ] Which supported Better Auth request-proof seam is proven by the initial
      implementation spike? Record the result in the execution plan before
      persistence work is finalized; this does not change the product contract.
