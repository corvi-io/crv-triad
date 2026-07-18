# Site Components And Copy

## Structure

- Site-level components such as the header live under `src/components/site/**`.
- Home-specific sections live under `src/components/home/**`.
- Reusable UI primitives live under `src/components/ui/**` only when reuse is
  real or imminent.
- Page-specific assets live under `src/assets/pages/**`.

## Copy And Language

- Keep code, filenames, routes, comments, and technical docs in English.
- Keep user-facing copy, labels, validation messages, and CTAs in Brazilian
  Portuguese.
- Keep marketing copy crawlable without client-side JavaScript.

## UI Rules

- Use semantic landmarks and headings.
- Keep interactive controls keyboard accessible with visible focus states.
- Prevent duplicate submissions and expose clear loading and error states.
- Avoid adding reusable abstractions before reuse is real.
