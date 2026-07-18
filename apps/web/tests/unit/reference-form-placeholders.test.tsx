import { render, screen, within } from "@testing-library/react"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { PermissionProfileCreationDrawer } from "@/modules/access-control/components/permission-profile-creation-form"
import { CompanyCreationDrawer } from "@/modules/companies/components/company-creation-form"
import { CustomerCreationDrawer } from "@/modules/customers/components/customer-creation-form"
import { DriverCreationDrawer } from "@/modules/fleet/components/driver-creation-form"
import { TruckCreationDrawer } from "@/modules/fleet/components/truck-creation-form"
import { ProductCreationDrawer } from "@/modules/inventory/components/product-creation-form"
import { WarehouseCreationDrawer } from "@/modules/inventory/components/warehouse-creation-form"
import { CollaboratorCreationDrawer } from "@/modules/workforce/components/collaborator-creation-form"

type FieldAudit = {
  icon?: string
  id: string
  label: string
  placeholder?: string
  required?: boolean
  text?: string
}

function normalize(value: string | null | undefined) {
  return value?.replaceAll(/\s+/g, " ").trim() ?? ""
}

function expectDrawerInventory({
  fields,
  header,
  renderDrawer,
  sections,
}: {
  fields: readonly FieldAudit[]
  header: string
  renderDrawer: ReactElement
  sections: readonly string[]
}) {
  render(renderDrawer)
  const dialog = screen.getByRole("dialog", { name: header })
  const form = dialog.querySelector("form")
  expect(form).not.toBeNull()

  const sectionHeadings = Array.from(dialog.querySelectorAll("h2.text-xs")).map((heading) =>
    normalize(heading.textContent),
  )
  expect(sectionHeadings).toEqual(sections)

  const labels = Array.from(form?.querySelectorAll("label[data-slot='field-label']") ?? []).map(
    (label) => normalize(label.textContent),
  )
  expect(labels).toEqual(fields.map((field) => field.label))

  for (const field of fields) {
    const label = form?.querySelector<HTMLLabelElement>(`label[for='${field.id}']`)
    expect(label, field.id).not.toBeNull()
    expect(normalize(label?.textContent)).toBe(field.label)
    if (field.required) expect(label).toHaveAttribute("data-required", "true")
    else expect(label).not.toHaveAttribute("data-required")

    if (field.icon) {
      const icon = label?.querySelector(`.${field.icon}`)
      expect(icon, `${field.id} icon`).toHaveAttribute("aria-hidden", "true")
    } else {
      expect(label?.querySelector("svg"), `${field.id} icon`).toBeNull()
    }

    const control = dialog.querySelector<HTMLElement>(`#${field.id}`)
    expect(control, `${field.id} control`).not.toBeNull()
    if (field.required && !control?.matches(":disabled")) {
      expect(
        control?.hasAttribute("required") || control?.getAttribute("aria-required") === "true",
        `${field.id} programmatic required state`,
      ).toBe(true)
    }
    if (field.placeholder) expect(control).toHaveAttribute("placeholder", field.placeholder)
    if (field.text) expect(control).toHaveTextContent(field.text)
  }

  return { dialog, form: form as HTMLFormElement }
}

