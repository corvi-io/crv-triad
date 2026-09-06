import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import {
  BusinessProfileSection,
  PaymentsSection,
} from "@/modules/barbershop-setup/completion-sections"
import type {
  BarbershopSetupRepository,
  SetupCompletion,
} from "@/modules/barbershop-setup/contracts"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"

describe("initiative 25 setup production surfaces", () => {
  it("keeps the profile draft visible after a version conflict and a rejected logo", async () => {
    const user = userEvent.setup()
    const updateProfile = vi.fn(async () => {
      throw new Error("Outra alteração foi salva. Revise a versão mais recente.")
    })
    const uploadBusinessLogo = vi.fn(async () => {
      throw new Error("O arquivo não é uma imagem válida.")
    })
    renderSurface(<BusinessProfileSection scenarioId="production" />, {
      ...repository,
      updateProfile,
      uploadBusinessLogo,
    })
    expect(await screen.findByDisplayValue("Barbearia Centro")).toBeInTheDocument()
    const name = screen.getByLabelText("Nome de exibição")
    await user.clear(name)
    await user.type(name, "Barbearia Atualizada")
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }))
    expect(await screen.findByText(/Outra alteração foi salva/)).toBeInTheDocument()
    expect(name).toHaveValue("Barbearia Atualizada")
    await user.upload(
      screen.getByLabelText("Logotipo"),
      new File(["invalid"], "logo.png", { type: "image/png" }),
    )
    expect(await screen.findByText("O arquivo não é uma imagem válida.")).toBeInTheDocument()
    expect(uploadBusinessLogo).toHaveBeenCalledWith(expect.any(File), 3)
  })

  it("persists profile, uploads and removes a logo while advancing the visible version", async () => {
    const user = userEvent.setup()
    const updateProfile = vi.fn(async (value: SetupCompletion["profile"]) => ({
      ...value,
      version: 4,
    }))
    const uploadBusinessLogo = vi.fn(async (_file: File, _version: number) => ({
      ...completion.profile,
      logoAvailable: true,
      version: 5,
    }))
    const removeBusinessLogo = vi.fn(async (_version: number) => ({
      ...completion.profile,
      logoAvailable: false,
      version: 6,
    }))
    renderSurface(<BusinessProfileSection scenarioId="production" />, {
      ...repository,
      updateProfile,
      uploadBusinessLogo,
      removeBusinessLogo,
    })
    fireEvent.click(await screen.findByRole("button", { name: "Salvar dados" }))
    await waitFor(() => expect(updateProfile).toHaveBeenCalled())
    await user.upload(
      screen.getByLabelText("Logotipo"),
      new File(["png"], "logo.png", { type: "image/png" }),
    )
    await waitFor(() => expect(uploadBusinessLogo).toHaveBeenCalledWith(expect.any(File), 4))
    await user.click(screen.getByRole("button", { name: "Remover logotipo" }))
    await waitFor(() => expect(removeBusinessLogo).toHaveBeenCalledWith(5))
  })

  it("loads commission totals and saves a future-only percentage policy", async () => {
    const user = userEvent.setup()
    const saveCommissionPolicy = vi.fn(async () => [
      {
        professionalId: "professional-a",
        serviceId: null,
        kind: "percentage" as const,
        basisPoints: 4000,
        fixedCents: null,
        version: 1,
      },
    ])
    renderSurface(<PaymentsSection scenarioId="production" />, {
      ...repository,
      saveCommissionPolicy,
    })
    expect(await screen.findByText("Comissões")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/No mês/)).toHaveTextContent("30,00"))
    await user.click(screen.getByRole("combobox", { name: "Profissional da comissão" }))
    await user.click(screen.getByRole("option", { name: "Ana" }))
    fireEvent.click(screen.getByRole("button", { name: "Salvar regra" }))
    await waitFor(() =>
      expect(saveCommissionPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          professionalId: "professional-a",
          basisPoints: 4000,
          expectedVersion: null,
        }),
      ),
    )
  })

  it("restores persisted commission labels and values instead of exposing technical ids", async () => {
    renderSurface(<PaymentsSection scenarioId="production" />, {
      ...repository,
      getCommissionPolicies: async () => [
        {
          professionalId: "professional-a",
          serviceId: null,
          kind: "percentage",
          basisPoints: 3250,
          fixedCents: null,
          version: 2,
        },
      ],
    })
    expect(
      await screen.findByRole("combobox", { name: "Profissional da comissão" }),
    ).toHaveTextContent("Ana")
    expect(screen.getByRole("combobox", { name: "Serviço da comissão" })).toHaveTextContent(
      "Regra padrão",
    )
    expect(screen.getByRole("combobox", { name: "Tipo de comissão" })).toHaveTextContent(
      "Percentual",
    )
    await waitFor(() => expect(screen.getByLabelText("Percentual da comissão")).toHaveValue("32.5"))
  })

  it("restores a fixed service exception and its localized selector labels", async () => {
    const user = userEvent.setup()
    renderSurface(<PaymentsSection scenarioId="production" />, {
      ...repository,
      getCommissionPolicies: async () => [
        {
          professionalId: "professional-a",
          serviceId: "service-a",
          kind: "fixed",
          basisPoints: null,
          fixedCents: 1234,
          version: 4,
        },
      ],
    })
    await user.click(await screen.findByRole("combobox", { name: "Serviço da comissão" }))
    await user.click(await screen.findByRole("option", { name: "Corte" }))
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Serviço da comissão" })).toHaveTextContent(
        "Corte",
      )
      expect(screen.getByRole("combobox", { name: "Tipo de comissão" })).toHaveTextContent(
        "Valor fixo por serviço",
      )
      expect(screen.getByLabelText("Valor fixo da comissão")).toHaveValue("12,34")
    })
  })

  it("explains when no primary unit is selected", async () => {
    renderSurface(<BusinessProfileSection scenarioId="production" />, {
      ...repository,
      getCompletion: async () => ({
        ...completion,
        profile: { ...completion.profile, primaryUnitId: undefined },
      }),
    })
    expect(await screen.findByText("Cadastre uma unidade para definir o endereço.")).toBeVisible()
    expect(screen.getByLabelText("Unidade principal")).toHaveTextContent("Selecione uma unidade")
  })

  it("explains a selected unit whose address is unavailable", async () => {
    renderSurface(<BusinessProfileSection scenarioId="production" />, {
      ...repository,
      getAvailability: async () => ({
        ...(await repository.getAvailability({} as never)),
        units: [
          {
            id: "unit-a",
            kind: "unit",
            status: "active",
            name: "Centro",
            code: "C",
            address: undefined as unknown as string,
            businessHours: { days: ["monday"], start: "09:00", end: "18:00" },
          },
        ],
      }),
    })
    expect(await screen.findByText("Endereço não informado para esta unidade.")).toBeVisible()
  })

  it("restores an explicit no-commission policy without an amount field", async () => {
    renderSurface(<PaymentsSection scenarioId="production" />, {
      ...repository,
      getCommissionPolicies: async () => [
        {
          professionalId: "professional-a",
          serviceId: null,
          kind: "none",
          basisPoints: null,
          fixedCents: null,
          version: 1,
        },
      ],
    })
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Tipo de comissão" })).toHaveTextContent(
        "Sem comissão",
      ),
    )
    expect(screen.queryByLabelText("Percentual da comissão")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Valor fixo da comissão")).not.toBeInTheDocument()
  })
})

