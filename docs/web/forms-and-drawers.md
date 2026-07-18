# Web Forms And Action Drawers

This guide defines the reusable form and right-side action-drawer contract for `apps/web`. The
current reference forms are scaffolding that demonstrates the shared composition and accessibility
contracts until Triad product domains are defined.

## Ownership

- Keep drawer shells, bordered collapsible sections, responsive label/icon/control rows,
  shadcn/Base UI controls, footer action slots, masks, and accessibility behavior in
  `src/modules/shared`.
- Keep field inventories, icon choices, labels and placeholders, Zod schemas, React Hook Form
  values/defaults, option catalogs, dependent-field rules, submit intents, and visible form
  composition in the owning domain module.
- Keep route leaves under `src/routes/_authenticated`; route files compose a domain screen and do
  not own form behavior.
- Do not invent API payload types. Add payload adapters only after an accepted generated API
  contract exists.

## Drawer Lifecycle

Use `ActionDrawer` through `ReferenceFormDrawer` for reference creation forms. The `form` size is
640px at desktop widths and uses the available viewport width on narrower screens. The shared shell
owns the accessible title, one scrollable body, fixed header/footer, cancellation, and
dirty-discard confirmation.

Each form:

- provides a fresh default-value factory and an explicit form ID;
- may expose a typed `onReview` callback for validated local values, but reference routes do not wire
  it to persistence;
- moves focus to the first field after opening and to the first invalid field after review;
- uses `noValidate`, React Hook Form, a Zod resolver, and Brazilian Portuguese errors;
- resets only after confirmed discard or a future confirmed mutation;
- keeps command labels stable while pending and prevents duplicate submission when a real mutation
  is later wired;
- never emits a success toast or closes as though a record exists unless a real mutation confirms
  success.

All eight reference routes expose the action pair `Salvar e adicionar outro/outra` and
`Salvar <singular>` as distinct typed local submit intents. Every command performs validation only
and preserves values; none closes, resets, writes, stores a draft, emits a success toast, or presents
implementation-limit copy. Their visible and accessible titles use the audited singular order
`Novo / <entidade>`. Request and storage assertions, rather than user-visible disclaimers, enforce
the no-write boundary.

During local development, these stable URLs expose the same screens without a session for visual
review:

- `/workspace-preview/forms/companies`;
- `/workspace-preview/forms/customers`;
- `/workspace-preview/forms/products`;
- `/workspace-preview/forms/warehouses`;
- `/workspace-preview/forms/trucks`;
- `/workspace-preview/forms/drivers`;
- `/workspace-preview/forms/collaborators`;
- `/workspace-preview/forms/permission-profiles`.

The `/workspace-preview/forms` index redirects to the company preview. A shared parent route guards
the complete subtree with `env.isDevServer`; every URL redirects to `/login` in production and must
never become an authentication bypass. Preview leaves for warehouse, truck, driver, and collaborator
load explicit wrappers that inject design fixtures; authenticated leaves import the reusable screens
without those fixtures and receive empty catalogs until real options are injected. Deferred React
imports ensure creation-form and preview-wrapper chunks are requested only after the development
guard, or the authenticated `AuthGate`, actually renders the child screen. Redirected production and
unauthenticated routes must not preload either kind of domain chunk.

## Form Composition

Use `FormSection`, which composes the existing `CollapsibleDrawerSection`, for every form section.
Sections are bordered, rounded, initially open disclosures with semantic headings, chevrons,
keyboard operation, visible focus, and reduced-motion-safe transitions. Use `FormField` for
label/control rows; it presents a label column and flexible control on wide drawers, then stacks
vertically at narrow widths and zoomed layouts. Associate descriptions and errors with stable IDs
through `getFieldDescriptionIds`.

Use `FormSwitchGrid`/`FormSwitchItem` for boolean groups and `PermissionGroup` for hierarchical
permissions. A permission parent reports `aria-checked="mixed"` when only some children are selected.
This UI is draft presentation state, not proof of server authorization or enforcement.

Prefer normal typed composition over a JSON-driven universal renderer. Domain differences should be
visible in code, using slots or explicit variants instead of boolean-heavy component APIs. Keep this
web-only reuse in `apps/web`; do not introduce `packages/*`.

## Shared Controls

- `MaskedInput` receives and returns canonical strings. Formatting is display-only. The shared
  Brazilian registration policy accepts letters, digits, and common punctuation while typing,
  preserves leading zeros, caps input defensively at 32 characters, and emits uppercase
  alphanumeric IE/IM values without applying a fabricated universal checksum.
