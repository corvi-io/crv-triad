# API Dependency Wiring

## Rules

- Configure application wiring explicitly from
  `src/entrypoints/rest/app.ts` or a nearby composition factory.
- Use function factories and TypeScript structural typing by default.
- Keep module persistence implementations under
  `src/modules/{module}/persistence`.
- Create a named port under `application/contracts` only when volatility,
  multiple implementations, or testing value justifies it.

## Use Case Pattern

Use the smallest contract that expresses the use case dependency:

```typescript
type CreateLeadDependencies = {
  insertLead: (lead: Lead) => Promise<void>
}

export const createLead = ({ insertLead }: CreateLeadDependencies) => {
  return async (input: CreateLeadInput) => {
    const lead = Lead.create(input)
    await insertLead(lead)
    return lead
  }
}
```

Pass fakes directly in unit tests. Do not keep alternate production in-memory
repositories for convenience.
