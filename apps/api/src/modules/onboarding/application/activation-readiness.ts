import { and, eq } from "drizzle-orm"

import { readSeries } from "../../availability/application/availability-service.js"
import {
  assertAvailable,
  assertOpeningHours,
  projectAvailability,
} from "../../availability/domain/availability.js"
import { addDate, weekday } from "../../availability/domain/time.js"
import { businessProfile } from "../../business-profile/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import { member, user } from "../../idp/database/schema.js"
import { professional, professionalUnit } from "../../professionals/database/schema.js"
import { professionalService, service, serviceUnit } from "../../services/database/schema.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import { unit } from "../../units/database/schema.js"

export const activationStepIds = [
  "business_identity",
  "primary_unit",
  "professional",
  "eligible_service",
  "availability",
] as const

const stepPresentation = {
  business_identity: [
    "Identidade da barbearia",
    "Informe os dados essenciais da barbearia.",
    "profile",
  ],
  primary_unit: [
    "Unidade principal",
    "Defina uma unidade ativa, fuso e horários de funcionamento.",
    "units",
  ],
  professional: [
    "Profissional ativo",
    "Vincule um profissional ativo à unidade principal.",
    "professionals",
  ],
  eligible_service: [
    "Serviço agendável",
    "Associe um serviço ativo à unidade e ao profissional.",
    "services",
  ],
  availability: [
    "Disponibilidade",
    "Abra um intervalo que comporte o primeiro agendamento.",
    "availability",
  ],
} as const

export function createActivationReadinessService(db: IdpDatabase, clock = () => new Date()) {
  return async (context: TenantContext) => {
    const [profile] = await db
      .select({ id: businessProfile.id, primaryUnitId: businessProfile.primaryUnitId })
      .from(businessProfile)
      .where(eq(businessProfile.organizationId, context.organizationId))
      .limit(1)

    const [location] = profile?.primaryUnitId
      ? await db
          .select()
          .from(unit)
          .where(
            and(
              eq(unit.organizationId, context.organizationId),
              eq(unit.id, profile.primaryUnitId),
              eq(unit.status, "active"),
            ),
          )
          .limit(1)
      : []
    const periods = location
      ? location.openingPeriods.length
        ? location.openingPeriods
        : [{ days: location.openingDays, start: location.openingStart, end: location.openingEnd }]
      : []
    const unitReady = Boolean(location?.timezone && periods.some((period) => period.days.length))

    const candidates = location
      ? await db
          .select({
            durationMinutes: service.durationMinutes,
            professionalId: professional.id,
            serviceId: service.id,
          })
          .from(professional)
          .innerJoin(user, eq(user.id, professional.globalUserId))
          .innerJoin(
            member,
            and(
              eq(member.organizationId, professional.organizationId),
              eq(member.userId, professional.globalUserId),
            ),
          )
          .innerJoin(
            professionalUnit,
            and(
              eq(professionalUnit.organizationId, professional.organizationId),
              eq(professionalUnit.professionalId, professional.id),
              eq(professionalUnit.unitId, location.id),
            ),
          )
          .leftJoin(
            professionalService,
            and(
              eq(professionalService.organizationId, professional.organizationId),
              eq(professionalService.professionalId, professional.id),
            ),
          )
          .leftJoin(
            service,
            and(
              eq(service.organizationId, professional.organizationId),
              eq(service.id, professionalService.serviceId),
              eq(service.status, "active"),
            ),
          )
          .leftJoin(
            serviceUnit,
            and(
              eq(serviceUnit.organizationId, professional.organizationId),
              eq(serviceUnit.serviceId, service.id),
              eq(serviceUnit.unitId, location.id),
            ),
          )
          .where(
            and(
              eq(professional.organizationId, context.organizationId),
              eq(professional.status, "active"),
              eq(user.status, "active"),
              eq(member.status, "active"),
            ),
          )
          .limit(50)
      : []
    const professionalReady = candidates.length > 0
    const eligible = candidates.filter(
      (item): item is { durationMinutes: number; professionalId: string; serviceId: string } =>
        Boolean(item.serviceId && item.durationMinutes),
    )
    const serviceReady = eligible.length > 0
    let availabilityReady = false
    if (unitReady && location?.timezone && eligible.length) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: location.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(clock())
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? ""
      const today = `${part("year")}-${part("month")}-${part("day")}`
      const end = addDate(today, 13)
      const occurrences = projectAvailability(
        await readSeries(db, context.organizationId, location.id, today, end),
        today,
        end,
      )
      availabilityReady = eligible.some((candidate) =>
        hasSchedulableSlot(candidate, location.id, today, periods, occurrences),
      )
    }

    const completed = [
      Boolean(profile),
      unitReady,
      professionalReady,
      serviceReady,
      availabilityReady,
    ]
    const steps = activationStepIds.map((id, index) => ({
      id,
      complete: completed[index] ?? false,
      title: stepPresentation[id][0],
      description: stepPresentation[id][1],
      section: stepPresentation[id][2],
    }))
    return {
      outcome: availabilityReady ? ("schedule_ready" as const) : ("setup_required" as const),
      canManage: context.role === "owner" || context.role === "admin",
      completedCount: steps.filter((step) => step.complete).length,
      totalCount: steps.length,
      nextStepId: steps.find((step) => !step.complete)?.id ?? null,
      steps,
    }
  }
}

function hasSchedulableSlot(
  candidate: { durationMinutes: number; professionalId: string },
  unitId: string,
  startDate: string,
  periods: readonly { days: readonly string[]; start: string; end: string }[],
  occurrences: ReturnType<typeof projectAvailability>,
) {
  for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
    const date = addDate(startDate, dayIndex)
    for (const period of periods.filter((item) => item.days.includes(weekday(date)))) {
      for (
        let minute = toMinute(period.start);
        minute + candidate.durationMinutes <= toMinute(period.end);
        minute += 15
      ) {
        const start = toTime(minute)
        const end = toTime(minute + candidate.durationMinutes)
        try {
          assertOpeningHours(
            {
              unitId,
              professionalId: candidate.professionalId,
              kind: "available",
              start,
              end,
              weekdays: [weekday(date)],
              effectiveFrom: date,
              effectiveUntil: date,
            },
            periods,
          )
          assertAvailable(occurrences, {
            date,
            start,
            end,
            professionalId: candidate.professionalId,
            unitId,
          })
          return true
        } catch {}
      }
    }
  }
  return false
}

const toMinute = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
const toTime = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`

export type ActivationReadinessService = ReturnType<typeof createActivationReadinessService>
