import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OnboardingAvailabilityStep } from "@/modules/barbershop-setup/onboarding-availability-step"
import { useBusinessProfile, useSetupEntities } from "@/modules/barbershop-setup/queries"
import {
  createSchedulingCommandClient,
  schedulingRequest,
} from "@/modules/scheduling/http-repository"

vi.mock("@/modules/barbershop-setup/queries", () => ({
  useBusinessProfile: vi.fn(),
  useSetupEntities: vi.fn(),
}))
vi.mock("@/modules/scheduling/http-repository", () => ({
  createSchedulingCommandClient: vi.fn(),
  schedulingRequest: vi.fn(),
}))
vi.mock("@/modules/scheduling/queries", () => ({
  invalidateSchedulingConsumers: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/modules/workspace/context-provider", () => ({
  useWorkspaceTenantId: () => "tenant-a",
}))

const unit = {
  id: "unit-a",
  kind: "unit" as const,
  name: "Unidade Recife",
  businessHours: {
    days: ["monday", "tuesday"],
    start: "09:00",
    end: "18:00",
    periods: [{ days: ["monday", "tuesday"], start: "09:00", end: "18:00" }],
  },
}

describe("onboarding availability step", () => {
  afterEach(() => vi.clearAllMocks())

  it("starts from the unit opening period and persists the first weekly series", async () => {
    const command = vi.fn().mockResolvedValue({})
    vi.mocked(createSchedulingCommandClient).mockReturnValue(command)
    mockQueries()
    const onCompleted = vi.fn()
    renderStep(onCompleted)

    expect(
      await screen.findByRole("heading", { name: "Defina a primeira disponibilidade" }),
    ).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Seg" })).toHaveAttribute("aria-pressed", "true"),
    )
    expect(screen.getByRole("button", { name: "Ter" })).toHaveAttribute("aria-pressed", "true")

    await userEvent.click(screen.getByRole("button", { name: "Salvar e revisar" }))

    await waitFor(() =>
      expect(command).toHaveBeenCalledWith(
        "/api/availability/series",
        expect.objectContaining({
          end: "18:00",
          professionalId: "professional-a",
          start: "09:00",
          unitId: "unit-a",
          weekdays: ["monday", "tuesday"],
        }),
        "POST",
      ),
    )
    expect(onCompleted).toHaveBeenCalledOnce()
  })

  it("validates missing days without sending a command", async () => {
    const command = vi.fn()
    vi.mocked(createSchedulingCommandClient).mockReturnValue(command)
    mockQueries()
    renderStep(vi.fn())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Seg" })).toHaveAttribute("aria-pressed", "true"),
    )

    await userEvent.click(screen.getByRole("button", { name: "Seg" }))
    await userEvent.click(screen.getByRole("button", { name: "Ter" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar e revisar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Selecione pelo menos um dia.")
    expect(command).not.toHaveBeenCalled()
  })

  it("keeps the form recoverable when persistence fails", async () => {
    vi.mocked(createSchedulingCommandClient).mockReturnValue(
      vi.fn().mockRejectedValue(new Error("Horário fora do funcionamento da unidade.")),
    )
    mockQueries()
    renderStep(vi.fn())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Seg" })).toHaveAttribute("aria-pressed", "true"),
    )

    await userEvent.click(screen.getByRole("button", { name: "Salvar e revisar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Horário fora do funcionamento da unidade.",
    )
    expect(screen.getByRole("button", { name: "Salvar e revisar" })).toBeEnabled()
  })

  it("explains unmet dependencies instead of rendering an invalid form", async () => {
    mockQueries({ professionals: [] })
    renderStep(vi.fn())
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Conclua a unidade principal e vincule um profissional ativo",
    )
  })

  it("offers one retry when a required query fails", async () => {
    const refetch = vi.fn()
    mockQueries({ unitsError: true, refetch })
    renderStep(vi.fn())
    await userEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }))
    expect(refetch).toHaveBeenCalled()
  })

  it("waits for prerequisites and rejects a unit without an operational timezone", async () => {
    mockQueries({ profilePending: true })
    const view = renderStep(vi.fn())
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument()
    view.unmount()

    mockQueries({ timezone: null })
    renderStep(vi.fn())
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Conclua a unidade principal e vincule um profissional ativo",
    )
  })

  it("requires the ending time to be later than the starting time", async () => {
    mockQueries()
    renderStep(vi.fn())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Seg" })).toHaveAttribute("aria-pressed", "true"),
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole("combobox", { name: "Início" }))
    await user.click(await screen.findByRole("option", { name: "18:00" }))
    await user.click(screen.getByRole("button", { name: "Salvar e revisar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O término deve ser posterior ao início.",
    )
  })

  it.each([
    "profile",
    "catalog",
    "professionals",
  ] as const)("offers recovery when the %s dependency fails", async (dependency) => {
    mockQueries({
      catalogError: dependency === "catalog",
      profileError: dependency === "profile",
      professionalsError: dependency === "professionals",
    })
    renderStep(vi.fn())
    expect(await screen.findByText("Não foi possível preparar a disponibilidade.")).toBeVisible()
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled()
  })

  it("uses the generic recovery copy for an unknown persistence failure", async () => {
    vi.mocked(createSchedulingCommandClient).mockReturnValue(vi.fn().mockRejectedValue("offline"))
    mockQueries()
    renderStep(vi.fn())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Seg" })).toHaveAttribute("aria-pressed", "true"),
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar e revisar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar. Tente novamente.",
    )
  })
})

function mockQueries({
  professionals = [{ id: "professional-a", name: "Ana", unitIds: ["unit-a"] }],
  catalogError = false,
  profileError = false,
  professionalsError = false,
  refetch = vi.fn(),
  profilePending = false,
  timezone = "America/Recife" as string | null,
  unitsError = false,
}: {
  professionals?: { id: string; name: string; unitIds: string[] }[]
  catalogError?: boolean
  profileError?: boolean
  professionalsError?: boolean
  refetch?: ReturnType<typeof vi.fn>
  profilePending?: boolean
  timezone?: string | null
  unitsError?: boolean
} = {}) {
  vi.mocked(useBusinessProfile).mockReturnValue({
    data: { primaryUnitId: "unit-a" },
    isPending: profilePending,
    isError: profileError,
    refetch,
  } as never)
  vi.mocked(useSetupEntities).mockReturnValue({
    data: { items: [unit] },
    isPending: false,
    isError: catalogError,
    refetch,
  } as never)
  vi.mocked(schedulingRequest).mockResolvedValueOnce([
    { id: "unit-a", name: "Unidade Recife", timezone },
  ])
  if (professionalsError) vi.mocked(schedulingRequest).mockRejectedValueOnce(new Error("Offline"))
  else vi.mocked(schedulingRequest).mockResolvedValueOnce(professionals)
  if (unitsError) vi.mocked(schedulingRequest).mockReset().mockRejectedValue(new Error("Offline"))
}

function renderStep(onCompleted: () => void) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cache}>
      <OnboardingAvailabilityStep scenarioId="single-unit" onCompleted={onCompleted} />
    </QueryClientProvider>,
  )
}
