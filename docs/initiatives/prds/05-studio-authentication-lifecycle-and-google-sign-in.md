# 05 TRIAD Studio Authentication Lifecycle And Google Sign-In

## Summary

Complete the invite-gated TRIAD Studio authentication lifecycle before more
product modules depend on it. The initiative adds Google sign-in, safe
same-email account linking, email verification, complete forgot/reset/change
password journeys, and account-method controls in authenticated preferences.

The IDP remains the owner of identity, access policy, provider configuration,
credentials, account records, sessions, and transactional authentication
email. Studio owns the user-facing routes and reuses the existing login visual
shell while rendering a dedicated central form or result state for each flow.

## Context

- Current state:
  - Better Auth email/password, persisted sessions, invitation-gated user
    creation, reset-token generation, and reset email delivery already exist in
    `apps/idp`.
  - Studio can request a password reset from the login form, but the reset link
    returns to `/login`; there is no route that reads the token and submits the
    new password.
  - Password-reset delivery is coupled to
    `IDP_INVITATION_EMAILS_ENABLED`, and reset/invitation email transport code
    is duplicated.
  - Studio has one combined login/first-access form and no Google provider,
    email-verification result, password-change UI, or connected-account UI.
  - Better Auth currently emits the default secure session cookie as
    `__Secure-better-auth.session_token`. ENG-36 proposes the separate
    `__Secure-triad-dev-partitioned.session_token` namespace for the deployed
    cross-site `dev` topology so the server ignores the legacy unpartitioned
    cookie.
  - `idp_users.email` is unique and Better Auth already persists multiple
    authentication methods in `idp_accounts`.
- Problem:
  - Users cannot complete self-service password recovery even though the IDP
    starts the flow.
  - Users cannot use Google or understand which sign-in methods are attached to
    their TRIAD identity.
  - Adding Google without an explicit linking and invitation policy could
    create duplicate identities, open self-registration, or enable account
    takeover.
  - The current email/password first-access flow does not require email
    verification, so possession of an invited email address is not proven
    before a session can be created.
- Why now:
  - Authentication is a critical dependency for every authenticated Studio
    capability and should be made production-capable before more product work
    expands its blast radius.
  - The current login shell is stable enough to support route-specific auth
    forms without a visual redesign.
  - Google OAuth and account-linking decisions affect environment manifests,
    provider setup, persistence integrity, security tests, and preferences;
    they should not be introduced as an isolated button.
