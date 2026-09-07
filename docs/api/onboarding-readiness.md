# Onboarding Readiness And Invitation Context

Initiative 26 adds `GET /api/onboarding/readiness`, an authenticated active-tenant projection. It is
derived on every request and never persists browser or session completion.

The ordered steps are `business_identity`, `primary_unit`, `professional`, `eligible_service`, and
`availability`. `schedule_ready` means a real appointment-sized interval exists during the bounded
14-day window. Payments, commissions, reporting, logos, and appointment history are not gates.

Invitation facts remain outside IDP. IDP validates proof and lifecycle, then calls the optional
`InvitationDisplayContextProvider` only for a valid token. The business provider returns bounded
organization, professional role, unit names, optional inviter, and logo availability. It never
returns object keys, permanent URLs, email addresses, or submitted payloads. Terminal tokens receive
no business context. `POST /invitations/logo` accepts the proof only in a no-store body, shares the
resolve rate limits, validates a live invitation before storage access, and returns image bytes with
`nosniff`; a separate email-only provider accepts JPEG/PNG/WebP images up to 100,000 bytes and
derives an in-memory data representation. Larger or unavailable images fall back to contextual text
without delaying delivery. Neither surface exposes storage identity. Email retains the generic
fallback when the business provider is unavailable.

Operational logs contain stable outcome, next-step, role-class, and duration fields only. Roll out
API before Studio. Optional additions preserve existing pending invitations and can be rolled back
independently from the Agenda behavior.
