# TRIAD Studio

Authenticated barbershop-management frontend for CRV Triad.

## Development

```bash
bun --filter studio dev
bun --filter studio check
bun --filter studio build
```

Routes:

- `/login`
- `/workspace-preview` (development-only visual shell preview; no login required)
- `/workspace-preview/sandbox` (development-only neutral component/data sandbox)
- `/overview`
- `/profile`
- `/preferences`

TRIAD Studio intentionally exposes only the authenticated shell and account-local preferences.
Identity administration remains outside the Studio surface. New business domains require an
accepted initiative and explicit authorization, API, and persistence contracts.

The preview and sandbox redirect to `/login` in production. The sandbox is deterministic and
resettable, persists nothing, and never mocks authentication. Verify it with
`bun --filter studio test:e2e:sandbox`; verify both production routing and bundle exclusion with
`bun --filter studio test:production-boundary` and `bun --filter studio test:e2e:production`.

Component placement, exhaustive inventory, public and internal-only decisions, token layers,
adapter boundaries, and manual accessibility checks are documented in English at
`docs/studio/component-system.md`. Focused Vitest and Playwright coverage verifies behavior without
a separate component-catalog runtime.

Runtime env:

- `VITE_APP_NAME`
- `VITE_AUTH_BASE_URL`
