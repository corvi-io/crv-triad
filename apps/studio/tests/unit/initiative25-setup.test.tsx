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
