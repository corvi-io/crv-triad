import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { PermissionProfileCreationDrawer } from "@/modules/access-control/components/permission-profile-creation-form"
import {
  CompanyCreationDrawer,
  CompanyCreationScreen,
} from "@/modules/companies/components/company-creation-form"
import {
  CustomerCreationDrawer,
  shouldClearCustomerDocument,
} from "@/modules/customers/components/customer-creation-form"
import { DriverCreationDrawer } from "@/modules/fleet/components/driver-creation-form"
import {
  shouldClearTruckModel,
  TruckCreationDrawer,
} from "@/modules/fleet/components/truck-creation-form"
import {
  ProductCreationDrawer,
  ProductCreationScreen,
} from "@/modules/inventory/components/product-creation-form"
import {
  WarehouseCreationDrawer,
  WarehouseCreationScreen,
} from "@/modules/inventory/components/warehouse-creation-form"
import {
  CollaboratorCreationDrawer,
  CollaboratorCreationScreen,
} from "@/modules/workforce/components/collaborator-creation-form"

function mockVisibleSelectAnchor() {
  const rect = {
    bottom: 40,
    height: 40,
    left: 0,
    right: 320,
    top: 0,
    width: 320,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect)
  const clientRect = new DOMRect(0, 0, 320, 40)
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(
    Object.assign([clientRect], {
      item: (index: number) => (index === 0 ? clientRect : null),
    }) as unknown as DOMRectList,
  )
}

function selectBaseUiOption(name: string) {
  const option = screen.getByRole("option", { hidden: true, name })
  fireEvent.pointerDown(option, { buttons: 1, pointerType: "mouse" })
  fireEvent.click(option, { detail: 1 })
}

async function selectFirstCalendarDate(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(screen.getByLabelText(label))
  const dayButton = await waitFor(() => {
    const button = document.querySelector<HTMLButtonElement>(
      '[data-slot="calendar"] button[data-day]:not([disabled])',
    )
    if (!button) throw new Error("Calendar day button was not rendered")
    return button
  })
  fireEvent.click(dayButton)
}

