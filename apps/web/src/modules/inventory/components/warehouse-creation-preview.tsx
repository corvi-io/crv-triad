import { WarehouseCreationScreen } from "@/modules/inventory/components/warehouse-creation-form"

const previewCompanyOptions = [{ label: "Empresa Exemplo", value: "empresa-exemplo" }] as const
const previewCollaboratorOptions = [
  { label: "Responsável local", value: "responsavel-local" },
] as const

export function WarehouseCreationPreviewScreen() {
  return (
    <WarehouseCreationScreen
      collaboratorOptions={previewCollaboratorOptions}
      companyOptions={previewCompanyOptions}
    />
  )
}