- `DatePicker` composes the shadcn Calendar and Popover primitives for every real date. It renders a
  compact 32px labelled trigger, keeps keyboard/focus/error semantics, displays PT-BR dates, and
  emits a canonical `YYYY-MM-DD` value assembled and parsed in local time. Do not use native
  `type=date` controls or date masks; year/model is not a date.
- `CompactQuantityUnitControl` combines a canonical decimal string with exactly `t`, `m³`, `kg`,
  and `un`. Use it where the design couples a quantity and selectable unit, and share one unit form
  value across related minimum/maximum fields when that is the domain contract.
- `SelectInput` is the project-owned shadcn/Base UI select for bounded local enums. Domain options and
  placeholders stay in their feature module.
- `ComboboxInput` supports free text, keyboard option navigation, loading, empty, error, and retry
  states. It caps the visible list at 50 options by default. Domain forms inject available options;
  future remote adapters must debounce, cancel stale work, and return bounded results. Never load
  every record to discover options. Focus remains on the input while `aria-activedescendant` tracks
  the active option; options stay outside the Tab order, and Tab/Shift+Tab leave and return to the
  input normally.
  Its listbox is portalled outside drawer disclosures and scroll areas, retains the trigger width,
  and uses collision-aware viewport positioning so icons and options are not clipped.
- `SwitchControl` is the project-owned shadcn/Base UI labelled boolean control. Use the project-owned
  Base UI tri-state checkbox composition for mixed hierarchical state because ARIA switches cannot
  represent `mixed`.
- `FileInput` keeps the selected `File` in memory, announces the filename, and supports removal. It
  does not upload, log, serialize, or persist the file.
- Selector-looking controls without an accepted catalog contract remain accessible local fields.
  Do not invent a catalog, upload contract, request, persistence behavior, or technical limitation
  helper.

Default controls remain 40px high. The eight audited drawers use explicit compact form variants for
their 32px fields, 72/80px textareas, and 36px footer actions; the global primitives are not shrunk.
Interactive rows and controls still preserve at least the WCAG 2.2 24px target minimum.

## Reference Form Field, Placeholder, And Icon Inventory

Field inventory, placeholder copy, and decorative icon choices are domain-owned. The focused unit inventory in
`tests/unit/reference-form-placeholders.test.tsx` asserts every label in order, required marker,
implemented prompt, and Lucide class, so omission of an icon from any of the seven non-company forms
is a regression.

| Form | Prompt comparison | Audited Lucide mapping and deliberate differences |
| --- | --- | --- |
| Company | Matched operational prompts; corrected copied supplier/client location, certificate-password, and malformed phone copy. | `RectangleEllipsis`, `BookUser`, `Type`, `CalendarSync`, `Hash`, `TextCursorInput`, `MapPin`, `Milestone`, `CalendarRange`, `Calendar`, and `Paperclip` follow the company baseline. The 28px close target exceeds the 24px accessibility minimum while its glyph remains 16px. |
| Customer | Matched general/contact prompts; corrected copied legal-name/address text in state, city, and district. Selected payment/table examples remain deliberate defaults. | Audited mappings include `RectangleEllipsis`, `BookUser`, `Type`, `FileCheck`, `Hash`, `TextCursorInput`, `MapPin`, `Milestone`, `UserRound`, `Phone`, `MessageCircle`, `Mail`, `Wallet`, `CalendarRange`, and `Calendar`. Contact icons replace semantically wrong calendar layers. |
| Product | Matched every operational prompt. NCM, CFOP, and CST reproduce the selector-like affordance as accessible local fields without inventing a fiscal catalog or upload contract. | `Contact` is the nearest category mapping; `RectangleEllipsis`, `Type`, `Hash`, `ShoppingCart`, `Tag`, and `DollarSign` follow the audit. Fiscal rows use `FileCode2` with decorative paperclip/upload affordances. |
| Warehouse | Matched; corrected the copied alias prompt to `Insira um apelido`. | `BookUser`, `Type`, `Hash`, `MapPin`, `LandPlot`, `Milestone`, and `UserRound` follow the audit; `AtSign` is the audited decorative control-prefix icon for collaborator search. Local preview catalogs are examples only, not shared policy. |
| Truck | Matched operational prompts; retained a valid Brazilian plate prompt instead of numeric copied text and expanded the truncated year/model example `2000/01` to `2000/2001`. | `TextCursorInput`, `Truck`, `Binary`, `Dock`, `Calendar`, `ChartNoAxesCombined`, `Waypoints`, `Paintbrush`, `Box`, `Hash`, and `MapPin` are the closest audited Lucide mappings. |
| Driver | Matched general/contact/company prompts; corrected copied driver-name/CPF text in CNH number and category. | `UserRound`, `CreditCard`, `Hash`, `Calendar`, `Phone`, `MessageCircle`, `Mail`, `SquareUserRound`, `CalendarClock`, `UserRoundCheck`, `Truck`, and `ReceiptText` follow the audit. |
| Collaborator | Matched company/profile/notes prompts; corrected truck/fleet/chassis copy. Username and password are enabled RHF fields; the password generator uses browser cryptographic randomness and retains the value only in form memory. | `UserRound`, `Mail`, `Phone`, `Lock`, `Building2`, `Badge`, `TextCursorInput`, and `Hash` follow the audit. Identity creation remains an IDP-owned future mutation boundary. |
| Permission profile | Matched. | Identification uses `TextCursorInput` and `AlignLeft`. The inventory records no separate thematic icon for the groups; each of the eight groups renders the audited decorative `ChevronDown` disclosure icon, which the inventory test requires. Mixed parent state uses checkbox semantics, not an invalid mixed switch, and the identification section remains bordered/collapsible per the accepted global form contract. |

