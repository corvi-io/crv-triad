import { and, eq } from "drizzle-orm"
import type { IdpDatabase } from "../../idp/database/client.js"
import { member, user } from "../../idp/database/schema.js"
import { professional, professionalUnit } from "../../professionals/database/schema.js"
import { unit } from "../../units/database/schema.js"
import { SchedulingError } from "../domain/time.js"
export type TransactionDatabase = Omit<IdpDatabase, "$client">
export async function resolveAvailabilityCatalog(
  db: TransactionDatabase,
  organizationId: string,
  unitId: string,
  professionalId: string,
) {
  const [location] = await db
    .select()
    .from(unit)
    .where(
      and(eq(unit.organizationId, organizationId), eq(unit.id, unitId), eq(unit.status, "active")),
    )
    .for("share")
  if (!location) throw new SchedulingError("invalid_relation", "unitId")
  if (!location.timezone) throw new SchedulingError("timezone_required", "unitId")
  const [person] = await db
    .select({ id: professional.id, name: user.name })
    .from(professional)
    .innerJoin(user, eq(user.id, professional.globalUserId))
    .innerJoin(
      member,
      and(eq(member.organizationId, professional.organizationId), eq(member.userId, user.id)),
    )
    .innerJoin(
      professionalUnit,
      and(
        eq(professionalUnit.organizationId, professional.organizationId),
        eq(professionalUnit.professionalId, professional.id),
      ),
    )
    .where(
      and(
        eq(professional.organizationId, organizationId),
        eq(professional.id, professionalId),
        eq(professional.status, "active"),
        eq(user.status, "active"),
        eq(member.status, "active"),
        eq(professionalUnit.unitId, unitId),
      ),
    )
    .for("share")
  if (!person) throw new SchedulingError("invalid_relation", "professionalId")
  return {
    location,
    person,
    periods: location.openingPeriods.length
      ? location.openingPeriods
      : [{ days: location.openingDays, start: location.openingStart, end: location.openingEnd }],
  }
}
