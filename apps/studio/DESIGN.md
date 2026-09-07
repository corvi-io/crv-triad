---
name: TRIAD Studio
description: Restrained navy-and-gold operational interfaces with explicit administrative context.
colors:
  background-light: "#f3f6fc"
  background-dark: "#0f172a"
  surface-light: "#ffffff"
  surface-dark: "#131d32"
  foreground-light: "#080d19"
  foreground-dark: "#f3f6fc"
  primary-light: "#86652f"
  primary-dark: "#cdaa5b"
  border-light: "#c5d0e5"
  border-dark: "#2a3852"
  destructive-light: "#b91c1c"
  destructive-dark: "#dc2626"
typography:
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  xs: "0.25rem"
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
    height: "2.5rem"
    padding: "0.75rem"
  button-outline:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.lg}"
    height: "2.5rem"
    padding: "0.75rem"
  card:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.lg}"
    height: "2.5rem"
    padding: "0.75rem"
---

# Design System: TRIAD Studio

## Overview

**Creative North Star: "Confirmed Context"**

TRIAD Studio is a calm operating environment in which every administrative action visibly belongs
to one server-confirmed context. Its restrained navy-and-gold identity conveys trust through clear
hierarchy, bounded surfaces, and factual state—not decorative dashboard theater. Brand expression
is concentrated in identity, navigation, focus, and primary action; dense work stays solid and quiet.

Tenant work, platform operations, and temporary support form three explicit levels. Tenant work is
the familiar everyday world. Platform operations are a separate inventory-and-governance console.
Support is a time-limited, reason-bound, read-only state that interrupts the normal shell with a
persistent signature. The system never uses a color change alone to imply a change of authority.

**Key Characteristics:**

- Restrained navy surfaces with scarce, purposeful gold emphasis.
- Compact operational density, readable hierarchy, and factual Brazilian Portuguese copy.
- Continuously visible organization and authority context.
- Structural separation for elevated platform and support work.
- Intentional light, dark, system, reduced-motion, and narrow-viewport behavior.

## Colors

Navy supplies the environment and hierarchy; gold marks brand, focus, selection, and primary action.
Semantic feedback colors communicate outcomes and risk without replacing labels, icons, or structure.

### Primary

- **Operational Gold** (`#86652f` light / `#cdaa5b` dark): primary actions, focus rings, selected
  navigation details, and restrained identity accents.

### Neutral

- **Workspace Mist** (`#f3f6fc`): light-mode page background.
- **Navy Night** (`#0f172a`): dark-mode page background and the primary acceptance surface.
- **Clear Surface** (`#ffffff`): light cards, popovers, and sidebar.
- **Deep Navy Surface** (`#131d32`): dark cards and contained operational regions.
- **Ink Navy** (`#080d19` light foreground / `#f3f6fc` dark foreground): high-emphasis content.
- **Boundary Navy** (`#c5d0e5` light / `#2a3852` dark): borders, dividers, and containment.

### Named Rules

**The Gold Is Scarce Rule.** Gold identifies focus, selection, brand, and the primary action; it does
not wash large operational regions or decorate every status.

**The State Has More Than Color Rule.** Permission, plan, quota, platform, and support states always
carry direct text and semantic structure. Color reinforces meaning but never owns it.

## Typography

**Display Font:** Geist Variable (with system sans-serif fallback)
**Body Font:** Geist Variable (with system sans-serif fallback)

**Character:** One modern grotesk keeps the product direct and compact. Hierarchy comes from size,
weight, spacing, and tabular numerals rather than font switching or ornamental display styles.

### Hierarchy

- **Headline** (600, `1.875rem`, tight tracking): page identity such as context selection and
  platform operations.
- **Title** (600, `1.125rem`, snug): major content sections and bounded workflows.
- **Component title** (500–600, `1rem`, snug): cards, workspace rows, and local headings.
- **Body** (400, `1rem`, `1.5`): form and operational content; shared controls become `0.875rem` at
  medium viewports where density benefits.
- **Label** (500, `0.875rem`, `1.25`): controls, table headings, and concise metadata.
- **Supporting text** (400, `0.75–0.875rem`): role, expiry, recovery, and secondary explanation.
- **Metrics** (600, `1.875rem`, tabular numerals): bounded counts only, never fabricated activity.

## Layout

The authenticated tenant shell uses a contiguous sidebar: `15.9375rem` expanded, `3.5rem` collapsed,
and at most `calc(100vw - 1rem)` on mobile. Its header is `3.5rem` high; content uses `1.5rem`
horizontal and `1.25rem` vertical insets. Standalone administrative pages use centered content
containers (`48rem` for context selection and `72rem` for platform/support) with `1.25rem` mobile
padding that grows to `2rem`.

