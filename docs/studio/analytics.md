# Studio Analytics And Error Tracking

TRIAD Studio uses PostHog for always-on product analytics, sampled privacy-bounded session replay,
and browser error tracking in configured deployed environments. Local and test runtimes remain
provider-free. The integration is operational telemetry only and never grants application access.

## Identity contract

- The login surface starts anonymously.
- After Better Auth resolves a valid session, Studio calls `identify` with the internal user UUID.
- The active workspace is associated as a `tenant` group using its UUID.
- Switching workspaces replaces the active group context.
- Logout or session loss resets PostHog before another browser user can inherit the identity.
- Names, emails, phone numbers, client data, appointment data, and financial values are prohibited.

The public site remains anonymous and consent-gated. A future accepted public-sign-up initiative may
identify a consented anonymous visitor with the newly created user UUID after confirmed registration
and before redirecting to Studio. Studio then identifies the same UUID. Do not put a PostHog distinct
ID, identity proof, invitation proof, or session material in a redirect URL. A visitor who declined
site analytics begins a new always-on Studio history after authentication.

## Initial event contract

Custom names and properties use English `snake_case`.

| Event | Trigger | Safe properties |
| --- | --- | --- |
| `module_viewed` | A normalized TanStack route becomes active | `module`, `route` |
| `studio_session_started` | A new valid user UUID is identified | Common properties only |
| `workspace_selected` | A tenant group becomes active | `tenant_id` |
| `onboarding_completed` | A previously required setup becomes schedule-ready | Common properties only |
| `appointment_created`, `appointment_updated`, `appointment_rescheduled`, `appointment_cancelled`, `appointment_status_changed` | The corresponding scheduling mutation succeeds | Common properties only |
| `service_session_started`, `service_session_updated`, `service_completed`, `service_session_completed`, `service_queue_updated` | The corresponding service-desk mutation succeeds | Common properties only |
| `cash_day_opened`, `cash_day_reopened`, `cash_day_closed`, `cash_movement_recorded` | The corresponding cash mutation succeeds | Common properties only |
| `checkout_updated`, `checkout_completed` | The corresponding checkout mutation succeeds | Common properties only |
| `client_created`, `client_updated` | The corresponding client mutation succeeds | Common properties only |
| `report_export_requested`, `report_export_retried` | The corresponding export mutation succeeds | Common properties only |
| `notification_read` | One or all operational notifications are marked read | Common properties only |

Common properties are `app`, `environment`, and `release`. Expand this catalog only with an accepted
product question, stable trigger, property allowlist, privacy classification, and focused test.
Autocapture remains disabled.

## Error contract

PostHog captures unexpected render/runtime, unhandled-promise, router, query, and mutation failures.
Expected form, validation, domain-transition, abort, authentication, access, not-found, and conflict
outcomes are excluded. Error messages are replaced with generic safe messages while stack locations
are retained for symbolication. A single failure must not be reported again at every boundary.
Automatic exception capture stays disabled so the SDK cannot transmit an original error message
before the Studio sanitizer runs.

Deployed builds attach the Git commit as the release. The delivery gate generates hidden source maps,
uploads them with `posthog-cli`, strips source-map references/maps, and only then publishes the build.

## Replay privacy

Replay is sampled by `VITE_POSTHOG_REPLAY_SAMPLE_RATE`, masks every input and all rendered text, and
blocks images, hidden/file inputs, and subtrees marked with `data-private` or `data-sensitive`.
Components that display client, appointment, financial, account, support, or private operational
content must retain the appropriate marker before production rollout.
Representative recordings must be inspected after every material UI expansion.

## Runtime configuration

- `VITE_POSTHOG_KEY`: browser-safe project key.
- `VITE_POSTHOG_HOST`: first-party ingestion endpoint, normally the API `/e` proxy.
- `VITE_POSTHOG_REPLAY_SAMPLE_RATE`: number from `0` to `1`; defaults to `0.1`.
- `VITE_RELEASE`: deployed commit/release; the delivery script supplies `GITHUB_SHA`.

Provider failure is non-blocking. Disable replay by setting its sample rate to zero; disable all
Studio telemetry by removing the project key and rebuilding. Production deployment requires the
configured key/host and private source-map upload credentials.
