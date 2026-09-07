---
name: triad-initiative-workflow
description: Turn a CRV Triad product or technical idea into an implementation-ready PRD and dependency-ordered execution plan, with project-standard gates, traceable requirements, and verifiable completion criteria.
---

# Triad Initiative Workflow

Use this skill when an idea must become a concrete, coherent, executable
initiative or when reviewing or executing initiative documents under
`docs/initiatives`.

Write user-facing analysis in Brazilian Portuguese. Keep docs, filenames,
routes, code, commits, and PR titles in English.

## Files

- PRDs: `docs/initiatives/prds/{nn-slug}.md`
- Task plans: `docs/initiatives/tasks/{nn-slug}.md`
- Templates:
  - `docs/initiatives/templates/prd-template.md`
  - `docs/initiatives/templates/task-template.md`

Use the same filename for the PRD and task plan.

Read [references/planning-gates.md](references/planning-gates.md) whenever
creating or materially changing an initiative. It defines the mandatory
applicability review, Definition of Ready, traceability, and Definition of Done.

Creating an initiative is a planning action, not implementation approval. Always
stop after the approval handoff described below. Begin implementation only after
the user explicitly approves the resulting initiative in a subsequent request.

## Outcome

Produce two connected contracts:

1. A PRD that explains the validated problem, requirements, constraints,
   selected solution, boundaries, risks, and observable acceptance criteria.
2. An execution plan that maps every accepted requirement to dependency-ordered
   implementation work and verification evidence.

Do not treat a brainstorm, a list of generic tasks, or unresolved product
decisions as an implementation-ready initiative.

## Required Brainstorm

Before recommending or implementing a solution, explicitly think through:

- problem framing and the real workflow being improved;
- gaps, unknowns, and assumptions;
- counterpoints to the requested approach;
- simpler alternatives and stronger long-term alternatives;
- performance and scalability, including what changes with millions of records;
- security, privacy, spam/abuse, and auth/session impact;
- accessibility, responsive behavior, loading/error/empty states for frontend;
- API boundaries, query bounds, pagination, N+1 risks, and persistence shape;
- IDP boundaries: do not put product business rules in identity;
- logging, metrics, tracing, alerts, and data that must not be logged;
- which existing Triad skills and docs apply.

If the requested approach is likely not the best path, present a clear
counterproposal with tradeoffs. Do not silently implement a weaker approach.

## Required Planning Pipeline

For a new initiative or a material PRD/plan revision, read and apply these
project-installed skills in order:

1. `requirements-analysis`: diagnose the earliest unresolved requirements state,
   separate needs from proposed solutions, surface constraints and assumptions,
   and bound the smallest useful scope.
2. `spec-writer`: turn the validated requirements and repository evidence into a
   coherent product/technical contract.
3. `create-implementation-plan`: decompose the accepted contract into atomic,
   dependency-aware, verifiable work.

Do not invoke them as three independent document generators. Their findings feed
the Triad PRD and execution-plan templates defined by this skill.

The following Triad overrides are mandatory:

- Store outputs only under `docs/initiatives/prds` and
  `docs/initiatives/tasks`; do not ask for another output directory or create
  separate generic requirements files.
- Use the Triad templates, statuses, and IDs. Do not use `/plan`, remote status
  badges, or an upstream template/frontmatter.
- Do not require line numbers or exact implementation details that repository
  evidence cannot support. Tasks must be concrete without inventing code.
- Ask the user only about genuinely blocking product decisions. Repository facts,
  project standards, and conservative reversible choices should be discovered or
  recorded as assumptions.
- Keep requirements solution-independent until validated, then apply the Triad
  architecture and implementation constraints during specification and planning.

For a narrow execution-status update or checkbox/evidence update, apply only the
pipeline stage needed by the change; do not redo validated discovery without new
contradictory evidence.

## Project Skill Routing

Use other project skills as needed:

