import { zodResolver } from "@hookform/resolvers/zod"
import { AlignLeftIcon, TextCursorInputIcon } from "lucide-react"
import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { FormSection } from "@/modules/shared/components/form-layout"
import { PermissionGroup } from "@/modules/shared/components/permission-group"
import { ReferenceCreationPage } from "@/modules/shared/components/reference-creation-page"
import { ReferenceFormDrawer } from "@/modules/shared/components/reference-form-drawer"
import {
  CompactRhfDescriptionField,
  CompactRhfTextField,
} from "@/modules/shared/components/rhf-form-fields"
import { Button } from "@/modules/shared/components/ui/button"
import { optionalText, requiredText } from "@/modules/shared/lib/form-schema"

const permissionFields = {
  companies: ["companiesView", "companiesCreate", "companiesEdit", "companiesDelete"],
  customers: ["customersView", "customersCreate", "customersEdit", "customersDelete"],
  inventory: ["inventoryView", "inventoryCreate", "inventoryEdit", "inventoryDelete"],
  products: ["productsView", "productsCreate", "productsEdit", "productsDelete"],
  operations: ["operationsCreate", "operationsApprove", "operationsCancel"],
  finance: ["financePayable", "financeReceivable", "financeCostCenters"],
  fiscal: ["fiscalNfe", "fiscalCte", "fiscalMdfe", "fiscalCancel"],
  administration: ["adminUsers", "adminProfiles", "adminSettings"],
} as const

const booleanFields = Object.values(permissionFields).flat()
const permissionShape = Object.fromEntries(booleanFields.map((field) => [field, z.boolean()])) as {
  [Key in (typeof booleanFields)[number]]: z.ZodBoolean
}

export const permissionProfileSchema = z.object({
  name: requiredText,
  description: optionalText,
  ...permissionShape,
})

export type PermissionProfileFormValues = z.infer<typeof permissionProfileSchema>
export type PermissionProfileSubmitIntent = "save-and-add-another" | "save-permission-profile"

export function getPermissionProfileDefaultValues(): PermissionProfileFormValues {
  const defaults = Object.fromEntries(booleanFields.map((field) => [field, true]))
  return {
    name: "",
    description: "",
    ...defaults,
    inventoryDelete: false,
    productsDelete: false,
    fiscalCancel: false,
  } as PermissionProfileFormValues
}

const groupDefinitions = [
  { key: "companies", label: "Empresas", labels: ["Visualizar", "Criar", "Editar", "Excluir"] },
  { key: "customers", label: "Clientes", labels: ["Visualizar", "Criar", "Editar", "Excluir"] },
  { key: "inventory", label: "Estoque", labels: ["Visualizar", "Criar", "Editar", "Excluir"] },
  { key: "products", label: "Produtos", labels: ["Visualizar", "Criar", "Editar", "Excluir"] },
  { key: "operations", label: "Operações", labels: ["Criar", "Aprovar", "Cancelar"] },
  {
    key: "finance",
    label: "Financeiro",
    labels: ["Contas a pagar", "Contas a receber", "Centros de custo"],
  },
  {
    key: "fiscal",
    label: "Fiscal",
    labels: ["Emitir NF-e", "Emitir CT-e", "Emitir MDF-e", "Cancelar documento"],
  },
  {
    key: "administration",
    label: "Administração",
    labels: ["Criar e gerenciar usuários", "Criar e gerenciar perfis", "Editar configurações"],
  },
] as const

export function PermissionProfileCreationScreen() {
  return (
    <ReferenceCreationPage
      actionLabel="Novo perfil"
      description="Gerencie os conjuntos de permissões atribuídos aos colaboradores."
      title="Perfis de permissão"
    >
      {({ isOpen, onOpenChange }) => (
        <PermissionProfileCreationDrawer isOpen={isOpen} onOpenChange={onOpenChange} />
      )}
    </ReferenceCreationPage>
  )
}

export function PermissionProfileCreationDrawer({
  isOpen,
  onReview,
  onOpenChange,
}: {
  isOpen: boolean
  onReview?: (values: PermissionProfileFormValues, intent: PermissionProfileSubmitIntent) => void
  onOpenChange: (open: boolean) => void
}) {
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setFocus,
    setValue,
  } = useForm<PermissionProfileFormValues>({
    defaultValues: getPermissionProfileDefaultValues(),
    resolver: zodResolver(permissionProfileSchema),
  })
  const permissionValues = useWatch({ control })

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("name"))
  }, [isOpen, setFocus])

  function discard() {
    reset(getPermissionProfileDefaultValues())
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
            form="permission-profile-reference-form"
            name="permissionProfileSubmitIntent"
            size="form"
            type="submit"
            value="save-and-add-another"
            variant="secondary"
          >
            Salvar e adicionar outro
          </Button>
          <Button
            form="permission-profile-reference-form"
            name="permissionProfileSubmitIntent"
            size="form"
            type="submit"
            value="save-permission-profile"
          >
            Salvar perfil
          </Button>
        </div>
      }
      secondaryAction={(requestClose) => (
        <Button size="form" type="button" variant="outline" onClick={requestClose}>
          Cancelar
        </Button>
      )}
      title="Perfil"
    >
      <form
        id="permission-profile-reference-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values, event) => {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)
            ?.submitter as HTMLButtonElement | null
          const intent: PermissionProfileSubmitIntent =
            submitter?.value === "save-and-add-another"
              ? "save-and-add-another"
              : "save-permission-profile"
          onReview?.(values, intent)
        })}
      >
        <FormSection title="Identificação">
          <CompactRhfTextField
            control={control}
            id="permission-name"
            icon={TextCursorInputIcon}
            label="Nome"
            name="name"
            placeholder="Insira o nome do perfil"
            required
          />
          <CompactRhfDescriptionField
            control={control}
            id="permission-description"
            icon={AlignLeftIcon}
            label="Descrição"
            name="description"
            placeholder="Crie uma descrição para o perfil"
          />
        </FormSection>
        <fieldset className="space-y-6 border-0 p-0">
          <legend className="sr-only">Permissões do perfil</legend>
          {groupDefinitions.map((group) => {
            const fields = permissionFields[group.key]
            return (
              <PermissionGroup
                key={group.key}
                label={group.label}
                items={fields.map((field, index) => ({
                  checked: Boolean(permissionValues[field]),
                  label: group.labels[index] ?? field,
                  onCheckedChange: (checked) =>
                    setValue(field, checked, { shouldDirty: true, shouldTouch: true }),
                }))}
                onAllChange={(checked) => {
                  fields.forEach((field) => {
                    setValue(field, checked, { shouldDirty: true, shouldTouch: true })
                  })
                }}
              />
            )
          })}
        </fieldset>
      </form>
    </ReferenceFormDrawer>
  )
}