const completion: SetupCompletion = {
  paymentMethods: [
    { id: "pix", label: "Pix", active: true },
    { id: "cash", label: "Dinheiro", active: true },
    { id: "debit", label: "Débito", active: true },
    { id: "credit", label: "Crédito", active: true },
    { id: "mixed", label: "Pagamento misto", active: true },
  ],
  profile: {
    displayName: "Barbearia Centro",
    email: "oi@example.com",
    phone: "81999999999",
    primaryUnitId: "unit-a",
    version: 3,
    logoAvailable: false,
  },
  readiness: { completedCount: 1, nextStepId: "review", totalCount: 1, steps: [] },
  serviceOverrides: [],
}
const repository = {
  catalogSource: "http",
  getCompletion: async () => completion,
  getAvailability: async () => ({
    conflicts: [],
    records: [],
    units: [
      {
        id: "unit-a",
        kind: "unit",
        status: "active",
        name: "Centro",
        code: "C",
        address: "Rua A",
        businessHours: { days: ["monday"], start: "09:00", end: "18:00" },
      },
    ],
    professionals: [
      {
        id: "professional-a",
        kind: "professional",
        status: "active",
        name: "Ana",
        role: "Barbeira",
        accountAccess: "connected",
        serviceIds: ["service-a"],
        unitIds: ["unit-a"],
      },
    ],
    services: [
      {
        id: "service-a",
        kind: "service",
        status: "active",
        name: "Corte",
        category: "Cabelo",
        description: "Corte",
        durationMinutes: 30,
        priceCents: 5000,
        professionalIds: ["professional-a"],
        unitIds: ["unit-a"],
      },
    ],
  }),
  updateProfile: async () => completion.profile,
  updatePaymentMethods: async ({ settings }: { settings: SetupCompletion["paymentMethods"] }) =>
    settings,
  getCommissionPolicies: async () => [],
  getCommissionDetail: async () => ({
    items: [],
    totals: { commissionCents: 3000, barbershopShareCents: 9000 },
  }),
} as unknown as BarbershopSetupRepository

function renderSurface(element: ReactNode, value: BarbershopSetupRepository) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(element, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <BarbershopSetupRepositoryProvider repository={value}>
          {children}
        </BarbershopSetupRepositoryProvider>
      </QueryClientProvider>
    ),
  })
}
