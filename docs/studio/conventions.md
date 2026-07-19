# Studio Conventions

See `component-system.md` for the responsibility folders, exhaustive component inventory,
textual component contract, token layers, and removable development runtime.

`apps/studio` is the authenticated product frontend.

- Use TanStack Router file routes.
- Keep private routes under `src/routes/_authenticated`.
- Keep auth client code under `src/modules/auth/services`.
- Read `import.meta.env` only in `src/modules/shared/config/env.ts`.
- Keep shared UI primitives under `src/modules/shared/components`.
- Keep UI copy in Brazilian Portuguese.

The schedule prototype owns its UI-facing port, query keys, validation, and presentation under
`src/modules/scheduling`. Synthetic catalogs, scenarios, and the memory adapter remain under
`src/dev/scheduling`; the generic mock engine remains domain-free.
