import { afterEach, describe, expect, it, vi } from "vitest"
import { SetupValidationError } from "@/modules/barbershop-setup/contracts"
import { BarbershopSetupHttpRepository } from "@/modules/barbershop-setup/http-repository"

describe("barbershop setup HTTP repository", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("derives setup completion from the three persisted catalogs", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            items: [],
            page: 1,
            pageSize: 50,
            totalCount: 0,
            totalPages: 0,
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const repository = new BarbershopSetupHttpRepository()
    const completion = await repository.getCompletion("production")

    expect(repository.catalogSource).toBe("http")
    expect(completion.readiness.steps.map(({ section }) => section)).toEqual([
      "units",
      "professionals",
      "services",
      "availability",
    ])
    expect(completion.readiness.completedCount).toBe(0)
    expect(completion.readiness.totalCount).toBe(4)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("explains when the invited email already belongs to the barbershop", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: "already_member" }), {
            headers: { "content-type": "application/json" },
            status: 400,
          }),
      ),
    )

    const repository = new BarbershopSetupHttpRepository()
    await expect(
      repository.create("professional", {
        commissionBasisPoints: 5_000,
        invitationEmail: "owner@example.com",
        role: "Barbeiro",
        serviceIds: [],
        specialties: [],
        unitIds: [],
      }),
    ).rejects.toEqual(
      new SetupValidationError(
        "Este usuário já faz parte da barbearia. Use outro e-mail para enviar o convite.",
      ),
    )
  })
})
