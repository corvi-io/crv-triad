import { describe, expect, it } from "vitest"
import type { Appointment } from "@/modules/scheduling/contracts"
import {
  canTransition,
  filterQueueEntries,
  formatWait,
  isAppointmentActiveAt,
  projectScheduledEntries,
  queueCounts,
  sortQueueEntries,
  waitMinutes,
} from "@/modules/service-desk/projection"
import { validateServiceDeskSearch } from "@/modules/service-desk/search"
import {
  createWalkInFormDefaults,
  walkInFormSchema,
  walkInFormValuesToInput,
} from "@/modules/service-desk/walk-in-schema"

const appointment: Appointment = {
  clientId: "client-safe",
  customerName: "Cliente Sintético",
  customerPhone: "81900000000",
  date: "2026-07-23",
  durationMinutes: 30,
  id: "appointment-safe",
  notes: "",
  origin: "reception",
  paymentStatus: "pending",
  priceCents: 3500,
  professionalId: "professional-carlos",
  serviceId: "service-simple-cut",
  start: "10:00",
  status: "waiting",
  tags: [],
  unitId: "centro",
}

function sourceDate(hours: number, minutes: number, seconds = 0) {
  return new Date(2026, 6, 23, hours, minutes, seconds)
}

describe("service desk pure rules", () => {
  it("allows only the explicit waiting-to-called-to-service journey", () => {
    expect(canTransition("waiting", "called")).toBe(true)
    expect(canTransition("called", "in-service")).toBe(true)
    expect(canTransition("waiting", "in-service")).toBe(false)
    expect(canTransition("in-service", "called")).toBe(false)
  })

  it("projects scheduled records without copying unsupported appointments", () => {
    const now = sourceDate(10, 15)
    const entries = projectScheduledEntries({
      appointments: [
        appointment,
        { ...appointment, id: "future", start: "11:00" },
        { ...appointment, id: "confirmed", status: "confirmed" },
      ],
      calledAppointmentIds: new Set(["appointment-safe"]),
      now,
    })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      appointmentId: "appointment-safe",
      id: "scheduled-appointment-safe",
      source: "scheduled",
      stage: "called",
    })
  })

  it("uses exact start-inclusive and end-exclusive current-time bounds", () => {
    expect(isAppointmentActiveAt(appointment, sourceDate(9, 59, 59))).toBe(false)
    expect(isAppointmentActiveAt(appointment, sourceDate(10, 0))).toBe(true)
    expect(isAppointmentActiveAt(appointment, sourceDate(10, 29, 59))).toBe(true)
    expect(isAppointmentActiveAt(appointment, sourceDate(10, 30))).toBe(false)
    expect(isAppointmentActiveAt(appointment, new Date(2026, 6, 24, 10, 15))).toBe(false)
  })

  it("derives exact non-negative wait durations from one supplied clock", () => {
    expect(waitMinutes("2026-07-23T09:45:00-03:00", "2026-07-23T11:30:00-03:00")).toBe(105)
    expect(formatWait("2026-07-23T09:45:00-03:00", "2026-07-23T11:30:00-03:00")).toBe("1 h 45 min")
    expect(waitMinutes("2026-07-23T12:00:00-03:00", "2026-07-23T11:30:00-03:00")).toBe(0)
  })

  it("keeps counts equal to the rendered filtered subset", () => {
    const entries = [
      ...projectScheduledEntries({
        appointments: [appointment],
        calledAppointmentIds: new Set(),
        now: sourceDate(11, 30),
      }),
      {
        arrivalAt: "2026-07-23T10:30:00-03:00",
        customerName: "Outra Pessoa",
        id: "walk-in-1",
        preferenceKind: "first-available" as const,
        priority: "fit-in" as const,
        serviceId: "service-simple-cut",
        source: "walk-in" as const,
        stage: "called" as const,
        unitId: "centro" as const,
      },
    ]
    const visible = filterQueueEntries(
      entries,
      {
        preference: "all",
        priority: "fit-in",
        professionalId: "all",
        scenarioId: "typical",
        search: "outra",
        stage: "all",
        unitId: "centro",
      },
      [{ id: "professional-carlos", name: "Carlos" }],
      [
        {
          durationMinutes: 30,
          eligibleProfessionalIds: ["professional-carlos"],
          id: "service-simple-cut",
          name: "Corte simples",
          priceCents: 3500,
        },
      ],
    )
    expect(visible.map(({ id }) => id)).toEqual(["walk-in-1"])
    expect(queueCounts(visible)).toEqual({ called: 1, "in-service": 0, waiting: 0 })
  })

  it("orders mixed scheduled and walk-in entries by arrival with a stable tie-breaker", () => {
    const entries = [
      {
        arrivalAt: "2026-07-23T10:15:00-03:00",
        customerName: "Chegada posterior",
        id: "walk-in-z",
        preferenceKind: "first-available" as const,
        priority: "normal" as const,
        serviceId: "service-simple-cut",
        source: "walk-in" as const,
        stage: "waiting" as const,
        unitId: "centro" as const,
      },
      {
        ...projectScheduledEntries({
          appointments: [appointment],
          calledAppointmentIds: new Set(),
          now: sourceDate(11, 30),
        })[0],
        arrivalAt: "2026-07-23T09:30:00-03:00",
      },
      {
        arrivalAt: "2026-07-23T09:30:00-03:00",
        customerName: "Mesmo horário",
        id: "walk-in-a",
        preferenceKind: "first-available" as const,
        priority: "normal" as const,
        serviceId: "service-simple-cut",
        source: "walk-in" as const,
        stage: "waiting" as const,
        unitId: "centro" as const,
      },
    ]
    expect(sortQueueEntries(entries).map(({ id }) => id)).toEqual([
      "scheduled-appointment-safe",
      "walk-in-a",
      "walk-in-z",
    ])
  })
})

