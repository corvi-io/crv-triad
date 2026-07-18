# Triad Skill Governance

## Ownership

- Triad-authored skills use the `triad-` prefix and live under `.agents/skills`.
- Downloaded or upstream skills keep their original names and should be treated
  as vendor content.
- Do not edit downloaded skills just to encode Triad policy. Create or update a
  `triad-*` skill that wraps the local behavior.

## When To Create A Skill

Create a Triad skill when:

- A workflow is repeated across PRs or initiatives.
- The project has non-obvious local conventions that generic docs will not
  capture.
- Mistakes are costly: auth, privacy, analytics, migrations, release, CI,
  accessibility, SEO, or architecture boundaries.
- The same review feedback appears more than once.

Do not create a skill when:

- A one-line `AGENTS.md` rule is enough.
- The knowledge belongs to a single short-lived task.
- The workflow is generic framework knowledge already covered by an upstream
  skill and does not need Triad policy.

## Structure

- Keep `SKILL.md` short and use `references/` for focused guides.
- Put app-wide workflows in app skills, not one skill per micro-action.
- Create module-specific skills only after module rules become repetitive and
  app-level references are too broad.
- Prefer references named by concern, for example `routes.md`, `persistence.md`,
  `auth.md`, `analytics-privacy.md`, and `testing.md`.

## Update Rule

When architecture or workflow changes affect future agent behavior, update both:

- The normative source if needed (`AGENTS.md` or durable docs).
- The relevant `triad-*` skill so agents execute the convention correctly.
