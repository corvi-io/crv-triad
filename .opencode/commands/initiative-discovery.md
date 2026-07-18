---
description: Discover and plan an initiative through guided questions
agent: build
---

Run a structured discovery process for a new product, design, frontend, backend, full-stack, tooling, documentation, or infrastructure initiative.

Use this command when the user provides a rough goal and wants help turning it into a PRD, execution plan, and task checklist before implementation.

## Core Behavior

- Start by understanding the workspace, local `AGENTS.md` files, existing docs, package scripts, architecture, and current branch context.
- Use all relevant available tools: repository reads/searches, MCP servers, Context7 documentation, web research, image/file reads, project skills, installed commands, and package/tooling inspection.
- If a Figma, Framer, production URL, staging URL, screenshot, API schema, issue, PRD, or reference asset is provided, inspect it before asking detailed implementation questions.
- Ask one question at a time and wait for the user answer before asking the next question.
- Ask between 10 and 20 questions total unless the user explicitly asks for more or fewer.
- Every question must include your recommendation, the option you would choose, and the reason.
- Do not implement code during discovery unless the user explicitly switches from planning to execution.
- Keep the process generic enough for frontend, backend, landing pages, APIs, data models, auth, analytics, infra, internal tools, docs, or cross-cutting work.

## First Response

In the first response:

- Restate the initiative goal in one short paragraph.
- Say that you will ask one question at a time.
- Say the process will use 10 to 20 questions unless the user changes the limit.
- Mention that recommendations will include security, privacy, LGPD, accessibility, performance, SEO, analytics, maintainability, testing, and documentation when relevant.
- Ask question 1 only.

## Question Topics

Select only the topics that fit the initiative. Do not force irrelevant topics.

- Scope and non-goals.
- Target users, business outcome, and success metrics.
- Release target, environments, rollout strategy, and branch target.
- UX, visual references, Figma/Framer/design assets, screenshots, or brand constraints.
- Responsiveness and supported devices: mobile, tablet, desktop, wide screens, reduced motion, dark mode, print, or email clients.
- Design tokens, colors, typography, spacing, Tailwind theme strategy, component variants, and brand consistency.
- SEO, metadata, structured data, canonical URLs, robots, sitemap, Open Graph, content crawlability, and localization.
- Accessibility: semantics, keyboard navigation, focus states, labels, contrast, reduced motion, screen readers, target sizes, and WCAG 2.2 AA.
- Security and privacy: LGPD, data minimization, consent, PII, secrets, logs, auth, permissions, abuse protection, rate limits, and secure defaults.
- Analytics and observability: events, properties, PII-safe tracking, PostHog, Sentry, OpenTelemetry, logs, metrics, traces, dashboards, and alerting.
- Data model, API contracts, validation, error states, duplicate submissions, idempotency, transactions, migrations, and backward compatibility.
- Performance: bundle size, image optimization, caching, third-party scripts, Core Web Vitals, query performance, N+1 risks, and deployment constraints.
- Componentization and architecture: folder boundaries, reusable primitives, composition patterns, state ownership, API clients, package boundaries, and future modules.
- Testing: unit, integration, E2E, accessibility, visual regression, contract tests, load tests, fixtures, and CI gates.
- Documentation: PRD, task plan, README, AGENTS.md, durable docs, backlog updates, ADRs, handoff notes, and runbooks.
- Skills: installed project skills, candidate skills, and whether a new skill should be installed.

## Recommendation Format For Each Question

For every question, use this exact structure:

```md
Question N/NN: <short question>

Recommendation: <your recommended option>

Why: <pragmatic reason, including risks/tradeoffs when useful>

Options:
- A. <option>
- B. <option>
- C. <option>
```

Keep each question focused. If the user gives a free-form answer, accept it and continue.

## Tool Use Requirements

- Inspect repository docs and code before assuming architecture or conventions.
- Use Context7 for current framework/library guidance when implementation depends on non-trivial external API behavior.
- Use web research for public references, standards, or product pages when current external context matters.
- Use Figma/Framer/MCP references when provided and available.
- Read images/screenshots when provided and use them as visual requirements.
- Search for relevant project skills before proposing new ones.
- Before installing a new skill, tell the user the skill name, why it fits, what risk it reduces, and ask for approval.
- If a requested tool is unavailable, state that clearly and use the closest available tool.

## Safety And Compliance

- Treat secrets, tokens, credentials, private URLs, customer data, user-submitted payloads, auth headers, and `.env` files as sensitive.
- Do not expose secrets in frontend code or browser-visible environment variables.
- Do not log PII, user-submitted payloads, credentials, tokens, or private request headers.
- Prefer data minimization and explicit consent for LGPD-sensitive flows.
- For analytics, only propose event properties that are safe and non-identifying unless the user explicitly approves a compliant strategy.
- Prefer secure defaults: validation, rate limits, CSRF/session considerations, RLS/permissions, least privilege, and safe error messages when relevant.
- Call out when legal/privacy review is needed instead of pretending to provide legal advice.

## Planning Output After Questions

After the final question is answered, produce a concise planning package in Brazilian Portuguese unless the user asks otherwise.

Include:

- Initiative summary.
- Goals and non-goals.
- Key decisions made from the Q&A.
- Requirements and acceptance criteria.
- Risks, assumptions, and open questions.
- Recommended file/document changes.
- Recommended skills to use or install, with approval status.
- Proposed task plan grouped by phases.
- Verification plan.
- Documentation updates needed.
- Suggested branch name and Conventional Commit/PR title.

Then ask whether to proceed with creating or updating the PRD/task docs.

## Documentation Creation Rules

When the user approves documentation creation:

- Create or update the relevant PRD under `docs/initiatives/prds` when the initiative is product/behavior/architecture significant.
- Create or update the matching task plan under `docs/initiatives/tasks`.
- Update root `TODO.md` only for backlog items not already covered by an active task plan.
- Update durable docs under `docs/site` or another relevant docs area only for conventions expected to outlive the initiative.
- Update app/package README files when commands, setup, architecture, or workflows change.
- Update `AGENTS.md` only for concise rules that future agents must follow.

## Execution Handoff

If the user asks to continue into implementation after planning:

- Confirm the target branch and base branch.
- Create a todo list.
- Implement the smallest correct changes.
- Preserve user-facing copy language rules from local docs.
- Run the smallest relevant verification commands.
- Do not commit, push, open PRs, or merge unless explicitly requested.
