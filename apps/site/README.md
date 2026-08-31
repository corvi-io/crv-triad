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

Lead recipients, Resend credentials, Turnstile secrets, and rate-limit secrets belong only to
the API runtime. They must never use Astro's public env prefix.

The local server runs at `http://localhost:3001`.
