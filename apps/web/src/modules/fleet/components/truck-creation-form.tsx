import { zodResolver } from "@hookform/resolvers/zod"
import {
  BinaryIcon,
  BoxIcon,
  CalendarIcon,
  ChartNoAxesCombinedIcon,
  DockIcon,
  HashIcon,
  MapPinIcon,
  PaintbrushIcon,
  TextCursorInputIcon,
  TruckIcon,
  WaypointsIcon,
} from "lucide-react"
import { useEffect, useRef } from "react"
import { useForm, useWatch } from "react-hook-form"
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
  CompactRhfDateField,
  CompactRhfMaskedField,
  CompactRhfQuantityField,
  CompactRhfSelectField,
  CompactRhfSwitchField,
  CompactRhfTextareaField,
  CompactRhfTextField,
} from "@/modules/shared/components/rhf-form-fields"
import { Button } from "@/modules/shared/components/ui/button"
import {
  optionalCompleteDecimal,
  optionalDateOnly,
  optionalText,
  requiredText,
} from "@/modules/shared/lib/form-schema"

export const truckSchema = z.object({
  plate: z
    .string()
    .regex(
      /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/,
      "Informe uma placa brasileira válida no formato AAA0000 ou AAA0A00.",
    ),
  fleet: optionalText,
  chassis: optionalText,
  renavam: optionalText,
  crlvValidity: optionalDateOnly,
  licensingValidity: optionalDateOnly,
  brand: requiredText,
  model: optionalText,
  yearModel: optionalText.refine(
    (value) => value.length === 0 || value.length === 8,
    "Informe ano/modelo completos.",
  ),
  color: optionalText,
  vehicleType: optionalText,
  capacity: optionalCompleteDecimal,
  capacityUnit: z.enum(["t", "m³", "kg", "un"]),
  volume: optionalCompleteDecimal,
  volumeUnit: z.enum(["t", "m³", "kg", "un"]),
  baseWarehouse: requiredText,
  isOwned: z.boolean(),
  interstateOperation: z.boolean(),
  generatesCommission: z.boolean(),
  isActive: z.boolean(),
  notes: optionalText,
})

export type TruckFormValues = z.infer<typeof truckSchema>
export type TruckSubmitIntent = "save-and-add-another" | "save-truck"

export function shouldClearTruckModel(previousBrand: string, nextBrand: string) {
  return previousBrand !== nextBrand
}

export function getTruckDefaultValues(): TruckFormValues {
  return {
    plate: "",
    fleet: "",
    chassis: "",
    renavam: "",
    crlvValidity: "",
    licensingValidity: "",
    brand: "",
    model: "",
    yearModel: "",
    color: "",
    vehicleType: "",
    capacity: "",
    capacityUnit: "t",
    volume: "",
    volumeUnit: "m³",
    baseWarehouse: "",
    isOwned: true,
    interstateOperation: true,
    generatesCommission: true,
    isActive: true,
    notes: "",
  }
}

const brandOptions = [
  { label: "Mercedes-Benz", value: "mercedes" },
  { label: "Scania", value: "scania" },
  { label: "Volvo", value: "volvo" },
] as const
const vehicleTypeOptions = [
  { label: "Cavalo", value: "tractor" },
  { label: "Caçamba", value: "dump" },
] as const
export function TruckCreationScreen({
  warehouseOptions = [],
}: {
  warehouseOptions?: readonly ComboboxInputOption[]
} = {}) {
  return (
    <ReferenceCreationPage
      actionLabel="Novo caminhão"
      description="Gerencie identificação, capacidade e configurações operacionais dos caminhões."
      title="Caminhões"
    >
      {({ isOpen, onOpenChange }) => (
        <TruckCreationDrawer
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          warehouseOptions={warehouseOptions}
        />
      )}
    </ReferenceCreationPage>
  )
}

