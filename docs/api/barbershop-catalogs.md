# Barbershop Catalogs

Units, professional employment relationships, and services are tenant-owned production catalogs
exposed at `/api/units`, `/api/professionals`, and `/api/services`. Each API supports bounded
server-side lists, detail, optimistic update, archive, restore, and `/options` projections. Units
and services support direct creation. Professionals use `POST /api/professionals/invite` and become
active only when the identity invitation is accepted. Mutations never accept a
tenant identifier from the browser.

Professional invitations always create a basic `member` tenant membership. The visible
professional `role` is the business function, such as `Barbeiro` or `Atendente`, and never changes
authorization. Administrator promotion and ownership transfer belong to the protected access
configuration flows, outside professional onboarding.

Units and services may be created independently. Professional-to-unit, service-to-unit, and
professional-to-service assignments are stored with tenant-safe compound foreign keys. A service
and professional can be linked only when they share an active unit. Archive preserves assignments
and historical references.

Units persist one or more weekly opening periods. Each period assigns one valid start/end range to
a disjoint set of weekdays, allowing weekday and Saturday hours to differ without an ambiguous day
belonging to multiple periods. Existing single-period records are backfilled during migration.

Migration `0016_curved_pride.sql` removes legacy professional rows without `global_user_id` before
making the identity reference mandatory. Those rows represented the rejected standalone-employee
model and cannot be converted safely by matching personal contact fields.

Current option projections are appropriate for future operational selection. Transaction owners
must persist the catalog ID plus event-time names, durations, prices, and rules needed for historical
truth; they must not recompute paid or completed history from the current catalog.

Availability, payment configuration, scheduling,
service fulfillment, and checkout remain outside this production boundary.
