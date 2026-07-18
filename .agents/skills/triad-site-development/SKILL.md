---
name: triad-site-development
description: Build or refactor the Triad Astro marketing site in apps/site using static-first Astro conventions, Brazilian Portuguese UI copy, accessibility, SEO, privacy-safe analytics, public env vars, campaign-link UX, Cloudflare Pages behavior, and project validation commands. Use for Astro components, pages, forms, metadata, assets, analytics, and site docs.
---

# Triad Site Development

Use this skill for changes under `apps/site`. The site is the public Triad
marketing landing page and should remain static-first, crawlable, accessible,
and privacy-aware.

Write user-facing analysis in Brazilian Portuguese. Keep code, filenames,
routes, docs, commit messages, and PR titles in English. User-facing UI labels,
validation messages, CTAs, and marketing copy should be Brazilian Portuguese.

## Reference Routing

- Components, pages, and copy: read `references/components-copy.md`.
- SEO and accessibility: read `references/seo-accessibility.md`.
- Analytics and privacy: read `references/analytics-privacy.md`.
- Routes, assets, and environment: read `references/routing-assets-env.md`.
- Tests and handoff: read `references/testing.md`.

## Hard Boundaries

- Keep the landing page static by default.
- Use Astro components for static sections.
- Add client-side JavaScript only when interaction requires it.
- Do not add React, Vue, Svelte, or another island framework without a concrete
  component need.
- Keep core marketing copy and form content crawlable without client-side
  JavaScript.
- Do not expose secrets through frontend environment variables.

## Performance And Scalability

- Preserve static-first performance: avoid unnecessary client JavaScript,
  oversized assets, render-blocking third-party scripts, and avoidable layout
  shift.
- Consider peak browser workload, form submission behavior, analytics overhead,
  Cloudflare Pages behavior, and external API latency before adding interactive
  features.
- Do not claim capacity, traffic, or concurrent user support unless measured or
  clearly estimated with explicit assumptions.
