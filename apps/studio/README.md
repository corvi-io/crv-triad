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
- `/workspace-preview/agenda` (development-only schedule interaction/QA surface)
- `/agenda` (authenticated daily schedule visual prototype when enabled)
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

The shipped Studio theme is dark-first navy/gold with deliberate light, dark, and system
preferences. `src/index.css` owns the primitive, semantic, and component token layers, while the
document-head `public/theme-init.js` resolves the saved/system preference before React paint. The
durable token, contrast, status, gradient, and contribution contract lives in
`docs/studio/theme-system.md`.

Runtime env:

- `VITE_APP_NAME`
- `VITE_AUTH_BASE_URL`
- `VITE_DEPLOY_TARGET` (`local`, `dev`, `hml`, or `prd`; defaults to `local`)
- `VITE_SCHEDULING_SOURCE` (`disabled` or `memory`; defaults to `disabled`)

`bun --filter studio dev` explicitly composes memory scheduling for local UX work. Remote `dev`
builds require `VITE_DEPLOY_TARGET=dev` and `VITE_SCHEDULING_SOURCE=memory`. The composition
boundary ignores memory for `hml` and `prd`, and production checks reject synthetic markers.
