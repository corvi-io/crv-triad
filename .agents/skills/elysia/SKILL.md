---
name: elysia
description: Build and refactor Elysia HTTP apps on Bun, including route plugins, middleware, OpenAPI docs, tests with app.handle, and framework integrations such as Better Auth.
---

# Elysia

Use this skill when code imports from `elysia` or `@elysiajs/*`, when migrating routes to Elysia, or when working on Bun-native HTTP services.

## Workflow

1. Prefer small `new Elysia({ name })` plugins for route groups and middleware.
2. Mount WinterTC-compatible handlers with `.mount(prefix, handler)` instead of wrapping every endpoint manually.
3. Use `status(code, body)` or `set` for explicit HTTP status and headers.
4. Expose OpenAPI with `@elysiajs/openapi` and hide documentation in production when the product requires it.
5. Test handlers with `app.handle(new Request("https://example.test/path"))`.

## Triad Notes

- For `apps/idp`, Better Auth stays mounted directly at `/api/auth/*`.
- Keep Triad-owned routes documented in the app OpenAPI document.
- Use Bun package scripts so Turborepo can orchestrate workspace tasks.
