# TRIAD Studio Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Barbershop owners and administrators operate the business daily, including client records,
  membership governance, access requests, and workspace selection when they participate in more
  than one organization.
- Barbershop members use the operational capabilities allowed by their current organization role,
  plan, and quota.
- CRV platform operators monitor tenant health and perform explicitly reason-bound, time-limited,
  auditable support work without impersonating tenant users.

Clients of a barbershop are business records, not Studio users. A future verified identity link does
not grant administrative access by itself.

## Product Purpose

TRIAD Studio is the authenticated operating product for barbershops. It brings daily management
work into one coherent workspace while keeping every business record isolated to the selected
organization. Success means an authorized user can understand the active context, complete routine
work safely, and recover from permission, subscription, quota, network, and concurrency failures
without losing work or seeing another tenant's data.

## Positioning

TRIAD combines barbershop operations with explicit multi-organization context, server-enforced
access, and a separately governed CRV support boundary. Platform support is attributable and
auditable rather than an invisible impersonation path.

## Operating Context

- Tenant users sign in through the invite-gated identity flow and work in one confirmed active
  organization at a time.
- Users with multiple administrative contexts select or switch workspace without signing out.
- Owners and administrators work primarily in frequent, task-oriented desktop sessions; all core
  flows must remain usable on narrow mobile web viewports.
- Platform operators use a visually distinct console, enter a reason before accessing tenant client
  records, see a persistent support-mode indicator, and explicitly exit that context.
- Client management includes bounded search, filters, sorting, pagination, create/edit,
  archive/restore, duplicate warnings, and internal notes.

## Capabilities and Constraints

- The UI is Brazilian Portuguese. Technical identifiers and implementation artifacts remain in
  English.
- Better Auth supplies identity, sessions, organizations, and memberships. Business authorization
  is server-owned and never inferred from hidden navigation or cached browser summaries.
- Membership roles, professional work, client identity, platform authority, plan entitlements, and
  quotas are separate concepts.
- There is one principal owner per active tenant. Multiple administrators may coexist, but generic
  member actions cannot replace or remove the principal owner.
- Public self-registration, impersonation, payment processing, customer portal access, hard client
  deletion, and arbitrary platform data editing are outside the current product contract.
- The first subscription source is manual/provider-neutral. The UI must not imply that checkout or
  payment collection exists.
- Client contact values and notes are private business data and must not appear in logs, analytics,
  URLs, traces, errors, or support audit payloads.

## Brand Commitments

- Preserve the established TRIAD Studio visual system rather than introducing a redesign.
- The existing navy-and-gold identity, official logo assets, Geist typography, semantic token
  layers, restrained operational surfaces, and intentional light/dark/system themes remain
  authoritative.
- Brand expression stays concentrated in navigation, identity, focus, and primary actions. Dense
  operational content remains calm and solid.

## Evidence on Hand

- Existing production-quality shell, shared component system, theme tokens, and authenticated
  routes under `apps/studio/src`.
- Durable visual contract in `docs/studio/theme-system.md`.
- Existing client-management interaction prototype and automated tests documented in
  `docs/studio/client-management.md`.
- Approved Initiative 19 PRD and execution plan under `docs/initiatives`.
- No production customer testimonials, commercial pricing, measured capacity claims, or payment
  provider evidence exists and none may be fabricated.

## Product Principles

- Make the active organization and authority context continuously understandable.
- Keep ordinary high-frequency work fast while making elevated or irreversible work deliberate.
- Fail closed at trust boundaries and explain recoverable denials without exposing private data.
- Reuse one coherent operational vocabulary across roles, plans, quotas, and modules.
- Prefer factual states and observable evidence over simulated activity or unsupported claims.

## Accessibility & Inclusion

All new surfaces target WCAG 2.2 AA and preserve keyboard operation, visible focus, semantic names,
screen-reader announcements, non-color-only state communication, reduced motion, zoom, 320 CSS
pixel reflow, and light/dark/system theme behavior. Brazilian Portuguese copy must be direct and
understandable without relying on technical authorization terminology.
