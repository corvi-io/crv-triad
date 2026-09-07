# CRV Triad Site

Static Astro marketing site for CRV Triad.

## Routes

- `/` — product overview
- `/studio` — TRIAD Studio
- `/pro-barber` — TRIAD Pro Barber

## Development

```bash
bun --filter site dev
bun --filter site check
bun --filter site build
```

Runtime env:

- `PUBLIC_SITE_URL`
- `PUBLIC_API_BASE_URL` — public base URL for the consolidated API
- `PUBLIC_TURNSTILE_SITE_KEY` — public Cloudflare Turnstile site key
- `PUBLIC_APP_ENV` — public environment label attached to analytics events
- `PUBLIC_POSTHOG_KEY` — browser-safe PostHog project key

Lead recipients, Resend credentials, Turnstile secrets, and rate-limit secrets belong only to
the API runtime. They must never use Astro's public env prefix.

The local server runs at `http://localhost:3004`.

## Analytics

PostHog remains disabled on localhost and does not initialize until the visitor explicitly
chooses **Permitir analytics**. Custom events use `snake_case`, automatic click capture is
disabled, session replay masks every form input plus all lead-dialog text, and ingestion uses
the API first-party endpoint derived from `PUBLIC_API_BASE_URL`. See
`docs/site/analytics.md` for the event contract and operational setup.
