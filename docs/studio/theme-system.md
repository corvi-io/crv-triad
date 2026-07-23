# TRIAD Studio Theme System

## Purpose And Status

This document preserves the designer handoff reviewed on 2026-07-19 and records
its implemented Studio translation. Initiative 04 keeps
`apps/studio/src/index.css` as the runtime source of truth and ships the accepted
navy/gold values through primitive, semantic, and component layers.

The handoff also contained the broader TRIAD Studio MLP feature description.
That product scope is already represented by the initiative roadmap and is not
part of the theme migration.

## Accepted Direction

- Product: TRIAD Studio, the desktop operating product for the barbershop.
- Visual direction: dark-first navy surfaces with restrained gold brand/action
  emphasis.
- Theme behavior: preserve light, dark, and system preferences. Dark is the
  primary design-acceptance surface; light is an intentional companion.
- Typography: retain Geist and the existing scale until design supplies an
  accepted typography handoff.
- Runtime source: keep the three token layers in `apps/studio/src/index.css`.
- Component consumption: use semantic Tailwind utilities, shadcn variants, and
  named component tokens. Do not consume raw palette steps from feature markup
  when a semantic role exists.
- Effects: use gradients and branded shadows only through named tokens on
  bounded brand surfaces. Dense operational UI remains predominantly solid.

## Designer Primitive Anchors

These raw anchors were supplied in the temporary handoff and are preserved here
so the disposable source files can be removed.

### Navy

| Step | Value |
| --- | --- |
| 50 | `#f3f6fc` |
| 100 | `#e4eaf5` |
| 200 | `#c5d0e5` |
| 300 | `#9baccc` |
| 400 | `#7086af` |
| 500 | `#50678f` |
| 600 | `#3b4e72` |
| 700 | `#2e3e5d` |
| 800 | `#1e293b` |
| 900 | `#0f172a` |
| 950 | `#080d19` |

### Gold

| Step | Value |
| --- | --- |
| 50 | `#fff9ec` |
| 100 | `#fdf0ce` |
| 200 | `#f9dfa0` |
| 300 | `#f1c871` |
| 400 | `#d8b86c` |
| 500 | `#cdaa5b` |
| 600 | `#b0883f` |
| 700 | `#86652f` |
| 800 | `#5e4624` |
| 900 | `#3d2e19` |
| 950 | `#21180d` |

## Dark-Theme Intent

The handoff proposed the following dark semantic anchors. The implementation
adjusts exact values where browser-computed contrast requires it while
preserving the intended role and visual relationship.

| Role | Annotated value | Intent |
| --- | --- | --- |
| Background | `#0f172a` | Principal navy canvas |
| Foreground | `#f8fafc` | Primary content |
| Card | `#131d32` | Raised surface |
| Popover | `#172036` | Overlay surface |
| Primary | `#cdaa5b` | Gold primary action/brand |
| Primary foreground | `#0f172a` | Navy content on gold |
| Secondary | `#1b2740` | Secondary action/surface |
| Secondary foreground | `#e2e8f0` | Secondary content |
| Accent | `#24324d` | Hover/selection surface |
| Muted | `#1e293b` | Muted surface |
| Muted foreground | `#94a3b8` | Secondary text |
| Border | `#2a3852` | Default boundary |
| Input | `#24314a` | Input boundary/surface |
| Ring | `#cdaa5b` | Focus anchor, subject to 3:1 review |
| Sidebar | dark navy below background | Structural navigation |

The implemented dark theme uses navy 900 for the canvas, the supplied card and
popover surface anchors, gold 500 for primary actions, and gold 400 for focus.
The supplied input anchor remains documented as a primitive, while the active
input boundary uses navy 400 so meaningful control boundaries exceed 3:1.

## Light Companion Theme

The handoff did not define a light theme. Initiative 04 derives the shipped
companion from the same anchors:

| Role | Implemented anchor |
| --- | --- |
| Background | Navy 50 |
| Foreground | Navy 950 |
| Card and popover | White |
| Primary | Gold 700 |
| Primary foreground | White |
| Secondary and muted | Navy 100 |
| Muted foreground | Navy 600 |
| Accent | Gold 50 with navy 900 content |
| Input boundary | Navy 500 |
| Focus ring | Gold 700 |
| Sidebar | White with navy content and gold selection/focus |