export function TruckCreationDrawer({
  isOpen,
  onReview,
  onOpenChange,
  warehouseOptions = [],
}: {
  isOpen: boolean
  onReview?: (values: TruckFormValues, intent: TruckSubmitIntent) => void
  onOpenChange: (open: boolean) => void
  warehouseOptions?: readonly ComboboxInputOption[]
}) {
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setFocus,
    setValue,
  } = useForm<TruckFormValues>({
    defaultValues: getTruckDefaultValues(),
    resolver: zodResolver(truckSchema),
  })
  const brand = useWatch({ control, name: "brand" })
  const previousBrand = useRef(brand)

  useEffect(() => {
    if (shouldClearTruckModel(previousBrand.current, brand)) {
      setValue("model", "", {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
    previousBrand.current = brand
  }, [brand, setValue])

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("plate"))
  }, [isOpen, setFocus])

  function discard() {
    reset(getTruckDefaultValues())
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
            form="truck-reference-form"
            name="truckSubmitIntent"
            size="form"
            type="submit"
            value="save-and-add-another"
            variant="secondary"
          >
            Salvar e adicionar outro
          </Button>
          <Button
            form="truck-reference-form"
            name="truckSubmitIntent"
            size="form"
            type="submit"
            value="save-truck"
          >
            Salvar caminhão
          </Button>
        </div>
      }
      secondaryAction={(requestClose) => (
        <Button size="form" type="button" variant="outline" onClick={requestClose}>
          Cancelar
        </Button>
      )}
      title="Caminhão"
    >
      <form
        id="truck-reference-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values, event) => {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)
            ?.submitter as HTMLButtonElement | null
          const intent: TruckSubmitIntent =
            submitter?.value === "save-and-add-another" ? "save-and-add-another" : "save-truck"
          onReview?.(values, intent)
        })}
      >
        <FormSection title="Identificação">
          <CompactRhfMaskedField
            control={control}
            id="truck-plate"
            icon={TextCursorInputIcon}
            label="Placa"
            mask="brVehiclePlate"
            name="plate"
            placeholder="ABC1D23 ou ABC-1234"
            required
          />
          <CompactRhfTextField
            control={control}
            id="truck-fleet"
            icon={TruckIcon}
            label="Frota"
            name="fleet"
            placeholder="Selecione a frota"
          />
          <CompactRhfTextField
            control={control}
            id="truck-chassis"
            icon={BinaryIcon}
            label="Chassi"
            name="chassis"
            placeholder="Número do chassi"
          />
          <CompactRhfTextField
            control={control}
            id="truck-renavam"
            icon={DockIcon}
            label="Renavam"
            name="renavam"
            inputMode="numeric"
            placeholder="Número do renavam"
          />
          <CompactRhfDateField
            control={control}
            id="truck-crlv"
            icon={CalendarIcon}
            label="CRLV"
            name="crlvValidity"
            placeholder="Selecione a validade"
          />
          <CompactRhfDateField
            control={control}
            id="truck-licensing"
            icon={CalendarIcon}
            label="Licenciamento"
            name="licensingValidity"
            placeholder="Selecione a validade"
          />
        </FormSection>
        <FormSection title="Veículo">
          <CompactRhfSelectField
            control={control}
            id="truck-brand"
            icon={ChartNoAxesCombinedIcon}
            label="Marca"
            name="brand"
            options={brandOptions}
            placeholder="Selecione uma marca"
            required
          />
          <CompactRhfComboboxField
            control={control}
            id="truck-model"
            icon={WaypointsIcon}
            label="Modelo"
            name="model"
            options={[]}
            placeholder="Selecione o modelo"
          />
          <CompactRhfMaskedField
            control={control}
            id="truck-year-model"
            icon={CalendarIcon}
            label="Ano"
            mask="brYearModel"
            name="yearModel"
            placeholder="2000/2001"
          />
          <CompactRhfTextField
            control={control}
            id="truck-color"
            icon={PaintbrushIcon}
            label="Cor"
            name="color"
            placeholder="Insira uma cor"
          />
          <CompactRhfSelectField
            control={control}
            id="truck-type"
            icon={BoxIcon}
            label="Tipo"
            name="vehicleType"
            options={vehicleTypeOptions}
            placeholder="Selecione o tipo do veículo"
          />
          <CompactRhfQuantityField
            amountName="capacity"
            control={control}
            id="truck-capacity"
            icon={HashIcon}
            label="Capacidade"
            placeholder="0000,00"
            unitName="capacityUnit"
          />
          <CompactRhfQuantityField
            amountName="volume"
            control={control}
            id="truck-volume"
            icon={HashIcon}
            label="Volume m³"
            placeholder="0000,00"
            unitName="volumeUnit"
          />
        </FormSection>
        <FormSection title="Configurações">
          <CompactRhfComboboxField
            control={control}
            id="truck-base-warehouse"
            icon={MapPinIcon}
            label="Depósito base"
            name="baseWarehouse"
            options={warehouseOptions}
            placeholder="Selecione um depósito base"
            required
          />
          <CompactFormGroup icon={HashIcon} label="Operação de estoque">
            <CompactFormSwitchStack label="Operação de estoque">
              <CompactRhfSwitchField control={control} label="Caminhão próprio" name="isOwned" />
              <CompactRhfSwitchField
                control={control}
                label="Permite operação interestadual"
                name="interstateOperation"
              />
              <CompactRhfSwitchField
                control={control}
                label="Gera comissão"
                name="generatesCommission"
              />
              <CompactRhfSwitchField control={control} label="Ativo" name="isActive" />
            </CompactFormSwitchStack>
          </CompactFormGroup>
        </FormSection>
        <FormSection title="Observações">
          <CompactRhfTextareaField
            control={control}
            id="truck-notes"
            label="Observações"
            name="notes"
            placeholder="Insira as observações necessárias"
          />
        </FormSection>
      </form>
    </ReferenceFormDrawer>
  )
}