describe("reference creation forms", () => {
  it("exposes final, editable fiscal controls without technical limitation copy", async () => {
    const user = userEvent.setup()
    render(<ProductCreationScreen />)

    await user.click(screen.getByRole("button", { name: "Novo produto" }))
    const dialog = await screen.findByRole("dialog", { name: "Novo / Produto" })
    expect(screen.getByLabelText("NCM")).toBeEnabled()
    expect(screen.getByLabelText("NCM")).toHaveAttribute("placeholder", "Selecione")
    expect(dialog).not.toHaveTextContent(/adiad|aguardando|não operacional/i)
    expect(screen.getByRole("button", { name: "Salvar e adicionar outro" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar produto" })).toBeInTheDocument()
  })

  it("focuses the first invalid product field after local review", async () => {
    const user = userEvent.setup()
    render(<ProductCreationScreen />)
    await user.click(screen.getByRole("button", { name: "Novo produto" }))
    await user.click(screen.getByRole("button", { name: "Salvar produto" }))

    await waitFor(() => expect(screen.getByLabelText(/Categoria/)).toHaveFocus())
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
  })

  it("keeps a partial decimal editable but rejects it during local review", async () => {
    mockVisibleSelectAnchor()
    const user = userEvent.setup()
    render(<ProductCreationScreen />)
    fireEvent.click(screen.getByRole("button", { name: "Novo produto" }))

    await user.click(screen.getByLabelText(/Categoria/))
    selectBaseUiOption("Produto")
    fireEvent.change(screen.getByLabelText(/Código único/), { target: { value: "PROD-01" } })
    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Produto" } })
    await user.click(screen.getByLabelText(/^Unidade/))
    selectBaseUiOption("Tonelada")
    fireEvent.change(screen.getByLabelText("NCM"), { target: { value: "25171000" } })
    fireEvent.change(screen.getByLabelText("CFOP"), { target: { value: "5102" } })
    fireEvent.change(screen.getByLabelText("CST"), { target: { value: "00" } })
    fireEvent.change(screen.getByLabelText(/^Estoque mínimo$/), { target: { value: "0," } })
    fireEvent.change(screen.getByLabelText(/^Estoque máximo$/), { target: { value: "10" } })

    expect(screen.getByLabelText(/^Estoque mínimo$/)).toHaveValue("0,")
    await user.click(screen.getByRole("button", { name: "Salvar produto" }))

    await waitFor(() => expect(screen.getByLabelText(/^Estoque mínimo$/)).toHaveFocus())
    expect(screen.getByText("Informe um número decimal completo.")).toBeInTheDocument()
    expect(
      screen.queryByText("Campos revisados localmente. Nenhum dado foi salvo."),
    ).not.toBeInTheDocument()
  })

  it("focuses the first invalid warehouse combobox after local review", async () => {
    render(<WarehouseCreationScreen />)
    fireEvent.click(screen.getByRole("button", { name: "Novo depósito" }))
    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: "Depósito Central" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar depósito" }))

    await waitFor(() => expect(screen.getByLabelText(/Empresa/)).toHaveFocus())
    expect(screen.getByLabelText(/^Tipo/)).toHaveAttribute("aria-invalid", "true")
  })

  it("protects dirty company data before dismissal", async () => {
    const user = userEvent.setup()
    render(<CompanyCreationScreen />)
    await user.click(screen.getByRole("button", { name: "Nova empresa" }))
    await user.type(screen.getByLabelText(/Razão social/), "Empresa teste")
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(await screen.findByRole("dialog", { name: "Descartar alterações?" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Continuar preenchendo" }))
    expect(screen.getByLabelText(/Razão social/)).toHaveValue("Empresa teste")
  })

  it("renders the company reference design icon mapping as decorative label support", async () => {
    const user = userEvent.setup()
    render(<CompanyCreationScreen />)
    await user.click(screen.getByRole("button", { name: "Nova empresa" }))

    const cnpjLabel = screen.getByText("CNPJ").closest("label")
    const tradeNameLabel = screen.getByText("Nome fantasia").closest("label")
    expect(cnpjLabel?.querySelector(".lucide-rectangle-ellipsis")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(tradeNameLabel?.querySelector(".lucide-type")).toHaveAttribute("aria-hidden", "true")
  })

  it("validates both company submit intents locally without writes, storage, reset, or false success", async () => {
    mockVisibleSelectAnchor()
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const storageSpy = vi.spyOn(Storage.prototype, "setItem")
    render(<CompanyCreationScreen />)

    await user.click(screen.getByRole("button", { name: "Nova empresa" }))
    const dialog = await screen.findByRole("dialog", { name: "Novo / Empresa" })
    const drawer = within(dialog)
    await user.type(drawer.getByLabelText(/CNPJ/), "12345678000190")
    await user.type(drawer.getByLabelText(/Razão social/), "LOCAL Empresa")
    await user.type(drawer.getByLabelText(/Telefone/), "81999990000")
    await user.type(drawer.getByLabelText(/E-mail/), "empresa@example.com")
    await user.click(drawer.getByRole("combobox", { name: /Ambiente SEFAZ/ }))
    selectBaseUiOption("Homologação")

    await user.click(drawer.getByRole("button", { name: "Salvar e adicionar outra" }))
    expect(drawer.getByLabelText(/Razão social/)).toHaveValue("LOCAL Empresa")

    await user.click(drawer.getByRole("button", { name: "Salvar empresa" }))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    expect(screen.queryByText(/salva com sucesso|empresa salva/i)).not.toBeInTheDocument()
  })

  it("passes distinct company submit intents to the optional local callback only when valid", async () => {
    mockVisibleSelectAnchor()
    const user = userEvent.setup()
    const onReview = vi.fn()
    render(<CompanyCreationDrawer isOpen onOpenChange={vi.fn()} onReview={onReview} />)

    await user.type(screen.getByLabelText(/CNPJ/), "12345678000190")
    await user.type(screen.getByLabelText(/Razão social/), "Empresa Intenções")
    await user.type(screen.getByLabelText(/Telefone/), "81999990000")
    await user.type(screen.getByLabelText(/E-mail/), "intencoes@example.com")
    await user.type(screen.getByLabelText(/Inscrição estadual/), "01.2-a/3")
    await user.click(screen.getByRole("combobox", { name: /Ambiente SEFAZ/ }))
    selectBaseUiOption("Produção")

    await user.click(screen.getByRole("button", { name: "Salvar e adicionar outra" }))
    await user.click(screen.getByRole("button", { name: "Salvar empresa" }))

    expect(onReview).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ legalName: "Empresa Intenções", stateRegistration: "012A3" }),
      "save-and-add-another",
    )
    expect(onReview).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ legalName: "Empresa Intenções", stateRegistration: "012A3" }),
      "save-company",
    )
  })

  it("validates both typed local submit intents for every remaining drawer without writes or reset", async () => {
    mockVisibleSelectAnchor()
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const storageSpy = vi.spyOn(Storage.prototype, "setItem")

    const cases = [
      {
        name: "cliente",
        firstInvalid: /CNPJ/,
        addAnother: "Salvar e adicionar outro",
        save: "Salvar cliente",
        intents: ["save-and-add-another", "save-customer"],
        markerLabel: /Razão social/,
        marker: "Cliente local LOCAL",
        renderDrawer: (onReview: ReturnType<typeof vi.fn>) => (
          <CustomerCreationDrawer isOpen onOpenChange={vi.fn()} onReview={onReview as never} />
        ),
        fill: async (_user: ReturnType<typeof userEvent.setup>) => {
          fireEvent.change(screen.getByLabelText(/CNPJ/), {
            target: { value: "12345678000190" },
          })
          fireEvent.change(screen.getByLabelText(/Razão social/), {
            target: { value: "Cliente local LOCAL" },
          })
          fireEvent.change(screen.getByLabelText(/^CEP/), { target: { value: "50000000" } })
          fireEvent.change(screen.getByLabelText(/Nome do contato/), {
            target: { value: "Contato local" },
          })
        },
      },
      {
        name: "produto",
        firstInvalid: /Categoria/,
        addAnother: "Salvar e adicionar outro",
        save: "Salvar produto",
        intents: ["save-and-add-another", "save-product"],
        markerLabel: /^Nome/,
        marker: "Produto local LOCAL",
        renderDrawer: (onReview: ReturnType<typeof vi.fn>) => (
          <ProductCreationDrawer isOpen onOpenChange={vi.fn()} onReview={onReview as never} />
        ),
        fill: async (user: ReturnType<typeof userEvent.setup>) => {
          await user.click(screen.getByLabelText(/Categoria/))
          selectBaseUiOption("Produto")
          fireEvent.change(screen.getByLabelText(/Código único/), {
            target: { value: "LOCAL-01" },
          })
          fireEvent.change(screen.getByLabelText(/^Nome/), {
            target: { value: "Produto local LOCAL" },
          })
          await user.click(screen.getByLabelText(/^Unidade/))
          selectBaseUiOption("Tonelada")
          fireEvent.change(screen.getByLabelText("NCM"), { target: { value: "25171000" } })
          fireEvent.change(screen.getByLabelText("CFOP"), { target: { value: "5102" } })
          fireEvent.change(screen.getByLabelText("CST"), { target: { value: "00" } })
          fireEvent.change(screen.getByLabelText(/^Estoque mínimo$/), {
            target: { value: "1" },
          })
          fireEvent.change(screen.getByLabelText(/^Estoque máximo$/), {
            target: { value: "10" },
          })
        },
      },
      {
        name: "depósito",
        firstInvalid: /^Nome/,
        addAnother: "Salvar e adicionar outro",
        save: "Salvar depósito",
        intents: ["save-and-add-another", "save-warehouse"],
        markerLabel: /^Nome/,
        marker: "Depósito local LOCAL",
        renderDrawer: (onReview: ReturnType<typeof vi.fn>) => (
          <WarehouseCreationDrawer
            collaboratorOptions={[{ label: "Responsável local", value: "responsavel-local" }]}
            companyOptions={[{ label: "Empresa Exemplo", value: "empresa-exemplo" }]}
            isOpen
            onOpenChange={vi.fn()}
            onReview={onReview as never}
          />
        ),
        fill: async (user: ReturnType<typeof userEvent.setup>) => {
          fireEvent.change(screen.getByLabelText(/^Nome/), {
            target: { value: "Depósito local LOCAL" },
          })
          await user.click(screen.getByLabelText(/Empresa/))
          selectBaseUiOption("Empresa Exemplo")
          await user.click(screen.getByLabelText(/^Tipo/))
          selectBaseUiOption("Depósito")
          fireEvent.change(screen.getByLabelText(/^CEP/), { target: { value: "50000000" } })
          fireEvent.change(screen.getByLabelText(/Colaborador/), {
            target: { value: "Responsável local" },
          })
          fireEvent.change(screen.getByLabelText(/^Estoque mínimo$/), {
            target: { value: "1" },
          })
          fireEvent.change(screen.getByLabelText(/^Estoque máximo$/), {
            target: { value: "10" },
          })
        },
      },
      {
        name: "caminhão",
        firstInvalid: /Placa/,
        addAnother: "Salvar e adicionar outro",
        save: "Salvar caminhão",
        intents: ["save-and-add-another", "save-truck"],
        markerLabel: /Placa/,
        marker: "ABC1D23",
        renderDrawer: (onReview: ReturnType<typeof vi.fn>) => (
          <TruckCreationDrawer
            isOpen
            onOpenChange={vi.fn()}
            onReview={onReview as never}
            warehouseOptions={[{ label: "Depósito Central", value: "deposito-central" }]}
          />
        ),
        fill: async (user: ReturnType<typeof userEvent.setup>) => {
          fireEvent.change(screen.getByLabelText(/Placa/), { target: { value: "ABC1D23" } })
          await user.click(screen.getByLabelText(/Marca/))
          selectBaseUiOption("Mercedes-Benz")
          fireEvent.change(screen.getByLabelText(/Depósito base/), {
            target: { value: "Depósito Central" },
          })
        },
      },
      {
        name: "motorista",
        firstInvalid: /^Nome/,
        addAnother: "Salvar e adicionar outro",
        save: "Salvar motorista",
        intents: ["save-and-add-another", "save-driver"],
        markerLabel: /^Nome/,
        marker: "Motorista local LOCAL",
        renderDrawer: (onReview: ReturnType<typeof vi.fn>) => (
          <DriverCreationDrawer
            isOpen
            onOpenChange={vi.fn()}
            onReview={onReview as never}
            truckOptions={[{ label: "ABC1D23", value: "abc1d23" }]}
          />
        ),
        fill: async (user: ReturnType<typeof userEvent.setup>) => {
          fireEvent.change(screen.getByLabelText(/^Nome/), {
            target: { value: "Motorista local LOCAL" },
          })
          fireEvent.change(screen.getByLabelText(/^Telefone/), {
            target: { value: "81999990000" },
          })
          fireEvent.change(screen.getByLabelText(/^Número/), {
            target: { value: "12345678900" },
          })
          await selectFirstCalendarDate(user, /^Validade/)
          fireEvent.change(screen.getByLabelText(/Caminhão principal/), {
            target: { value: "ABC1D23" },
          })
        },
      },
      {
        name: "colaborador",
        firstInvalid: /^Nome/,
        addAnother: "Salvar e adicionar outro",
        save: "Salvar colaborador",
        intents: ["save-and-add-another", "save-collaborator"],
        markerLabel: /^Nome/,
        marker: "Colaborador local LOCAL",
        renderDrawer: (onReview: ReturnType<typeof vi.fn>) => (
          <CollaboratorCreationDrawer
            companyOptions={[{ label: "Empresa Exemplo", value: "empresa-exemplo" }]}
            isOpen
            onOpenChange={vi.fn()}
            onReview={onReview as never}
            profileOptions={[{ label: "Operação", value: "operacao" }]}
          />
        ),
        fill: async (user: ReturnType<typeof userEvent.setup>) => {
          fireEvent.change(screen.getByLabelText(/^Nome/), {
            target: { value: "Colaborador local LOCAL" },
          })
          fireEvent.change(screen.getByLabelText("Usuário"), {
            target: { value: "colaborador.local" },
          })
          fireEvent.change(screen.getByLabelText("Senha"), {
            target: { value: "Senha!Segura2026" },
          })
          await user.click(screen.getByLabelText(/Empresa/))
          selectBaseUiOption("Empresa Exemplo")
          await user.click(screen.getByLabelText(/^Perfil/))
          selectBaseUiOption("Operação")
        },
      },
      {
        name: "perfil",
        firstInvalid: /^Nome/,
        addAnother: "Salvar e adicionar outro",
        save: "Salvar perfil",
        intents: ["save-and-add-another", "save-permission-profile"],
        markerLabel: /^Nome/,
        marker: "Perfil local LOCAL",
        renderDrawer: (onReview: ReturnType<typeof vi.fn>) => (
          <PermissionProfileCreationDrawer
            isOpen
            onOpenChange={vi.fn()}
            onReview={onReview as never}
          />
        ),
        fill: async (_user: ReturnType<typeof userEvent.setup>) => {
          fireEvent.change(screen.getByLabelText(/^Nome/), {
            target: { value: "Perfil local LOCAL" },
          })
        },
      },
    ] as const

    for (const formCase of cases) {
      const user = userEvent.setup()
      const onReview = vi.fn()
      render(formCase.renderDrawer(onReview))

      await user.click(screen.getByRole("button", { name: formCase.save }))
      await waitFor(() => expect(screen.getByLabelText(formCase.firstInvalid)).toHaveFocus())
      expect(onReview, `${formCase.name} callback inválido`).not.toHaveBeenCalled()

      await formCase.fill(user)
      await user.click(screen.getByRole("button", { name: formCase.addAnother }))
      await waitFor(() => {
        if (onReview.mock.calls.length !== 1) {
          const errors = screen
            .queryAllByRole("alert")
            .map((alert) => `${alert.id}:${alert.textContent}`)
          throw new Error(`${formCase.name}: ${errors.join(" | ")}`)
        }
      })
      expect(onReview.mock.calls[0]?.[1]).toBe(formCase.intents[0])
      expect(screen.queryByText(/Validação local concluída/i)).not.toBeInTheDocument()
      expect(screen.getByLabelText(formCase.markerLabel)).toHaveValue(formCase.marker)

      await user.click(screen.getByRole("button", { name: formCase.save }))
      await waitFor(() => expect(onReview).toHaveBeenCalledTimes(2))
      expect(onReview.mock.calls[1]?.[1]).toBe(formCase.intents[1])
      expect(screen.getByLabelText(formCase.markerLabel)).toHaveValue(formCase.marker)
      expect(screen.queryByText(/salv[oa] com sucesso/i)).not.toBeInTheDocument()
      expect(document.body).not.toHaveTextContent(
        /protótipo|local-only|validação local|nenhum dado foi salvo|sem persistência|não operacional|catálogo não carregado|aguardando contrato/i,
      )
      cleanup()
    }

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
  }, 30_000)

  it("focuses the first invalid company field and preserves its typed value", async () => {
    const user = userEvent.setup()
    const onReview = vi.fn()
    render(<CompanyCreationDrawer isOpen onOpenChange={vi.fn()} onReview={onReview} />)

    await user.type(screen.getByLabelText(/CNPJ/), "123")
    await user.click(screen.getByRole("button", { name: "Salvar empresa" }))

    await waitFor(() => expect(screen.getByLabelText(/CNPJ/)).toHaveFocus())
    expect(screen.getByLabelText(/CNPJ/)).toHaveValue("12.3")
    expect(onReview).not.toHaveBeenCalled()
  })

  it("keeps collaborator credentials editable and generates a secure in-memory password", async () => {
    const user = userEvent.setup()
    render(<CollaboratorCreationScreen />)
    await user.click(screen.getByRole("button", { name: "Novo colaborador" }))

    const username = await screen.findByLabelText("Usuário")
    const password = screen.getByLabelText("Senha")
    expect(username).toBeEnabled()
    expect(password).toBeEnabled()
    expect(password).toHaveAttribute("type", "password")
    fireEvent.change(username, { target: { value: "ana.silva" } })
    const generator = screen.getByRole("button", { name: "Gerar senha segura" })
    await user.click(generator)
    const generatedPassword = (password as HTMLInputElement).value
    expect(generatedPassword).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{20}$/)
    expect(generator).toHaveFocus()
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Senha segura gerada."),
    )
    expect(screen.getByRole("status")).not.toHaveTextContent(generatedPassword)
    expect(screen.queryByText(/IDP|indispon|não operacional/i)).not.toBeInTheDocument()
  }, 10_000)

  it("clears a stale truck model only when its brand changes", () => {
    expect(shouldClearTruckModel("mercedes", "scania")).toBe(true)
    expect(shouldClearTruckModel("mercedes", "mercedes")).toBe(false)
  })

  it("clears an incompatible customer document only when the person type changes", () => {
    expect(shouldClearCustomerDocument("company", "person")).toBe(true)
    expect(shouldClearCustomerDocument("company", "company")).toBe(false)
  })

  it("switches customer document label, mask, placeholder, and value between CNPJ and CPF", async () => {
    mockVisibleSelectAnchor()
    const user = userEvent.setup()
    render(<CustomerCreationDrawer isOpen onOpenChange={vi.fn()} />)

    await waitFor(() => expect(screen.getByLabelText(/Tipo de pessoa/)).toHaveFocus())
    const cnpj = screen.getByLabelText("CNPJ")
    await user.type(cnpj, "12345678000190")
    expect(cnpj).toHaveValue("12.345.678/0001-90")

    await user.click(screen.getByLabelText(/Tipo de pessoa/))
    selectBaseUiOption("Pessoa física")
    const cpf = await screen.findByLabelText("CPF")
    expect(cpf).toHaveValue("")
    expect(cpf).toHaveAttribute("placeholder", "000.000.000-00")
    await user.type(cpf, "12345678901")
    expect(cpf).toHaveValue("123.456.789-01")
  })

  it("exposes typed valid values only through an explicit local review callback", async () => {
    const user = userEvent.setup()
    const onReview = vi.fn()
    render(<PermissionProfileCreationDrawer isOpen onOpenChange={vi.fn()} onReview={onReview} />)

    await user.type(screen.getByLabelText(/^Nome/), "Operação")
    await user.click(screen.getByRole("button", { name: "Salvar perfil" }))

    expect(onReview).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Operação" }),
      "save-permission-profile",
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
