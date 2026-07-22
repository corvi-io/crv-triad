# Studio Authentication

TRIAD Studio owns authentication presentation and delegates identity behavior to the IDP's native
Better Auth `1.6.23` contract. Studio does not create auth endpoints, tokens, sessions, cookies,
provider credentials, account-linking decisions, or persistence.

## Routes And Journeys

- `/login` owns email/password sign-in, invite-gated first access, Google initiation, verification
  notice/resend, verified-email confirmation, and safe provider callback errors.
- `/forgot-password` validates an email and always uses enumeration-safe result copy. Its native
  `requestPasswordReset` call sets `redirectTo` to the fixed browser-origin
  `/reset-password` route.
- `/reset-password` reads Better Auth's native `token` or `error` query contract. It never renders,
  logs, or persists the token. Missing, invalid, expired, and reused tokens share one safe state.
- `/preferences` contains the authenticated `Segurança e acesso` section. It lists native account
  methods, links or unlinks Google, changes an existing password with current-password proof, and
  starts verified-email recovery for a Google-only account.

All callback and redirect URLs are assembled from `window.location.origin` plus fixed accepted
paths. Provider errors are collapsed to stable Portuguese categories; upstream messages and query
details are never rendered. Provider secrets remain server-only and are not represented by Studio
environment variables.

## Native Client Map

| Studio operation          | Better Auth client method | Fixed target or guard                                      |
| ------------------------- | ------------------------- | ---------------------------------------------------------- |
| Email/password sign-in    | `signIn.email`            | `/overview`                                                |
| Invite-gated first access | `signUp.email`            | IDP database hook remains the gate                         |
| Google sign-in            | `signIn.social`           | Google only; `/overview`; safe `/login` error target       |
| Verification resend       | `sendVerificationEmail`   | `/login?verified=true`                                     |
| Forgot password           | `requestPasswordReset`    | `/reset-password`                                          |
| Complete reset            | `resetPassword`           | Native URL token only                                      |
| Change password           | `changePassword`          | Current password; revoke other sessions                    |
| Inspect methods           | `listAccounts`            | Authenticated session                                      |
| Connect Google            | `linkSocial`              | Google only; `/preferences` result target; no extra scopes |
| Disconnect Google         | `unlinkAccount`           | Credential guard in UI and last-account guard in IDP       |
| Sign out                  | `signOut`                 | Existing authenticated shell                               |

All Studio client operations in this map remain native Better Auth `1.6.23` methods. ENG-38 accepts
that persisted `idToken` is not covered by `encryptOAuthTokens` and that manual verification resend
awaits the configured email sender. Studio adds no workaround and does not claim all-token
encryption, durable delivery, or provider-independent timing. Backlog follow-up ENG-39 owns future
durable queued IDP transactional-email delivery. The server remains the authority for invitation
access, verified provider email, same-email linking, minimal `openid`/`email`/`profile` scopes,
profile preservation, session revocation, and unlink-all rejection.

## UI And Accessibility Contract

The three public routes reuse one auth-specific responsive shell. Headings receive programmatic
focus on route entry, React Hook Form focuses the first invalid field, dynamic errors use alerts,
and non-urgent delivery or success results use polite status regions. Password inputs preserve
paste, autofill, and password-manager semantics and provide named show/hide controls. Buttons keep
stable labels and expose loading through the shared `Button` busy state.

Method status is written as text and never depends on color. Controls use native buttons/links,
existing visible focus styles, minimum 40px system-control height, responsive wrapping, and the
global reduced-motion behavior. The auth browser spec covers focused route entry, one keyboard
path, 320 CSS-pixel reflow, reduced motion, and focused axe scans. VoiceOver/NVDA, real 200% browser
zoom, every light/dark/system state, and forced-colors manual review remain release evidence and
must not be inferred from automated tests.

## Component Decision

The implementation reuses Studio's existing `Button`, `Input`, `Field`, `StatusBadge`, theme,
shell, and feedback tokens. No registry dependency or shared component was added. The auth shell,
auth feedback, and password-input composition are module-owned because their API and copy are
specific to these identity journeys; the existing shadcn/Base UI primitives already provide their
interactive foundation. The shared component inventory therefore does not change.

## Verification And Privacy

- Unit tests verify native method payloads, fixed callbacks, safe error mapping, resend/reset
  states, duplicate-submit protection, account-method guards, and current-password proof.
- `tests/e2e/auth-lifecycle.spec.ts` uses only synthetic non-deliverable identities and local
  request fakes. It never contacts a provider or stores live credentials.
- Logs, screenshots, and assertions must not contain live emails, OAuth codes/state, reset or
  verification tokens, session/cookie values, provider headers, or provider response bodies.

Deployment still depends on the IDP runtime values documented under `docs/idp`, approved public
Google consent/privacy/support content, and an authorized cookie-session cutover. Studio cannot
complete those external or operational prerequisites.
