# Initiatives

Initiatives describe product or engineering work before implementation.

Use this structure:

```txt
docs/initiatives/
  templates/
    prd-template.md
    task-template.md
  prds/
    01-example-initiative.md
  tasks/
    01-example-initiative.md
```

## Workflow

1. Create or update a PRD under `prds/`.
2. Run a brainstorm before locking the solution:
   - problem framing;
   - gaps and unknowns;
   - performance and scalability risks;
   - accessibility and responsive behavior for frontend work;
   - API, IDP, security, privacy, logging, and observability concerns;
   - alternative solutions and counterproposals.
3. Create or update the execution plan under `tasks/`.
4. Use the relevant project skills during implementation:
   - `triad-architecture`;
   - `triad-api-development`;
   - `triad-idp-development`;
   - `triad-studio-development`;
   - `triad-site-development`.
5. Keep acceptance criteria and verification evidence explicit.

## Naming

Use a numeric prefix and a short English slug:

```txt
01-example-initiative.md
02-another-initiative.md
03-third-initiative.md
```

Use the same filename in `prds/` and `tasks/`.
