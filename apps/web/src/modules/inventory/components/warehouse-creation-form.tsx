import { zodResolver } from "@hookform/resolvers/zod"
import {
  AtSignIcon,
  BookUserIcon,
  HashIcon,
  LandPlotIcon,
  MapPinIcon,
  MilestoneIcon,
  TypeIcon,
  UserRoundIcon,
} from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { ComboboxInputOption } from "@/modules/shared/components/combobox-input"
import {
  CompactFormGroup,
  CompactFormSwitchStack,
  FormSection,
} from "@/modules/shared/components/form-layout"
import { ReferenceCreationPage } from "@/modules/shared/components/reference-creation-page"
import { ReferenceFormDrawer } from "@/modules/shared/components/reference-form-drawer"
import {
  CompactRhfComboboxField,
  CompactRhfMaskedField,
  CompactRhfQuantityField,
  CompactRhfSelectField,
  CompactRhfSwitchField,
  CompactRhfTextareaField,
  CompactRhfTextField,
} from "@/modules/shared/components/rhf-form-fields"
import { Button } from "@/modules/shared/components/ui/button"
import {
  compareDecimalStrings,
  optionalText,
  requiredCompleteDecimal,
  requiredText,
} from "@/modules/shared/lib/form-schema"

export const warehouseSchema = z
  .object({
    name: requiredText,
    company: requiredText,
    type: requiredText,
    postalCode: requiredText.length(8, "Informe um CEP com 8 dígitos."),
    state: optionalText,
    city: optionalText,
    address: optionalText,
    alias: optionalText,
    responsible: requiredText,
    minimumStock: requiredCompleteDecimal,
    maximumStock: requiredCompleteDecimal,
    stockUnit: z.enum(["t", "m³", "kg", "un"]),
    isPrimary: z.boolean(),
    permitsTransfer: z.boolean(),
    isActive: z.boolean(),
    notes: optionalText,
  })
  .superRefine((values, context) => {
    if (
      /^\d+(?:\.\d+)?$/.test(values.minimumStock) &&
      /^\d+(?:\.\d+)?$/.test(values.maximumStock) &&
      compareDecimalStrings(values.minimumStock, values.maximumStock) > 0
    ) {
      context.addIssue({
        code: "custom",
        message: "O estoque máximo deve ser maior ou igual ao estoque mínimo.",
        path: ["maximumStock"],
      })
    }
  })

export type WarehouseFormValues = z.infer<typeof warehouseSchema>
export type WarehouseSubmitIntent = "save-and-add-another" | "save-warehouse"

export function getWarehouseDefaultValues(): WarehouseFormValues {
  return {
    name: "",
    company: "",
    type: "",
    postalCode: "",
    state: "",
    city: "",
    address: "",
    alias: "",
    responsible: "",
    minimumStock: "",
    maximumStock: "",
    stockUnit: "t",
    isPrimary: true,
    permitsTransfer: true,
    isActive: true,
    notes: "",
  }
}

const warehouseTypeOptions = [
  { label: "Pátio", value: "yard" },
  { label: "Depósito", value: "warehouse" },
  { label: "Filial", value: "branch" },
  { label: "Mina", value: "mine" },
  { label: "Draga", value: "dredge" },
] as const

export function WarehouseCreationScreen({
  collaboratorOptions = [],
  companyOptions = [],
}: {
  collaboratorOptions?: readonly ComboboxInputOption[]
  companyOptions?: readonly ComboboxInputOption[]
} = {}) {
  return (
    <ReferenceCreationPage
      actionLabel="Novo depósito"
      description="Gerencie localização, responsáveis e parâmetros de estoque dos depósitos."
      title="Depósitos"
    >
      {({ isOpen, onOpenChange }) => (
        <WarehouseCreationDrawer
          collaboratorOptions={collaboratorOptions}
          companyOptions={companyOptions}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        />
      )}
    </ReferenceCreationPage>
  )
}

