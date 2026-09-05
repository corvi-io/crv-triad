INSERT INTO "access_plan_entitlements" ("id", "plan_version_id", "capability_key", "enabled", "created_at")
SELECT md5(version.id || ':catalogs.read'), version.id, 'catalogs.read', true, now()
FROM "access_plan_versions" version
WHERE NOT EXISTS (
  SELECT 1 FROM "access_plan_entitlements" entitlement
  WHERE entitlement.plan_version_id = version.id AND entitlement.capability_key = 'catalogs.read'
);--> statement-breakpoint
INSERT INTO "access_plan_entitlements" ("id", "plan_version_id", "capability_key", "enabled", "created_at")
SELECT md5(version.id || ':catalogs.manage'), version.id, 'catalogs.manage', true, now()
FROM "access_plan_versions" version
WHERE NOT EXISTS (
  SELECT 1 FROM "access_plan_entitlements" entitlement
  WHERE entitlement.plan_version_id = version.id AND entitlement.capability_key = 'catalogs.manage'
);
