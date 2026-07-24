import { describe, expect, it } from "vitest"
import type { ServiceSession } from "@/modules/service-desk/contracts"
import {
  formatSessionElapsed,
  isSessionReadyToFinish,
} from "@/modules/service-desk/session-projection"

const session: ServiceSession = {
  customerName: "Pessoa Sintética",
  id: "session-safe",
  items: [
    {
      addedAt: "2026-07-23T10:00:00-03:00",
      id: "initial",
      professionalId: "professional-1",
      serviceId: "service-1",
      source: "initial",
    },
  ],
  notes: "",
  now: "2026-07-23T11:30:00-03:00",
  professionals: [{ id: "professional-1", name: "Profissional" }],
  queueEntryId: "queue-safe",
  services: [
    {
      durationMinutes: 30,
      eligibleProfessionalIds: ["professional-1"],
      id: "service-1",
      name: "Serviço",
      priceCents: 0,
    },
  ],
  source: "walk-in",
  startedAt: "2026-07-23T10:00:00-03:00",
  status: "in-progress",
  unitId: "centro",
  unitName: "Centro",
  unavailableProfessionalIds: [],
}

describe("service session projections", () => {
  it("formats exact non-negative elapsed boundaries", () => {
    expect(formatSessionElapsed(session.startedAt, session.startedAt)).toBe("0 min")
    expect(formatSessionElapsed(session.startedAt, "2026-07-23T11:30:00-03:00")).toBe("1 h 30 min")
    expect(formatSessionElapsed(session.startedAt, "2026-07-23T09:59:00-03:00")).toBe("0 min")
  })

  it("requires an eligible available professional on every item", () => {
    expect(isSessionReadyToFinish(session)).toBe(true)
    expect(
      isSessionReadyToFinish({ ...session, unavailableProfessionalIds: ["professional-1"] }),
    ).toBe(false)
    expect(isSessionReadyToFinish({ ...session, status: "ready-for-payment" })).toBe(false)
  })
})
