import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SaveIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"
import {
  CompactRhfDescriptionField,
  CompactRhfInlineSwitchField,
  CompactRhfMaskedField,
  CompactRhfSwitchField,
  CompactRhfTextareaField,
  CompactRhfTextField,
  RhfMaskedField,
  RhfSwitchField,
  RhfTextareaField,
  RhfTextField,
} from "@/modules/shared/components/forms/rhf-form-fields"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { TooltipProvider } from "@/modules/shared/components/ui/tooltip"
import {
  compareDecimalStrings,
  exactDigits,
  isValidDateOnly,
  optionalCompleteDecimal,
  optionalDateOnly,
  optionalEmail,
  requiredCompleteDecimal,
  requiredDateOnly,
  requiredEmail,
  requiredText,
} from "@/modules/shared/lib/form-schema"
import {
  applyInputMask,
  type InputMaskName,
  normalizeInputMask,
} from "@/modules/shared/lib/input-masks"

describe("scheduling shared validation boundaries", () => {
  it.each([
    ["2024-02-29", true],
    ["2026-02-29", false],
    ["2026-13-01", false],
    ["2026-01-00", false],
    ["2026-04-31", false],
    ["2026-09-07", true],
    ["07/09/2026", false],
    ["", false],
  ])("validates complete local date %s", (value, expected) => {
    expect(isValidDateOnly(String(value))).toBe(expected)
    expect(requiredDateOnly.safeParse(value).success).toBe(expected)
    expect(optionalDateOnly.safeParse(value).success).toBe(value === "" || expected)
  })
  it.each([
    ["10", "2", 1],
    ["2", "10", -1],
    ["21", "20", 1],
    ["20", "21", -1],
    ["1.01", "1.1", -1],
    ["1.10", "1.01", 1],
    ["0001.200", "1.2", 0],
    ["0", "0.00", 0],
    ["0.001", "0", 1],
  ])("compares catalog decimal amounts %s and %s without floating-point rounding", (a, b, expected) =>
    expect(compareDecimalStrings(String(a), String(b))).toBe(expected))
  it.each([
    ["", true],
    ["1", true],
    ["1.25", true],
    ["1.", false],
    [".5", false],
    ["-1", false],
    ["1,5", false],
    ["NaN", false],
  ])("rejects incomplete decimal input %s", (value, valid) => {
    expect(optionalCompleteDecimal.safeParse(value).success).toBe(valid)
    expect(requiredCompleteDecimal.safeParse(value).success).toBe(value !== "" && valid)
  })
  it("preserves required text and canonical contact validation", () => {
    expect(requiredText.parse("  Cliente  ")).toBe("Cliente")
    expect(requiredText.safeParse("   ").success).toBe(false)
    expect(optionalEmail.parse("")).toBe("")
    expect(optionalEmail.safeParse("invalid").success).toBe(false)
    expect(requiredEmail.safeParse("person@example.invalid").success).toBe(true)
    expect(exactDigits(11, "Telefone inválido").safeParse("81999999999").success).toBe(true)
    expect(exactDigits(11, "Telefone inválido").safeParse("81999").success).toBe(false)
  })
})
const textFields = [
  RhfTextField,
  CompactRhfTextField,
  RhfTextareaField,
  CompactRhfTextareaField,
  CompactRhfDescriptionField,
] as const
function TextHarness({ variant }: { variant: number }) {
  const form = useForm<{ value: string }>(),
    Component = textFields[variant]
  return (
    <form noValidate>
      <Component
        control={form.control}
        id="field-test"
        name="value"
        label="Observações"
        description="Informação adicional"
        required
        placeholder="Ex.: Acabamento"
      />
      <button
        type="button"
        onClick={() =>
          form.setError("value", { message: "Revise este campo" }, { shouldFocus: true })
        }
      >
        Validar
      </button>
      <output aria-label="Valor canônico">{form.watch("value")}</output>
    </form>
  )
}
describe("shared scheduling controls", () => {
  it.each([
    0, 1, 2, 3, 4,
  ])("links persistent labels, descriptions, errors and focus in text composition %s", async (variant) => {
    render(<TextHarness variant={variant} />)
    const input = screen.getByLabelText("Observações")
    expect(input).toHaveValue("")
    fireEvent.change(input, { target: { value: "Acabamento natural" } })
    expect(screen.getByLabelText("Valor canônico")).toHaveTextContent("Acabamento natural")
    await userEvent.click(screen.getByRole("button", { name: "Validar" }))
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveFocus()
    expect(input.getAttribute("aria-describedby")).toContain("field-test-error")
  })
  it.each([
    false,
    true,
  ])("keeps formatted phone input separate from canonical digits, compact=%s", async (compact) => {
    const save = vi.fn()
    function MaskForm() {
      const form = useForm({ defaultValues: { phone: "" } }),
        Component = compact ? CompactRhfMaskedField : RhfMaskedField
      return (
        <form onSubmit={form.handleSubmit(save)}>
          <Component
            control={form.control}
            id="phone"
            name="phone"
            label="Telefone"
            mask="brPhone"
            placeholder="Ex.: (81) 99999-9999"
            suffix="Contato"
          />
          <button type="submit">Salvar contato</button>
        </form>
      )
    }
    render(<MaskForm />)
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "81999999999" } })
    await userEvent.click(screen.getByRole("button", { name: "Salvar contato" }))
    expect(save).toHaveBeenCalledWith({ phone: "81999999999" }, expect.anything())
  })
  it.each([0, 1, 2])("keeps switch %s values boolean and keyboard operable", async (variant) => {
    function SwitchForm() {
      const form = useForm({ defaultValues: { active: false } }),
        Component = [RhfSwitchField, CompactRhfSwitchField, CompactRhfInlineSwitchField][variant]
      return (
        <>
          <Component control={form.control} name="active" label="Ativo" />
          <output>{String(form.watch("active"))}</output>
        </>
      )
    }
    render(<SwitchForm />)
    const toggle = screen.getByRole("switch", { name: "Ativo" })
    toggle.focus()
    await userEvent.keyboard(" ")
    expect(toggle).toHaveAttribute("aria-checked", "true")
    expect(screen.getByText("true")).toBeVisible()
  })
  it("keeps primary and secondary page commands equivalent in the compact menu", async () => {
    const save = vi.fn(),
      cancel = vi.fn()
    render(
      <TooltipProvider>
        <PageHeader
          title="Agenda"
          description="Organize os horários"
          actionItems={[
            { id: "save", label: "Salvar", variant: "default", icon: SaveIcon, onSelect: save },
            { label: "Cancelar", onSelect: cancel },
            { label: "Arquivar", disabled: true, variant: "destructive" },
          ]}
        />
      </TooltipProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(save).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole("button", { name: "Ações" }))
    expect(await screen.findByRole("menuitem", { name: "Arquivar" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancelar" }))
    expect(cancel).toHaveBeenCalledOnce()
  })
})

describe("incremental scheduling contact/date/price masks", () => {
  it.each<[InputMaskName, string, string]>([
    ["brPhone", "", ""],
    ["brPhone", "8", "(8"],
    ["brPhone", "819", "(81) 9"],
    ["brPhone", "+55", "+55"],
    ["brPhone", "+558", "+55 8"],
    ["brPhone", "+55819", "+55 81 9"],
    ["brPhone", "8133334444", "(81) 3333-4444"],
    ["brPhone", "81999994444", "(81) 99999-4444"],
    ["brDate", "1", "1"],
    ["brDate", "120", "12/0"],
    ["brDate", "12092026", "12/09/2026"],
    ["brMoney", "", ""],
    ["brMoney", "R$ 0,01", "R$ 0,01"],
    ["brMoney", "1", "R$ 1,00"],
    ["brPercent", "", ""],
    ["brPercent", "0,01", "0,01"],
    ["brPercent", "1", "1,00"],
    ["brDecimal", "", ""],
    ["brDecimal", "001", "1"],
    ["brDecimal", ",1", "0,1"],
  ])("formats incomplete %s input %s without inventing extra digits", (mask, value, display) => {
    expect(applyInputMask(mask, value)).toBe(display)
    expect(normalizeInputMask(mask, display)).not.toContain("NaN")
  })
})
