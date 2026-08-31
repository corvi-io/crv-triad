# Product QA Contract Catalog

Feature QA selects affected and adjacent contracts. Full-product QA executes all
active contracts and the critical cross-app journeys.

| Boundary | Contract | Primary perspective |
| --- | --- | --- |
| Public site | [site.md](site.md) | Visitor and prospective customer |
| Authenticated studio | [studio.md](studio.md) | Invited and authenticated product user |
| API and persistence | [api.md](api.md) | Browser client and authorized service actor |
| Cross-app journeys | [cross-app.md](cross-app.md) | End-to-end product outcome |

When a new business module introduces a user journey, add its contract here or
extend the owning app contract. Contracts state outcomes and risks, not component
implementation details.