## Feedback And Schedule States

The supplied feedback intent was green for success, amber for warning, sky for
information, and red for destructive actions. The supplied schedule set covered
scheduled, confirmed, waiting, in-service, completed, and canceled. Studio needs
two additional accepted schedule roles: arrived and no-show.

The shipped schedule presentation covers:

| State | Required communication |
| --- | --- |
| Scheduled | Portuguese label, symbol/icon, border/shape, optional gold color |
| Confirmed | Portuguese label, symbol/icon, border/shape, optional green color |
| Arrived | Portuguese label, distinct symbol/icon and shape; final color reviewed with design |
| Waiting | Portuguese label, symbol/icon, border/shape, optional amber color |
| In progress | Portuguese label, symbol/icon, border/shape, optional sky/blue color |
| Completed | Portuguese label, symbol/icon, border/shape, optional emerald color |
| Canceled | Portuguese label, symbol/icon, border/shape, optional red color |
| No-show | Portuguese label, distinct symbol/icon and muted/neutral treatment |

Color is never the only carrier of status meaning. Scheduling owns this
presentation vocabulary until another module proves the same semantics are
shared.

## Agenda Neutral Card Contract

ENG-43 narrows schedule status colors from full appointment surfaces to bounded
signals. Every board appointment now resolves its container from
`--schedule-appointment-surface` (`--card`) and
`--schedule-appointment-foreground` (`--card-foreground`). Status roles may
affect only the logical leading indicator, low-intensity leading tint, hover
border mix, compact symbol, status badge, and drag outline.

The Agenda component layer in `src/index.css` owns:

| Responsibility | Component tokens |
| --- | --- |
| Grid hierarchy | `--schedule-grid-surface`, `--schedule-grid-border`, `--schedule-grid-line` |
| Sticky axes | `--schedule-time-column-surface`, `--schedule-barber-header-surface` |
| Neutral card | `--schedule-appointment-surface`, `--schedule-appointment-foreground`, `--schedule-appointment-border` |
| Status signal | `--schedule-appointment-indicator-width`, `--schedule-appointment-tint` |
| Elevation | `--schedule-appointment-shadow`, `--schedule-appointment-hover-shadow`, `--schedule-appointment-drag-shadow` |
| Drop feedback | `--schedule-drop-target-surface`, `--schedule-drop-target-border` |
| Current time | `--schedule-current-time-line`, `--schedule-current-time-label-surface`, `--schedule-current-time-label-foreground` |

`data-appointment-status` maps each card to the existing schedule surface,
foreground, and border roles. The container never consumes the status surface
or foreground as its full background or body text. Medium and full cards retain
the textual badge. Compact cards retain their time/customer geometry, add the
existing status symbol as a visible non-color signal, and keep the complete
Portuguese status in the details button accessible name.

Focus replaces hover movement and adds the semantic ring around the full card.
Reduced motion removes card and overlay transforms. Forced colors removes the
tint, restores Canvas/CanvasText surfaces and structural borders, and uses
Highlight for leading/focus/drop signals.

The current-time marker reuses the semantic primary surface and foreground
through Agenda component tokens. Its visible `Agora HH:mm` label prevents a
color-only cue; forced colors maps the line and label to
`Highlight`/`HighlightText`.

## Implemented Contrast Evidence

`tests/e2e/theme.spec.ts` creates real browser elements from the shipped custom
properties and measures Chromium-computed foreground, background, and border
colors. It covers the principal semantic text pairs, feedback, focus, input
boundaries, neutral appointment containers, indicators, and status badges in
both themes. `tests/e2e/schedule-prototype.spec.ts` independently rejects
status-filled containers and covers rendered interaction states. Normal text
targets at least 4.5:1; focus and meaningful non-text boundaries target at
least 3:1.

| Feedback role | Light text | Light border | Dark text | Dark border |
| --- | ---: | ---: | ---: | ---: |
| Success | 6.81:1 | 4.79:1 | 12.30:1 | 6.54:1 |
| Warning | 8.75:1 | 4.84:1 | 12.03:1 | 6.97:1 |
| Info | 8.87:1 | 5.57:1 | 10.46:1 | 5.01:1 |
| Destructive | 7.60:1 | 5.91:1 | 11.16:1 | 4.29:1 |

