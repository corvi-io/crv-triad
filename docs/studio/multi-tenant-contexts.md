# Studio Multi-Tenant Contexts

The Studio discovers administrative contexts from `GET /api/contexts`. A single tenant is selected
through Better Auth and opens `/overview`; multiple contexts open `/select-workspace`; a platform-only
identity opens `/platform`. Platform operations remain visually and technically separate from the
tenant shell.

Changing a tenant confirms the server-side active organization before navigation, cancels in-flight
queries, removes context-bound cache data, and refetches context and access summaries. Tenant names
are indicators only; API authorization always revalidates membership and commercial access.

Client management uses the HTTP repository when `VITE_CLIENT_MANAGEMENT_SOURCE=http`. Memory data is
allowed only on local/development targets and never acts as a network or authorization fallback.
User-facing context and access states use Brazilian Portuguese and preserve keyboard, screen-reader,
mobile, theme, zoom, and reduced-motion behavior from the existing Studio system.

Platform support is an explicit, temporary, read-only context. Its route carries a persistent tenant
banner, expiry and exit action. Exit is complete only after server revocation succeeds; failures keep
the in-memory proof available for retry and never silently return to unrestricted platform UI.
