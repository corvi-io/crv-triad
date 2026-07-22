# Studio Component System Workflow

Read `docs/studio/component-system.md` before changing the catalog or development runtime.

1. Place a primitive in `shared/components/ui` and a composite in its responsibility folder.
2. Import the owning file/folder directly; do not add a workspace-wide barrel.
3. Define purpose, typed API, explicit variants/slots, states, tokens, responsive behavior, and
   keyboard/focus behavior.
4. Add or update its English Markdown inventory entry with the public contract and relevant focused
   tests, or record an explicit internal-only rationale.
5. Run unit/component tests, the textual inventory gate, production-boundary scan, Studio
   build/check, and relevant Playwright coverage.

For development data, keep generic typed collection/scenario mechanics in `src/dev/mock-engine`.
Keep an accepted module's development source adapter under `src/dev`, and keep its record
vocabulary, query/page types, repository port, query keys, and UI in the owning module. Presentation
consumes the replaceable port through TanStack Query; production code does not import `src/dev`.
An explicitly accepted product-realistic evaluation module may enter the authenticated shell only
for configured `local`/`dev` sources that resolve fail-closed/disabled in `hml`/`prd`, expose no
ordinary preview/debug chrome, and have production-boundary tests and durable documentation. Do not
add fake HTTP endpoints, auth interception, persistence, or IDP behavior. Treat large local
scenarios as UX stress only, never as API, production, or capacity evidence.