- Related docs/issues:
  - `docs/idp/conventions.md`
  - `docs/idp/deployment.md`
  - `docs/idp/operations.md`
  - `docs/studio/conventions.md`
  - `docs/studio/component-system.md`
  - [Linear initiative: TRIAD Studio Authentication Lifecycle and Google Sign-In](https://linear.app/corvi-io/initiative/triad-studio-authentication-lifecycle-and-google-sign-in-0d0dc88ddf75)
  - [ENG-38: Complete TRIAD Studio authentication lifecycle and Google sign-in](https://linear.app/corvi-io/issue/ENG-38/complete-triad-studio-authentication-lifecycle-and-google-sign-in)
  - [ENG-39: Add durable queue for IDP transactional authentication emails](https://linear.app/corvi-io/issue/ENG-39/add-durable-queue-for-idp-transactional-authentication-emails)
  - [ENG-36: Fix dev login when the browser blocks the IDP session cookie](https://linear.app/corvi-io/issue/ENG-36/fix-dev-login-when-the-browser-blocks-the-idp-session-cookie)

## Goals

- Let an existing active user or a user with a valid pending invitation sign in
  with Google without opening public self-registration.
- Resolve a verified Google identity with the same normalized email to the
  existing TRIAD user and preserve one user, role, invitation, and business
  identity.
- Provide complete email/password first access, verification, forgot password,
  reset password, authenticated password change, and sign-out journeys.
- Use Better Auth and the existing IDP as the first and authoritative
  implementation path for every in-scope identity capability; add custom code
  only for a documented vendor gap or a TRIAD-specific access policy.
- Reuse the existing login page shell while giving each auth journey a stable
  route, focused form, browser history, loading state, and error handling.
- Add a `Segurança e acesso` area to authenticated preferences where users can
  inspect and manage email/password and Google sign-in methods safely.
- Make auth email delivery and Google credentials explicit, target-aware, and
  safe in local, `dev`, `hml`, and `prd` environments.
- Treat Google sign-in and transactional auth email as mandatory baseline
  capabilities in every deployed environment, without runtime feature flags or
  a reduced production mode.
- Replace vendor-branded auth cookie names with a stable TRIAD-owned namespace
  while preserving secure/partitioned topology distinctions and an explicit
  session migration.

## Non-Goals

- Public self-registration or access for an unknown email without a valid
  pending invitation.
- Google Workspace domain restriction; any Google account is eligible only
  after the TRIAD invitation/existing-user policy allows its email.
- Linking a Google identity whose email differs from the TRIAD user email.
- Microsoft, Apple, GitHub, SAML, enterprise SSO, passkeys, magic links, MFA,
  phone authentication, or passwordless login.
- Google Calendar, Drive, Gmail, offline access, refresh-token-dependent
  features, or scopes beyond identity (`openid`, `email`, and `profile`).
- User email changes, account deletion, identity administration, role editing,
  active-session management UI, or business-domain authorization.
- Custom OAuth endpoints or wrappers around Better Auth `/api/auth/*` routes.
- Custom stripping, encryption, or vendor-internal handling of persisted Google
  `idToken`; ENG-38 accepts Better Auth `1.6.23` native persistence behavior.
- In-process verification-email detachment or a durable delivery queue. ENG-39
  owns provider-independent asynchronous transactional-auth-email delivery.
- Custom password hashing, verification/reset tokens, session machinery,
  account-linking algorithms, or duplicate user/account persistence when Better
  Auth already owns the capability.
- A Google-disabled deployment mode, runtime Google feature flag, or release
  that is considered complete without working Google sign-in.
- Removing `HttpOnly`, `Secure`, `SameSite`, `Partitioned`, origin, CSRF, or
  browser cookie-prefix protections to simplify naming.
- Long-lived dual support for legacy and new session cookie names or exposing
  session values to browser JavaScript for client-side migration.
- Inventing legal/privacy copy; any provider-required public content must be
  supplied or approved by the responsible product/legal owner and delivered as
  part of the production-capable initiative.

## Market And Vendor Research

Research snapshot: 2026-07-21.

| Source                                                                                                                              | Current Behavior Or Guidance                                                                                                                                                                                              | TRIAD Implication                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Better Auth users and accounts](https://better-auth.com/docs/concepts/users-accounts)                                              | Supports multiple provider accounts per user, automatic same-email linking for verified/trusted providers, explicit `linkSocial`, account listing/unlinking, and protection against unlinking the last method by default. | Use Better Auth account primitives directly; keep implicit same-email Google linking and expose explicit controls in preferences.                            |
| [Better Auth Google provider](https://better-auth.com/docs/authentication/google)                                                   | Uses a server-side OAuth callback and requires exact provider credentials/base URL configuration. Additional Google scopes are optional and separate from sign-in.                                                        | Configure Google only in IDP, register the exact IDP callback, and request identity scopes only.                                                             |
| [Better Auth email/password](https://better-auth.com/docs/authentication/email-password)                                            | Provides email verification, request/reset password, token validation, session revocation on reset, and authenticated password change.                                                                                    | Finish the browser routes around native Better Auth methods instead of creating custom password endpoints.                                                   |
| [Better Auth cookies](https://better-auth.com/docs/concepts/cookies)                                                                | Uses `${prefix}.${cookie_name}`, defaults the prefix to `better-auth`, supports `advanced.cookiePrefix`, and automatically applies secure cookie behavior.                                                                | Configure a TRIAD-owned prefix for the complete Better Auth cookie family instead of overriding only the session cookie name.                                |
| [Clerk account linking](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking)                 | Automatically links matching verified emails and adds additional proof when the pre-existing email is unverified.                                                                                                         | Same-email auto-linking is a familiar market pattern, but TRIAD must verify password-created emails and keep the invitation gate.                            |
| [Auth0 account linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking)                                     | Emphasizes that unsafe linking can cause account takeover and recommends authenticating both identities for manual linking.                                                                                               | Manual linking belongs behind an authenticated preferences flow; different-email linking remains disabled.                                                   |
| [OWASP forgot-password guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)                   | Recommends uniform responses, side-channel delivery, random single-use expiring tokens, HTTPS reset URLs, rate limiting, and no account lockout during recovery.                                                          | Preserve enumeration-safe copy/timing, bounded tokens, trusted redirect origins, throttling, and session revocation.                                         |
| [Google OAuth production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance) | Recommends separate testing/production projects, minimal scopes, owned domains, secure redirect URIs, accurate branding, and public home/privacy information.                                                             | Make these provider requirements part of delivery, with mandatory credentials/configuration in every deployed target rather than a disabled production mode. |

## Brainstorm

### Problem Framing

- We are completing a reliable identity journey, not merely adding a Google
  button.
- Invited owners, managers, and staff are affected whenever they first enter,
  forget a password, change credentials, switch to Google, or lose access to a
  method.
- The improved workflow lets a user recover access without administrator
  intervention and use either verified Google or password credentials while
  retaining the same TRIAD identity.
- Operationally, the initiative makes provider provisioning, email delivery, and
  failure diagnosis explicit before auth becomes a dependency for more modules.

### Gaps And Unknowns

- Product gaps:
  - Approved public homepage, privacy-policy, and support URLs for the Google
    production consent screen must be supplied or approved during execution if
    the provider requires changes to the current public site.
  - Final Portuguese auth copy and email content need product review, but can
    start from the concrete contract in this PRD.
  - The preferences route currently contains only appearance settings and has
    no security/access information architecture.
- Technical gaps:
  - ENG-36 is merged at `5404d176b0aba05141aed52b1f2501adf3a82f33` and establishes
    the deployed Studio/IDP cookie and origin topology used by this initiative.
  - ENG-36 intentionally gives partitioned `dev` sessions a different prefix
    from the legacy Better Auth cookie; the final initiative must replace both
    vendor and environment-specific namespaces with the accepted TRIAD auth
    namespace without reintroducing ambiguous duplicate cookie names.
  - IDP and Studio declare compatible Better Auth ranges but should use the
    same resolved version during implementation and schema generation.
  - The current reset redirect points to `/login` and drops the dedicated reset
    experience required to consume the token.
  - Email delivery is duplicated and password reset is incorrectly controlled
    by an invitation-specific feature flag.
  - The current account schema must be compared with the Better Auth v1.6
    generated Drizzle contract before deciding whether a migration or provider
    uniqueness constraint is required.
  - Better Auth `1.6.23` encrypts persisted OAuth access and refresh tokens when
    `encryptOAuthTokens` is enabled, but persists `idToken` through its native
    unencrypted path. ENG-38 accepts that at-rest limitation without a custom
    adapter, stripping, or vendor-internal workaround.
  - Better Auth `1.6.23` awaits the configured sender for manual verification
    resend. ENG-38 does not detach that work in process; provider-independent
    asynchronous delivery belongs to the durable queue in ENG-39.
- Data/model gaps:
  - Existing `emailVerified = false` users need a staged verification policy so
    rollout does not silently strand them.
  - Concurrent OAuth callbacks or repeated link actions must not create
    duplicate provider-account rows.
  - Invitation acceptance semantics must remain correct for Google first access
    and for password first access that is awaiting email verification.
- Operational gaps:
  - Target-specific Google client IDs/secrets, exact callback URIs, consent test
    mode, and test users exist for `dev`, `hml`, and `prd`; deployed verification
    still depends on the remaining email and public-policy prerequisites.
  - `INFRA__RESEND_API_KEY`, `IDP__EMAIL_FROM`, and the final
    `IDP__STUDIO_URL` values remain absent from GitHub Environments.
  - Transactional email must be configured and verified in every deployed
    environment; automated tests use deterministic fake senders without a
    runtime email-disable flag.
  - ENG-39 is a Backlog follow-up related to ENG-38 and owns durable queue
    persistence, workers, retries, provider-independent response timing, and
    delivery observability for IDP transactional authentication emails.
  - Provider outage, user cancellation, invalid/expired tokens, and email
    delivery failure need runbook-level behavior.

### Counterpoints

- A Google button alone is quick, but does not define invitation gating,
  duplicate identity prevention, verified-email requirements, recovery, or
  provider operations.
- A single component that swaps every auth form through local state would reuse
  markup, but would weaken deep links, browser history, token URLs, focus
  restoration, refresh behavior, and route-level tests. Reuse the visual shell
  and keep journey forms/routes separate.
- Disabling implicit linking and requiring every existing user to link Google
  from preferences is safest in isolation, but creates avoidable friction for
  verified same-email users and fails the expected "continue with Google"
  behavior. TRIAD can safely auto-link only trusted Google same-email identities
  while keeping manual different-email linking disabled.
- Automatically linking any provider or allowing different emails is flexible,
  but expands account-takeover risk and identity ambiguity. Only Google is
  trusted in this scope, and only an exact normalized email match is allowed.
- Keeping password first access unverified is simpler, but an invitation row
  proves eligibility, not mailbox possession. Verification should be required
  before password authentication creates a usable session.
- Building custom IDP password routes would give UI-specific control, but would
  duplicate Better Auth token and session security. Use the mounted Better Auth
  contract directly.
- Adding MFA, passkeys, or a provider-agnostic connection framework now would
  make the system more extensible, but it would increase schema, recovery, UX,
  and operational scope without a validated near-term need.

### Options

| Option | Description                                                                                                                                        | Pros                                                              | Cons                                                                         | When To Choose                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| A      | Add only a Google button and keep the current combined form                                                                                        | Lowest initial effort                                             | Leaves recovery incomplete and account/invitation policy implicit            | Do not choose                                       |
| B      | Use Better Auth native lifecycle methods, verified same-email Google linking, route-specific forms in the existing shell, and preferences controls | Completes current needs with bounded architecture and familiar UX | Requires IDP, Studio, env, email, migration audit, and provider setup work   | Recommended                                         |
| C      | Disable implicit linking and require authenticated manual linking for every Google account                                                         | Strongest explicit proof for linking                              | Existing users cannot use Google until they first recover/use their password | Use only if product rejects same-email auto-linking |
| D      | Build a provider-agnostic identity-management platform with MFA/passkeys/SSO                                                                       | Strong long-term extensibility                                    | Premature complexity and broader recovery/security surface                   | Revisit after validated enterprise requirements     |

### Recommendation

Choose Option B.

Keep Better Auth mounted directly and configure Google as the only trusted
social provider. Allow implicit linking only when Google returns the same
normalized email, keep `allowDifferentEmails` and unlink-all behavior disabled,
and do not overwrite the local user profile during linking. Existing active
users and valid pending invitees may use Google; unknown and disabled users may
not establish a session.

Require email verification for password-created access, preserve the generic
forgot-password response, and use Better Auth's reset/change password methods.
Extract a shared Studio auth shell from the existing login page, then compose
separate `/login`, `/forgot-password`, and `/reset-password` route screens.
Preferences receives a bounded `Segurança e acesso` section for password
actions and connected Google state.

### Native Capability First

- Treat Better Auth as the authentication engine and the IDP as the identity
  boundary. Mount Better Auth directly at `/api/auth/*` and prefer its current
  server/client APIs, configuration, hooks, adapter contracts, generated
  schema, cookies, security checks, and supported plugins over parallel TRIAD
  implementations.
- For this initiative, use the native capabilities for email/password sign-in,
  email verification and resend, password-reset request/completion,
  authenticated password change, Google social sign-in, verified same-email
  implicit linking, explicit `linkSocial`, account listing/unlinking, session
  lookup/revocation, secure cookies, CSRF/origin checks, and rate limiting.
- Keep custom IDP code limited to TRIAD-owned policy and integration seams:
  active/disabled user status, the valid-pending-invitation gate, invitation
  role preservation, UUIDv7 and `idp_` mappings, runtime validation,
  transactional email transport/templates, and safe product-facing error
  mapping. Implement these through documented Better Auth hooks and adapters
  wherever the contract supports them.
- A thin typed Studio adapter may delegate to the Better Auth client to keep
  module boundaries and stable UI error categories. It must not recreate an
  auth endpoint, token format, session store, linking algorithm, or security
  check.
- Do not replace a secure Better Auth default merely to make the implementation
  look more TRIAD-specific. Any exception requires a written gap record naming
  the resolved Better Auth version and API evaluated, why it cannot satisfy the
  requirement, the smallest extension point, security/maintenance tradeoffs,
  tests, and explicit approval in ENG-38 before implementation.
- "Native first" applies to the approved scope; it does not implicitly enable
  out-of-scope features such as email change, account deletion, MFA, passkeys,
  organization management, or an active-session UI.

### Final Engineering Decisions

- ENG-38 keeps Better Auth `1.6.23` native OAuth token persistence. Access and
  refresh tokens use `encryptOAuthTokens`; persisted Google `idToken` does not.
  No custom stripping, encryption, adapter wrapper, or vendor-internal handling
  is part of this initiative.
- ENG-38 keeps the native manual verification-resend request behavior and does
  not add in-process detachment. The Studio result remains generic, but provider
  latency/failure can still affect the native IDP response.
- ENG-39, `Add durable queue for IDP transactional authentication emails`, is
  the Backlog follow-up for provider-independent asynchronous delivery. It owns
  durable enqueueing, workers, retries, shutdown safety, idempotent delivery,
  and operational visibility across invitation, verification, and reset email.

Adopt `triad-auth` as the stable Better Auth cookie prefix and
`triad-auth-partitioned` when the active browser topology requires a distinct
partitioned namespace. Keep Better Auth's cookie suffixes and the `__Secure-`
prefix that Better Auth applies and browsers enforce. Treat the rename as an
explicit session migration: revoke or expire affected server sessions, expire
the exact legacy cookie names where the browser permits it, and require a fresh
sign-in rather than attempting to
copy an HttpOnly token in Studio.

## Authentication Contract

### Access Matrix

| User State                                              | Email/Password First Access                           | Email/Password Sign-In                            | Google Sign-In                                  | Expected Result                                      |
| ------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Unknown email, no invitation                            | Rejected                                              | Rejected                                          | Rejected                                        | No user/session is created                           |
| Valid pending invitation                                | Account created, verification required                | Allowed only after verification                   | User/account created from verified Google email | Invitation role is preserved and one user exists     |
| Existing active user, matching email                    | Existing-account response                             | Allowed subject to verification/password          | Google account auto-links to the same user      | One user with multiple methods                       |
| Existing disabled user                                  | Rejected                                              | Rejected                                          | Session rejected                                | No product access                                    |
| Existing active Google-only user                        | Password can be established through the recovery flow | Allowed after password establishment/verification | Allowed                                         | One user with Google and optional credential account |
| Existing active credential user, different Google email | Not applicable                                        | Allowed                                           | Link rejected                                   | Different-email linking remains unavailable          |

### Account Linking Rules

- Configure only `google` as a social provider and trusted linking provider.
- Keep implicit linking enabled for an exact normalized same-email Google
  identity.
- Require the Google provider's verified email claim and reject missing email.
- Keep `allowDifferentEmails: false`, `allowUnlinkingAll: false`, and
  `updateUserInfoOnLink: false`.
- Preserve local `name`, `email`, `role`, `status`, and business identity when
  linking; Google profile data does not overwrite authoritative local fields.
- Let an authenticated user explicitly connect Google from preferences.
- Let a user disconnect Google only when another usable sign-in method remains;
  server behavior is authoritative even if UI state is stale.
- Treat duplicate/concurrent linking as an idempotent or conflict-safe outcome,
  never as a second TRIAD user.

### Password And Verification Rules

- Require email verification for password-created accounts before credential
  sign-in can establish a session.
- Provide a resend-verification action with enumeration-safe feedback and
  throttling.
- Request reset through `/forgot-password` with the same success copy whether
  the email exists or not.
- Redirect valid reset links to `/reset-password?token=...`; map invalid or
  expired links to a recoverable route state without exposing token details.
- Use a single-use token with the configured bounded expiry and never log or
  persist it outside Better Auth verification storage.
- Require and confirm a new password under the same IDP password policy.
- Revoke existing sessions after password reset, as the IDP already configures.
- Allow authenticated credential users to change password by providing the
  current password and choosing whether other sessions are revoked; default the
  Studio action to revoke other sessions.
- For a Google-only user, use the verified email recovery journey to establish
  a credential password rather than exposing Better Auth's server-only
  `setPassword` method to the browser.

### Cookie Namespace Contract

- Use Better Auth `advanced.cookiePrefix` so the complete auth cookie family,
  including temporary OAuth state cookies, receives the TRIAD namespace. Do not
  customize only `session_token` or parse cookies manually.
- Use these stable prefixes and resulting session-cookie names:

| Browser Topology                    | Better Auth Prefix       | Session Cookie                                  |
| ----------------------------------- | ------------------------ | ----------------------------------------------- |
| Local HTTP                          | `triad-auth`             | `triad-auth.session_token`                      |
| Standard HTTPS                      | `triad-auth`             | `__Secure-triad-auth.session_token`             |
| HTTPS requiring partitioned storage | `triad-auth-partitioned` | `__Secure-triad-auth-partitioned.session_token` |

- The topology, not the deployment environment name, determines whether the
  partitioned namespace is used. Do not embed `dev`, `hml`, or `prd` in the
  stable cookie prefix.
- Preserve `HttpOnly`, `Secure`, the accepted `SameSite` value, exact domain and
  path scope, and `Partitioned` only where the accepted topology requires it.
  The `__Secure-` prefix applied by Better Auth and enforced by browsers remains
  part of HTTPS cookie names.
- `__Secure-better-auth.session_token` is the legacy default namespace.
  `__Secure-triad-dev-partitioned.session_token` is the ENG-36 transitional
  partitioned `dev` namespace. They are separate cookie slots and their values
  must not be assumed equal, logged, copied, or compared.
- Better Auth reads the cookie name configured for the current auth instance.
  After cutover, legacy cookies are inert but may remain visible until expired
  or explicitly removed.
- Perform a coordinated namespace cutover:
  - revoke/expire affected database-backed sessions before a legacy namespace
    could become recognizable again;
  - expire only the known legacy cookie names for the matching IDP origin/path
    when browser policy permits;
  - require users to authenticate again;
  - do not add a broad cookie deletion, client-side token copy, or indefinite
    dual-read fallback.
- Verify email/password, Google OAuth state/callback, session refresh,
  verification/reset links, preferences account actions, sign-out, and
  full-release rollback under both standard and partitioned namespaces.

### Studio Routes And Composition

- Keep `/login` as the entry point for email/password sign-in, Google sign-in,
  invite-gated first access, verification notices, and provider callback errors.
- Add `/forgot-password` for reset requests and the generic sent state.
- Add `/reset-password` for valid token entry, invalid/expired token recovery,
  new-password confirmation, and success return to login.
- Extract the current split-screen brand/login structure into a shared auth
  shell. Each route supplies only its central title, description, form, result,
  and navigation actions.
- Keep authenticated password/method management inside `/preferences` under a
  separate `Segurança e acesso` section; do not create an IDP administration
  frontend.
- Keep the Google action visually equal to other login methods and comply with
  Google's sign-in branding requirements.

## Architecture And Boundaries

- Site impact:
  - No change is expected when the existing public site satisfies Google
    provider policy.
  - If Google requires approved public homepage, privacy-policy, or support
    content that does not exist, the required `apps/site` work and approved copy
    are part of completing this production-capable initiative rather than a
    reason to ship Google disabled.
- API impact: none. Business API routes, authorization, and persistence remain
  unchanged.
- IDP impact:
  - configure Google and account-linking policy in Better Auth;
  - keep invitation/access checks in IDP database/session hooks;
  - add email verification and consolidate auth transactional email delivery;
  - validate Google/email runtime configuration centrally;
  - keep Better Auth mounted directly at `/api/auth/*`;
  - compare/generate the Better Auth Drizzle schema and migration when needed;
  - enable native encryption for persisted OAuth access/refresh tokens, accept
    Better Auth `1.6.23` native `idToken` persistence, and request identity
    scopes only;
  - configure the stable TRIAD cookie prefix for standard and partitioned
    topologies and own the exact legacy-session migration.
- Studio impact:
  - extract the reusable auth shell;
  - add route-specific recovery/reset states and Google sign-in;
  - extend the narrow auth client with native Better Auth methods only;
  - add security/access preferences for change password and connected methods;
  - preserve `AuthGate`, private-route boundaries, theme behavior, and
    Brazilian Portuguese copy.
- Data/persistence impact:
  - reuse `idp_users`, `idp_accounts`, `idp_sessions`, and
    `idp_verifications`;
  - do not create a parallel social-account table;
  - audit provider/account uniqueness and add only constraints required by the
    Better Auth v1.6 contract and concurrency tests;
  - use Drizzle-generated migrations and preserve UUIDv7 IDs/table prefixes.
- External provider impact:
  - create separate Google Cloud OAuth configuration for non-production and
    production;
  - register exact callbacks derived from each IDP `BETTER_AUTH_URL`, ending in
    `/api/auth/callback/google`;
  - Marcus Gabriel owns creation/configuration of the OAuth apps and addition
    of target variables, secrets, keys, and provider metadata;
  - require working consent branding, domains, public policy URLs, credentials,
    and publishing state as delivery inputs for production functionality;
  - use the existing transactional email provider through a consolidated IDP
    transport.

## Environment Contract

- App runtime names remain IDP-local and are validated together:
  - `AUTH_GOOGLE_CLIENT_ID`
  - `AUTH_GOOGLE_CLIENT_SECRET`
  - `IDP_EMAIL_FROM`
  - `IDP_STUDIO_URL`
  - `IDP_RESEND_API_KEY`
  - `IDP_RESEND_API_URL` as a safe default unless target-specific behavior is
    proven necessary.
- Google and transactional auth email have no runtime enable/disable flags.
- `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `IDP_EMAIL_FROM`,
  `IDP_STUDIO_URL`, and `IDP_RESEND_API_KEY` are required runtime inputs; absent
  or partial configuration fails startup instead of omitting a requested auth
  method.
- Declare target-specific deployment sources in `env-schema.yaml` using:
  - `INFRA__GOOGLE_OAUTH_CLIENT_ID` for the provider identifier;
  - `INFRA__GOOGLE_OAUTH_CLIENT_SECRET` for the provider credential;
  - `IDP__EMAIL_FROM` and `IDP__STUDIO_URL` for app behavior;
  - `INFRA__RESEND_API_KEY` for the provider credential.
- Keep local `.env.example` values placeholder-only and document that functional
  local development requires valid developer credentials or the explicit test
  fakes used by automated tests. Never put Google or Resend secrets in
  Studio/Vite variables.
- Do not add a separate callback URL env value; Better Auth derives the exact
  callback from `BETTER_AUTH_URL`.

## Performance And Scalability

- Expected data growth:
  - users grow one bounded user row;
  - each user has a small bounded set of provider-account rows and sessions;
  - verification rows are short-lived and bounded by expiry/cleanup behavior.
- Critical paths:
  - email/password sign-in and session creation;
  - OAuth start/callback plus user/account lookup and optional link insert;
  - reset/verification token lookup and transactional email dispatch;
  - authenticated account listing in preferences.
- Query bounds/pagination:
  - user lookup remains bounded by unique normalized email;
  - provider-account lookup must be indexed/uniquely constrained according to
    the generated adapter contract;
  - preferences lists only the current user's bounded methods and needs no
    pagination;
  - no cross-user or unbounded identity listing is added.
- Concurrency risks:
  - repeated Google callbacks, double clicks, multiple tabs, and simultaneous
    explicit/implicit links can race on the same provider identity;
  - database constraints plus conflict-safe Better Auth behavior must prevent
    duplicate accounts/users;
  - UI busy states prevent avoidable duplicate submissions but are not the
    integrity boundary.
- External limits:
  - Google OAuth and transactional email availability/quotas are outside the
    process; failures must remain recoverable and not corrupt identity state;
  - request/reset/resend actions need bounded Better Auth rate limiting by
    IP/identifier without using account lockout.
- What happens with millions of users:
  - sign-in remains point lookup by indexed email/provider identifiers;
  - no auth request scans users, accounts, invitations, or sessions;
  - after ENG-39 delivers the durable queue, email delivery must not occupy the
    request path while waiting on provider latency;
  - expired verification cleanup becomes an operational maintenance concern,
    not a browser/API pagination concern.
- Do not claim throughput or concurrency capacity until load measurements exist.

## Security, Privacy, And Abuse

- Auth/session impact:
  - ENG-36's accepted secure cookie/origin topology is a prerequisite;
  - preserve HttpOnly/Secure behavior, origin/CSRF checks, OAuth state
    validation, and database-backed sessions;
  - treat cookie namespace changes as forced reauthentication and revoke legacy
    server sessions before rollback can recognize an old cookie again;
  - revoke sessions after reset and other sessions after authenticated password
    change by default.
- Roles/access:
  - Google never grants a role; existing user state or the pending invitation
    remains authoritative;
  - disabled users and unknown uninvited emails cannot create a usable session;
  - preferences manages only the current user's methods.
- PII/secrets:
  - email is identity PII and must not appear in provider/error logs;
  - Google client secret, OAuth tokens, password/reset/verification tokens,
    session cookies, Resend credentials, and private headers must never reach
    Studio bundles, logs, Linear, fixtures, or screenshots;
  - enable Better Auth encryption for persisted OAuth access and refresh tokens;
  - accept Better Auth `1.6.23` native persisted `idToken` behavior without
    claiming all-token encryption.
- Spam/abuse vectors:
  - reset and verification resend endpoints can be abused for enumeration or
    email flooding;
  - OAuth start/callback can be spammed or canceled repeatedly;
  - link/unlink actions can be double-submitted or attempted with stale state.
- Rate limiting or throttling needs:
  - configure/test bounded rate limits for sign-in, first access, reset request,
    verification resend, and OAuth initiation/callback;
  - return uniform reset/resend responses and avoid account lockout as a
    recovery defense;
  - do not expose raw Better Auth/provider/database error messages in UI.
- Build redirect and callback URLs from configured trusted origins; do not
  trust arbitrary query-string redirects or request Host headers.

## Accessibility And UX

- Keyboard flow:
  - every form has a logical heading, first field, submit action, and return
    link order;
  - route changes and validation failures move focus to the heading or first
    invalid field as appropriate;
  - Google, reset, resend, connect, disconnect, and password actions are native
    keyboard-operable controls with visible focus.
- Screen reader states:
  - use `role=status` for non-error progress/success and `role=alert` for
    actionable failures;
  - announce provider redirects, email-sent state, invalid/expired token state,
    password success, link/unlink result, and busy state without exposing email
    existence;
  - connected method name/status and disconnect availability are textual, not
    color-only.
- Responsive behavior:
  - preserve the current single-column auth shell below desktop and brand panel
    on large screens;
  - verify every auth state and preferences section at 320 CSS pixels, 200%
    zoom-equivalent width, light/dark/system themes, and mobile keyboard sizes.
- Loading/error/empty states:
  - keep button labels stable while loading and prevent duplicate actions;
  - distinguish user cancellation, provider unavailable, not invited,
    disabled, account conflict, invalid/expired token, delivery failure, and
    generic retry states with safe Brazilian Portuguese guidance;
  - an account with no Google link shows a clear connect action; a Google-only
    account shows how to establish a password.
- Duplicate submission prevention:
  - guard all local submissions and provider redirects;
  - keep server/database behavior idempotent or conflict-safe because browser
    guards are not authoritative.
- Forms support autofill, paste, password managers, `autocomplete` tokens, and
  show-password controls without blocking copied generated passwords.

## UX Copy Contract

- Primary Google action: `Continuar com o Google`.
- Forgot-password entry: `Esqueceu a senha?`.
- Reset request heading: `Recupere seu acesso`.
- Enumeration-safe reset result: `Se o e-mail estiver cadastrado, você
receberá as instruções para redefinir a senha.`
- Invalid/expired reset guidance: `Este link não é mais válido. Solicite uma
nova redefinição de senha.`
- Preferences section: `Segurança e acesso`.
- Connected method labels: `E-mail e senha` and `Google`.
- Keep every final source string in Brazilian Portuguese with proper accents.

## Logging And Observability

- Useful structured events:
  - do not introduce an auth audit table, canonical request log, or durable
    identity event stream in this MVP;
  - existing safe application logging may classify provider/delivery failures
    by operation, provider, environment, result, and request ID only;
  - never include email, name, role, user/account/session IDs, callback code,
    OAuth state, tokens, cookies, password fields, or private headers.
- Metrics:
  - if the existing platform exposes safe counters, measure OAuth callback
    success/failure class, email delivery success/failure, invalid reset-token
    outcomes, and rate-limit rejections without identity labels;
  - otherwise record manual/provider dashboard evidence and defer a telemetry
    foundation rather than adding one inside this initiative.
- Traces/spans: no new tracing spans in the IDP MVP.
- Alerts:
  - future alerts should cover sustained Google callback failures, email
    delivery failures, and rate-limit spikes after a metrics foundation exists;
  - provider dashboards remain an operational signal during this initiative.
- Sensitive data that must not be logged: credentials, passwords, PII,
  invitation/user payloads, OAuth authorization codes/state/tokens, reset or
  verification tokens, sessions/cookies, and private request/response headers.

## Delivery, Recovery, And Rollback

- Use the merged ENG-36 contract as the basis for deployed OAuth browser testing.
- Treat Google and transactional email as required while landing the schema,
  env, IDP, and Studio foundations; no runtime feature flag or Google-disabled
  production path is created.
- Verify the complete flow with test fakes locally, then with real target
  credentials in `dev`, `hml`, and `prd`. Environment order is verification
  sequencing, not staged feature enablement.
- A deployed target is not release-ready when Google, consent/callback setup, or
  transactional auth email is missing or nonfunctional.
- Recover from bad credentials by rotating/correcting the target values and
  redeploying, or roll back the entire release to a known-good version. Do not
  delete provider accounts or automatically unset Fly secrets.
- Coordinate the cookie namespace migration across local, `dev`, `hml`, and
  `prd`: revoke affected server sessions, expire only the known legacy names,
  deploy the accepted prefix, and require a fresh sign-in. A rollback must
  repeat session revocation/cleanup before restoring an older prefix.
- During a Google outage, keep email/password recovery usable and return a safe
  provider-unavailable state; do not remove Google from the product contract.
- If email verification rollout blocks existing credential users, keep a
  documented resend/recovery path; do not bypass verification or mark users
  verified without evidence.
- Provider-independent asynchronous auth-email delivery is not implemented by
  ENG-38. ENG-39 owns the durable queue; until it lands, manual verification
  resend retains Better Auth `1.6.23` provider-dependent latency/failure.

## Acceptance Criteria

- [x] ENG-36 is merged and its secure deployed Studio/IDP cookie/origin contract
      is the basis for OAuth verification.
- [x] Every in-scope auth operation delegates to a documented Better Auth
      configuration, API, hook, adapter, generated schema contract, or plugin;
      no duplicate auth endpoint, token/session mechanism, password primitive,
      or account-linking algorithm is introduced.
- [x] ENG-38 introduces no custom workaround for the two reviewed Better Auth
      `1.6.23` limitations; the accepted native `idToken` persistence and ENG-39
      queue ownership are recorded explicitly.
- [x] Google is configured only in IDP through validated target-aware env, uses
      exact Better Auth callback URIs and minimal identity scopes. Persisted
      access/refresh tokens use native encryption; `idToken` follows Better Auth
      `1.6.23` native persistence.
- [x] Google and transactional auth email are mandatory in local development
      and every deployed target, with no runtime enable/disable feature flags;
      missing required inputs fail startup or deployment validation.
- [x] Better Auth uses `triad-auth` for standard cookies and
      `triad-auth-partitioned` only for partitioned topology; no stable cookie
      namespace contains `better-auth` or an environment name.
- [ ] The cookie namespace migration revokes affected legacy sessions, expires
      only the known old cookie names where possible, requires fresh sign-in,
      and documents safe full-release rollback without logging/copying tokens.
- [ ] Unknown uninvited and disabled emails cannot create a Google or credential
      session; valid invitees preserve the invitation role.
- [ ] A verified Google identity with the same normalized email links to the
      existing user without creating a duplicate user or overwriting local
      profile/access fields.
- [x] Different-email linking and unlinking the last usable sign-in method are
      rejected by the server and represented correctly in Studio.
- [ ] Password-created access requires email verification, supports safe
      resend/retry states, and has an explicit migration/rollout path for
      existing unverified users.
- [x] `/forgot-password` returns enumeration-safe feedback and sends a bounded,
      trusted-origin reset link without blocking on provider latency.
- [x] `/reset-password` handles valid, invalid, expired, reused, success, and
      duplicate-submit states; successful reset revokes existing sessions.
- [x] Authenticated credential users can change their password from preferences
      with current-password proof and other-session revocation by default.
- [x] Google-only users can initiate the verified email flow to establish a
      password without a browser-exposed custom `setPassword` endpoint.
- [x] `/login`, `/forgot-password`, and `/reset-password` reuse one auth shell
      but own separate route/form/result behavior and accessible focus states.
- [x] `/preferences` exposes `Segurança e acesso`, current sign-in methods,
      Google connect/disconnect, password action, and safe loading/error states.
- [x] IDP auth email delivery is consolidated and no longer controlled by an
      invitation-specific flag. Automatic reset/verification sends use native
      background handling; manual verification resend retains provider-dependent
      timing until ENG-39 supplies durable queued delivery.
- [ ] Better Auth/Drizzle schema compatibility and concurrent linking are tested;
      any required migration is generated, reviewed, reversible, and keeps
      `idp_` tables/UUIDv7 IDs.
- [x] `env-schema.yaml`, app env examples, IDP/Studio docs, operations guidance,
      and provider prerequisites are accurate without real secrets; Marcus
      Gabriel's provider-app and environment-value ownership is recorded.
- [ ] Google, email/password, verification, recovery, password change,
      linking/unlinking, session, sign-out, keyboard, responsive, theme, and
      production-boundary checks pass with no sensitive data in evidence.

## Verification Plan

- Unit tests:
  - mandatory IDP Google/email env validation and safe non-secret defaults;
  - standard, local HTTP, and partitioned cookie prefixes/names/attributes plus
    rejection of legacy cookie names after cutover;
  - invitation/access matrix for credential and Google creation/session hooks;
  - email verification/reset delivery behavior with fake transport;
  - normalized same-email linking policy, different-email rejection, disabled
    user rejection, unlink-last protection, and concurrent duplicate handling;
  - Studio auth client methods, schemas, route states, focus/error copy, busy
    guards, and preferences method rendering.
- Integration/API tests:
  - mounted Better Auth request/reset/change-password, verification, social
    start/callback error, list/link/unlink account, session, and sign-out
    contracts without manual endpoint wrappers;
  - Drizzle migration against a disposable PostgreSQL database, including
    existing credential users and provider-account uniqueness behavior;
  - email/provider failure does not create an invalid session; Studio feedback
    stays generic, while provider-independent manual-resend timing belongs to
    ENG-39 queue verification.
  - Google OAuth state/callback and sign-out use the selected TRIAD cookie
    family and do not fall back to a legacy vendor namespace.
- UI tests:
  - login with email/password and Google redirect initiation;
  - invite first access plus verification notice/resend;
  - forgot request, sent state, reset valid/invalid/expired/reused, and success;
  - authenticated password change;
  - preferences connect, callback return, connected state, safe disconnect, and
    last-method rejection;
  - loading, cancellation, retry, duplicate submit, direct navigation, refresh,
    back/forward history, and session redirect behavior.
- Manual/browser checks:
  - deployed `dev`, `hml`, and `prd` Google consent/callback with exact origins;
  - real transactional email delivery/link opening without copying tokens into
    evidence;
  - Chrome, Firefox, and Safari-supported cookie/provider behavior;
  - 320 CSS pixels, 200% zoom-equivalent width, keyboard-only, screen reader,
    light/dark/system, reduced motion, forced colors, autofill, paste, and
    password-manager behavior;
  - Google button branding and production consent prerequisites.
  - legacy-cookie cleanup, forced reauthentication, standard/partitioned cookie
    names and attributes, and rollback recovery without inspecting token values.
- Build/check commands:
  - `bun --filter idp db:generate`
  - `bun --filter idp db:migrate`
  - `bun --filter idp check`
  - `bun --filter idp build`
  - `bun --filter idp test`
  - `bun --filter studio routes:generate`
  - `bun --filter studio check`
  - `bun --filter studio test:e2e`
  - `bun --filter studio test:e2e:production`
  - `bun run check`

## Open Questions

- [x] Google audience: allow any Google account only when the normalized email
      belongs to an existing active user or valid pending invitation; do not
      restrict to a Workspace domain in this initiative.
- [x] Same-email behavior: auto-link trusted verified Google identities and
      also expose explicit preferences controls.
- [x] Different-email behavior: reject it; do not add account merge or secondary
      email support.
- [x] UI composition: reuse the visual auth shell and use route-specific forms,
      not one local-state-only form for every journey.
- [x] Availability contract: Google and transactional auth email are mandatory
      baseline capabilities with no runtime feature flags or Google-disabled
      production mode.
- [x] Provider ownership: Marcus Gabriel owns creation/configuration of the
      non-production and production Google Cloud OAuth apps and registration of
      target variables, secrets, keys, callbacks, and consent metadata.
- [x] Cookie namespace: use `triad-auth` for standard Better Auth cookies and
      `triad-auth-partitioned` only when partitioned storage is required; keep
      Better Auth suffixes and the browser-enforced `__Secure-` prefix.
- [x] Marcus Gabriel provided the Google OAuth apps, exact callbacks, and
      required Google GitHub Environment names for `dev`, `hml`, and `prd`.
- [x] OAuth token persistence: keep Better Auth `1.6.23` native behavior; encrypt
      access/refresh tokens and accept native persisted `idToken` without custom
      stripping or encryption.
- [x] Transactional email delivery: do not detach verification email in process;
      ENG-39 owns the future durable queue and provider-independent asynchronous
      delivery contract.
- [ ] Product/legal must supply or approve any Google-required public homepage,
      privacy-policy, and support content during implementation.
