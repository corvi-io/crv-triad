# Initiative 23 UI Inventory

| Surface | Shared source | Initiative specialization | Evidence |
| --- | --- | --- | --- |
| Reception header/search | `PageHeader`, `ListSearchField`, shared filters | Unit-scoped queue freshness and three production stages | Service Desk E2E queue/layout cases |
| Walk-in admission | `ActionDrawer`, `Field`, `Input`, `Select` | Guest or canonical client exclusivity; service/professional eligibility | E2E add/focus/PII case; real HTTP guest journey |
| Queue cards/list | `Card`, `Badge`, `Avatar`, shared buttons | FIFO call/return/start/exit commands | Scheduled coherence and dense/responsive E2E |
| Service workspace | `Card`, `Select`, confirmation dialog | Sequential item start/finish/extend/remove and read-only completion | Fulfillment and fixture round-trip E2E |
| Completed history | Shared cards, filters and pagination controls | Operational completion/cancel truth without finance mutation | Real HTTP completed-history refresh |
| Sheet/Select regression | Shared Base UI primitives | Persistent starting/ending style correction | Desktop open/select/close plus 320px reduced-motion open/select/close and focus restoration |

User data remains out of URLs. Brazilian Portuguese labels/errors are preserved. The 320px check verifies no document overflow and drawer bounds; axe covers WCAG 2.2 A/AA tags.
