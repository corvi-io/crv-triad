# Site Product QA Contract

## Outcomes

- Visitors can understand Corvi, navigate the landing page, and complete every
  available public CTA without broken anchors or misleading affordances.
- Lead capture provides explicit validation, duplicate-submit prevention,
  loading, success, error, retry, privacy, and Turnstile behavior.
- Campaign links resolve through the real local API and preserve safe browser
  history and recovery behavior.
- Analytics activates only after the applicable consent and never includes PII,
  lead payloads, secrets, or private headers.
- Public pages preserve crawlable content, metadata, structured data, canonical
  behavior, responsive layout, keyboard use, and Brazilian Portuguese copy.

## Required Risk States

Exercise narrow mobile and desktop layouts, keyboard navigation, 200% zoom,
reduced motion, slow and failed API/provider responses, invalid and duplicate
form submission, consent changes, direct/deep links, and browser back/forward.

Capture and inspect the landing entry, navigation/menu states, every form state,
campaign resolution state, and each materially different responsive layout.
