import type {
  AppointmentOperationalEvent,
  OperationalNotificationSources,
  PaymentNotificationSourceSnapshot,
  SchedulingNotificationSourceSnapshot,
  ServiceNotificationSourceSnapshot,
} from "@/modules/operational-notifications/rules"
import type { Checkout, PaidSale } from "@/modules/revenue-operations/contracts"
import type {
  Appointment,
  Professional,
  SchedulePeriod,
  Service,
} from "@/modules/scheduling/contracts"
import type { QueueEntry, ServiceSession } from "@/modules/service-desk/contracts"

export const operationalNotificationScenarioIds = [
  "normal",
  "empty",
  "duplicates",
  "overflow",
  "resolved",
  "missing-target",
  "slow",
  "slow-read",
  "fail-next-read",
  "persistent-error",
  "long-content",
] as const

export type OperationalNotificationScenarioId = (typeof operationalNotificationScenarioIds)[number]

const sourceNow = "2026-07-24T15:35:00-03:00"
const professional: Professional = { id: "professional-carlos", name: "Carlos Sintético" }
const service: Service = {
  durationMinutes: 45,
  eligibleProfessionalIds: [professional.id],
  id: "service-hair-beard",
  name: "Cabelo e barba",
  priceCents: 6500,
}

const conflict = appointment("kanban-01", "15:00", 45)
const conflictPeer = appointment("operational-conflict-peer", "15:15", 30)
const upcoming = {
  ...appointment("kanban-05", "15:40", 45),
  professionalId: "professional-ana",
}
const blockedPeriod: SchedulePeriod = {
  end: "17:00",
  id: "blocked-slot",
  kind: "blocked",
  label: "Bloqueio operacional",
  professionalId: professional.id,
  start: "16:00",
}
const appointmentChange: AppointmentOperationalEvent = {
  appointmentId: "kanban-04",
  date: "2026-07-24",
  id: "appointment-changed:kanban-04",
  kind: "changed",
  occurredAt: "2026-07-24T15:00:00-03:00",
  unitId: "centro",
  version: 2,
}
const waitingEntry: QueueEntry = {
  arrivalAt: "2026-07-24T15:00:00-03:00",
  customerName: "Pessoa em espera",
  id: "walk-in-notification-wait",
  preferenceKind: "first-available",
  priority: "normal",
  serviceId: service.id,
  sessionId: "session-walk-in-fulfillment-long-running",
  source: "walk-in",
  stage: "waiting",
  unitId: "centro",
}
const overdueSession = session("session-walk-in-fulfillment-multiple", "13:00")
const pendingCheckout = checkout("session-walk-in-fulfillment-ready", "open")
const paidCheckout = checkout("session-walk-in-checkout-paid", "paid")
const paidSale: PaidSale = {
  commissions: [],
  completedAt: "2026-07-24T15:10:00-03:00",
  discountCents: 0,
  id: `paid-sale-${paidCheckout.id}`,
  lines: [],
  source: "walk-in",
  surchargeCents: 0,
  tenders: [],
  totalCents: 6500,
  unitId: "centro",
}

const normalScheduling: SchedulingNotificationSourceSnapshot = {
  appointments: [conflict, conflictPeer, upcoming],
  events: [appointmentChange],
  periods: [blockedPeriod],
}
const normalService: ServiceNotificationSourceSnapshot = {
  queue: [waitingEntry],
  sessions: [overdueSession],
}
const normalPayments: PaymentNotificationSourceSnapshot = {
  checkouts: [pendingCheckout, paidCheckout],
  paidSales: [paidSale],
}
const emptyScheduling: SchedulingNotificationSourceSnapshot = {
  appointments: [],
  events: [],
  periods: [],
}
const emptyService: ServiceNotificationSourceSnapshot = { queue: [], sessions: [] }
const emptyPayments: PaymentNotificationSourceSnapshot = { checkouts: [], paidSales: [] }