- `triad-architecture` for boundaries and durable conventions.
- `triad-api-development` for API modules, routes, use cases, persistence, and tests.
- `triad-idp-development` for authentication, sessions, users, invitations, and IDP persistence.
- `triad-studio-development` for authenticated React UI.
- `triad-site-development` for static site changes.

Use framework/vendor skills when relevant, such as Elysia, Better Auth, Drizzle,
Vitest, accessibility, or GitHub Actions docs. Triad documents, boundaries,
templates, and project skills remain authoritative when guidance conflicts.

## Workflow

1. **Discover and analyze requirements.** Read related code, PRDs, task plans,
   durable docs, applicable `AGENTS.md` files, and relevant skills. Establish the
   current behavior, actors, workflow, constraints, assumptions, unknowns, and
   evidence. Do not design from the idea alone.
2. **Specify the initiative.** Draft or update the PRD from the template. Complete
   the brainstorm, compare viable options, select a recommendation, assign stable
   requirement and acceptance-criterion IDs, and classify open questions as
   blocking or non-blocking.
3. **Pass Definition of Ready.** Apply every row of the project-standards matrix
   in `planning-gates.md` as `Applicable`, `Not applicable`, or `Deferred`, with
   rationale. Do not call the PRD ready while a blocking question, missing
   boundary decision, or untestable acceptance criterion remains.
4. **Create the implementation plan.** Only after the recommendation is clear,
   decompose work by dependency and implementation boundary. Map each task to
   requirement/acceptance IDs, expected artifacts, verification, dependencies,
   and relevant skills. Identify safe parallel work without ignoring shared-file
   or schema dependencies.
5. **Validate plan completeness.** Confirm bidirectional traceability: every
   accepted requirement has implementation and verification coverage, and every
   task exists for an accepted requirement, risk mitigation, or required
   operational work.
6. **Present for approval.** Set the approval status to `Awaiting approval` and
   give the user the mandatory approval handoff. Stop; do not implement the plan.
7. **Process the decision.** On explicit approval, set the approval status to
   `Approved`. When changes are requested, set it to `Changes requested`, revise
   both documents, re-run the applicable planning gates, and present a new
   summary. If rejected, set it to `Rejected` and do not execute it.
8. **Execute with evidence.** During approved implementation, update checkboxes only after
   their stated evidence exists. Record scope changes, skipped checks, blockers,
   and follow-ups explicitly; update the PRD when a discovery changes its
   accepted contract.
9. **Pass Definition of Done.** Complete the initiative-level gate in
   `planning-gates.md`; do not equate code completion with initiative completion.

Ask only for blocking decisions that cannot be inferred safely. Otherwise make
the narrowest conservative assumption, label it, and include its validation path.

## Mandatory Approval Handoff

The final response after creating or materially revising an initiative must be a
concise Brazilian Portuguese decision brief containing:

- initiative name and one-paragraph outcome summary;
- problem and target user or actor;
- recommended solution and why it was selected;
- in-scope and explicitly out-of-scope items;
- affected apps/modules and important data or external dependencies;
- main acceptance criteria and success signals;
- highest risks, assumptions, and unresolved decisions;
- Definition of Ready result, including any failed or deferred gate;
- links to the PRD and execution plan;
- an explicit request to `Approve`, `Request changes`, or `Reject`.

Keep the handoff useful for product judgment rather than repeating the entire
documents. If the initiative is not Ready, recommend `Request changes` and state
exactly what prevents approval. Never describe an initiative as approved based
only on its completeness or on the original request to create it.

## Verification Expectations

Every initiative should define the relevant evidence:

- API: unit tests, route behavior, type/check/build commands.
- IDP: access policy tests, env parsing, migration checks, route contracts.
- Studio/site: component/unit tests, accessibility and responsive checks, build.
- Data-heavy work: pagination/filter/sort behavior and query-bound reasoning.
- Ops work: env schema, deploy scripts, provider requirements, rollback notes.

Prefer behavioral evidence over file existence. Verification commands must be
concrete for the affected workspace, and manual checks must state the journey,
viewport or role when those details affect the outcome.

Do not claim capacity numbers unless measured or clearly estimated with
assumptions.
