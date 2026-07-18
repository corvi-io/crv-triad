import { zodResolver } from "@hookform/resolvers/zod"
import {
  BookUserIcon,
  CalendarIcon,
  CalendarRangeIcon,
  CalendarSyncIcon,
  FormInputIcon,
  HashIcon,
  MapPinIcon,
  MilestoneIcon,
  TextCursorInputIcon,
  TypeIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { CompactFileInput } from "@/modules/shared/components/form-controls"
import {
  CompactFormField,
  CompactFormSwitchGrid,
  FormSection,
} from "@/modules/shared/components/form-layout"
import { ReferenceCreationPage } from "@/modules/shared/components/reference-creation-page"
import { ReferenceFormDrawer } from "@/modules/shared/components/reference-form-drawer"
import {
  CompactRhfMaskedField,
  CompactRhfSelectField,
  CompactRhfSwitchField,
  CompactRhfTextField,
} from "@/modules/shared/components/rhf-form-fields"
import { Button } from "@/modules/shared/components/ui/button"
import {
  exactDigits,
  optionalText,
  requiredEmail,
  requiredText,
} from "@/modules/shared/lib/form-schema"

export const companySchema = z.object({
  cnpj: exactDigits(14, "Informe um CNPJ com 14 dígitos."),
  legalName: requiredText,
  tradeName: optionalText,
  stateRegistration: optionalText,
  municipalRegistration: optionalText,
  taxRegime: optionalText,
  status: optionalText,
  postalCode: optionalText.refine(
    (value) => value.length === 0 || value.length === 8,
    "Informe um CEP com 8 dígitos.",
  ),
  state: optionalText,
  city: optionalText,
  district: optionalText,
  address: optionalText,
  phone: requiredText.min(10, "Informe um telefone válido."),
  whatsapp: optionalText,
  email: requiredEmail,
  sefazEnvironment: requiredText,
  certificatePassword: optionalText,
  isHeadquarters: z.boolean(),
  controlsInventory: z.boolean(),
  issuesNfe: z.boolean(),
  issuesCte: z.boolean(),
  issuesMdfe: z.boolean(),
  isCarrier: z.boolean(),
})

export type CompanyFormValues = z.infer<typeof companySchema>
export type CompanySubmitIntent = "save-and-add-another" | "save-company"

export function getCompanyDefaultValues(): CompanyFormValues {
  return {
    cnpj: "",
    legalName: "",
    tradeName: "",
    stateRegistration: "",
    municipalRegistration: "",
    taxRegime: "",
    status: "",
    postalCode: "",
    state: "",
    city: "",
    district: "",
    address: "",
    phone: "",
    whatsapp: "",
    email: "",
    sefazEnvironment: "",
    certificatePassword: "",
    isHeadquarters: false,
    controlsInventory: true,
    issuesNfe: false,
    issuesCte: false,
    issuesMdfe: false,
    isCarrier: false,
  }
}

const taxRegimeOptions = [
  { label: "Simples Nacional", value: "simples" },
  { label: "Lucro Presumido", value: "presumido" },
  { label: "Lucro Real", value: "real" },
] as const

const companyStatusOptions = [
  { label: "Ativa", value: "active" },
  { label: "Inativa", value: "inactive" },
] as const

const sefazOptions = [
  { label: "Homologação", value: "homologation" },
  { label: "Produção", value: "production" },
] as const

export function CompanyCreationScreen() {
  return (
    <ReferenceCreationPage
      actionLabel="Nova empresa"
      description="Gerencie os dados cadastrais, fiscais e operacionais das empresas."
      title="Empresas"
    >
      {({ isOpen, onOpenChange }) => (
        <CompanyCreationDrawer isOpen={isOpen} onOpenChange={onOpenChange} />
      )}
    </ReferenceCreationPage>
  )
}

export function CompanyCreationDrawer({
  isOpen,
  onReview,
  onOpenChange,
}: {
  isOpen: boolean
  onReview?: (values: CompanyFormValues, intent: CompanySubmitIntent) => void
  onOpenChange: (open: boolean) => void
}) {
  const [certificate, setCertificate] = useState<File | null>(null)
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setFocus,
  } = useForm<CompanyFormValues>({
    defaultValues: getCompanyDefaultValues(),
    resolver: zodResolver(companySchema),
  })

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("cnpj"))
  }, [isOpen, setFocus])

  function discard() {
    reset(getCompanyDefaultValues())
    setCertificate(null)
  }

  return (
    <ReferenceFormDrawer
      bodyClassName="px-4 py-4 sm:px-6"
      context="Novo"
      isDirty={isDirty || Boolean(certificate)}
      isOpen={isOpen}
      onDiscard={discard}
      onOpenChange={onOpenChange}
      primaryAction={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            form="company-reference-form"
            name="companySubmitIntent"
            size="form"
            type="submit"
            value="save-and-add-another"
            variant="secondary"
          >
            Salvar e adicionar outra
          </Button>
          <Button
            form="company-reference-form"
            name="companySubmitIntent"
            size="form"
            type="submit"
            value="save-company"
          >
            Salvar empresa
          </Button>
        </div>
      }
      secondaryAction={(requestClose) => (
        <Button size="form" type="button" variant="outline" onClick={requestClose}>
          Cancelar
        </Button>
      )}
      title="Empresa"
    >
      <form
        id="company-reference-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values, event) => {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)
            ?.submitter as HTMLButtonElement | null
          const intent: CompanySubmitIntent =
            submitter?.value === "save-and-add-another" ? "save-and-add-another" : "save-company"
          onReview?.(values, intent)
        })}
      >
        <FormSection title="Dados gerais">
          <CompactRhfMaskedField
            control={control}
            id="company-cnpj"
            icon={FormInputIcon}
            label="CNPJ"
            mask="brCnpj"
            name="cnpj"
            placeholder="00.000.000/0001-00"
            required
          />
          <CompactRhfTextField
            control={control}
            id="company-legal-name"
            icon={BookUserIcon}
            label="Razão social"
            name="legalName"
            placeholder="Insira a razão social"
            required
          />
          <CompactRhfTextField
            control={control}
            id="company-trade-name"
            icon={TypeIcon}
            label="Nome fantasia"
            name="tradeName"
            placeholder="Insira o nome da empresa"
          />
          <CompactRhfMaskedField
            control={control}
            id="company-state-registration"
            icon={FormInputIcon}
            label="Inscrição estadual"
            mask="brRegistration"
            name="stateRegistration"
            placeholder="Insira a IE"
          />
          <CompactRhfMaskedField
            control={control}
            id="company-municipal-registration"
            icon={FormInputIcon}
            label="Inscrição municipal"
            mask="brRegistration"
            name="municipalRegistration"
            placeholder="Insira a IM"
          />
          <CompactRhfSelectField
            control={control}
            id="company-tax-regime"
            icon={CalendarSyncIcon}
            label="Regime tributário"
            name="taxRegime"
            options={taxRegimeOptions}
            placeholder="Selecione um tipo de regime"
          />
          <CompactRhfSelectField
            control={control}
            id="company-status"
            icon={CalendarSyncIcon}
            label="Situação"
            name="status"
            options={companyStatusOptions}
            placeholder="Selecione a situação da empresa"
          />
        </FormSection>
        <FormSection title="Localização">
          <CompactRhfMaskedField
            control={control}
            id="company-postal-code"
            icon={HashIcon}
            label="CEP"
            mask="brPostalCode"
            name="postalCode"
            placeholder="00000-000"
          />
          <CompactRhfTextField
            control={control}
            id="company-state"
            icon={TextCursorInputIcon}
            label="Estado"
            name="state"
            placeholder="Estado"
          />
          <CompactRhfTextField
            control={control}
            id="company-city"
            icon={MapPinIcon}
            label="Cidade"
            name="city"
            placeholder="Cidade"
          />
          <CompactRhfTextField
            control={control}
            id="company-district"
            icon={MilestoneIcon}
            label="Bairro"
            name="district"
            placeholder="Bairro"
          />
          <CompactRhfTextField
            control={control}
            id="company-address"
            icon={MapPinIcon}
            label="Endereço"
            name="address"
            placeholder="Insira o endereço da empresa"
          />
        </FormSection>
        <FormSection title="Contato">
          <CompactRhfMaskedField
            control={control}
            id="company-phone"
            icon={CalendarSyncIcon}
            label="Telefone"
            mask="brPhone"
            name="phone"
            placeholder="(00) 00000-0000"
            required
          />
          <CompactRhfMaskedField
            control={control}
            id="company-whatsapp"
            icon={CalendarRangeIcon}
            label="WhatsApp"
            mask="brPhone"
            name="whatsapp"
            placeholder="(00) 00000-0000"
          />
          <CompactRhfTextField
            autoComplete="email"
            control={control}
            id="company-email"
            icon={CalendarIcon}
            label="E-mail"
            name="email"
            placeholder="Insira um email"
            type="email"
            required
          />
        </FormSection>
        <FormSection title="Fiscal">
          <CompactRhfSelectField
            control={control}
            id="company-sefaz"
            icon={CalendarSyncIcon}
            label="Ambiente SEFAZ"
            name="sefazEnvironment"
            options={sefazOptions}
            placeholder="Selecione um ambiente"
            required
          />
          <CompactFormField
            id="company-certificate"
            icon={CalendarRangeIcon}
            label="Certificado digital"
          >
            <CompactFileInput
              accept=".pfx,.p12"
              id="company-certificate"
              placeholder="Faça o upload do certificado"
              value={certificate}
              onValueChange={setCertificate}
            />
          </CompactFormField>
          <CompactRhfTextField
            autoComplete="new-password"
            control={control}
            id="company-certificate-password"
            icon={CalendarIcon}
            label="Senha do certificado"
            name="certificatePassword"
            placeholder="Insira a senha do certificado"
            type="password"
          />
        </FormSection>
        <FormSection title="Configurações">
          <CompactFormSwitchGrid label="Configurações da empresa">
            <CompactRhfSwitchField control={control} label="Empresa matriz" name="isHeadquarters" />
            <CompactRhfSwitchField
              control={control}
              label="Controla estoque"
              name="controlsInventory"
            />
            <CompactRhfSwitchField control={control} label="Emite NF-e" name="issuesNfe" />
            <CompactRhfSwitchField control={control} label="Emite CT-e" name="issuesCte" />
            <CompactRhfSwitchField control={control} label="Emite MDF-e" name="issuesMdfe" />
            <CompactRhfSwitchField
              control={control}
              label="Empresa transportadora"
              name="isCarrier"
            />
          </CompactFormSwitchGrid>
        </FormSection>
      </form>
    </ReferenceFormDrawer>
  )
}