describe("reference form field, placeholder, and icon inventory", () => {
  it("keeps the company form as the structural baseline", () => {
    render(<CompanyCreationDrawer isOpen onOpenChange={vi.fn()} />)
    const dialog = screen.getByRole("dialog", { name: "Novo / Empresa" })
    expect(
      dialog.querySelector("label[for='company-cnpj'] .lucide-rectangle-ellipsis"),
    ).toHaveAttribute("aria-hidden", "true")
    expect(dialog.querySelector("label[for='company-trade-name'] .lucide-type")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(within(dialog).getByLabelText(/^CNPJ/)).toHaveAttribute(
      "placeholder",
      "00.000.000/0001-00",
    )
    expect(within(dialog).getByLabelText(/^CNPJ/)).toBeRequired()
  })

  it("covers every customer field in the content and drawer", () => {
    const { dialog } = expectDrawerInventory({
      header: "Novo / Cliente",
      renderDrawer: <CustomerCreationDrawer isOpen onOpenChange={vi.fn()} />,
      sections: ["Dados gerais", "Localização", "Contato", "Comercial", "Operação", "Observações"],
      fields: [
        {
          id: "customer-type",
          label: "Tipo de pessoa",
          required: true,
          text: "Pessoa jurídica",
          icon: "lucide-rectangle-ellipsis",
        },
        {
          id: "customer-document",
          label: "CNPJ",
          required: true,
          placeholder: "00.000.000/0001-00",
          icon: "lucide-rectangle-ellipsis",
        },
        {
          id: "customer-legal-name",
          label: "Razão social",
          required: true,
          placeholder: "Insira a razão social",
          icon: "lucide-book-user",
        },
        {
          id: "customer-trade-name",
          label: "Nome fantasia",
          placeholder: "Insira o nome fantasia",
          icon: "lucide-type",
        },
        {
          id: "customer-state-registration",
          label: "Inscrição estadual",
          placeholder: "Insira a IE",
          icon: "lucide-rectangle-ellipsis",
        },
        {
          id: "customer-municipal-registration",
          label: "Inscrição municipal",
          placeholder: "Insira a IM",
          icon: "lucide-rectangle-ellipsis",
        },
        {
          id: "customer-postal-code",
          label: "CEP",
          required: true,
          placeholder: "00000-000",
          icon: "lucide-hash",
        },
        {
          id: "customer-address",
          label: "Endereço",
          placeholder: "Endereço do cliente",
          icon: "lucide-map-pin",
        },
        {
          id: "customer-state",
          label: "Estado",
          placeholder: "Insira o estado do cliente",
          icon: "lucide-text-cursor-input",
        },
        {
          id: "customer-city",
          label: "Cidade",
          placeholder: "Insira a cidade do cliente",
          icon: "lucide-map-pin",
        },
        {
          id: "customer-district",
          label: "Bairro",
          placeholder: "Insira o bairro do cliente",
          icon: "lucide-milestone",
        },
        {
          id: "customer-contact",
          label: "Nome do contato",
          required: true,
          placeholder: "Insira o nome do contato",
          icon: "lucide-user-round",
        },
        {
          id: "customer-phone",
          label: "Telefone",
          placeholder: "(00) 00000-0000",
          icon: "lucide-phone",
        },
        {
          id: "customer-whatsapp",
          label: "WhatsApp",
          placeholder: "(00) 00000-0000",
          icon: "lucide-message-circle",
        },
        {
          id: "customer-email",
          label: "E-mail",
          placeholder: "email@empresa.com.br",
          icon: "lucide-mail",
        },
        {
          id: "customer-payment",
          label: "Condição de pagamento",
          text: "Boleto",
          icon: "lucide-file-check",
        },
        {
          id: "customer-credit",
          label: "Limite de crédito",
          placeholder: "R$ 0,00",
          icon: "lucide-wallet",
        },
        {
          id: "customer-price-table",
          label: "Tabela de preço",
          text: "Atacado",
          icon: "lucide-calendar-range",
        },
        {
          id: "customer-term",
          label: "Prazo padrão",
          placeholder: "30 dias",
          icon: "lucide-calendar",
        },
        {
          id: "customer-notes",
          label: "Observações",
          placeholder: "Insira as observações necessárias",
        },
      ],
    })
    for (const name of ["Compra produtos", "Contrata transporte", "Recebe entrega própria"]) {
      expect(within(dialog).getByRole("switch", { name })).toBeChecked()
    }
  })

  it("covers every product field in the content and drawer", () => {
    const { dialog } = expectDrawerInventory({
      header: "Novo / Produto",
      renderDrawer: <ProductCreationDrawer isOpen onOpenChange={vi.fn()} />,
      sections: ["Informações", "Fiscal", "Estoque", "Comercial", "Observações"],
      fields: [
        {
          id: "product-category",
          label: "Categoria",
          required: true,
          text: "Selecione a categoria do produto",
          icon: "lucide-contact",
        },
        {
          id: "product-code",
          label: "Código único",
          required: true,
          placeholder: "ABC123",
          icon: "lucide-rectangle-ellipsis",
        },
        {
          id: "product-name",
          label: "Nome",
          required: true,
          placeholder: "Insira o nome do novo produto",
          icon: "lucide-rectangle-ellipsis",
        },
        {
          id: "product-unit",
          label: "Unidade",
          required: true,
          text: "Selecione a unidade de medida",
          icon: "lucide-type",
        },
        {
          id: "product-ncm",
          label: "NCM",
          required: true,
          placeholder: "Selecione",
          icon: "lucide-file-code-corner",
        },
        {
          id: "product-cfop",
          label: "CFOP",
          required: true,
          placeholder: "Selecione",
          icon: "lucide-file-code-corner",
        },
        {
          id: "product-cst",
          label: "CST",
          required: true,
          placeholder: "Selecione",
          icon: "lucide-file-code-corner",
        },
        {
          id: "product-minimum-stock",
          label: "Estoque mínimo",
          required: true,
          placeholder: "0000,00",
          icon: "lucide-hash",
        },
        {
          id: "product-maximum-stock",
          label: "Estoque máximo",
          required: true,
          placeholder: "0000,00",
          icon: "lucide-hash",
        },
        {
          id: "product-purchase-cost",
          label: "Custo compra",
          placeholder: "R$ 0,00",
          icon: "lucide-shopping-cart",
        },
        {
          id: "product-sale-price",
          label: "Preço venda",
          placeholder: "R$ 0,00",
          icon: "lucide-tag",
        },
        {
          id: "product-notes",
          label: "Observações",
          placeholder: "Insira as observações necessárias",
        },
      ],
    })
    expect(dialog.querySelector("legend .lucide-dollar-sign")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
    expect(within(dialog).getByRole("switch", { name: "Produto ativo" })).toBeChecked()
    expect(within(dialog).getByRole("switch", { name: "Alerta de estoque mínimo" })).toBeChecked()
    expect(
      within(dialog).getByRole("switch", { name: "Alerta de estoque máximo" }),
    ).not.toBeChecked()
    expect(within(dialog).getByRole("switch", { name: "Precificação manual" })).toBeChecked()
  })

  it("covers every warehouse field in the content and drawer", () => {
    const { dialog } = expectDrawerInventory({
      header: "Novo / Depósito",
      renderDrawer: <WarehouseCreationDrawer isOpen onOpenChange={vi.fn()} />,
      sections: ["Informações", "Localização", "Responsável", "Configuração", "Observações"],
      fields: [
        {
          id: "warehouse-name",
          label: "Nome",
          required: true,
          placeholder: "Insira o nome do novo depósito",
          icon: "lucide-type",
        },
        {
          id: "warehouse-company",
          label: "Empresa",
          required: true,
          text: "Selecione a empresa",
          icon: "lucide-type",
        },
        {
          id: "warehouse-type",
          label: "Tipo",
          required: true,
          text: "Selecione o tipo do depósito",
          icon: "lucide-book-user",
        },
        {
          id: "warehouse-postal-code",
          label: "CEP",
          required: true,
          placeholder: "00000-000",
          icon: "lucide-hash",
        },
        { id: "warehouse-state", label: "Estado", placeholder: "Estado", icon: "lucide-map-pin" },
        { id: "warehouse-city", label: "Cidade", placeholder: "Cidade", icon: "lucide-map-pin" },
        {
          id: "warehouse-address",
          label: "Endereço",
          placeholder: "Endereço",
          icon: "lucide-land-plot",
        },
        {
          id: "warehouse-alias",
          label: "Apelido",
          placeholder: "Insira um apelido",
          icon: "lucide-milestone",
        },
        {
          id: "warehouse-responsible",
          label: "Colaborador",
          required: true,
          placeholder: "Selecione um colaborador",
          icon: "lucide-user-round",
        },
        {
          id: "warehouse-minimum-stock",
          label: "Estoque mínimo",
          required: true,
          placeholder: "0000,00",
          icon: "lucide-hash",
        },
        {
          id: "warehouse-maximum-stock",
          label: "Estoque máximo",
          required: true,
          placeholder: "0000,00",
          icon: "lucide-hash",
        },
        {
          id: "warehouse-notes",
          label: "Observações",
          placeholder: "Insira as observações necessárias",
        },
      ],
    })
    expect(
      dialog
        .querySelector("#warehouse-responsible")
        ?.parentElement?.querySelector(".lucide-at-sign"),
    ).toHaveAttribute("aria-hidden", "true")
    for (const name of ["Depósito principal", "Permite transferência", "Ativo"]) {
      expect(within(dialog).getByRole("switch", { name })).toBeChecked()
    }
  })

  it("covers every truck field in the content and drawer", () => {
    const { dialog } = expectDrawerInventory({
      header: "Novo / Caminhão",
      renderDrawer: <TruckCreationDrawer isOpen onOpenChange={vi.fn()} />,
      sections: ["Identificação", "Veículo", "Configurações", "Observações"],
      fields: [
        {
          id: "truck-plate",
          label: "Placa",
          required: true,
          placeholder: "ABC1D23 ou ABC-1234",
          icon: "lucide-text-cursor-input",
        },
        {
          id: "truck-fleet",
          label: "Frota",
          placeholder: "Selecione a frota",
          icon: "lucide-truck",
        },
        {
          id: "truck-chassis",
          label: "Chassi",
          placeholder: "Número do chassi",
          icon: "lucide-binary",
        },
        {
          id: "truck-renavam",
          label: "Renavam",
          placeholder: "Número do renavam",
          icon: "lucide-dock",
        },
        {
          id: "truck-crlv",
          label: "CRLV",
          text: "Selecione a validade",
          icon: "lucide-calendar",
        },
        {
          id: "truck-licensing",
          label: "Licenciamento",
          text: "Selecione a validade",
          icon: "lucide-calendar",
        },
        {
          id: "truck-brand",
          label: "Marca",
          required: true,
          text: "Selecione uma marca",
          icon: "lucide-chart-no-axes-combined",
        },
        {
          id: "truck-model",
          label: "Modelo",
          placeholder: "Selecione o modelo",
          icon: "lucide-waypoints",
        },
        {
          id: "truck-year-model",
          label: "Ano",
          placeholder: "2000/2001",
          icon: "lucide-calendar",
        },
        {
          id: "truck-color",
          label: "Cor",
          placeholder: "Insira uma cor",
          icon: "lucide-paintbrush",
        },
        {
          id: "truck-type",
          label: "Tipo",
          text: "Selecione o tipo do veículo",
          icon: "lucide-box",
        },
        { id: "truck-capacity", label: "Capacidade", placeholder: "0000,00", icon: "lucide-hash" },
        { id: "truck-volume", label: "Volume m³", placeholder: "0000,00", icon: "lucide-hash" },
        {
          id: "truck-base-warehouse",
          label: "Depósito base",
          required: true,
          placeholder: "Selecione um depósito base",
          icon: "lucide-map-pin",
        },
        {
          id: "truck-notes",
          label: "Observações",
          placeholder: "Insira as observações necessárias",
        },
      ],
    })
    for (const name of [
      "Caminhão próprio",
      "Permite operação interestadual",
      "Gera comissão",
      "Ativo",
    ]) {
      expect(within(dialog).getByRole("switch", { name })).toBeChecked()
    }
  })

  it("covers every driver field in the content and drawer", () => {
    expectDrawerInventory({
      header: "Novo / Motorista",
      renderDrawer: <DriverCreationDrawer isOpen onOpenChange={vi.fn()} />,
      sections: ["Dados gerais", "Contato", "CNH", "Empresa", "Observações"],
      fields: [
        {
          id: "driver-name",
          label: "Nome",
          required: true,
          placeholder: "Insira o nome do motorista",
          icon: "lucide-user-round",
        },
        {
          id: "driver-cpf",
          label: "CPF",
          placeholder: "000.000.000-00",
          icon: "lucide-text-cursor-input",
        },
        {
          id: "driver-rg",
          label: "RG",
          placeholder: "0.000.000",
          icon: "lucide-square-user-round",
        },
        {
          id: "driver-birth-date",
          label: "Data de nascimento",
          text: "Selecione a data",
          icon: "lucide-calendar",
        },
        {
          id: "driver-phone",
          label: "Telefone",
          required: true,
          placeholder: "(00) 00000-0000",
          icon: "lucide-phone",
        },
        {
          id: "driver-whatsapp",
          label: "WhatsApp",
          placeholder: "(00) 00000-0000",
          icon: "lucide-message-circle",
        },
        {
          id: "driver-email",
          label: "E-mail",
          placeholder: "email@empresa.com.br",
          icon: "lucide-mail",
        },
        {
          id: "driver-cnh-number",
          label: "Número",
          required: true,
          placeholder: "Insira o número da CNH",
          icon: "lucide-hash",
        },
        {
          id: "driver-cnh-category",
          label: "Categoria",
          text: "Selecione a categoria",
          icon: "lucide-credit-card",
        },
        {
          id: "driver-cnh-validity",
          label: "Validade",
          required: true,
          text: "Selecione a validade",
          icon: "lucide-calendar-clock",
        },
        { id: "compact-inline-switch-remuneratedActivity", label: "Atividade remunerada" },
        {
          id: "driver-main-truck",
          label: "Caminhão principal",
          required: true,
          placeholder: "Selecione uma placa ou nome",
          icon: "lucide-truck",
        },
        {
          id: "driver-commission",
          label: "Comissão",
          text: "Selecione um modelo de comissão",
          icon: "lucide-receipt-text",
        },
        {
          id: "driver-status",
          label: "Situação",
          text: "Selecione uma situação",
          icon: "lucide-user-round-check",
        },
        {
          id: "driver-notes",
          label: "Observações",
          placeholder: "Insira as observações necessárias",
        },
      ],
    })
    expect(screen.getByRole("switch", { name: "Atividade remunerada" })).toBeChecked()
  })

  it("covers every collaborator field in the content and drawer", () => {
    const { dialog } = expectDrawerInventory({
      header: "Novo / Colaborador",
      renderDrawer: <CollaboratorCreationDrawer isOpen onOpenChange={vi.fn()} />,
      sections: ["Identificação", "Acesso", "Empresa", "Configurações", "Observações"],
      fields: [
        {
          id: "collaborator-name",
          label: "Nome",
          required: true,
          placeholder: "Insira o nome do colaborador",
          icon: "lucide-text-cursor-input",
        },
        {
          id: "collaborator-email",
          label: "E-mail",
          placeholder: "email@empresa.com.br",
          icon: "lucide-mail",
        },
        {
          id: "collaborator-phone",
          label: "Telefone",
          placeholder: "(00) 00000-0000",
          icon: "lucide-phone",
        },
        {
          id: "collaborator-username",
          label: "Usuário",
          required: true,
          placeholder: "Insira o nome do usuário",
          icon: "lucide-user-round",
        },
        {
          id: "collaborator-password",
          label: "Senha",
          required: true,
          placeholder: "Insira a senha",
          icon: "lucide-lock",
        },
        {
          id: "collaborator-company",
          label: "Empresa",
          required: true,
          text: "Selecione a empresa",
          icon: "lucide-building-2",
        },
        {
          id: "collaborator-profile",
          label: "Perfil",
          required: true,
          text: "Selecione o tipo de perfil",
          icon: "lucide-badge",
        },
        {
          id: "collaborator-notes",
          label: "Observações",
          placeholder: "Insira as observações necessárias",
        },
      ],
    })
    expect(dialog.querySelector("legend .lucide-hash")).toHaveAttribute("aria-hidden", "true")
    for (const name of [
      "Recebe notificações",
      "Usuário ativo",
      "Alterar senha no primeiro acesso",
    ]) {
      expect(within(dialog).getByRole("switch", { name })).toBeChecked()
    }
    expect(within(dialog).getByRole("button", { name: "Gerar senha segura" })).toBeVisible()
  })

  it("covers every permission profile field in the content and drawer", () => {
    const { dialog } = expectDrawerInventory({
      header: "Novo / Perfil",
      renderDrawer: <PermissionProfileCreationDrawer isOpen onOpenChange={vi.fn()} />,
      sections: ["Identificação"],
      fields: [
        {
          id: "permission-name",
          label: "Nome",
          required: true,
          placeholder: "Insira o nome do perfil",
          icon: "lucide-text-cursor-input",
        },
        {
          id: "permission-description",
          label: "Descrição",
          placeholder: "Crie uma descrição para o perfil",
          icon: "lucide-text-align-start",
        },
      ],
    })
    expect(dialog.querySelector("#permission-description")).toHaveClass("h-[4.5rem]")
    const groups = [
      "Empresas",
      "Clientes",
      "Estoque",
      "Produtos",
      "Operações",
      "Financeiro",
      "Fiscal",
      "Administração",
    ]
    expect(groups.map((name) => within(dialog).getByRole("checkbox", { name }))).toHaveLength(8)
    for (const name of groups) {
      const trigger = within(dialog).getByRole("button", { name: `Alternar permissões de ${name}` })
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      expect(trigger.querySelector(".lucide-chevron-down")).toHaveAttribute("aria-hidden", "true")
    }
    expect(within(dialog).getByRole("checkbox", { name: "Estoque" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    )
    expect(within(dialog).getByRole("checkbox", { name: "Produtos" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    )
    expect(within(dialog).getByRole("checkbox", { name: "Fiscal" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    )
  })
})