Spacing follows a four-pixel rhythm, with `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, and `2rem` doing most
of the work. Context selection is a bounded semantic list, not a tile dashboard. Platform inventory
uses a horizontally scrollable table when its `40rem` minimum cannot reflow safely. Form controls
and action rows wrap rather than shrink below usable size.

At 320 CSS pixels, core journeys remain operable without page-level horizontal scrolling: rows wrap,
actions remain named, support identity stays visible, and dense tables own their local overflow.
Zoom must not obscure focus, context, or exit controls.

## Elevation & Depth

The system is flat by default. Borders, dividers, background tone, and containment establish depth;
cards do not float merely to seem interactive. Low shadows are reserved for menus and the contiguous
sidebar, while stronger branded shadows belong only to bounded identity surfaces. Operational cards
remain solid in both themes.

### Shadow Vocabulary

- **Menu** (`0 0.625rem 1.875rem rgb(10 10 10 / 0.12)`): floating menus and popovers.
- **Sidebar** (`0 0.0625rem 0.125rem rgb(10 10 10 / 0.08)`): subtle shell separation.
- **Brand** (`0 1.5rem 4rem rgb(8 13 25 / 0.32)`): bounded authentication artwork only.

**The Flat-by-Default Rule.** Use tonal layers and one-pixel boundaries for operational hierarchy;
reserve elevation for actual overlay, shell, or bounded brand depth.

## Shapes

Corners are compact and consistent: `0.5rem` is the base control radius, `0.75rem` contains cards
and lists, `0.25rem` marks selected navigation, and pill geometry is reserved for badges. One-pixel
borders separate calm surfaces. Icons are typically `1rem–1.25rem` and accompany accessible names;
they do not substitute for them.

## Components

### Buttons

- **Shape:** compact rounded rectangle (`0.75rem` shared button radius), normally `2.5rem` high.
- **Primary:** operational gold with high-contrast foreground; reserve for the main action.
- **Outline / ghost:** context switching, recovery, pagination, exit, and secondary operations.
- **States:** hover changes tone; active presses by one pixel; disabled/loading keeps the label or a
  named progress state. Focus uses a three-pixel semantic gold outline/ring with offset.

### Cards / Containers

- **Shape:** `0.75rem` corners with a one-pixel semantic ring or border.
- **Background:** solid semantic card color, with `1rem` default internal spacing.
- **Use:** group one coherent workflow, metric, or list. Do not turn every section into a card.

### Inputs / Fields

- **Style:** transparent or theme-layered background, semantic input border, `0.75rem` radius,
  `2.5rem` height, and explicit visible labels.
- **Focus:** semantic gold border plus three-pixel translucent ring.
- **Error / disabled:** destructive border and ring for invalid fields; disabled remains legible and
  clearly inert. Errors are announced and explain recovery without leaking private data.

### Navigation and Context Selection

- The shell keeps the active tenant visible and uses a selected surface plus a two-pixel indicator.
- The context switcher names the current destination, confirms a switch, clears stale tenant data,
  and preserves the prior context on failure.
- The selection page presents tenant name, translated role, destination type, and one direct action.
- Platform authority is labeled **Operações CRV** and presented separately from tenant destinations.

### Access-Denial States

Permission, subscription, and quota denial share a factual pattern: what is unavailable, why it is
unavailable in plain language, what remains safe, and the next available action. The server-provided
access summary is authoritative. Hidden navigation is never treated as authorization, and recovery
must not discard user work.

### Signature Component: Support-State Boundary

Support begins only after selecting a tenant and recording a reason. The entry form states the
30-minute limit and explicitly says the operator does not represent a tenant user. While active, a
sticky, full-width destructive-tinted banner remains above all content and includes a shield icon,
**Suporte ativo**, the confirmed organization name, formatted expiry time, and a persistent
**Sair do suporte** action.

The workspace below is labeled temporary, read-only, and audited. Exit revokes the context before
returning to platform operations; if revocation fails, the banner and context remain visible for a
safe retry. Expired or revoked credentials produce an alert and cannot read data again (the verified
contract is HTTP 403). This structure—not the red tint alone—is the support-state signature.

## Do's and Don'ts

### Do:

- **Do** expose the server-confirmed tenant, role, capability, plan, quota, reason, and expiry facts
  exactly where they affect a decision.
- **Do** use semantic tokens and shared Base UI/shadcn components instead of raw palette utilities in
  feature markup.
- **Do** keep Brazilian Portuguese labels direct, factual, and free of internal authorization jargon.
- **Do** preserve keyboard order, visible focus, semantic headings, `role="status"` for progress, and
  `role="alert"` for actionable failures.
- **Do** verify light, dark, system, 320-pixel reflow, zoom, forced colors, and reduced motion.

### Don't:

- **Don't** visually merge tenant work, platform operations, and support into one generic dashboard.
- **Don't** imply impersonation, checkout, payment collection, or authority the server did not grant.
- **Don't** communicate support, denial, role, or status by color or icon alone.
- **Don't** expose client contact data, notes, credentials, or reasons in URLs, logs, analytics, traces,
  or audit payloads.
- **Don't** add gradients, glass effects, decorative charts, oversized display type, or strong shadows
  to dense operational surfaces.
