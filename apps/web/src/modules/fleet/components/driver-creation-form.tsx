import { zodResolver } from "@hookform/resolvers/zod"
import {
  CalendarClockIcon,
  CalendarIcon,
  CreditCardIcon,
  HashIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  ReceiptTextIcon,
  SquareUserRoundIcon,
  TextCursorInputIcon,
  TruckIcon,
  UserRoundCheckIcon,
  UserRoundIcon,
} from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { ComboboxInputOption } from "@/modules/shared/components/combobox-input"
import { FormSection } from "@/modules/shared/components/form-layout"
import { ReferenceCreationPage } from "@/modules/shared/components/reference-creation-page"
import { ReferenceFormDrawer } from "@/modules/shared/components/reference-form-drawer"
import {
  CompactRhfComboboxField,
  CompactRhfDateField,
  CompactRhfInlineSwitchField,
  CompactRhfMaskedField,
  CompactRhfSelectField,
  CompactRhfTextareaField,
  CompactRhfTextField,
} from "@/modules/shared/components/rhf-form-fields"
import { Button } from "@/modules/shared/components/ui/button"
import {
  optionalDateOnly,
  optionalEmail,
  optionalText,
  requiredDateOnly,
  requiredText,
} from "@/modules/shared/lib/form-schema"

export const driverSchema = z.object({
  name: requiredText,
  cpf: optionalText.refine(
    (value) => value.length === 0 || value.length === 11,
    "Informe um CPF com 11 dígitos.",
  ),
  rg: optionalText,
  birthDate: optionalDateOnly,
  phone: requiredText.min(10, "Informe um telefone válido."),
  whatsapp: optionalText,
  email: optionalEmail,
  cnhNumber: requiredText,
  cnhCategory: optionalText,
  cnhValidity: requiredDateOnly,
  remuneratedActivity: z.boolean(),
  mainTruck: requiredText,
  commissionModel: optionalText,
  status: optionalText,
  notes: optionalText,
})

export type DriverFormValues = z.infer<typeof driverSchema>
export type DriverSubmitIntent = "save-and-add-another" | "save-driver"

export function getDriverDefaultValues(): DriverFormValues {
  return {
    name: "",
    cpf: "",
    rg: "",
    birthDate: "",
    phone: "",
    whatsapp: "",
    email: "",
    cnhNumber: "",
    cnhCategory: "",
    cnhValidity: "",
    remuneratedActivity: true,
    mainTruck: "",
    commissionModel: "",
    status: "",
    notes: "",
  }
}

const cnhCategoryOptions = ["A", "B", "C", "D", "E"].map((value) => ({ label: value, value }))
const commissionOptions = [
  { label: "Valor fixo", value: "fixed" },
  { label: "Percentual", value: "percentage" },
  { label: "Não recebe comissão", value: "none" },
  { label: "Valor manual", value: "manual" },
] as const
const statusOptions = [
  { label: "Ativo", value: "active" },
  { label: "Férias", value: "vacation" },
  { label: "Afastado", value: "leave" },
  { label: "Desligado", value: "inactive" },
] as const
export function DriverCreationScreen({
  truckOptions = [],
}: {
  truckOptions?: readonly ComboboxInputOption[]
} = {}) {
  return (
    <ReferenceCreationPage
      actionLabel="Novo motorista"
      description="Gerencie dados pessoais, habilitação e vínculos operacionais dos motoristas."
      title="Motoristas"
    >
      {({ isOpen, onOpenChange }) => (
        <DriverCreationDrawer
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          truckOptions={truckOptions}
        />
      )}
    </ReferenceCreationPage>
  )
}