| Schedule role | Light text | Light border | Dark text | Dark border |
| --- | ---: | ---: | ---: | ---: |
| Scheduled | 8.42:1 | 3.11:1 | 13.40:1 | 7.91:1 |
| Confirmed | 6.81:1 | 4.79:1 | 12.30:1 | 6.54:1 |
| Arrived | 12.11:1 | 6.90:1 | 12.11:1 | 3.98:1 |
| Waiting | 8.75:1 | 4.84:1 | 12.03:1 | 6.97:1 |
| In progress | 8.87:1 | 5.57:1 | 10.46:1 | 5.01:1 |
| Completed | 8.30:1 | 4.57:1 | 8.70:1 | 5.23:1 |
| Canceled | 7.60:1 | 5.91:1 | 11.16:1 | 4.29:1 |
| No-show | 13.88:1 | 4.35:1 | 14.23:1 | 3.78:1 |

The schedule table above now represents badge text/boundary pairs. The lowest
badge text pair is 6.81:1 and the lowest badge boundary is 3.11:1. Neutral card
text measures 19.41:1 in light and 15.53:1 in dark; the shared card boundary
measures 5.71:1 and 4.58:1 respectively. The lowest status indicator is 3.26:1
in light and 3.54:1 in dark. Browser-focused links, buttons, and inputs retain
their component box shadow and render a three-pixel opaque gold outline above
utility-layer outline resets. Browser-native sRGB canvas composition measures
that rendered outline at 5.11:1 on the light selected sidebar link and 5.36:1 on
the light page action and drawer input. Dark measurements are 6.71:1 on the
selected sidebar link, 8.80:1 on the page action, and 8.48:1 on the drawer
input. Active input boundaries measure 5.27:1 in light and 4.86:1 in dark.

## Gradient And Elevation Intent

The handoff supplied three effects:

- gold linear gradient: `#f1c871` to `#cdaa5b` to `#86652f`;
- navy surface gradient: `#172036` to `#0f172a`;
- subtle radial gold highlight using the primary gold at low opacity.

It also supplied a low-opacity gold outline with a deep elevation shadow. These
are raw inputs. Implementation must express them through named tokens that
reference accepted primitives and must not create feature-level raw gradients.

The shipped `--auth-brand-background` and `--auth-brand-shadow` component tokens
compose the restrained radial highlight, navy surface gradient, and elevation on
the desktop login preview only. Agenda appointment cards use a separate bounded
leading status tint over an otherwise neutral semantic card; schedule grids,
tables, forms, routine cards, and long reading surfaces remain on solid semantic
colors.

## Initial Theme Resolution

`public/theme-init.js` runs from the document head before the React module. It
validates the browser-local `triad-studio-theme` value, resolves `system` through
`prefers-color-scheme`, applies the dark class when needed, and sets native
`color-scheme`. `ThemeProvider` keeps responsibility for subsequent preference
and system changes. The browser suite records the class at the first animation
frame for stored light, stored dark, and system-dark cases; no incorrect-theme
frame reproduced.

## Contribution Rules

1. Check existing semantic and component tokens before adding a visual value.
2. Add a primitive only when no accepted anchor represents the value.
3. Map primitives to meaning before UI consumption.
4. Register semantic/component roles through Tailwind v4 `@theme inline`; do not
   expose the complete primitive palette merely for convenience.
5. Use shadcn built-in variants before changing component source.
6. Inspect upstream shadcn diffs before modifying a copied primitive.
7. Keep raw values out of project-owned component markup.
8. Verify light, dark, system, focus, forced colors, reduced motion, narrow
   viewport, and long/dense content where relevant.
9. Record browser-computed contrast and visual approval evidence in the PR.
10. Update this document when the implemented token contract changes.

## Rejected Direct Imports

- Do not copy the handoff's combined `:root, .dark` rule.
- Do not replace the existing `@theme inline` block or workspace token mappings.
- Do not run a shadcn preset apply operation for this migration.
- Do not create a second global stylesheet, token JSON source, or theme skill.
- Do not add missing product features from the handoff's MLP feature list.
- Do not use palette names as a substitute for semantic status or component
  meaning.
