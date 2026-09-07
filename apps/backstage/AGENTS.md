# Backstage Agent Instructions

- Follow the root `AGENTS.md` and keep user-facing copy in Brazilian Portuguese.
- Keep Backstage limited to internal system operations; tenant business work belongs in Studio.
- Use TanStack Router file routes under `src/routes`, with private routes under `_authenticated`.
- Treat `/api/backstage/me` as the authority gate. Authentication alone never grants Backstage access.
- Keep tenant lifecycle mutations restricted to server-confirmed `system_owner` and `operations` roles.
- Keep support sessions explicit, reason-bound, expiring, revocable, and read-only.
- Read `import.meta.env` only through `src/modules/shared/config/env.ts`.
- Reuse the navy-and-gold token system and shadcn/Base UI primitives under `src/modules/shared`.
- Never import Studio business modules, fixtures, memory repositories, or tenant mutation UI.
- Do not log credentials, session material, owner email addresses, or tenant business payloads.
