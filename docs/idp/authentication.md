# IDP Authentication Lifecycle

The IDP uses Better Auth `1.6.23` as the authentication engine. Both `apps/idp` and
`apps/studio` resolve that version through `bun.lock`; their declared compatible ranges differ, but
no package change is required while the resolved version remains aligned.

## Native capability map

| ENG-38 operation                        | Better Auth `1.6.23` owner                                                                                                             | TRIAD seam                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email/password first access and sign-in | `signUp.email`, `signIn.email`, `emailAndPassword`                                                                                     | Native signup accepts a write-only request proof. Transaction-scoped database hooks resolve and conditionally consume the bound invitation before native credential-account insertion. Sign-in remains unchanged.                                                                              |
| Email verification and resend           | `emailVerification.sendVerificationEmail`, `sendOnSignUp`, `sendOnSignIn`, `/send-verification-email`                                  | The shared IDP email sender renders the Portuguese message and builds the link from configured IDP/Studio origins. Better Auth defers automatic sends through its background handler, but `1.6.23` awaits the sender in the manual resend endpoint; ENG-39 owns future durable queue delivery. |
| Forgot/reset password                   | `/request-password-reset`, `/reset-password/:token`, `/reset-password`, `resetPasswordTokenExpiresIn`, `revokeSessionsOnPasswordReset` | React Email renders the reset message; Better Auth still owns tokens, expiry, single use, native hashing, and session revocation.                                                                                                                                                              |
| Authenticated password change           | `changePassword` with current-password proof and `revokeOtherSessions`                                                                 | Studio will choose the native request option in Phase B; IDP adds no endpoint.                                                                                                                                                                                                                 |
| Google sign-in                          | `socialProviders.google`, `/sign-in/social`, `/callback/google`                                                                        | Required server-only runtime credentials and the existing access hooks. Callback URI derives from `BETTER_AUTH_URL`.                                                                                                                                                                           |
| Same-email linking                      | `account.accountLinking`, implicit verified-email linking, `linkSocial`                                                                | Google is the only configured social/linking provider. A provider-verified exact normalized email may link to an existing active user even when the matching local email starts unverified; Better Auth promotes it to verified before session creation. Different-email linking remains disabled.                                                            |
| Connected methods and unlink            | `listAccounts`, `unlinkAccount`                                                                                                        | `allowUnlinkingAll: false` keeps the native last-method guard. No parallel account API exists.                                                                                                                                                                                                 |
| OAuth token protection                  | `account.encryptOAuthTokens`                                                                                                           | Better Auth `1.6.23` encrypts persisted access and refresh tokens, while `idToken` follows its native persistence without that transform. ENG-38 accepts this at-rest limitation and exposes no stored token to Studio.                                                                        |
| Sessions and sign-out                   | `getSession`, `revokeSession(s)`, `signOut`                                                                                            | `databaseHooks.session.create.before` rejects disabled or locally unverified users. A provider-verified same-email link is promoted before this hook. An admin status change to `disabled` deletes that user's persisted sessions in the same transaction as the user update, so existing session cookies no longer authenticate.                             |
| Cookies and OAuth state                 | `advanced.cookiePrefix`, secure cookie defaults, native state verification                                                             | Topology selects `triad-auth` or `triad-auth-partitioned` for the complete cookie family.                                                                                                                                                                                                      |
| Abuse control                           | Native `rateLimit` and per-path `customRules`                                                                                          | Bounded in-memory limits cover sign-in, first access, reset, resend, OAuth start, and callback. A shared secondary store is required before horizontally scaled limits can be treated as global.                                                                                               |
| Persistence and IDs                     | Drizzle adapter, generated core schema, `advanced.database.generateId`                                                                 | Adapter transactions are enabled, UUIDv7 remains authoritative, tables remain `idp_`, and `(provider_id, account_id)` is uniquely indexed.                                                                                                                                                     |

