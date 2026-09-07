import { createHash } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import sharp from "sharp"
import { z } from "zod"
import type { IdpDatabase } from "../../idp/database/client.js"
import { createId } from "../../shared/infra/ids.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import { unit } from "../../units/database/schema.js"
import { businessLogoCleanup, businessProfile } from "../database/schema.js"
import { type BusinessLogoStorage, createBusinessLogoKey } from "../infra/logo-storage.js"

export class BusinessProfileError extends Error {
  constructor(readonly code: "invalid_request" | "primary_unit_invalid" | "version_conflict") {
    super(code)
  }
}

export const businessProfileInput = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: z.email().transform((value) => value.trim().toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^\+55\d{10,11}$/),
    whatsapp: z
      .string()
      .trim()
      .regex(/^\+55\d{10,11}$/)
      .nullable()
      .optional(),
    description: z.string().trim().max(500).nullable().optional(),
    website: z
      .url()
      .refine((value) => new URL(value).protocol === "https:")
      .nullable()
      .optional(),
    instagram: z
      .string()
      .trim()
      .regex(/^@?[A-Za-z0-9._]{1,30}$/)
      .transform((value) => (value.startsWith("@") ? value : `@${value}`))
      .nullable()
      .optional(),
    primaryUnitId: z.string().min(1).nullable().optional(),
    expectedVersion: z.number().int().positive().nullable(),
  })
  .strict()

export function createBusinessProfileService(db: IdpDatabase, storage?: BusinessLogoStorage) {
  async function get(actor: TenantContext) {
    const [profile] = await db
      .select()
      .from(businessProfile)
      .where(eq(businessProfile.organizationId, actor.organizationId))
      .limit(1)
    return profile ?? null
  }
  async function save(actor: TenantContext, raw: unknown) {
    const input = businessProfileInput.parse(raw)
    if (input.primaryUnitId) {
      const [activeUnit] = await db
        .select({ id: unit.id })
        .from(unit)
        .where(
          and(
            eq(unit.organizationId, actor.organizationId),
            eq(unit.id, input.primaryUnitId),
            eq(unit.status, "active"),
          ),
        )
        .limit(1)
      if (!activeUnit) throw new BusinessProfileError("primary_unit_invalid")
    }
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(businessProfile)
        .where(eq(businessProfile.organizationId, actor.organizationId))
        .limit(1)
      if ((current?.version ?? null) !== input.expectedVersion)
        throw new BusinessProfileError("version_conflict")
      const values = {
        displayName: input.displayName,
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp || null,
        description: input.description || null,
        website: input.website || null,
        instagram: input.instagram || null,
        primaryUnitId: input.primaryUnitId || null,
        updatedBy: actor.actorUserId,
        updatedAt: new Date(),
      }
      if (!current)
        await tx
          .insert(businessProfile)
          .values({ id: createId(), organizationId: actor.organizationId, ...values })
      else
        await tx
          .update(businessProfile)
          .set({ ...values, version: sql`${businessProfile.version} + 1` })
          .where(
            and(
              eq(businessProfile.organizationId, actor.organizationId),
              eq(businessProfile.version, current.version),
            ),
          )
    })
    return get(actor)
  }
  async function uploadLogo(actor: TenantContext, bytes: Uint8Array, expectedVersion: number) {
    if (!storage || bytes.byteLength > 5 * 1024 * 1024)
      throw new BusinessProfileError("invalid_request")
    const image = sharp(bytes, { failOn: "warning" }).rotate()
    const metadata = await image.metadata()
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 4096 ||
      metadata.height > 4096 ||
      !["jpeg", "png", "webp"].includes(metadata.format ?? "")
    )
      throw new BusinessProfileError("invalid_request")
    const format = metadata.format === "jpeg" ? "jpeg" : metadata.format === "png" ? "png" : "webp"
    const normalized = new Uint8Array(await image.toFormat(format).toBuffer())
    const key = createBusinessLogoKey(actor.organizationId, format === "jpeg" ? "jpg" : format)
    await storage.put(key, normalized, `image/${format}`)
    const checksum = createHash("sha256").update(normalized).digest("hex")
    const result = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(businessProfile)
        .where(eq(businessProfile.organizationId, actor.organizationId))
        .limit(1)
      if (!current || current.version !== expectedVersion)
        throw new BusinessProfileError("version_conflict")
      await tx
        .update(businessProfile)
        .set({
          logoObjectKey: key,
          logoContentType: `image/${format === "jpeg" ? "jpeg" : format}`,
          logoByteSize: normalized.byteLength,
          logoChecksum: checksum,
          logoWidth: metadata.width,
          logoHeight: metadata.height,
          version: sql`${businessProfile.version} + 1`,
          updatedBy: actor.actorUserId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(businessProfile.organizationId, actor.organizationId),
            eq(businessProfile.version, expectedVersion),
          ),
        )
      if (current.logoObjectKey)
        await tx
          .insert(businessLogoCleanup)
          .values({
            id: createId(),
            organizationId: actor.organizationId,
            objectKey: current.logoObjectKey,
          })
          .onConflictDoNothing()
      return current.logoObjectKey
    })
    if (result) storage.delete(result).catch(() => undefined)
    return get(actor)
  }
  async function logo(actor: TenantContext) {
    const current = await get(actor)
    return current?.logoObjectKey && storage ? storage.get(current.logoObjectKey) : null
  }
  async function removeLogo(actor: TenantContext, expectedVersion: number) {
    const oldKey = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(businessProfile)
        .where(eq(businessProfile.organizationId, actor.organizationId))
        .limit(1)
      if (!current || current.version !== expectedVersion)
        throw new BusinessProfileError("version_conflict")
      if (!current.logoObjectKey) return null
      await tx
        .update(businessProfile)
        .set({
          logoObjectKey: null,
          logoContentType: null,
          logoByteSize: null,
          logoChecksum: null,
          logoWidth: null,
          logoHeight: null,
          version: sql`${businessProfile.version} + 1`,
          updatedBy: actor.actorUserId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(businessProfile.organizationId, actor.organizationId),
            eq(businessProfile.version, expectedVersion),
          ),
        )
      await tx
        .insert(businessLogoCleanup)
        .values({
          id: createId(),
          organizationId: actor.organizationId,
          objectKey: current.logoObjectKey,
        })
        .onConflictDoNothing()
      return current.logoObjectKey
    })
    if (oldKey && storage) storage.delete(oldKey).catch(() => undefined)
    return get(actor)
  }
  return { get, save, uploadLogo, logo, removeLogo }
}
export type BusinessProfileService = ReturnType<typeof createBusinessProfileService>
