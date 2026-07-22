# Studio Conventions

See `component-system.md` for the responsibility folders, exhaustive component inventory,
textual component contract, token layers, and removable development runtime.
See `authentication.md` for the native Better Auth client map, public auth routes, account-local
security controls, safe redirect/error rules, and auth accessibility/test contract.

`apps/studio` is the authenticated product frontend.

- Use TanStack Router file routes.
- Keep private routes under `src/routes/_authenticated`.
- Keep auth client code under `src/modules/auth/services`.
- Keep `/login`, `/forgot-password`, and `/reset-password` addressable and compose them through the
  auth-owned visual shell. Do not combine password recovery into the login form.
- Build auth redirects from the browser origin and fixed route paths. Never render upstream OAuth
  messages or persist reset/verification tokens in browser storage.
- Keep provider and credential management in the bounded `Segurança e acesso` preferences section;
  the IDP remains the final authority for linking and last-method guards.
- Read `import.meta.env` only in `src/modules/shared/config/env.ts`.
- Keep shared UI primitives under `src/modules/shared/components`.
- Keep UI copy in Brazilian Portuguese.

The schedule prototype owns its UI-facing port, query keys, validation, and presentation under
`src/modules/scheduling`. Synthetic catalogs, scenarios, and the memory adapter remain under
`src/dev/scheduling`; the generic mock engine remains domain-free.
