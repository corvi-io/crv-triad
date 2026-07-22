import type { ScenarioDefinition } from "@/dev/mock-engine"
import type {
  AccountAccessStatus,
  AvailabilityTimeBlock,
  SetupAvailability,
  SetupProfessional,
  SetupRecord,
  SetupScenarioId,
  SetupService,
  SetupUnit,
  Weekday,
} from "@/modules/barbershop-setup/contracts"

const weekdays: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

function unit(id: string, name: string, status: "active" | "archived" = "active"): SetupUnit {
  return {
    id,
    kind: "unit",
    name,
    code: id.replace("unit-", "").toUpperCase(),
    address: `Avenida Exemplo, ${100 + id.length} — Bairro Demonstração`,
    businessHours: {
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      start: "09:00",
      end: "19:00",
    },
    status,
  }
}

function professional(
  id: string,
  name: string,
  unitIds: readonly string[],
  serviceIds: readonly string[],
  accountAccess: AccountAccessStatus = "connected",
): SetupProfessional {
  return {
    id,
    kind: "professional",
    name,
    role: "Profissional de atendimento",
    unitIds,
    serviceIds,
    accountAccess,
    status: "active",
  }
}

function service(
  id: string,
  name: string,
  unitIds: readonly string[],
  professionalIds: readonly string[],
  index = 0,
): SetupService {
  return {
    id,
    kind: "service",
    name,
    category: index % 2 === 0 ? "Cabelo" : "Barba e cuidado",
    description: "Serviço sintético criado exclusivamente para validação visual local.",
    durationMinutes: 30 + (index % 3) * 15,
    priceCents: 3500 + index * 250,
    unitIds,
    professionalIds,
    status: "active",
  }
}

function availability(
  professionalId: string,
  unitId: string,
  conflicts = false,
): SetupAvailability[] {
  return weekdays.map((day, index) => {
    const closed = index === 6 || (conflicts && index === 5)
    const block = (
      type: "available" | "break" | "absence",
      start: string,
      end: string,
      suffix = "default",
    ): AvailabilityTimeBlock => ({
      id: `block-${professionalId}-${unitId}-${day}-${type}-${suffix}`,
      seriesId: `series-${professionalId}-${unitId}-${type}-${suffix}`,
      start,
      end,
    })
    return {
      id: `availability-${professionalId}-${day}`,
      kind: "availability" as const,
      professionalId,
      unitId,
      day,
      closed,
      periods:
        closed && index === 6
          ? []
          : conflicts && index === 0
            ? [
                block("available", "09:00", "13:00", "conflict-a"),
                block("available", "12:00", "18:00", "conflict-b"),
              ]
            : [block("available", "09:00", "18:00")],
      breaks:
        closed && index === 6
          ? []
          : conflicts && index === 1
            ? [block("break", "17:30", "18:30", "outside")]
            : conflicts && index === 2
              ? [
                  block("break", "12:00", "13:00", "conflict-a"),
                  block("break", "12:30", "13:30", "conflict-b"),
                ]
              : closed
                ? []
                : [block("break", "12:00", "13:00")],
      absences:
        conflicts && index === 3
          ? [block("absence", "14:00", "16:00", "valid")]
          : conflicts && index === 4
            ? [block("absence", "18:30", "19:30", "outside")]
            : [],
    }
  })
}

const center = unit("unit-center", "Unidade Centro")
const riverside = unit("unit-riverside", "Unidade Beira-Rio")
const workshop = unit("unit-workshop", "Unidade Oficina")
const baseServiceIds = ["service-classic", "service-beard", "service-combo", "service-care"]
const baseProfessionalIds = [
  "professional-alpha",
  "professional-bravo",
  "professional-charlie",
  "professional-delta",
]
const baseProfessionals = [
  professional("professional-alpha", "Profissional Alfa", [center.id], baseServiceIds),
  professional("professional-bravo", "Profissional Bravo", [center.id], baseServiceIds.slice(0, 3)),
  professional(
    "professional-charlie",
    "Profissional Charlie",
    [center.id],
    baseServiceIds.slice(1),
    "invited",
  ),
  professional(
    "professional-delta",
    "Profissional Delta",
    [center.id],
    baseServiceIds.slice(0, 2),
    "not-configured",
  ),
]
const baseServices = [
  service("service-classic", "Corte clássico", [center.id], baseProfessionalIds, 0),
  service("service-beard", "Barba completa", [center.id], baseProfessionalIds, 1),
  service("service-combo", "Cabelo e barba", [center.id], baseProfessionalIds.slice(0, 3), 2),
  service("service-care", "Cuidado premium", [center.id], baseProfessionalIds.slice(0, 2), 3),
]
const singleUnitRecords: SetupRecord[] = [
  center,
  ...baseProfessionals,
  ...baseServices,
  ...baseProfessionals.flatMap((item) => availability(item.id, center.id)),
]

