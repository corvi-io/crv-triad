import { describe, expect, it } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import type {
  ProfessionalInput,
  ServiceInput,
  UnitInput,
} from "@/modules/barbershop-setup/contracts"

const unit: UnitInput = {
  name: "Unidade nova",
  code: "NOVA",
  address: "Rua sintética, 10",
  businessHours: { days: ["monday"], start: "09:00", end: "18:00" },
}
const professional: ProfessionalInput = {
  role: "Barbeiro",
  invitationEmail: "novo@example.invalid",
  commissionBasisPoints: 4000,
  specialties: [],
  unitIds: ["unit-center"],
  serviceIds: [],
}
const service: ServiceInput = {
  name: "Serviço novo",
  category: "Cabelo",
  description: "Corte completo",
  durationMinutes: 30,
  priceCents: 4500,
  unitIds: ["unit-center"],
  professionalIds: ["professional-alpha"],
}
describe("catalog validation preserves eligible scheduling dependencies", () => {
  it.each<Partial<UnitInput>>([
    { name: "x" },
    { businessHours: { ...unit.businessHours, periods: [] } },
    { businessHours: { ...unit.businessHours, days: [] } },
    { businessHours: { ...unit.businessHours, start: "18:00", end: "09:00" } },
  ])("rejects invalid unit %j", async (patch) => {
    const repository = new BarbershopSetupMemoryRepository()
    await expect(repository.create("unit", { ...unit, ...patch })).rejects.toThrow()
  })
  it.each<Partial<ProfessionalInput>>([
    { invitationEmail: "bad" },
    { commissionBasisPoints: -1 },
    { commissionBasisPoints: 10001 },
    { commissionBasisPoints: 1.5 },
    { unitIds: ["foreign"] },
    { serviceIds: ["foreign"] },
  ])("rejects invalid invited professional %j", async (patch) => {
    const repository = new BarbershopSetupMemoryRepository()
    await expect(repository.create("professional", { ...professional, ...patch })).rejects.toThrow()
  })
  it.each<Partial<ServiceInput>>([
    { durationMinutes: 0 },
    { priceCents: -1 },
    { unitIds: ["foreign"] },
    { professionalIds: ["foreign"] },
    { unitIds: ["unit-center"], professionalIds: ["professional-bravo"] },
  ])("rejects invalid scheduling service %j", async (patch) => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("multi-unit")
    await expect(repository.create("service", { ...service, ...patch })).rejects.toThrow()
  })
  it("rejects unknown IDs instead of creating or archiving phantom resources", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await expect(repository.update("unit", "unknown", unit)).rejects.toThrow(
      "Registro não encontrado",
    )
    await expect(repository.setArchived("service", "unknown", true)).rejects.toThrow(
      "Registro não encontrado",
    )
    await expect(
      repository.getProfessionalOperationalSummary("unknown", "2026-09-07"),
    ).rejects.toThrow()
    await expect(repository.getProfessionalCommissionBasisPoints("unknown")).rejects.toThrow()
    expect(await repository.getCommissionRateBasisPoints("unknown")).toBeUndefined()
    await expect(
      repository.resolveProfessionalService("unknown", "professional-alpha"),
    ).rejects.toThrow()
    await expect(
      repository.setProfessionalServiceOverride({
        serviceId: "service-classic",
        professionalId: "unknown",
        priceCents: 50,
      }),
    ).rejects.toThrow()
  })
  it.each([
    { displayName: "x" },
    { phone: "1" },
    { email: "invalid" },
    { primaryUnitId: "unknown" },
    { primaryUnitId: undefined },
  ])("preserves the profile on invalid update %j", async (patch) => {
    const repository = new BarbershopSetupMemoryRepository()
    const before = await repository.getCompletion("single-unit")
    await expect(repository.updateProfile({ ...before.profile, ...patch })).rejects.toThrow()
    expect((await repository.getCompletion("single-unit")).profile).toEqual(before.profile)
  })
})