Official references: [options](https://better-auth.com/docs/reference/options),
[Google](https://better-auth.com/docs/authentication/google),
[email/password](https://better-auth.com/docs/authentication/email-password),
[users and accounts](https://better-auth.com/docs/concepts/users-accounts),
[hooks](https://better-auth.com/docs/concepts/hooks), and
[cookies](https://better-auth.com/docs/concepts/cookies).

ENG-38 explicitly accepts both native boundaries without custom workarounds. Persisted `idToken`
remains under Better Auth `1.6.23` native behavior; there is no stripping, custom encryption,
adapter wrapper, or vendor-internal handling. Manual `/send-verification-email` remains
provider-latency/failure dependent. ENG-39, `Add durable queue for IDP transactional authentication
emails`, is the Backlog follow-up for durable, provider-independent asynchronous invitation,
verification, and reset delivery.

## Invitation proof and migration

- Each email/password invitation receives 32 random bytes encoded as a URL-safe opaque value. Only
  its SHA-256 digest, issuance time, expiry, and lifecycle metadata are stored. The raw value exists
  only at the immediate render/send boundary and is never returned by administrative routes.
- `POST /invitations/resolve` accepts the proof in a no-store request body and returns only a
  lifecycle category plus valid-role presentation data. Malformed, expired, revoked, accepted,
  superseded, and unknown values cannot reach the password form as valid proof.
- Native `/api/auth/sign-up/email` accepts the proof as a request-only extension. Better Auth's
  `user.create.before` hook resolves it through the public current transaction adapter. The native
  credential `account.create.before` hook performs one conditional update over digest, pending
  status, non-null issuance, and future expiry. A zero-row update aborts and rolls back the native
  user/account transaction. The native hash is unchanged and successful acceptance returns no
  session.
- Resend marks the old invitation `superseded`, creates a new UUIDv7 invitation and digest, and
  attempts delivery. Provider failure never returns the raw value and the older link remains
  unusable.
- Migration `0002_kind_giant_man.sql` adds the nullable digest/issuance fields and unique digest
  index, then expires legacy pending rows that cannot have a secure proof. Operations must reissue
  those invitations; the migration must be applied only through the authorized deployment process.

## Password and authentication-email policy

The IDP counts Unicode code points and accepts 15 through 256 characters without trimming,
composition rules, or a remote check. Signup, reset, and change-password hooks share the same
whole-value policy before Better Auth performs its native hash. A bounded set loads once per
process from the first 10,000 ranked entries in `@zxcvbn-ts/language-common@4.1.3` plus TRIAD-specific
expected values. That MIT-licensed source is reviewed when the Bun dependency is updated; changes
require policy tests and a release-note review. Comparison uses the complete NFKC/case-folded value,
never substrings.

`AuthEmailLayout` and focused invitation, verification, and reset templates render semantic HTML
and plain text from trusted props. Action URLs must use configured allowlisted origins. Templates
have no remote images, tracking, marketing, social, or unsubscribe content. `email:preview` uses only
fixed synthetic data. Resend transport timeout, retry, idempotency, and sanitized-failure behavior
remain unchanged; ENG-39 still owns durable queueing, workers, shutdown recovery, metrics, and
alerts.

The visual hierarchy was informed by React Email's official Studio welcome reference and its
official render examples. TRIAD did not copy template source: the IDP layout, Portuguese copy,
literal styles, and three flow templates are original scoped implementations, so no copied-source
attribution is required. Recheck the upstream examples and package licenses when React Email is
updated.

## Access and linking policy

- Unknown emails without valid one-time proof cannot create an email/password user.
- Disabled users cannot create a session, even if an invitation exists.
- Session creation requires an active user whose local email is verified. Successful invitation
  consumption itself proves mailbox possession, but does not create a session.
- A provider-verified Google identity may implicitly link only to an existing active user with the
  exact same normalized email. The matching local email does not need to be verified beforehand:
  Better Auth `1.6.23` promotes it to verified before the retained session gate runs. Google does
  not overwrite local profile, role, or status fields.
- Unverified Google emails and different-email linking remain rejected. No provider-name trust
  bypass is configured because Better Auth `1.6.23` treats `trustedProviders` as an alternative to
  the provider `emailVerified` claim.
- Google first access for a valid invitee creates a usable session only when the provider email is
  verified. The active user preserves the invitation role, and the invitation is accepted after
  Better Auth completes transactional user/account creation. An unverified provider identity
  cannot create a usable session even with a valid pending invitation.
- Provider accounts are unique by `(provider_id, account_id)`; the database is the concurrency
  boundary for repeated callbacks.

## Cookie contract

| Topology                               | Prefix                   | Session cookie                                  | Attributes                                                                     |
| -------------------------------------- | ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Local HTTP                             | `triad-auth`             | `triad-auth.session_token`                      | `HttpOnly`, `SameSite=Lax`, host-only, path `/`; no `Secure` or `Partitioned`. |
| Standard HTTPS                         | `triad-auth`             | `__Secure-triad-auth.session_token`             | `HttpOnly`, `Secure`, `SameSite=None`, host-only, path `/`.                    |
| Partitioned HTTPS development topology | `triad-auth-partitioned` | `__Secure-triad-auth-partitioned.session_token` | `HttpOnly`, `Secure`, `SameSite=None`, `Partitioned`, host-only, path `/`.     |

The prefix applies to session, OAuth state, and other Better Auth cookies. Legacy
`better-auth` and transitional `triad-dev-partitioned` names are not read after cutover. Session
revocation and exact old-cookie expiration are authorized operational actions, not application
startup behavior, and have not been executed by Phase A.
