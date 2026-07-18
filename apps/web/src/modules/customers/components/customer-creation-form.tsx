import { zodResolver } from "@hookform/resolvers/zod"
import {
  BookUserIcon,
  CalendarIcon,
  CalendarRangeIcon,
  FileCheckIcon,
  HashIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  MilestoneIcon,
  PhoneIcon,
  RectangleEllipsisIcon,
  TextCursorInputIcon,
  TypeIcon,
  UserRoundIcon,
  WalletIcon,
} from "lucide-react"
import { useEffect } from "react"
import {
  type Control,
  type UseFormSetValue,
  useController,
  useForm,
  useWatch,
} from "react-hook-form"
import { z } from "zod"

import { CompactSelectInput, CompactSwitchControl } from "@/modules/shared/components/form-controls"
import {
  CompactFormField,
  CompactFormGroup,
  CompactFormSwitchStack,
  FormSection,
} from "@/modules/shared/components/form-layout"
import { MaskedInput } from "@/modules/shared/components/masked-input"
import { ReferenceCreationPage } from "@/modules/shared/components/reference-creation-page"
import { ReferenceFormDrawer } from "@/modules/shared/components/reference-form-drawer"
import {
  CompactRhfMaskedField,
  CompactRhfSelectField,
  CompactRhfSwitchField,
  CompactRhfTextareaField,
  CompactRhfTextField,
} from "@/modules/shared/components/rhf-form-fields"
import { Button } from "@/modules/shared/components/ui/button"
import { optionalEmail, optionalText, requiredText } from "@/modules/shared/lib/form-schema"

export const customerSchema = z
  .object({
    personType: z.enum(["company", "person"], { message: "Selecione o tipo de cliente." }),
    document: requiredText,
    legalName: requiredText,
    tradeName: optionalText,
    stateRegistration: optionalText,
    municipalRegistration: optionalText,
    postalCode: requiredText.length(8, "Informe um CEP com 8 dígitos."),
    address: optionalText,
    state: optionalText,
    city: optionalText,
    district: optionalText,
    contactName: requiredText,
    phone: optionalText,
    whatsapp: optionalText,
    email: optionalEmail,
    paymentCondition: optionalText,
    creditEnabled: z.boolean(),
    creditLimit: optionalText,
    creditPeriod: optionalText,
    priceTable: optionalText,
    defaultTerm: optionalText,
    buysProducts: z.boolean(),
    hiresTransport: z.boolean(),
    receivesOwnDelivery: z.boolean(),
    notes: optionalText,
  })
  .superRefine((value, context) => {
    const expectedLength = value.personType === "person" ? 11 : 14
    if (value.document.length !== expectedLength) {
      context.addIssue({
        code: "custom",
        path: ["document"],
        message:
          value.personType === "person"
            ? "Informe um CPF com 11 dígitos."
            : "Informe um CNPJ com 14 dígitos.",
      })
    }
  })

export type CustomerFormValues = z.infer<typeof customerSchema>
export type CustomerSubmitIntent = "save-and-add-another" | "save-customer"

export function shouldClearCustomerDocument(
  previousPersonType: CustomerFormValues["personType"],
  nextPersonType: CustomerFormValues["personType"],
) {
  return previousPersonType !== nextPersonType
}

export function getCustomerDefaultValues(): CustomerFormValues {
  return {
    personType: "company",
    document: "",
    legalName: "",
    tradeName: "",
    stateRegistration: "",
    municipalRegistration: "",
    postalCode: "",
    address: "",
    state: "",
    city: "",
    district: "",
    contactName: "",
    phone: "",
    whatsapp: "",
    email: "",
    paymentCondition: "boleto",
    creditEnabled: false,
    creditLimit: "",
    creditPeriod: "per-month",
    priceTable: "wholesale",
    defaultTerm: "",
    buysProducts: true,
    hiresTransport: true,
    receivesOwnDelivery: true,
    notes: "",
  }
}

const personTypeOptions = [
  { label: "Pessoa jurídica", value: "company" },
  { label: "Pessoa física", value: "person" },
] as const
const paymentOptions = [
  { label: "Boleto", value: "boleto" },
  { label: "À vista", value: "cash" },
  { label: "Faturado", value: "invoice" },
] as const
const creditPeriodOptions = [{ label: "por mês", value: "per-month" }] as const
const priceTableOptions = [
  { label: "Padrão", value: "default" },
  { label: "Atacado", value: "wholesale" },
] as const

export function CustomerCreationScreen() {
  return (
    <ReferenceCreationPage
      actionLabel="Novo cliente"
      description="Gerencie os dados cadastrais, comerciais e operacionais dos clientes."
      title="Clientes"
    >
      {({ isOpen, onOpenChange }) => (
        <CustomerCreationDrawer isOpen={isOpen} onOpenChange={onOpenChange} />
      )}
    </ReferenceCreationPage>
  )
}