export function DriverCreationDrawer({
  isOpen,
  onReview,
  onOpenChange,
  truckOptions = [],
}: {
  isOpen: boolean
  onReview?: (values: DriverFormValues, intent: DriverSubmitIntent) => void
  onOpenChange: (open: boolean) => void
  truckOptions?: readonly ComboboxInputOption[]
}) {
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setFocus,
  } = useForm<DriverFormValues>({
    defaultValues: getDriverDefaultValues(),
    resolver: zodResolver(driverSchema),
  })

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("name"))
  }, [isOpen, setFocus])

  function discard() {
    reset(getDriverDefaultValues())
  }

  return (
    <ReferenceFormDrawer
      bodyClassName="px-4 py-4 sm:px-6"
      context="Novo"
      isDirty={isDirty}
      isOpen={isOpen}
      onDiscard={discard}
      onOpenChange={onOpenChange}
      primaryAction={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            form="driver-reference-form"
            name="driverSubmitIntent"
            size="form"
            type="submit"
            value="save-and-add-another"
            variant="secondary"
          >
            Salvar e adicionar outro
          </Button>
          <Button
            form="driver-reference-form"
            name="driverSubmitIntent"
            size="form"
            type="submit"
            value="save-driver"
          >
            Salvar motorista
          </Button>
        </div>
      }
      secondaryAction={(requestClose) => (
        <Button size="form" type="button" variant="outline" onClick={requestClose}>
          Cancelar
        </Button>
      )}
      title="Motorista"
    >
      <form
        id="driver-reference-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values, event) => {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)
            ?.submitter as HTMLButtonElement | null
          const intent: DriverSubmitIntent =
            submitter?.value === "save-and-add-another" ? "save-and-add-another" : "save-driver"
          onReview?.(values, intent)
        })}
      >
        <FormSection title="Dados gerais">
          <CompactRhfTextField
            control={control}
            id="driver-name"
            icon={UserRoundIcon}
            label="Nome"
            name="name"
            placeholder="Insira o nome do motorista"
            required
          />
          <CompactRhfMaskedField
            control={control}
            id="driver-cpf"
            icon={TextCursorInputIcon}
            label="CPF"
            mask="brCpf"
            name="cpf"
            placeholder="000.000.000-00"
          />
          <CompactRhfMaskedField
            control={control}
            id="driver-rg"
            icon={SquareUserRoundIcon}
            label="RG"
            mask="brRg"
            name="rg"
            placeholder="0.000.000"
          />
          <CompactRhfDateField
            control={control}
            id="driver-birth-date"
            icon={CalendarIcon}
            label="Data de nascimento"
            name="birthDate"
            placeholder="Selecione a data"
          />
        </FormSection>
        <FormSection title="Contato">
          <CompactRhfMaskedField
            control={control}
            id="driver-phone"
            icon={PhoneIcon}
            label="Telefone"
            mask="brPhone"
            name="phone"
            placeholder="(00) 00000-0000"
            required
          />
          <CompactRhfMaskedField
            control={control}
            id="driver-whatsapp"
            icon={MessageCircleIcon}
            label="WhatsApp"
            mask="brPhone"
            name="whatsapp"
            placeholder="(00) 00000-0000"
          />
          <CompactRhfTextField
            autoComplete="email"
            control={control}
            id="driver-email"
            icon={MailIcon}
            label="E-mail"
            name="email"
            placeholder="email@empresa.com.br"
            type="email"
          />
        </FormSection>
        <FormSection title="CNH">
          <CompactRhfTextField
            control={control}
            id="driver-cnh-number"
            icon={HashIcon}
            label="Número"
            name="cnhNumber"
            inputMode="numeric"
            placeholder="Insira o número da CNH"
            required
          />
          <CompactRhfSelectField
            control={control}
            id="driver-cnh-category"
            icon={CreditCardIcon}
            label="Categoria"
            name="cnhCategory"
            options={cnhCategoryOptions}
            placeholder="Selecione a categoria"
          />
          <CompactRhfDateField
            control={control}
            id="driver-cnh-validity"
            icon={CalendarClockIcon}
            label="Validade"
            name="cnhValidity"
            placeholder="Selecione a validade"
            required
          />
          <CompactRhfInlineSwitchField
            control={control}
            label="Atividade remunerada"
            name="remuneratedActivity"
          />
        </FormSection>
        <FormSection title="Empresa">
          <CompactRhfComboboxField
            control={control}
            id="driver-main-truck"
            icon={TruckIcon}
            label="Caminhão principal"
            name="mainTruck"
            options={truckOptions}
            placeholder="Selecione uma placa ou nome"
            required
          />
          <CompactRhfSelectField
            control={control}
            id="driver-commission"
            icon={ReceiptTextIcon}
            label="Comissão"
            name="commissionModel"
            options={commissionOptions}
            placeholder="Selecione um modelo de comissão"
          />
          <CompactRhfSelectField
            control={control}
            id="driver-status"
            icon={UserRoundCheckIcon}
            label="Situação"
            name="status"
            options={statusOptions}
            placeholder="Selecione uma situação"
          />
        </FormSection>
        <FormSection title="Observações">
          <CompactRhfTextareaField
            control={control}
            id="driver-notes"
            label="Observações"
            name="notes"
            placeholder="Insira as observações necessárias"
          />
        </FormSection>
      </form>
    </ReferenceFormDrawer>
  )
}
