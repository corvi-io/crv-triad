import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { platformOperator } from "../../backstage/database/schema.js"
import { loadEnv } from "../../idp/config/env.js"
import { createDatabase, type IdpDatabase } from "../../idp/database/client.js"
import { member, organization, user } from "../../idp/database/schema.js"
import { createAuth } from "../../idp/identity/auth.js"
import { createId } from "../../shared/infra/ids.js"

const argsSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  userId: z.string().trim().min(1).max(128),
})

type OrganizationServerApi = {
  createOrganization(input: {
    body: {
      keepCurrentActiveOrganization: boolean
      name: string
      slug: string
      userId: string
    }
  }): Promise<{ id: string } | null>
}

export function parseBootstrapTenantArgs(argv: string[]) {
  const values: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--user-id") values.userId = argv[index + 1]
    if (argv[index] === "--name") values.name = argv[index + 1]
    if (argv[index] === "--slug") values.slug = argv[index + 1]
  }
  return argsSchema.parse(values)
}

export async function bootstrapTenant(
  db: IdpDatabase,
  authApi: OrganizationServerApi,
  input: z.infer<typeof argsSchema>,
) {
  const [existingUser] = await db
    .select({ id: user.id, status: user.status })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1)
  if (existingUser?.status !== "active") {
    throw new Error("An active IDP user is required.")
  }

  let [tenant] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, input.slug))
    .limit(1)
  let createdOrganization = false

  if (!tenant) {
    const created = await authApi.createOrganization({
      body: {
        keepCurrentActiveOrganization: true,
        name: input.name,
        slug: input.slug,
        userId: input.userId,
      },
    })
    if (!created) throw new Error("Better Auth did not create the organization.")
    tenant = { id: created.id }
    createdOrganization = true
  }

  const [owner] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.organizationId, tenant.id),
        eq(member.userId, input.userId),
        eq(member.role, "owner"),
        eq(member.status, "active"),
      ),
    )
    .limit(1)
  if (!owner) throw new Error("The organization does not have the requested active owner.")

  const [operator] = await db
    .insert(platformOperator)
    .values({ id: createId(), userId: input.userId })
    .onConflictDoNothing({ target: platformOperator.userId })
    .returning({ id: platformOperator.id })
  const [persistedOperator] = operator
    ? [operator]
    : await db
        .select({ id: platformOperator.id })
        .from(platformOperator)
        .where(eq(platformOperator.userId, input.userId))
        .limit(1)
  if (!persistedOperator) throw new Error("Platform operator assignment could not be confirmed.")

  return {
    createdOrganization,
    organizationId: tenant.id,
    ownerMembershipId: owner.id,
    platformOperatorId: persistedOperator.id,
  }
}

async function main() {
  const input = parseBootstrapTenantArgs(process.argv.slice(2))
  const env = loadEnv()
  const { db, pool } = createDatabase(env)
  const auth = createAuth(env, db)
  try {
    await bootstrapTenant(db, auth.api as unknown as OrganizationServerApi, input)
  } finally {
    await pool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