export function CustomerCreationDrawer({
  isOpen,
  onReview,
  onOpenChange,
}: {
  isOpen: boolean
  onReview?: (values: CustomerFormValues, intent: CustomerSubmitIntent) => void
  onOpenChange: (open: boolean) => void
}) {
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setFocus,
    setValue,
  } = useForm<CustomerFormValues>({
    defaultValues: getCustomerDefaultValues(),
    resolver: zodResolver(customerSchema),
  })
  const personType = useWatch({ control, name: "personType" })

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("personType"))
  }, [isOpen, setFocus])

  function discard() {
    reset(getCustomerDefaultValues())
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
            form="customer-reference-form"
            name="customerSubmitIntent"
            size="form"
            type="submit"
            value="save-and-add-another"
            variant="secondary"
          >
            Salvar e adicionar outro
          </Button>
          <Button
            form="customer-reference-form"
            name="customerSubmitIntent"
            size="form"
            type="submit"
            value="save-customer"
          >
            Salvar cliente
          </Button>
        </div>
      }
      secondaryAction={(requestClose) => (
        <Button size="form" type="button" variant="outline" onClick={requestClose}>
          Cancelar
        </Button>
      )}
      title="Cliente"
    >
      <form
        id="customer-reference-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values, event) => {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)
            ?.submitter as HTMLButtonElement | null
          const intent: CustomerSubmitIntent =
            submitter?.value === "save-and-add-another" ? "save-and-add-another" : "save-customer"
          onReview?.(values, intent)
        })}
      >
        <FormSection title="Dados gerais">
          <CustomerPersonTypeField control={control} setValue={setValue} />
          <CompactRhfMaskedField
            control={control}
            id="customer-document"
            icon={RectangleEllipsisIcon}
            label={personType === "person" ? "CPF" : "CNPJ"}
            mask={personType === "person" ? "brCpf" : "brCnpj"}
            name="document"
            placeholder={personType === "person" ? "000.000.000-00" : "00.000.000/0001-00"}
            required
          />
          <CompactRhfTextField
            control={control}
            id="customer-legal-name"
            icon={BookUserIcon}
            label="Razão social"
            name="legalName"
            placeholder="Insira a razão social"
            required
          />
          <CompactRhfTextField
            control={control}
            id="customer-trade-name"
            icon={TypeIcon}
            label="Nome fantasia"
            name="tradeName"
            placeholder="Insira o nome fantasia"
          />
          <CompactRhfMaskedField
            control={control}
            id="customer-state-registration"
            icon={RectangleEllipsisIcon}
            label="Inscrição estadual"
            mask="brRegistration"
            name="stateRegistration"
            placeholder="Insira a IE"
          />
          <CompactRhfMaskedField
            control={control}
            id="customer-municipal-registration"
            icon={RectangleEllipsisIcon}
            label="Inscrição municipal"
            mask="brRegistration"
            name="municipalRegistration"
            placeholder="Insira a IM"
          />
        </FormSection>
        <FormSection title="Localização">
          <CompactRhfMaskedField
            control={control}
            id="customer-postal-code"
            icon={HashIcon}
            label="CEP"
            mask="brPostalCode"
            name="postalCode"
            placeholder="00000-000"
            required
          />
          <CompactRhfTextField
            control={control}
            id="customer-address"
            icon={MapPinIcon}
            label="Endereço"
            name="address"
            placeholder="Endereço do cliente"
          />
          <CompactRhfTextField
            control={control}
            id="customer-state"
            icon={TextCursorInputIcon}
            label="Estado"
            name="state"
            placeholder="Insira o estado do cliente"
          />
          <CompactRhfTextField
            control={control}
            id="customer-city"
            icon={MapPinIcon}
            label="Cidade"
            name="city"
            placeholder="Insira a cidade do cliente"
          />
          <CompactRhfTextField
            control={control}
            id="customer-district"
            icon={MilestoneIcon}
            label="Bairro"
            name="district"
            placeholder="Insira o bairro do cliente"
          />
        </FormSection>
        <FormSection title="Contato">
          <CompactRhfTextField
            control={control}
            id="customer-contact"
            icon={UserRoundIcon}
            label="Nome do contato"
            name="contactName"
            placeholder="Insira o nome do contato"
            required
          />
          <CompactRhfMaskedField
            control={control}
            id="customer-phone"
            icon={PhoneIcon}
            label="Telefone"
            mask="brPhone"
            name="phone"
            placeholder="(00) 00000-0000"
          />
          <CompactRhfMaskedField
            control={control}
            id="customer-whatsapp"
            icon={MessageCircleIcon}
            label="WhatsApp"
            mask="brPhone"
            name="whatsapp"
            placeholder="(00) 00000-0000"
          />
          <CompactRhfTextField
            autoComplete="email"
            control={control}
            id="customer-email"
            icon={MailIcon}
            label="E-mail"
            name="email"
            placeholder="email@empresa.com.br"
            type="email"
          />
        </FormSection>
        <FormSection title="Comercial">
          <CompactRhfSelectField
            control={control}
            id="customer-payment"
            icon={FileCheckIcon}
            label="Condição de pagamento"
            name="paymentCondition"
            options={paymentOptions}
            placeholder="Selecione a condição de pagamento"
          />
          <CustomerCreditLimitField control={control} />
          <CompactRhfSelectField
            control={control}
            id="customer-price-table"
            icon={CalendarRangeIcon}
            label="Tabela de preço"
            name="priceTable"
            options={priceTableOptions}
            placeholder="Selecione a tabela de preço"
          />
          <CompactRhfTextField
            control={control}
            id="customer-term"
            icon={CalendarIcon}
            label="Prazo padrão"
            name="defaultTerm"
            inputMode="numeric"
            placeholder="30 dias"
          />
        </FormSection>
        <FormSection title="Operação">
          <CompactFormGroup label="Operação">
            <CompactFormSwitchStack label="Configurações de operação">
              <CompactRhfSwitchField
                control={control}
                label="Compra produtos"
                name="buysProducts"
              />
              <CompactRhfSwitchField
                control={control}
                label="Contrata transporte"
                name="hiresTransport"
              />
              <CompactRhfSwitchField
                control={control}
                label="Recebe entrega própria"
                name="receivesOwnDelivery"
              />
            </CompactFormSwitchStack>
          </CompactFormGroup>
        </FormSection>
        <FormSection title="Observações">
          <CompactRhfTextareaField
            control={control}
            id="customer-notes"
            label="Observações"
            name="notes"
            placeholder="Insira as observações necessárias"
          />
        </FormSection>
      </form>
    </ReferenceFormDrawer>
  )
}

