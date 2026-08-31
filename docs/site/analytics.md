# Site Analytics

The public Astro site uses PostHog for consent-gated, anonymous product analytics. The SDK is
bundled with the site but initializes only after an explicit analytics opt-in. Localhost and
`127.0.0.1` never initialize the provider.

## Runtime contract

- `PUBLIC_POSTHOG_KEY` is the browser-safe project key.
- `PUBLIC_API_BASE_URL` supplies the first-party analytics endpoint at `/e`; the browser never
  connects directly to the PostHog ingestion origin.
- `PUBLIC_APP_ENV` is attached as `environment` and must be one of the deployment labels.
- Deployment sources are `SITE__PUBLIC_API_BASE_URL`, `SITE__PUBLIC_POSTHOG_KEY`, and
  `SITE__PUBLIC_APP_ENV` under the Infisical `/site` path. The API selects the fixed regional
  upstream through `API__POSTHOG_UPSTREAM_URL` under `/api`.
- Missing configuration leaves analytics disabled without affecting navigation or lead intake.

## Privacy and consent

- No SDK initialization or analytics request is allowed before opt-in.
- Essential-only choice remains provider-free.
- Visitors remain anonymous; the marketing site does not call `identify`.
- Never capture names, barbershop names, phone numbers, email addresses, Turnstile tokens,
  form values, email bodies, credentials, or private headers.
- Session replay masks all inputs and all text inside the lead dialog.
- Autocapture is disabled. Only the reviewed events below are emitted.
- The proxy strips cookies, authorization, private forwarding headers, upstream cookies, and
  upstream error bodies. It accepts only `GET`, `POST`, and `OPTIONS` under `/e/*`.

## Event contract

All custom event and property names use English `snake_case`. Common properties are
`page_path`, `page_type`, `device_type`, and `environment`.

| Event | When | Privacy notes |
| --- | --- | --- |
| `$pageview` | Once after consent on a rendered route | URL and common page context only |
| `cta_clicked` | A primary lead CTA is activated | Stable normalized label and location |
| `solution_selected` | Studio or Pro Barber is explored | Product and source section |
| `lead_form_opened` | The native dialog opens | Source page, CTA location, product |
| `lead_form_started` | First valid input interaction per opening | No field name or value |
| `lead_form_validation_failed` | Invalid submit attempt | Technical invalid field names only |
| `lead_submission_succeeded` | API responds successfully | Integration name; no lead payload |
| `lead_submission_failed` | API or network fails | Coarse error type and HTTP status |
| `feature_pill_clicked` | A visitor manually selects a product pill | Automatic rotation is excluded |
| `faq_item_opened` | A FAQ item changes from closed to open | Stable question ID and position |
| `scroll_depth_reached` | 25%, 50%, 75%, and 90%, once per page load | Numeric milestone only |
| `section_viewed` | At least 50% visible for one second | Once per named section per page load |

The former `lead_email_intent_generated` event is retired because lead delivery now uses the
API. `lead_submission_succeeded` represents an accepted API response, not a later sales outcome.

## PostHog operations

The production provider artifacts are:

- Dashboard: [TRIAD — Aquisição e Conversão do Site](https://us.posthog.com/project/587522/dashboard/2052101)
- Funnel: [Da visita ao lead recebido](https://us.posthog.com/project/587522/insights/sRIKNjbS)

The dashboard contains 12 saved insights grouped by six Brazilian Portuguese section tiles:
executive view, acquisition and traffic, Studio and Pro Barber interest, conversion funnel, lead
quality, and content engagement. Insight titles, descriptions, series labels, and funnel steps are
Brazilian Portuguese; event and property identifiers remain English `snake_case`.

Create the main funnel in the configured production project:

1. `$pageview`
2. `solution_selected` or `cta_clicked`
3. `lead_form_opened`
4. `lead_form_started`
5. `lead_submission_succeeded`

Create dashboard insights for page traffic, acquisition sources, CTA rate, product interest,
form progression, submissions, failures, selected product pills, and opened FAQ items. Validate
the production project and region, Live Events payloads, replay masking, dashboard URL, and
funnel URL before considering provider setup complete. These provider-side artifacts require an
authorized PostHog operator and are not stored in source control.

The dashboard structure is intentionally useful before ingestion begins: empty charts remain
visible and populate automatically after consented production events arrive. Zero values must not
be interpreted as zero total traffic because visitors who decline analytics are excluded.
