-- Existing catalog plans retain access to the production scheduling replacement.
-- Explicitly disabled entitlements remain disabled; unrelated plans are unchanged.
INSERT INTO access_plan_entitlements (id, plan_version_id, capability_key, enabled)
SELECT md5(source.plan_version_id || ':' || target.capability_key),
       source.plan_version_id, target.capability_key, true
FROM access_plan_entitlements source
CROSS JOIN (VALUES
  ('catalogs.read', 'availability.read'),
  ('catalogs.manage', 'availability.manage'),
  ('catalogs.read', 'scheduling.read'),
  ('catalogs.manage', 'scheduling.manage')
) AS target(source_key, capability_key)
WHERE source.capability_key = target.source_key AND source.enabled = true
ON CONFLICT (plan_version_id, capability_key) DO NOTHING;
