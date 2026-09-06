import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { expect, it } from "vitest"

it("upgrades existing catalog plans without overriding denials or unrelated plans", async () => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.port === "5432" ||
    !url.pathname.endsWith("_test")
  ) {
    throw new Error("An isolated loopback test database is required")
  }
  const pool = new Pool({ connectionString: url.toString() })
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  })
  const connection = await pool.connect()
  try {
    await connection.query("BEGIN")
    const planId = randomUUID()
    const versions = [randomUUID(), randomUUID(), randomUUID()]
    await connection.query("INSERT INTO access_plans(id,key) VALUES ($1,$1)", [planId])
    for (const [index, id] of versions.entries()) {
      await connection.query(
        "INSERT INTO access_plan_versions(id,plan_id,version) VALUES ($1,$2,$3)",
        [id, planId, index + 1],
      )
    }
    for (const [version, capability, enabled] of [
      [versions[0], "catalogs.read", true],
      [versions[0], "catalogs.manage", true],
      [versions[0], "scheduling.manage", false],
      [versions[1], "catalogs.read", false],
      [versions[2], "catalogs.read", true],
    ] as const) {
      await connection.query(
        "INSERT INTO access_plan_entitlements(id,plan_version_id,capability_key,enabled) VALUES ($1,$2,$3,$4)",
        [randomUUID(), version, capability, enabled],
      )
    }
    const sql = await readFile(
      new URL("../../drizzle/0020_scheduling-plan-entitlements.sql", import.meta.url),
      "utf8",
    )
    await connection.query(sql)
    await connection.query(sql)
    const result = await connection.query(
      "SELECT plan_version_id, capability_key, enabled FROM access_plan_entitlements WHERE plan_version_id = ANY($1) AND capability_key NOT LIKE 'catalogs.%' ORDER BY capability_key",
      [versions],
    )
    expect(
      result.rows
        .filter((row) => row.plan_version_id === versions[0])
        .map(({ capability_key, enabled }) => ({ capability_key, enabled })),
    ).toEqual([
      { capability_key: "availability.manage", enabled: true },
      { capability_key: "availability.read", enabled: true },
      { capability_key: "scheduling.manage", enabled: false },
      { capability_key: "scheduling.read", enabled: true },
    ])
    expect(result.rows.filter((row) => row.plan_version_id === versions[1])).toEqual([])
    expect(
      result.rows
        .filter((row) => row.plan_version_id === versions[2])
        .map((row) => row.capability_key),
    ).toEqual(["availability.read", "scheduling.read"])
  } finally {
    await connection.query("ROLLBACK")
    connection.release()
    await pool.end()
  }
})
