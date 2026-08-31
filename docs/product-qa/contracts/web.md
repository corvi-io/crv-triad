# Studio Product QA Contract

## Outcomes

- Public authentication screens remain usable while private routes render no
  unauthenticated-content flicker.
- Active invited users can authenticate, resolve their permitted landing page,
  navigate the product, perform authorized workflows, refresh, and observe the
  same persisted outcome.
- Inactive, uninvited, expired-session, and forbidden users receive deliberate
  Brazilian Portuguese recovery without protected content or private errors.
- Forms prevent duplicate mutations and expose validation, loading, disabled,
  success, error, correction, and preserved-input behavior.
- Navigation, tables, filters, selects/comboboxes, dialogs, toasts, charts, and
  empty states are visually coherent, responsive, keyboard operable, and
  screen-reader understandable.

## Required Visual Checks

Inspect desktop and mobile screenshots for every material state. For selects and
comboboxes, prove that the chosen option remains visible in the trigger, its
label does not overlap the value, the active option is conveyed visually and
semantically, and the menu remains usable at narrow widths and 200% zoom.

## Required Session And Access Checks

Exercise reload, back/forward, deep links, expired session, cross-tab or stale
cache where relevant, denied role, direct URL access, and absence of secrets or
PII in URLs, storage, console, analytics, and rendered errors.
