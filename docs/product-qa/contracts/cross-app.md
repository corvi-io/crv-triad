# Cross-App Product QA Contract

## Critical Journeys

1. A visitor enters through the site, follows an available conversion or
   campaign path, and receives the intended API-backed outcome.
2. An invited active user authenticates through studio and API, reaches the correct
   private route without protected-content flicker, and preserves the session
   across refresh.
3. An authenticated user completes each active business workflow through the
   studio UI, the API commits the mutation, and a refreshed or new session renders
   the persisted result.
4. Logout or session expiry clears protected state and returns the user to a safe
   public/auth route without redirect loops or cached private content.
5. When multi-tenancy exists, tenant A can use its own resources while attempts
   to read or mutate tenant B resources fail safely across UI, direct URL, API,
   search/list/count, exports/files, notifications, cache, and stale tabs.

## Evidence Rule

Every critical journey requires browser evidence, inspected screenshots,
console/network results, and safe persistence evidence. Missing evidence in one
boundary cannot be averaged away by passing checks in another app.
