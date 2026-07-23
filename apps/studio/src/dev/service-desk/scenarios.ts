import type { ScenarioDefinition } from "@/dev/mock-engine/types"
import type { QueueEntry, ServiceDeskScenarioId } from "@/modules/service-desk/contracts"

export const serviceDeskScenarioIds = [
  "typical",
  "empty",
  "dense",
  "long-wait",
  "specific-professional",
  "first-available",
  "unavailable-professional",
  "slow",
  "next-failure",
  "persistent-error",
] as const satisfies readonly ServiceDeskScenarioId[]

export function createServiceDeskScenarios(now: Date) {
  const at = (time: string, dayOffset = 0) => {
    const date = new Date(now)
    date.setDate(date.getDate() + dayOffset)
    const [hours, minutes] = time.split(":").map(Number)
    date.setHours(hours, minutes, 0, 0)
    return date.toISOString()
  }
  const walkIn = (
    id: string,
    customerName: string,
    options: Partial<QueueEntry> = {},
  ): QueueEntry => ({
    arrivalAt: at("09:40"),
    customerName,
    id,
    preferenceKind: "first-available",
    priority: "normal",
    serviceId: "service-simple-cut",
    source: "walk-in",
    stage: "waiting",
    unitId: "centro",
    ...options,
  })
  const typical = [
    walkIn("walk-in-typical-first", "Rui Sintético", {
      arrivalAt: at("10:05"),
      notes: "Contato temporário para avaliação da recepção.",
    }),
    walkIn("walk-in-typical-specific", "Nara Exemplo", {
      arrivalAt: at("10:20"),
      preferenceKind: "specific",
      priority: "fit-in",
      professionalId: "professional-ana",
      serviceId: "service-fade",
    }),
  ]
  const dense = Array.from({ length: 18 }, (_, index) =>
    walkIn(`walk-in-dense-${String(index + 1).padStart(2, "0")}`, `Pessoa Sintética ${index + 1}`, {
      arrivalAt: at(
        `${String(8 + Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`,
      ),
      preferenceKind: index % 2 === 0 ? "specific" : "first-available",
      priority: index % 4 === 0 ? "fit-in" : "normal",
      professionalId: index % 2 === 0 ? "professional-bruno" : undefined,
      serviceId: index % 3 === 0 ? "service-fade" : "service-simple-cut",
      stage: index % 5 === 0 ? "called" : index % 7 === 0 ? "in-service" : "waiting",
    }),
  )
  const definitions = [
    {
      id: "typical",
      label: "Normal",
      description: "Fila normal com trajetos agendado e sem agendamento.",
      records: typical,
    },
    { id: "empty", label: "Vazio", description: "Fila sem registros.", records: [] },
    {
      id: "dense",
      label: "Denso",
      description: "Coleção limitada para avaliação visual densa.",
      records: dense,
    },
    {
      id: "long-wait",
      label: "Espera longa",
      description: "Registro com espera longa e conteúdo extenso.",
      records: [
        walkIn("walk-in-long-wait", "Cliente Sintético Com Nome Deliberadamente Longo", {
          arrivalAt: at("07:15"),
          notes:
            "Observação sintética longa para avaliar quebra de linha sem dados pessoais reais.",
          priority: "fit-in",
        }),
      ],
    },
    {
      id: "specific-professional",
      label: "Profissional específico",
      description: "Preferência por profissional específico.",
      records: [
        walkIn("walk-in-specific", "Ivo Demonstração", {
          preferenceKind: "specific",
          professionalId: "professional-carlos",
        }),
      ],
    },
    {
      id: "first-available",
      label: "Primeiro disponível",
      description: "Preferência sem atribuição automática.",
      records: [walkIn("walk-in-first-available", "Bia Demonstração")],
    },
    {
      id: "unavailable-professional",
      label: "Profissional indisponível",
      description: "Transição recuperável para profissional indisponível.",
      records: [
        walkIn("walk-in-unavailable", "Lia Demonstração", {
          preferenceKind: "specific",
          professionalId: "professional-carlos",
          stage: "called",
        }),
      ],
    },
    {
      id: "slow",
      label: "Lento",
      description: "Resposta com atraso determinístico.",
      latencyMs: 900,
      records: typical,
    },
    {
      id: "next-failure",
      label: "Próxima falha",
      description: "A próxima operação falha antes de escrever.",
      records: typical,
    },
    {
      id: "persistent-error",
      label: "Erro persistente",
      description: "Operações falham até a troca de cenário.",
      persistentFailure: true,
      records: typical,
    },
  ] satisfies readonly (ScenarioDefinition<QueueEntry> & { id: ServiceDeskScenarioId })[]
  return definitions
}
