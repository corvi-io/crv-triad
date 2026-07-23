import type { ScenarioDefinition } from "@/dev/mock-engine"
import type { ClientRecord, ClientScenarioId } from "@/modules/clients/contracts"

const services = ["Corte clássico", "Barba", "Acabamento"]
const tags = ["frequente", "manhã", "barba"]

function client(index: number, update: Partial<ClientRecord> = {}): ClientRecord {
  const suffix = String(index).padStart(2, "0")
  const date = `2026-${String(((index + 2) % 9) + 1).padStart(2, "0")}-${String((index % 20) + 1).padStart(2, "0")}`
  return {
    appointments: [
      {
        date: "2026-08-12",
        id: `appointment-${suffix}-next`,
        professionalLabel: `Profissional sintético ${(index % 4) + 1}`,
        serviceLabel: services[index % services.length],
        status: "Agendado",
        time: "10:30",
        unitLabel: "Unidade Demonstração",
      },
      {
        date,
        id: `appointment-${suffix}-past`,
        professionalLabel: `Profissional sintético ${(index % 4) + 1}`,
        serviceLabel: services[(index + 1) % services.length],
        status: "Concluído",
        time: "14:00",
        unitLabel: "Unidade Demonstração",
      },
    ],
    createdAt: `2025-01-${String((index % 20) + 1).padStart(2, "0")}T12:00:00.000Z`,
    email: `cliente.${suffix}@example.invalid`,
    id: `client-${suffix}`,
    lastVisitAt: `${date}T14:00:00.000Z`,
    name: `Cliente Sintético ${suffix}`,
    nextAppointmentAt: "2026-08-12T10:30:00.000Z",
    notes: [
      {
        body: "Prefere atendimento objetivo e acabamento discreto.",
        createdAt: "2026-01-10T12:00:00.000Z",
        id: `note-${suffix}-01`,
        updatedAt: "2026-01-10T12:00:00.000Z",
      },
    ],
    phone: `55819${String(10000000 + index).slice(-8)}`,
    preferenceNote: "Confirmar o acabamento antes de finalizar.",
    servicePreferences: [services[index % services.length]],
    status: "active",
    tags: [tags[index % tags.length]],
    ...update,
  }
}

const typical = [
  client(1, { name: "Cliente Sintético Aurora" }),
  client(2, { name: "Cliente Sintético Horizonte" }),
  client(3, { name: "Cliente Sintético Brisa" }),
  client(4, { name: "Cliente Sintético Cedro", status: "archived" }),
  ...Array.from({ length: 12 }, (_, index) => client(index + 5)),
]

const duplicatePhone = "5581999990001"
const duplicateRecords = [
  client(1, {
    email: "duplicado.a@example.invalid",
    name: "Cliente Sintético Duplicado A",
    phone: duplicatePhone,
  }),
  client(2, {
    email: "duplicado.b@example.invalid",
    name: "Cliente Sintético Duplicado B",
    phone: duplicatePhone,
  }),
  client(3, {
    email: "igual@example.invalid",
    name: "Cliente Sintético Duplicado C",
  }),
  client(4, {
    email: "IGUAL@example.invalid",
    name: "Cliente Sintético Duplicado D",
  }),
]

function scenario(
  id: ClientScenarioId,
  records: readonly ClientRecord[],
  options: Pick<ScenarioDefinition<ClientRecord>, "latencyMs" | "persistentFailure"> = {},
): ScenarioDefinition<ClientRecord> {
  return {
    description: "Cenário técnico determinístico do diretório de clientes.",
    id,
    label: id,
    records,
    ...options,
  }
}

export const clientScenarios: readonly ScenarioDefinition<ClientRecord>[] = [
  scenario("typical", typical),
  scenario("empty", []),
  scenario(
    "dense",
    Array.from({ length: 86 }, (_, index) => client(index + 1)),
  ),
  scenario("incomplete-contact", [
    client(1, { email: "", name: "Cliente Sintético Sem E-mail" }),
    client(2, { name: "Cliente Sintético Sem Telefone", phone: "" }),
    client(3, { email: "", name: "Cliente Sintético Contato Ausente", phone: "" }),
  ]),
  scenario("duplicate-candidates", duplicateRecords),
  scenario("slow", typical, { latencyMs: 750 }),
  scenario("next-failure", typical),
  scenario("persistent-error", typical, { persistentFailure: true }),
]
