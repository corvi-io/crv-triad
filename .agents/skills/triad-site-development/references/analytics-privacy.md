# Site Analytics And Privacy

## Public Environment

- Browser-visible variables must use the framework's public prefix.
- Do not put secrets, email provider keys, analytics administration keys, monitoring auth
  tokens, ads conversion secrets, private API tokens, or provider secrets in
  frontend env vars.

## Analytics

- Preserve the optional analytics consent gate before analytics initialization.
- Only browser-safe public keys and hosts may be exposed to the site.
- Do not send raw form messages, project summaries, credentials, tokens, or PII
  to analytics.
- Avoid duplicate event firing.

## Submitted And Campaign Data

- Preserve UTM parameters for future form payloads when relevant.
- Form-delivery secrets belong outside `apps/site`, in the server-side worker or
  backend that owns delivery.