function CustomerPersonTypeField({
  control,
  setValue,
}: {
  control: Control<CustomerFormValues>
  setValue: UseFormSetValue<CustomerFormValues>
}) {
  const { field, fieldState } = useController({ control, name: "personType" })
  const error = fieldState.error?.message

  return (
    <CompactFormField
      error={error}
      icon={RectangleEllipsisIcon}
      id="customer-type"
      label="Tipo de pessoa"
      required
    >
      <CompactSelectInput
        ref={field.ref}
        aria-describedby={error ? "customer-type-error" : undefined}
        aria-invalid={Boolean(error)}
        id="customer-type"
        name={field.name}
        options={personTypeOptions}
        placeholder="Selecione o tipo de empresa"
        required
        value={field.value}
        onBlur={field.onBlur}
        onValueChange={(nextValue) => {
          if (
            shouldClearCustomerDocument(field.value, nextValue as CustomerFormValues["personType"])
          ) {
            field.onChange(nextValue)
            setValue("document", "", { shouldDirty: true, shouldValidate: true })
            return
          }
          field.onChange(nextValue)
        }}
      />
    </CompactFormField>
  )
}

function CustomerCreditLimitField({ control }: { control: Control<CustomerFormValues> }) {
  const enabled = useController({ control, name: "creditEnabled" }).field
  const limit = useController({ control, name: "creditLimit" }).field
  const period = useController({ control, name: "creditPeriod" }).field

  return (
    <CompactFormField id="customer-credit" icon={WalletIcon} label="Limite de crédito">
      <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_7rem] items-center gap-1">
        <label
          className="flex size-8 cursor-pointer items-center justify-center rounded-sm border"
          htmlFor="customer-credit-enabled"
        >
          <span className="sr-only">Habilitar limite de crédito</span>
          <CompactSwitchControl
            ref={enabled.ref}
            checked={Boolean(enabled.value)}
            id="customer-credit-enabled"
            name={enabled.name}
            onBlur={enabled.onBlur}
            onCheckedChange={enabled.onChange}
          />
        </label>
        <MaskedInput
          ref={limit.ref}
          className="h-8 rounded-sm px-2 py-1"
          id="customer-credit"
          mask="brMoney"
          name={limit.name}
          placeholder="R$ 0,00"
          value={String(limit.value ?? "")}
          onBlur={limit.onBlur}
          onValueChange={limit.onChange}
        />
        <CompactSelectInput
          aria-label="Periodicidade do limite de crédito"
          id="customer-credit-period"
          name={period.name}
          options={creditPeriodOptions}
          placeholder="por mês"
          value={String(period.value ?? "")}
          onBlur={period.onBlur}
          onValueChange={period.onChange}
        />
      </div>
    </CompactFormField>
  )
}
