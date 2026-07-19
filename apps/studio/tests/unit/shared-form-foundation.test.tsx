import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AtSignIcon } from "lucide-react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  ComboboxInput,
  CompactComboboxInput,
} from "@/modules/shared/components/forms/combobox-input"
import {
  DatePicker,
  formatDateOnly,
  parseDateOnly,
} from "@/modules/shared/components/forms/date-picker"
import { SelectInput, SwitchControl } from "@/modules/shared/components/forms/form-controls"
import { MaskedInput } from "@/modules/shared/components/forms/masked-input"
import { PermissionGroup } from "@/modules/shared/components/forms/permission-group"
import {
  CompactQuantityUnitControl,
  quantityUnitOptions,
} from "@/modules/shared/components/forms/quantity-unit-control"
import { CollapsibleDrawerSection } from "@/modules/shared/components/overlays/drawer-section"
import { CompactTextarea } from "@/modules/shared/components/ui/textarea"

function selectBaseUiOption(name: string) {
  const option = screen.getByRole("option", { hidden: true, name })
  fireEvent.pointerDown(option, { buttons: 1, pointerType: "mouse" })
  fireEvent.click(option, { detail: 1 })
}

describe("shared form foundation", () => {
  it("exposes accessible disclosure state and native keyboard interaction", async () => {
    const user = userEvent.setup()
    render(
      <CollapsibleDrawerSection title="Dados gerais">
        <p>Conteúdo da seção</p>
      </CollapsibleDrawerSection>,
    )

    const trigger = screen.getByRole("button", { name: "Dados gerais" })
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Conteúdo da seção")).toBeVisible()

    trigger.focus()
    await user.keyboard(" ")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("Conteúdo da seção")).not.toBeVisible()

    await user.keyboard("{Enter}")
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Conteúdo da seção")).toBeVisible()
  })

  it("reopens a collapsed section and focuses its first invalid control", async () => {
    const user = userEvent.setup()

    function Harness() {
      const [invalid, setInvalid] = useState(false)
      return (
        <div role="dialog" aria-label="Formulário local">
          <CollapsibleDrawerSection title="Dados gerais">
            <label htmlFor="document">CNPJ</label>
            <input id="document" aria-invalid={invalid} />
          </CollapsibleDrawerSection>
          <button type="button" onClick={() => setInvalid(true)}>
            Validar
          </button>
        </div>
      )
    }

    render(<Harness />)
    const trigger = screen.getByRole("button", { name: "Dados gerais" })
    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    await user.click(screen.getByRole("button", { name: "Validar" }))
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"))
    await waitFor(() => expect(screen.getByLabelText("CNPJ")).toHaveFocus())
  })

  it("keeps the Base UI select controlled and connected to its error contract", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 40,
      height: 40,
      left: 0,
      right: 320,
      top: 0,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    const clientRect = new DOMRect(0, 0, 320, 40)
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(
      Object.assign([clientRect], {
        item: (index: number) => (index === 0 ? clientRect : null),
      }) as unknown as DOMRectList,
    )
    const user = userEvent.setup()

    function Harness() {
      const [value, setValue] = useState("")
      return (
        <>
          <label htmlFor="entity-status">Situação</label>
          <SelectInput
            aria-describedby="entity-status-error"
            aria-invalid
            id="entity-status"
            placeholder="Selecione uma situação"
            value={value}
            options={[
              { label: "Ativa", value: "active" },
              { label: "Inativa", value: "inactive" },
            ]}
            onValueChange={setValue}
          />
          <p id="entity-status-error">Selecione uma situação.</p>
        </>
      )
    }

    render(<Harness />)
    const select = screen.getByRole("combobox", { name: "Situação" })
    expect(select).toHaveAttribute("aria-invalid", "true")
    expect(select).toHaveAccessibleDescription("Selecione uma situação.")

    await user.click(select)
    selectBaseUiOption("Ativa")
    await waitFor(() => expect(select).toHaveTextContent("Ativa"))
  })

  it("uses Base UI switch semantics with an associated label and keyboard state", async () => {
    const user = userEvent.setup()

    function Harness() {
      const [checked, setChecked] = useState(false)
      return (
        <>
          <label htmlFor="feature-switch">Recurso ativo</label>
          <SwitchControl checked={checked} id="feature-switch" onCheckedChange={setChecked} />
        </>
      )
    }

    render(<Harness />)
    const control = screen.getByRole("switch", { name: "Recurso ativo" })
    expect(control).toHaveAttribute("aria-checked", "false")
    control.focus()
    await user.keyboard(" ")
    expect(control).toHaveAttribute("aria-checked", "true")
    expect(control).toHaveFocus()
  })

  it("selects combobox options with arrow keys and Enter", async () => {
    const user = userEvent.setup()
    const onOptionSelect = vi.fn()
    render(
      <ComboboxInput
        id="entity"
        value=""
        options={[
          { label: "Opção Alfa", value: "alpha" },
          { label: "Opção Beta", value: "beta" },
        ]}
        onOptionSelect={onOptionSelect}
        onValueChange={vi.fn()}
      />,
    )

    const combobox = screen.getByRole("combobox")
    await user.click(combobox)
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}")

    expect(onOptionSelect).toHaveBeenCalledWith({ label: "Opção Beta", value: "beta" })
    expect(combobox).toHaveAttribute("aria-expanded", "false")
  })

  it("keeps combobox options out of the tab order while focus stays on the input", async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Antes</button>
        <ComboboxInput
          id="entity-tab-order"
          value=""
          options={[
            { label: "Opção Alfa", value: "alpha" },
            { label: "Opção Beta", value: "beta" },
          ]}
          onOptionSelect={vi.fn()}
          onValueChange={vi.fn()}
        />
        <button type="button">Depois</button>
      </>,
    )

    const combobox = screen.getByRole("combobox")
    await user.click(combobox)
    await user.keyboard("{ArrowDown}")
    expect(combobox).toHaveAttribute("aria-activedescendant", "entity-tab-order-option-0")
    for (const option of screen.getAllByRole("option"))
      expect(option).toHaveAttribute("tabindex", "-1")

    await user.tab()
    expect(screen.getByRole("button", { name: "Depois" })).toHaveFocus()
    await user.tab({ shift: true })
    expect(combobox).toHaveFocus()
  })

  it("keeps compact combobox and textarea sizing explicit without shrinking defaults", () => {
    render(
      <>
        <label htmlFor="compact-combobox">Responsável</label>
        <CompactComboboxInput
          id="compact-combobox"
          value=""
          options={[]}
          placeholder="Selecione um responsável"
          onOptionSelect={vi.fn()}
          onValueChange={vi.fn()}
        />
        <label htmlFor="compact-textarea">Observações</label>
        <CompactTextarea id="compact-textarea" />
      </>,
    )

    expect(screen.getByRole("combobox", { name: "Responsável" })).toHaveClass("h-8")
    expect(screen.getByRole("textbox", { name: "Observações" })).toHaveClass("h-20", "min-h-20")
  })

  it("preserves compact combobox icon padding and portals a collision-bounded listbox", async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 740,
      height: 32,
      left: 24,
      right: 344,
      top: 708,
      width: 320,
      x: 24,
      y: 708,
      toJSON: () => ({}),
    })
    render(
      <div className="overflow-hidden">
        <CompactComboboxInput
          id="portal-combobox"
          startIcon={AtSignIcon}
          value=""
          options={[{ label: "Responsável", value: "responsavel" }]}
          onOptionSelect={vi.fn()}
          onValueChange={vi.fn()}
        />
      </div>,
    )

    const combobox = screen.getByRole("combobox")
    expect(combobox).toHaveClass("pl-8")
    expect(combobox).not.toHaveClass("px-2")
    await user.click(combobox)
    const listbox = screen.getByRole("listbox")
    expect(listbox.parentElement).toBe(document.body)
    expect(listbox).toHaveClass("fixed")
    expect(listbox).toHaveStyle({ width: "320px" })
    expect(combobox).toHaveAttribute("aria-controls", listbox.id)
  })

  it("announces combobox failures and exposes retry", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <ComboboxInput
        id="remote-options"
        value=""
        options={[]}
        status="error"
        onRetry={onRetry}
        onOptionSelect={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("combobox"))
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(screen.getByRole("status")).toHaveTextContent("Não foi possível buscar as opções.")
  })

  it("bounds the visible combobox result set", async () => {
    const user = userEvent.setup()
    render(
      <ComboboxInput
        id="bounded-options"
        maxVisibleOptions={2}
        value=""
        options={[
          { label: "Opção Alfa", value: "alpha" },
          { label: "Opção Beta", value: "beta" },
          { label: "Opção Gama", value: "gamma" },
        ]}
        onOptionSelect={vi.fn()}
        onValueChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("combobox"))
    expect(screen.getAllByRole("option")).toHaveLength(2)
    expect(screen.queryByRole("option", { name: "Opção Gama" })).not.toBeInTheDocument()
  })

  it("keeps canonical masked values separate from formatted display", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState("")
      return (
        <MaskedInput
          mask="brCpf"
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue)
            onValueChange(nextValue)
          }}
        />
      )
    }
    render(<Harness />)

    await user.type(screen.getByRole("textbox"), "12345678901")
    expect(onValueChange).toHaveBeenLastCalledWith("12345678901")
  })

  it("keeps registration punctuation visible and emits uppercase canonical values", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState("")
      return (
        <MaskedInput
          aria-label="Inscrição estadual"
          mask="brRegistration"
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue)
            onValueChange(nextValue)
          }}
        />
      )
    }
    render(<Harness />)
    const input = screen.getByLabelText("Inscrição estadual")
    await user.type(input, "01.2-a/3")
    expect(input).toHaveValue("01.2-A/3")
    expect(onValueChange).toHaveBeenLastCalledWith("012A3")
    expect(input).toHaveAttribute("maxlength", "32")
  })

  it("selects a date through the reusable calendar and emits a date-only string", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState("")
      return (
        <>
          <label htmlFor="validity">Validade</label>
          <DatePicker
            id="validity"
            placeholder="Selecione a validade"
            value={value}
            onValueChange={(nextValue) => {
              setValue(nextValue)
              onValueChange(nextValue)
            }}
          />
        </>
      )
    }
    render(<Harness />)
    const trigger = screen.getByLabelText("Validade")
    await user.click(trigger)

    expect(screen.getByRole("button", { name: "Ir para o mês anterior" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ir para o próximo mês" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Escolha o mês" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Escolha o ano" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Go to the/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /Choose the/i })).not.toBeInTheDocument()

    const today = screen.getByRole("button", { name: /^Hoje, / })
    await waitFor(() => expect(today).toHaveFocus())
    await user.click(today)
    expect(onValueChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(trigger).toHaveTextContent(/\d{2}\/\d{2}\/\d{4}/)

    await user.click(trigger)
    const selected = screen.getByRole("button", { name: /selecionado$/ })
    await waitFor(() => expect(selected).toHaveFocus())
    expect(selected).toHaveAccessibleName(/^Hoje, .+, selecionado$/)
    expect(formatDateOnly(new Date(2026, 6, 15))).toBe("2026-07-15")
    expect(parseDateOnly("2026-07-15")?.getDate()).toBe(15)
  })

  it("resets an off-month preselected date into view and focus on every open", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 6, 15, 12))

    try {
      const user = userEvent.setup()
      render(
        <>
          <label htmlFor="off-month-date">Data selecionada</label>
          <DatePicker
            id="off-month-date"
            placeholder="Selecione a data"
            value="2026-06-15"
            onValueChange={vi.fn()}
          />
        </>,
      )

      const trigger = screen.getByLabelText("Data selecionada")
      const selectedName = "segunda-feira, 15 de junho de 2026, selecionado"

      await user.click(trigger)
      expect(screen.getByRole("combobox", { name: "Escolha o mês" })).toHaveValue("5")
      expect(screen.getByRole("combobox", { name: "Escolha o ano" })).toHaveValue("2026")
      const initiallySelected = screen.getByRole("button", { name: selectedName })
      expect(initiallySelected).toHaveAccessibleName(selectedName)
      await waitFor(() => expect(initiallySelected).toHaveFocus())

      await user.selectOptions(screen.getByRole("combobox", { name: "Escolha o mês" }), "6")
      expect(screen.getByRole("combobox", { name: "Escolha o mês" })).toHaveValue("6")
      await user.keyboard("{Escape}")
      await waitFor(() => expect(trigger).toHaveFocus())

      await user.click(trigger)
      expect(screen.getByRole("combobox", { name: "Escolha o mês" })).toHaveValue("5")
      expect(screen.getByRole("combobox", { name: "Escolha o ano" })).toHaveValue("2026")
      const reopenedSelected = screen.getByRole("button", { name: selectedName })
      expect(reopenedSelected).toHaveAccessibleName(selectedName)
      await waitFor(() => expect(reopenedSelected).toHaveFocus())
    } finally {
      vi.useRealTimers()
    }
  })

  it("offers exactly the shared compact quantity units", async () => {
    const user = userEvent.setup()
    render(
      <CompactQuantityUnitControl
        amountValue="1"
        id="stock"
        placeholder="0000,00"
        unitAriaLabel="Quantidade: unidade"
        unitValue="t"
        onAmountChange={vi.fn()}
        onUnitChange={vi.fn()}
      />,
    )
    await user.click(screen.getByRole("combobox", { name: "Quantidade: unidade" }))
    expect(
      screen.getAllByRole("option", { hidden: true }).map((option) => option.textContent),
    ).toEqual(quantityUnitOptions.map((option) => option.label))
  })

  it("preserves a localized decimal separator while typing a fraction", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState("")
      return (
        <MaskedInput
          aria-label="Quantidade"
          mask="brDecimal"
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue)
            onValueChange(nextValue)
          }}
        />
      )
    }
    render(<Harness />)

    const input = screen.getByRole("textbox", { name: "Quantidade" })
    await user.type(input, "12,34")

    expect(input).toHaveValue("12,34")
    expect(onValueChange).toHaveBeenLastCalledWith("12.34")
  })

  it("maps Backspace across CNPJ punctuation to the previous canonical character", async () => {
    const user = userEvent.setup()
    function Harness() {
      const [value, setValue] = useState("12345678000190")
      return <MaskedInput aria-label="CNPJ" mask="brCnpj" value={value} onValueChange={setValue} />
    }
    render(<Harness />)

    const input = screen.getByRole("textbox", { name: "CNPJ" }) as HTMLInputElement
    input.focus()
    input.setSelectionRange(3, 3)
    await user.keyboard("{Backspace}")

    await waitFor(() => {
      expect(input).toHaveValue("13.456.780/0019-0")
      expect(input.selectionStart).toBe(1)
    })
  })

  it("maps Delete, middle insertion, and selection replacement through canonical characters", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState("12345678")
      return (
        <MaskedInput
          aria-label="Documento editável"
          mask="brCnpj"
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue)
            onValueChange(nextValue)
          }}
        />
      )
    }
    render(<Harness />)

    const input = screen.getByRole("textbox", { name: "Documento editável" }) as HTMLInputElement
    input.focus()
    input.setSelectionRange(2, 2)
    await user.keyboard("{Delete}")
    await waitFor(() => {
      expect(onValueChange).toHaveBeenLastCalledWith("1245678")
      expect(input.selectionStart).toBe(2)
    })

    input.setSelectionRange(2, 2)
    await user.keyboard("9")
    await waitFor(() => {
      expect(onValueChange).toHaveBeenLastCalledWith("12945678")
      expect(input.selectionStart).toBe(4)
    })

    input.setSelectionRange(3, 6)
    await user.keyboard("8")
    await waitFor(() => {
      expect(onValueChange).toHaveBeenLastCalledWith("128678")
      expect(input.selectionStart).toBe(4)
    })
  })

  it("maps BRL deletion by canonical digits instead of its display prefix", async () => {
    const user = userEvent.setup()
    function Harness() {
      const [value, setValue] = useState("1234.56")
      return (
        <MaskedInput aria-label="Valor" mask="brMoney" value={value} onValueChange={setValue} />
      )
    }
    render(<Harness />)

    const input = screen.getByRole("textbox", { name: "Valor" }) as HTMLInputElement
    input.focus()
    input.setSelectionRange(5, 5)
    await user.keyboard("{Backspace}")

    await waitFor(() => {
      expect(input).toHaveValue("R$ 234,56")
      expect(input.selectionStart).toBe(3)
    })
  })

  it("exposes a mixed parent permission state and all-selection action", async () => {
    const user = userEvent.setup()
    const onAllChange = vi.fn()
    render(
      <PermissionGroup
        label="Módulo"
        items={[
          { checked: true, label: "Visualizar", onCheckedChange: vi.fn() },
          { checked: false, label: "Editar", onCheckedChange: vi.fn() },
        ]}
        onAllChange={onAllChange}
      />,
    )

    const parent = screen.getByRole("checkbox", { name: "Módulo" })
    expect(parent).toHaveAttribute("aria-checked", "mixed")
    expect(parent.querySelector('[data-slot="tri-state-marker"]')).toHaveClass(
      "group-data-indeterminate:h-1",
      "group-data-indeterminate:w-3",
      "group-data-indeterminate:rounded-full",
    )
    await user.click(parent)
    expect(onAllChange).toHaveBeenCalledWith(true)

    const disclosure = screen.getByRole("button", { name: "Alternar permissões de Módulo" })
    disclosure.focus()
    await user.keyboard(" ")
    expect(disclosure).toHaveAttribute("aria-expanded", "false")
    await user.keyboard("{Enter}")
    expect(disclosure).toHaveAttribute("aria-expanded", "true")
  })
})