export function WarehouseCreationDrawer({
  collaboratorOptions = [],
  companyOptions = [],
  isOpen,
  onReview,
  onOpenChange,
}: {
  collaboratorOptions?: readonly ComboboxInputOption[]
  companyOptions?: readonly ComboboxInputOption[]
  isOpen: boolean
  onReview?: (values: WarehouseFormValues, intent: WarehouseSubmitIntent) => void
  onOpenChange: (open: boolean) => void
}) {
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setFocus,
  } = useForm<WarehouseFormValues>({
    defaultValues: getWarehouseDefaultValues(),
    resolver: zodResolver(warehouseSchema),
  })

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("name"))
  }, [isOpen, setFocus])

  function discard() {
    reset(getWarehouseDefaultValues())
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
            form="warehouse-reference-form"
            name="warehouseSubmitIntent"
            size="form"
            type="submit"
            value="save-and-add-another"
            variant="secondary"
          >
            Salvar e adicionar outro
          </Button>
          <Button
            form="warehouse-reference-form"
            name="warehouseSubmitIntent"
            size="form"
            type="submit"
            value="save-warehouse"
          >
            Salvar depósito
          </Button>
        </div>
      }
      secondaryAction={(requestClose) => (
        <Button size="form" type="button" variant="outline" onClick={requestClose}>
          Cancelar
        </Button>
      )}
      title="Depósito"
    >
      <form
        id="warehouse-reference-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values, event) => {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)
            ?.submitter as HTMLButtonElement | null
          const intent: WarehouseSubmitIntent =
            submitter?.value === "save-and-add-another" ? "save-and-add-another" : "save-warehouse"
          onReview?.(values, intent)
        })}
      >
        <FormSection title="Informações">
          <CompactRhfTextField
            control={control}
            id="warehouse-name"
            icon={TypeIcon}
            label="Nome"
            name="name"
            placeholder="Insira o nome do novo depósito"
            required
          />
          <CompactRhfSelectField
            control={control}
            id="warehouse-company"
            icon={TypeIcon}
            label="Empresa"
            name="company"
            options={companyOptions}
            placeholder="Selecione a empresa"
            required
          />
          <CompactRhfSelectField
            control={control}
            id="warehouse-type"
            icon={BookUserIcon}
            label="Tipo"
            name="type"
            options={warehouseTypeOptions}
            placeholder="Selecione o tipo do depósito"
            required
          />
        </FormSection>
        <FormSection title="Localização">
          <CompactRhfMaskedField
            control={control}
            id="warehouse-postal-code"
            icon={HashIcon}
            label="CEP"
            mask="brPostalCode"
            name="postalCode"
            placeholder="00000-000"
            required
          />
          <CompactRhfTextField
            control={control}
            id="warehouse-state"
            icon={MapPinIcon}
            label="Estado"
            name="state"
            placeholder="Estado"
          />
          <CompactRhfTextField
            control={control}
            id="warehouse-city"
            icon={MapPinIcon}
            label="Cidade"
            name="city"
            placeholder="Cidade"
          />
          <CompactRhfTextField
            control={control}
            id="warehouse-address"
            icon={LandPlotIcon}
            label="Endereço"
            name="address"
            placeholder="Endereço"
          />
          <CompactRhfTextField
            control={control}
            id="warehouse-alias"
            icon={MilestoneIcon}
            label="Apelido"
            name="alias"
            placeholder="Insira um apelido"
          />
        </FormSection>
        <FormSection title="Responsável">
          <CompactRhfComboboxField
            control={control}
            controlIcon={AtSignIcon}
            id="warehouse-responsible"
            icon={UserRoundIcon}
            label="Colaborador"
            name="responsible"
            options={collaboratorOptions}
            placeholder="Selecione um colaborador"
            required
          />
        </FormSection>
        <FormSection title="Configuração">
          <CompactRhfQuantityField
            amountName="minimumStock"
            control={control}
            id="warehouse-minimum-stock"
            icon={HashIcon}
            label="Estoque mínimo"
            placeholder="0000,00"
            required
            unitName="stockUnit"
          />
          <CompactRhfQuantityField
            amountName="maximumStock"
            control={control}
            id="warehouse-maximum-stock"
            icon={HashIcon}
            label="Estoque máximo"
            placeholder="0000,00"
            required
            unitName="stockUnit"
          />
          <CompactFormGroup icon={HashIcon} label="Operação de estoque">
            <CompactFormSwitchStack label="Operação de estoque">
              <CompactRhfSwitchField
                control={control}
                label="Depósito principal"
                name="isPrimary"
              />
              <CompactRhfSwitchField
                control={control}
                label="Permite transferência"
                name="permitsTransfer"
              />
              <CompactRhfSwitchField control={control} label="Ativo" name="isActive" />
            </CompactFormSwitchStack>
          </CompactFormGroup>
        </FormSection>
        <FormSection title="Observações">
          <CompactRhfTextareaField
            control={control}
            id="warehouse-notes"
            label="Observações"
            name="notes"
            placeholder="Insira as observações necessárias"
          />
        </FormSection>
      </form>
    </ReferenceFormDrawer>
  )
}
