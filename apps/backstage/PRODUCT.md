# TRIAD Backstage Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Internal Corvi system owners, operations staff, support specialists, and billing staff. They use
Backstage to operate the tenant estate without becoming a member of a customer barbershop.

## Product Purpose

TRIAD Backstage is the internal operating system for the TRIAD product family. It creates and
governs tenants, exposes bounded subscription and usage context, and provides explicit, temporary,
audited support access across Studio, Barber, and future products.

## Positioning

Backstage keeps the real internal operator attributable while separating system-wide authority from
tenant membership and customer-facing product sessions.

## Operating Context

Operators work from a desktop-first administrative environment, frequently searching tenants,
reviewing status and usage, provisioning a new barbershop, and entering a time-bounded support
context. Critical actions require reasons, confirmations, visible scope, and recoverable errors.

## Capabilities and Constraints

- Shared Better Auth identity and API; independent application, routes, session gate, deployment,
  environment and local port `3003`.
- Internal roles are `system_owner`, `operations`, `support`, and `billing`.
- Tenant creation establishes an owner and a manual subscription without public registration.
- Default tenant inventory and detail remain free of client PII.
- Support is explicit, temporary, non-impersonating, read-only in the initial Backstage surface, and
  audited.
- Tenant suspension is reversible; hard deletion is unavailable.
- User-facing copy is Brazilian Portuguese.

## Brand Commitments

Backstage belongs to the TRIAD family and inherits its navy/gold identity, Geist typography,
light/dark/system themes, restrained depth, and operational clarity. It must feel like the room
behind Studio, not a reskinned tenant workspace.

## Evidence on Hand

- Studio design and component system under `apps/studio`.
- Existing platform inventory/support API and temporary Studio surfaces.
- Initiative 19 PRD and execution plan.
- No production customer statistics, pricing claims, testimonials, or billing provider exist; the
  interface must not fabricate them.

## Product Principles

- Internal authority is explicit and narrower than identity administration.
- Every high-impact action is attributable, reasoned, and reversible where possible.
- Aggregate visibility precedes access to tenant business data.
- Backstage supports every TRIAD product without inheriting their business UI.
- Dense operational information remains calm, legible, and fast to scan.

## Accessibility & Inclusion

Meet WCAG 2.2 AA expectations for keyboard navigation, focus, semantic tables and forms, status
announcements, contrast, 320-pixel layouts, 200% zoom, themes, and reduced motion.
