# Studio Conventions

`apps/studio` is the authenticated product frontend.

- Use TanStack Router file routes.
- Keep private routes under `src/routes/_authenticated`.
- Keep auth client code under `src/modules/auth/services`.
- Read `import.meta.env` only in `src/modules/shared/config/env.ts`.
- Keep shared UI primitives under `src/modules/shared/components`.
- Keep UI copy in Brazilian Portuguese.
