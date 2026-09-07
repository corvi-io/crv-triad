---
name: TRIAD Backstage
description: Restrained navy-and-gold internal operations interface for tenant governance and support.
colors:
  background-light: "#f3f6fc"
  background-dark: "#0f172a"
  surface-light: "#ffffff"
  surface-dark: "#131d32"
  foreground-light: "#080d19"
  foreground-dark: "#f3f6fc"
  primary-light: "#86652f"
  primary-dark: "#cdaa5b"
typography:
  headline: { fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "1.875rem", fontWeight: 600, lineHeight: 1.25 }
  body: { fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif", fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 }
rounded: { sm: "0.375rem", md: "0.5rem", lg: "0.75rem", full: "9999px" }
spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem" }
---

# Design System: TRIAD Backstage

## Overview

The creative north star is **System Observatory**: a calm internal control room where authority,
tenant state, subscription state, capacity, and support scope are immediately explicit. The visual
language intentionally inherits TRIAD Studio's mature navy-and-gold foundation while remaining a
separate application and authority boundary.

## Colors

Gold is reserved for identity, focus, selection, and primary actions. Operational information uses
flat surfaces, one-pixel boundaries, direct labels, and tabular numerals. Status always has text in
addition to color. Navy provides hierarchy; mist and white provide reading surfaces. Success,
warning, information, and destructive states use the shared semantic feedback tokens.

## Typography

Geist Variable is the single product face. Page headings use 1.875rem/600 with tight tracking,
section titles use 1.25rem/600, body copy uses 0.875–1rem, and labels use 0.75–0.875rem/500.
Counts and capacity values use tabular numerals. Technical-looking monospace is not decorative.

## Layout

System-wide inventory uses generous page width and a 248px desktop navigation rail. Tenant detail
narrows into a factual reading column and a bounded operational control rail. At mobile widths the
rail becomes a 64px header and the desktop table becomes complete factual cards.

At 320 CSS pixels, controls wrap, tables own their horizontal overflow, focus stays visible, and no
destructive or support action loses its label. Dark, light, system, reduced-motion, and keyboard
behavior share the Studio token contract. Support mode uses a persistent structural warning and an
explicit exit; it never visually resembles ordinary tenant operation.

## Elevation & Depth

The interface is flat by default. One-pixel borders and tonal changes separate hierarchy. Shadows
are reserved for overlays and the authenticated shell; no operational record floats decoratively.

## Shapes

Controls and bounded records use 8–12px radii. Pills are reserved for compact status labels. The
radio-tower mark sits in a 12px rounded square; large decorative circles and arbitrary geometry are
outside the system.

## Components

- **Backstage shell:** persistent product identity, tenant navigation, sign-out, and skip link.
- **Tenant directory:** flat metrics, bounded search, desktop table, and complete mobile record cards.
- **Tenant detail:** semantic metric list, subscription facts, owner identity, and control rail.
- **Lifecycle controls:** reason-bound suspend/reactivate actions with optimistic version handling.
- **Support boundary:** persistent tenant/expiry warning, read-only summaries, and explicit exit.
- **Feedback states:** named loading, empty, error, retry, disabled, success, and permission states.

## Do's and Don'ts

Do show server-confirmed authority and state, use direct Brazilian Portuguese copy, keep gold scarce,
and preserve keyboard/320px/theme behavior. Do not import Studio business modules, infer authority
from tenant membership, fabricate commercial plans or analytics, communicate state by color alone,
or make support resemble impersonation.