describe("service desk URL and walk-in validation", () => {
  it("allowlists safe URL state and excludes customer-shaped text", () => {
    const search = validateServiceDeskSearch(
      {
        name: "Nome privado",
        notes: "texto livre",
        phone: "81999999999",
        preference: "specific",
        priority: "fit-in",
        professional: "professional-carlos",
        scenario: "dense",
        search: "PII",
        stage: "called",
        unit: "artesao",
      },
      ["typical", "dense"],
    )
    expect(search).toEqual({
      preference: "specific",
      priority: "fit-in",
      professional: "professional-carlos",
      scenario: "dense",
      stage: "called",
      unit: "artesao",
    })
    expect(JSON.stringify(search)).not.toContain("privado")
    expect(validateServiceDeskSearch({ professional: "Carlos Lima", scenario: "unknown" })).toEqual(
      {
        preference: "all",
        priority: "all",
        professional: "all",
        scenario: "typical",
        stage: "all",
        unit: "centro",
      },
    )
  })

  it("provides explicit Portuguese messages for every form bound", () => {
    const result = walkInFormSchema.safeParse({
      arrivalTime: "25:99",
      customerName: "A",
      customerPhone: "123",
      notes: "x".repeat(301),
      preferenceKind: "specific",
      priority: "normal",
      professionalId: "",
      serviceId: "",
    })
    expect(result.success).toBe(false)
    const messages = result.error?.issues.map(({ message }) => message) ?? []
    expect(messages).toEqual(
      expect.arrayContaining([
        "Informe um horário válido entre 00:00 e 23:59.",
        "Informe o nome do cliente com pelo menos 2 caracteres.",
        "Informe um telefone com 10 ou 11 dígitos.",
        "Use no máximo 300 caracteres nas observações.",
        "Escolha um serviço.",
        "Escolha o profissional específico.",
      ]),
    )
    expect(messages.join(" ")).not.toMatch(/too_|invalid_|expected/i)
  })

  it("creates fresh clock-based defaults and a temporary snapshot input", () => {
    const now = sourceDate(11, 30)
    expect(createWalkInFormDefaults(now)).toMatchObject({
      arrivalTime: "11:30",
      preferenceKind: "first-available",
      priority: "normal",
    })
    const input = walkInFormValuesToInput(
      {
        ...createWalkInFormDefaults(now),
        customerName: " Pessoa Exemplo ",
        customerPhone: "81900000000",
        notes: " temporário ",
        serviceId: "service-simple-cut",
      },
      now,
      "centro",
    )
    expect(input).toMatchObject({
      customerName: "Pessoa Exemplo",
      notes: "temporário",
      unitId: "centro",
    })
  })
})
