import { zodResolver } from "@hookform/resolvers/zod"
import {
  ContactIcon,
  DollarSignIcon,
  FileCode2Icon,
  HashIcon,
  PaperclipIcon,
  RectangleEllipsisIcon,
  ShoppingCartIcon,
  TagIcon,
  TypeIcon,
  UploadIcon,
} from "lucide-react"
import { useEffect } from "react"
import { type Control, useController, useForm } from "react-hook-form"
import { z } from "zod"

import {
  CompactFormField,
  CompactFormGroup,
  CompactFormSwitchStack,
  FormSection,
} from "@/modules/shared/components/form-layout"
import { ReferenceCreationPage } from "@/modules/shared/components/reference-creation-page"
import { ReferenceFormDrawer } from "@/modules/shared/components/reference-form-drawer"
import {
  CompactRhfMaskedField,
  CompactRhfQuantityField,
  CompactRhfSelectField,
  CompactRhfSwitchField,
  CompactRhfTextareaField,
  CompactRhfTextField,
} from "@/modules/shared/components/rhf-form-fields"
import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import {
  compareDecimalStrings,
  optionalText,
  requiredCompleteDecimal,
  requiredText,
} from "@/modules/shared/lib/form-schema"

export const productSchema = z
  .object({
    category: requiredText,
    code: requiredText,
    name: requiredText,
    unit: requiredText,
    ncm: requiredText,
    cfop: requiredText,
    cst: requiredText,
    minimumStock: requiredCompleteDecimal,
    maximumStock: requiredCompleteDecimal,
    stockUnit: z.enum(["t", "m³", "kg", "un"]),
    isActive: z.boolean(),
    minimumAlert: z.boolean(),
    maximumAlert: z.boolean(),
    purchaseCost: optionalText,
    salePrice: optionalText,
    manualPricing: z.boolean(),
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

export type ProductFormValues = z.infer<typeof productSchema>
export type ProductSubmitIntent = "save-and-add-another" | "save-product"

export function getProductDefaultValues(): ProductFormValues {
  return {
    category: "",
    code: "",
    name: "",
    unit: "",
    ncm: "",
    cfop: "",
    cst: "",
    minimumStock: "",
    maximumStock: "",
    stockUnit: "t",
    isActive: true,
    minimumAlert: true,
    maximumAlert: false,
    purchaseCost: "",
    salePrice: "",
    manualPricing: true,
    notes: "",
  }
}

const categoryOptions = [
  { label: "Produto", value: "product" },
  { label: "Insumo", value: "input" },
  { label: "Serviço", value: "service" },
  { label: "Ativo", value: "asset" },
  { label: "Outros", value: "other" },
] as const
const unitOptions = [
  { label: "Tonelada", value: "t" },
  { label: "Metro cúbico", value: "m3" },
  { label: "Quilograma", value: "kg" },
  { label: "Unidade", value: "unit" },
] as const

export function ProductCreationScreen() {
  return (
    <ReferenceCreationPage
      actionLabel="Novo produto"
      description="Gerencie informações fiscais, comerciais e de estoque dos produtos."
      title="Produtos"
    >
      {({ isOpen, onOpenChange }) => (
        <ProductCreationDrawer isOpen={isOpen} onOpenChange={onOpenChange} />
      )}
    </ReferenceCreationPage>
  )
}

export function ProductCreationDrawer({
  isOpen,
  onReview,
  onOpenChange,
}: {
  isOpen: boolean
  onReview?: (values: ProductFormValues, intent: ProductSubmitIntent) => void
  onOpenChange: (open: boolean) => void
}) {
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setFocus,
  } = useForm<ProductFormValues>({
    defaultValues: getProductDefaultValues(),
    resolver: zodResolver(productSchema),
  })

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("category"))
  }, [isOpen, setFocus])

  function discard() {
    reset(getProductDefaultValues())
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
            form="product-reference-form"
            name="productSubmitIntent"
            size="form"
            type="submit"
            value="save-and-add-another"
            variant="secondary"
          >
            Salvar e adicionar outro
          </Button>
          <Button
            form="product-reference-form"
            name="productSubmitIntent"
            size="form"
            type="submit"
            value="save-product"
          >
            Salvar produto
          </Button>
        </div>
      }
      secondaryAction={(requestClose) => (
        <Button size="form" type="button" variant="outline" onClick={requestClose}>
          Cancelar
        </Button>
      )}
      title="Produto"
    >
      <form
        id="product-reference-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values, event) => {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)
            ?.submitter as HTMLButtonElement | null
          const intent: ProductSubmitIntent =
            submitter?.value === "save-and-add-another" ? "save-and-add-another" : "save-product"
          onReview?.(values, intent)
        })}
      >
        <FormSection title="Informações">
          <CompactRhfSelectField
            control={control}
            id="product-category"
            icon={ContactIcon}
            label="Categoria"
            name="category"
            options={categoryOptions}
            placeholder="Selecione a categoria do produto"
            required
          />
          <CompactRhfTextField
            control={control}
            id="product-code"
            icon={RectangleEllipsisIcon}
            label="Código único"
            name="code"
            placeholder="ABC123"
            required
          />
          <CompactRhfTextField
            control={control}
            id="product-name"
            icon={RectangleEllipsisIcon}
            label="Nome"
            name="name"
            placeholder="Insira o nome do novo produto"
            required
          />
          <CompactRhfSelectField
            control={control}
            id="product-unit"
            icon={TypeIcon}
            label="Unidade"
            name="unit"
            options={unitOptions}
            placeholder="Selecione a unidade de medida"
            required
          />
        </FormSection>
        <FormSection title="Fiscal">
          <ProductFiscalField control={control} id="product-ncm" label="NCM" name="ncm" />
          <ProductFiscalField control={control} id="product-cfop" label="CFOP" name="cfop" />
          <ProductFiscalField control={control} id="product-cst" label="CST" name="cst" />
        </FormSection>
        <FormSection title="Estoque">
          <CompactRhfQuantityField
            amountName="minimumStock"
            control={control}
            id="product-minimum-stock"
            icon={HashIcon}
            label="Estoque mínimo"
            placeholder="0000,00"
            required
            unitName="stockUnit"
          />
          <CompactRhfQuantityField
            amountName="maximumStock"
            control={control}
            id="product-maximum-stock"
            icon={HashIcon}
            label="Estoque máximo"
            placeholder="0000,00"
            required
            unitName="stockUnit"
          />
          <CompactFormGroup icon={HashIcon} label="Operação de estoque">
            <CompactFormSwitchStack label="Operação de estoque">
              <CompactRhfSwitchField control={control} label="Produto ativo" name="isActive" />
              <CompactRhfSwitchField
                control={control}
                label="Alerta de estoque mínimo"
                name="minimumAlert"
              />
              <CompactRhfSwitchField
                control={control}
                label="Alerta de estoque máximo"
                name="maximumAlert"
              />
            </CompactFormSwitchStack>
          </CompactFormGroup>
        </FormSection>
        <FormSection title="Comercial">
          <CompactRhfMaskedField
            control={control}
            id="product-purchase-cost"
            icon={ShoppingCartIcon}
            label="Custo compra"
            mask="brMoney"
            name="purchaseCost"
            placeholder="R$ 0,00"
          />
          <CompactRhfMaskedField
            control={control}
            id="product-sale-price"
            icon={TagIcon}
            label="Preço venda"
            mask="brMoney"
            name="salePrice"
            placeholder="R$ 0,00"
          />
          <CompactFormGroup icon={DollarSignIcon} label="Operação comercial">
            <CompactFormSwitchStack label="Operação comercial">
              <CompactRhfSwitchField
                control={control}
                label="Precificação manual"
                name="manualPricing"
              />
            </CompactFormSwitchStack>
          </CompactFormGroup>
        </FormSection>
        <FormSection title="Observações">
          <CompactRhfTextareaField
            control={control}
            id="product-notes"
            label="Observações"
            name="notes"
            placeholder="Insira as observações necessárias"
          />
        </FormSection>
      </form>
    </ReferenceFormDrawer>
  )
}

function ProductFiscalField({
  control,
  id,
  label,
  name,
}: {
  control: Control<ProductFormValues>
  id: string
  label: "NCM" | "CFOP" | "CST"
  name: "ncm" | "cfop" | "cst"
}) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <CompactFormField id={id} icon={FileCode2Icon} label={label} required error={error}>
      <div className="relative">
        <PaperclipIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          {...field}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-8 rounded-sm px-8 py-1"
          id={id}
          placeholder="Selecione"
          required
          value={String(field.value ?? "")}
        />
        <UploadIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </CompactFormField>
  )
}
