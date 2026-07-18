# API Errors

## Placement

- Module-specific errors live under `src/modules/{module}/errors.py`.
- General service-layer errors live under `src/modules/shared/errors.py`.
- Cross-cutting auth errors such as `UnauthorizedError` belong in shared errors
  unless they are truly module-specific.
- REST mappings live under `src/entrypoints/rest/{module}/exceptions.py`.
- REST-wide exception handlers live under `src/entrypoints/rest/exceptions.py`.

## Naming

Prefix module-specific errors with the module concept:

- Good: `CampaignLinkDuplicateSlugError`.
- Avoid: `DuplicateSlugError`.

## HTTP Mapping

- Register module exception handlers from the REST composition root.
- Return shared error envelopes from REST handlers.
- Do not add route-level `try/except` for expected module errors unless a
  streaming or cleanup requirement makes it necessary.
