import { afterEach, describe, expect, it, vi } from "vitest"
import { SetupValidationError } from "@/modules/barbershop-setup/contracts"
import { BarbershopSetupHttpRepository } from "@/modules/barbershop-setup/http-repository"
import { FormSubmissionError } from "@/modules/shared/forms/form-submission-error"

describe("barbershop setup HTTP repository", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("derives setup completion from persisted catalogs and availability", async () => {
    const fetchMock = vi.fn(
      async (url: unknown) =>
        new Response(
          JSON.stringify(
            String(url).includes("/availability/summary")
              ? { activeSeries: 0 }
              : {
                  items: [],
                  page: 1,
                  pageSize: 50,
                  totalCount: 0,
                  totalPages: 0,
                },
          ),
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
    expect(fetchMock).toHaveBeenCalledTimes(4)
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

  it("maps duplicate service names to the name field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: "duplicate_name", details: { field: "name" } }), {
            headers: { "content-type": "application/json" },
            status: 400,
          }),
      ),
    )

    const repository = new BarbershopSetupHttpRepository()
    await expect(
      repository.create("service", {
        category: "Cabelo",
        description: "Corte masculino",
        durationMinutes: 30,
        name: "Corte Masculino",
        priceCents: 4_500,
        professionalIds: ["professional-a"],
        unitIds: ["unit-a"],
      }),
    ).rejects.toEqual(
      new FormSubmissionError("duplicate_name", "Já existe um registro com este nome.", "name"),
    )
  })

  it("lists and operates pending professional invitations", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              assignments: { serviceIds: [], unitIds: [] },
              email: "professional@example.com",
              expiresAt: "2099-01-01T00:00:00.000Z",
              id: "invite-a",
              role: "Barbeiro",
              specialties: [],
              status: "pending",
            },
          ]),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      )
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ status: "pending" }), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
      )
    vi.stubGlobal("fetch", fetchMock)

    const repository = new BarbershopSetupHttpRepository()
    expect(await repository.listPendingProfessionalInvitations()).toHaveLength(1)
    await repository.resendProfessionalInvitation("invite-a")
    await repository.revokeProfessionalInvitation("invite-a")

    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), init?.method])).toEqual([
      [expect.stringContaining("/api/professionals/invitations"), "GET"],
      [expect.stringContaining("/api/professionals/invitations/invite-a/resend"), "POST"],
      [expect.stringContaining("/api/professionals/invitations/invite-a/revoke"), "POST"],
    ])
  })
})