const multiProfessionals = baseProfessionals.map((item, index) => ({
  ...item,
  unitIds: index % 2 === 0 ? [center.id, riverside.id] : [riverside.id],
}))
const multiServices = baseServices.map((item, index) => ({
  ...item,
  unitIds: index % 2 === 0 ? [center.id, riverside.id] : [riverside.id],
}))
const multiUnitRecords: SetupRecord[] = [
  center,
  riverside,
  ...multiProfessionals,
  ...multiServices,
  ...multiProfessionals.flatMap((item, index) =>
    availability(item.id, index % 2 === 0 ? center.id : riverside.id),
  ),
]

const denseUnits = [center, riverside, workshop]
const denseProfessionals = Array.from({ length: 28 }, (_, index) => {
  const id = `professional-dense-${String(index + 1).padStart(2, "0")}`
  return professional(
    id,
    `Profissional sintético ${String(index + 1).padStart(2, "0")} com nome de teste`,
    [denseUnits[index % denseUnits.length].id],
    [`service-dense-${String((index % 12) + 1).padStart(2, "0")}`],
    index % 3 === 0 ? "invited" : "connected",
  )
})
const denseServices = Array.from({ length: 36 }, (_, index) => {
  const eligible = denseProfessionals
    .filter((_, professionalIndex) => professionalIndex % 6 === index % 6)
    .map(({ id }) => id)
  return service(
    `service-dense-${String(index + 1).padStart(2, "0")}`,
    `Serviço sintético ${String(index + 1).padStart(2, "0")} com descrição longa`,
    denseUnits.map(({ id }) => id),
    eligible,
    index,
  )
})
const denseRecords: SetupRecord[] = [
  ...denseUnits,
  ...denseProfessionals,
  ...denseServices,
  ...denseProfessionals
    .slice(0, 8)
    .flatMap((item, index) => availability(item.id, denseUnits[index % 3].id)),
]

const incompleteProfessional = professional(
  "professional-incomplete",
  "Profissional sem vínculos",
  [],
  [],
  "not-configured",
)

type SetupScenarioDefinition = ScenarioDefinition<SetupRecord> & { id: SetupScenarioId }

export const barbershopSetupScenarios: readonly SetupScenarioDefinition[] = [
  {
    id: "new-business",
    label: "Novo negócio",
    description: "Primeiro acesso sem catálogos configurados.",
    records: [],
  },
  {
    id: "incomplete-setup",
    label: "Configuração incompleta",
    description: "Uma unidade e um profissional ainda sem serviços ou disponibilidade.",
    records: [center, incompleteProfessional],
  },
  {
    id: "single-unit",
    label: "Unidade única",
    description: "Operação pequena com catálogos relacionados e horários completos.",
    records: singleUnitRecords,
  },
  {
    id: "multi-unit",
    label: "Múltiplas unidades",
    description: "Profissionais e serviços distribuídos entre duas unidades.",
    records: multiUnitRecords,
  },
  {
    id: "dense-catalogs",
    label: "Catálogos densos",
    description: "Listas locais maiores e nomes longos para estresse visual limitado.",
    records: denseRecords,
  },
  {
    id: "availability-conflicts",
    label: "Conflitos de disponibilidade",
    description: "Pausas sobrepostas, ausência e dependências inválidas explícitas.",
    records: [
      ...singleUnitRecords.filter((record) => record.kind !== "availability"),
      ...baseProfessionals.flatMap((item, index) => availability(item.id, center.id, index === 0)),
    ],
  },
  {
    id: "slow",
    label: "Resposta lenta",
    description: "Latência determinística limitada para validar carregamento.",
    latencyMs: 700,
    records: singleUnitRecords,
  },
  {
    id: "next-failure",
    label: "Próxima falha",
    description: "A próxima mutação falha uma vez e permite recuperação.",
    records: singleUnitRecords,
  },
  {
    id: "persistent-error",
    label: "Erro persistente",
    description: "Consultas falham até trocar ou restaurar o cenário.",
    persistentFailure: true,
    records: singleUnitRecords,
  },
]
