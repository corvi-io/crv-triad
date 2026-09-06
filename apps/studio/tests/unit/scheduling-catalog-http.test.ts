import { describe, expect, it, vi } from "vitest"
import { SetupValidationError } from "@/modules/barbershop-setup/contracts"
import { BarbershopSetupHttpRepository } from "@/modules/barbershop-setup/http-repository"

const serviceInput = {
  name: "Corte",
  category: "Cabelo",
  description: "",
  durationMinutes: 30,
  priceCents: 4500,
  unitIds: ["unit"],
  professionalIds: ["professional"],
}
const professionalInput = {
  invitationEmail: "person@example.invalid",
  role: "Barbeiro",
  commissionBasisPoints: 0,
  specialties: [],
  serviceIds: ["service"],
  unitIds: ["unit"],
}
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}
describe("scheduling catalog HTTP boundaries", () => {
  it.each([
    true,
    false,
  ])("reads the latest version before catalog archive/restore, archived=%s", async (archived) => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) =>
      response(
        init?.method === "GET" ? { id: "service", version: 7 } : { id: "service", version: 8 },
      ),
    )
    vi.stubGlobal("fetch", fetcher)
    const result = await new BarbershopSetupHttpRepository().setArchived(
      "service",
      "service",
      archived,
    )
    expect(result.version).toBe(8)
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({ version: 7 })
    expect(String(fetcher.mock.calls[1][0])).toContain(archived ? "/archive" : "/restore")
  })
  it("omits invitation-only identity fields when editing a linked professional", async () => {
    const fetcher = vi.fn(async () => response({ id: "professional" }))
    vi.stubGlobal("fetch", fetcher)
    await new BarbershopSetupHttpRepository().update(
      "professional",
      "professional",
      professionalInput,
      8,
    )
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      ...professionalInput,
      invitationEmail: undefined,
      version: 8,
    })
  })
  it.each([
    "sent",
    "skipped",
    "failed",
  ] as const)("handles invitation delivery=%s without manufacturing a professional", async (emailDelivery) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ emailDelivery })),
    )
    const result = new BarbershopSetupHttpRepository().create("professional", professionalInput)
    if (emailDelivery === "failed")
      await expect(result).rejects.toBeInstanceOf(SetupValidationError)
    else await expect(result).resolves.toBeUndefined()
  })
  it.each([
    [400, "duplicate_code", undefined, "código"],
    [400, "duplicate_name", undefined, "nome"],
    [400, "invalid_relation", "unitIds", "opções ativas"],
    [400, "invalid_request", "durationMinutes", "valor informado"],
    [400, "invalid_relation", undefined, "vínculos"],
    [400, "invitation_pending", undefined, "convite pendente"],
    [400, "invalid_request", undefined, "dados informados"],
    [409, "version_conflict", undefined, "Outra alteração"],
    [503, "invitation_delivery_failed", undefined, "entregar o convite"],
    [500, "untrusted_secret_sentinel", undefined, "Não foi possível"],
  ] as const)("maps %s/%s to actionable safe copy", async (status, code, field, expected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response(
          { code, ...(field ? { details: { field } } : {}), message: "PRIVATE_SERVER_SENTINEL" },
          status,
        ),
      ),
    )
    await expect(
      new BarbershopSetupHttpRepository().create("service", serviceInput),
    ).rejects.toThrow(expected)
  })
  it("derives readiness from real relationships and persisted availability, without adding fixture counts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) =>
        response(
          String(url).includes("availability")
            ? { activeSeries: 3 }
            : String(url).includes("professionals")
              ? [{ id: "professional", unitIds: ["unit"] }]
              : String(url).includes("services")
                ? [{ id: "service", unitIds: ["unit"], professionalIds: ["professional"] }]
                : [{ id: "unit" }],
        ),
      ),
    )
    const repository = new BarbershopSetupHttpRepository(),
      completion = await repository.getCompletion("production")
    expect(completion.readiness.completedCount).toBe(4)
    expect(completion.readiness.nextStepId).toBe("review")
    expect((await repository.getAvailability({ scenarioId: "production" })).records).toEqual([])
  })
  it("returns safe failure copy for a non-JSON upstream error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("PRIVATE_SERVER_SENTINEL", { status: 500 })),
    )
    await expect(
      new BarbershopSetupHttpRepository().create("service", serviceInput),
    ).rejects.not.toThrow("PRIVATE_SERVER_SENTINEL")
  })
})
