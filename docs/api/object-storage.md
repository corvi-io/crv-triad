# Object Storage Ownership And Key Conventions

Cloudflare R2 buckets are environment-specific and split by access policy. Object ownership is
encoded independently in the key so lifecycle cleanup cannot confuse tenant data with identity
data. Keys use opaque IDs and never include names, email addresses, or other PII.

## Ownership Roots

- `users/{userId}/...` contains identity-owned assets. These assets belong to the user and must not
  be deleted when any tenant membership or tenant is removed.
- `tenants/{tenantId}/...` contains business-owned assets. These assets may be selected for bounded,
  auditable cleanup when that tenant is deleted according to its retention policy.

## Current Keys

- Profile avatar: `users/{userId}/profile/avatar/{assetId}.{ext}`
- Barbershop logo: `tenants/{tenantId}/branding/logo/{assetId}.{ext}`
- Generated report: `tenants/{tenantId}/reports/{reportType}/{year}/{month}/{requestId}/attempt-{attempt}.csv`

Reports and authenticated media remain in the private bucket. Public assets may use the same
ownership roots in the public bucket, but bucket visibility does not change ownership or deletion
semantics. Legacy keys remain readable until the owning record is replaced or its existing retention
rule expires; no broad migration or deletion should be inferred from the new convention.
