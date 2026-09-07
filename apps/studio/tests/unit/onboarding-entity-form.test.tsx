import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import type {
  SetupEntityInput,
  SetupEntityKind,
  SetupProfessional,
  SetupUnit,
} from "@/modules/barbershop-setup/contracts"
import { SetupEntityOnboardingForm } from "@/modules/barbershop-setup/entity-drawer"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"

describe("inline onboarding entity form", () => {
  it("creates a unit inline with an explicit operational timezone", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderForm(onSave)
    const user = userEvent.setup()

    expect(screen.getByRole("heading", { name: "Nova unidade" })).toBeVisible()
    expect(screen.getByRole("combobox", { name: "Cidade ou região" })).toHaveTextContent(
      /Recife|São Paulo|Manaus|Rio Branco|Fernando de Noronha/,
    )
    await user.type(screen.getByLabelText("Nome"), "Unidade Boa Viagem")
    await user.type(screen.getByLabelText("Código"), "BV")
    await user.type(screen.getByLabelText("Endereço"), "Avenida Boa Viagem, 1000")
    await user.click(screen.getByRole("button", { name: "Salvar e continuar" }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave).toHaveBeenCalledWith(
      "unit",
      expect.objectContaining({
        address: "Avenida Boa Viagem, 1000",
        code: "BV",
        name: "Unidade Boa Viagem",
        timezone: expect.stringMatching(/^America\//),
      }),
    )
  })

  it("keeps the inline form visible and points to the first invalid field", async () => {
    renderForm(vi.fn().mockResolvedValue(undefined))
    await userEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }))
    expect(await screen.findByText("Informe um nome com pelo menos 2 caracteres.")).toBeVisible()
    expect(screen.getByLabelText("Nome")).toHaveFocus()
    expect(screen.queryByRole("dialog", { name: /unidade/i })).not.toBeInTheDocument()
  })

  it("requires invitation identity and a unit before continuing with a professional", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <BarbershopSetupRepositoryProvider repository={new BarbershopSetupMemoryRepository()}>
        <SetupEntityOnboardingForm
          entityKind="professional"
          isSaving={false}
          onSave={onSave}
          professionals={[]}
          services={[]}
          units={[availableUnit]}
        />
      </BarbershopSetupRepositoryProvider>,
    )
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("E-mail do convite"), "ana@example.com")
    await user.click(screen.getByRole("button", { name: "Salvar e continuar" }))
    expect(await screen.findByText("Selecione pelo menos uma unidade.")).toBeVisible()
    await user.click(screen.getByRole("checkbox", { name: "Unidade Recife" }))
    await user.click(screen.getByRole("button", { name: "Salvar e continuar" }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave).toHaveBeenCalledWith(
      "professional",
      expect.objectContaining({ invitationEmail: "ana@example.com", unitIds: ["unit-a"] }),
    )
  }, 15_000)

  it("creates a service only for a compatible unit and professional", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <BarbershopSetupRepositoryProvider repository={new BarbershopSetupMemoryRepository()}>
        <SetupEntityOnboardingForm
          entityKind="service"
          isSaving={false}
          onSave={onSave}
          professionals={[availableProfessional]}
          services={[]}
          units={[availableUnit]}
        />
      </BarbershopSetupRepositoryProvider>,
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText("Nome"), "Corte clássico")
    await user.type(screen.getByLabelText("Categoria"), "Cabelo")
    await user.type(screen.getByLabelText("Descrição"), "Corte masculino com acabamento")
    await user.type(screen.getByLabelText("Preço (R$)"), "6500")
    await user.click(screen.getByRole("checkbox", { name: "Unidade Recife" }))
    await user.click(screen.getByRole("checkbox", { name: "Ana" }))
    await user.click(screen.getByRole("button", { name: "Salvar e continuar" }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave).toHaveBeenCalledWith(
      "service",
      expect.objectContaining({
        priceCents: 6_500,
        professionalIds: ["professional-a"],
        unitIds: ["unit-a"],
      }),
    )
  }, 15_000)
})

const availableUnit: SetupUnit = {
  address: "Rua do Sol, 100",
  businessHours: { days: ["monday"], end: "18:00", start: "09:00" },
  code: "REC",
  id: "unit-a",
  kind: "unit",
  name: "Unidade Recife",
  status: "active",
  timezone: "America/Recife",
}

const availableProfessional: SetupProfessional = {
  accountAccess: "connected",
  id: "professional-a",
  kind: "professional",
  name: "Ana",
  role: "Barbeira",
  serviceIds: [],
  status: "active",
  unitIds: ["unit-a"],
}

function renderForm(onSave: (kind: SetupEntityKind, input: SetupEntityInput) => Promise<void>) {
  return render(
    <BarbershopSetupRepositoryProvider repository={new BarbershopSetupMemoryRepository()}>
      <SetupEntityOnboardingForm
        entityKind="unit"
        isSaving={false}
        onSave={onSave}
        professionals={[]}
        services={[]}
        units={[]}
      />
    </BarbershopSetupRepositoryProvider>,
  )
}
