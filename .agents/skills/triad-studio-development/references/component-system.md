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
Keep record vocabulary, query/page types, repository port, query keys, adapter, and UI in the
development sandbox or future owning module. Presentation consumes the port through TanStack Query.
Do not add fake HTTP endpoints, auth interception, persistence, domain rules, or production imports
from `src/dev`. Treat large local scenarios as UX stress only.