export function createOperationalNotificationSources(): OperationalNotificationSources {
  return {
    clock: { now: () => sourceNow },
    payments: {
      async getSnapshot({ scenarioId }) {
        return paymentsForScenario(scenarioId)
      },
    },
    scheduling: {
      async getSnapshot({ scenarioId }) {
        return schedulingForScenario(scenarioId)
      },
    },
    service: {
      async getSnapshot({ scenarioId }) {
        return serviceForScenario(scenarioId)
      },
    },
  }
}

function schedulingForScenario(scenarioId: string): SchedulingNotificationSourceSnapshot {
  if (scenarioId === "empty" || scenarioId === "resolved" || scenarioId === "missing-target")
    return emptyScheduling
  if (scenarioId === "overflow") {
    return {
      appointments: [],
      events: Array.from({ length: 105 }, (_, index) => ({
        ...appointmentChange,
        appointmentId: `kanban-${String((index % 42) + 1).padStart(2, "0")}`,
        id: `appointment-changed:overflow-${String(index).padStart(3, "0")}`,
        occurredAt: `2026-07-24T${String(10 + Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00-03:00`,
        version: 1,
      })),
      periods: [],
    }
  }
  if (scenarioId === "duplicates") {
    return { ...normalScheduling, events: [appointmentChange, { ...appointmentChange }] }
  }
  return normalScheduling
}

function serviceForScenario(scenarioId: string): ServiceNotificationSourceSnapshot {
  if (
    scenarioId === "empty" ||
    scenarioId === "resolved" ||
    scenarioId === "overflow" ||
    scenarioId === "missing-target"
  ) {
    if (scenarioId !== "missing-target") return emptyService
    return {
      queue: [{ ...waitingEntry, id: "walk-in-missing-target", sessionId: "unsafe/id" }],
      sessions: [],
    }
  }
  return normalService
}

function paymentsForScenario(scenarioId: string): PaymentNotificationSourceSnapshot {
  if (scenarioId === "empty" || scenarioId === "overflow" || scenarioId === "missing-target")
    return emptyPayments
  if (scenarioId === "resolved") return { checkouts: [paidCheckout], paidSales: [paidSale] }
  return normalPayments
}

function appointment(id: string, start: string, durationMinutes: number): Appointment {
  return {
    clientId: `client-${id}`,
    customerName: "Pessoa sintética",
    customerPhone: "81900000000",
    date: "2026-07-24",
    durationMinutes,
    id,
    notes: "Dados sintéticos para a fonte operacional.",
    origin: "reception",
    paymentStatus: "pending",
    priceCents: 6500,
    professionalId: professional.id,
    serviceId: service.id,
    start,
    status: "confirmed",
    tags: [],
    unitId: "centro",
  }
}

function session(id: string, start: string): ServiceSession {
  return {
    customerName: "Pessoa em atendimento",
    id,
    items: [
      {
        addedAt: `2026-07-24T${start}:00-03:00`,
        id: `item-${id}`,
        professionalId: professional.id,
        serviceId: service.id,
        source: "initial",
      },
    ],
    notes: "",
    now: sourceNow,
    professionals: [professional],
    queueEntryId: `queue-${id}`,
    services: [service],
    source: "walk-in",
    startedAt: `2026-07-24T${start}:00-03:00`,
    status: "in-progress",
    unitId: "centro",
    unitName: "Centro",
    unavailableProfessionalIds: [],
  }
}

function checkout(id: string, status: Checkout["status"]): Checkout {
  return {
    adjustmentAuthorized: true,
    adjustments: { discountCents: 0, surchargeCents: 0 },
    customerName: "Pessoa em pagamento",
    finishedAt: "2026-07-24T14:50:00-03:00",
    id,
    lines: [],
    source: "walk-in",
    status,
    tenders: [],
    totalCents: 6500,
    unitId: "centro",
    unitName: "Centro",
  }
}