## Canonical Values And Validation

Mask functions accept partial typed or pasted input, cap the canonical value, and only format it.
Schemas own completeness, impossible-date, range, checksum, and business validation. Current
canonical values are strings:

| Mask | Canonical value |
| --- | --- |
| CPF, CNPJ, CPF/CNPJ, CEP, phone | digits only |
| IE, IM | uppercase alphanumeric, maximum 32 characters; punctuation is display/editing only |
| RG | uppercase alphanumeric characters under the permissive local presentation policy |
| Vehicle plate | seven uppercase characters matching legacy `AAA0000` or Mercosur `AAA0A00` |
| Date | `YYYY-MM-DD` date-only string from `DatePicker`, with no UTC conversion |
| Year/model | eight digits |
| BRL, decimal | normalized strings with `.` as the canonical separator; a trailing `.` preserves partial fractional typing; never binary floating-point persistence |

National phone values with up to 11 digits use `(DD) ...` formatting, including DDD 55. The display
uses `+55` only when the value starts with an explicit `+` or contains more than 11 canonical digits
after the `55` country code. Phone canonical values remain digits-only, so transport policy still
belongs to a future API contract.

The mask deliberately permits a trailing decimal separator while the user is editing, such as
display `0,` and canonical `0.`. A shared Zod completeness rule rejects that partial state during
review. Complete decimal values contain digits and may include `.` only when followed by fractional
digits; optional decimal fields may also be empty.

Future APIs must define country-code behavior, decimal precision/transport, RG/plate policy, and
date-only representation before adapters are added.

## Accessibility And Responsive Behavior

- Preserve Base UI dialog naming, Escape/backdrop behavior, focus trapping, and trigger restoration.
- Give every field a visible label; mark required labels, propagate required state to the interactive
  control, and connect hints/errors with `aria-describedby`.
- Keep errors in text and focus the first invalid control; never communicate state by color alone.
- Preserve logical DOM order when visual rows become two columns.
- Support keyboard combobox navigation and announce loading/error/no-result status.
- Use motion-reduction variants for shared transitions.
- Verify representative flows at 320px, 200% zoom, keyboard-only, reduced motion, light/dark themes,
  and with a screen reader before claiming manual accessibility completion.

## Testing And Verification

Add focused tests at the narrowest useful layer:

- unit tests for masks, schemas, default factories, and hierarchical state;
- component tests for labels/errors, date picking, keyboard behavior, dirty dismissal, focus,
  selector-like local controls, final copy, and domain-dependent clearing;
- route tests for authentication, minimal content, route-level loading, and correct triggers;
- Playwright tests for desktop/mobile drawer geometry, reduced motion, focus restoration, and absence
  of unexpected write requests;
- production-preview browser tests for the dev-only/auth guards and absence of domain creation-form
  or preview-wrapper chunk requests before either guard allows child rendering.

Run the standard web validation sequence documented in `apps/web/README.md`. Inspect new source and
browser requests/storage before handoff to prove that reference forms did not introduce API/IDP
writes, autosave, draft persistence, polling, or sensitive-value logging.
