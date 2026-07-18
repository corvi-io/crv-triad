import { CollaboratorCreationScreen } from "@/modules/workforce/components/collaborator-creation-form"

const previewCompanyOptions = [{ label: "Empresa Exemplo", value: "empresa-exemplo" }] as const
const previewProfileOptions = [{ label: "Operação", value: "operacao" }] as const

export function CollaboratorCreationPreviewScreen() {
  return (
    <CollaboratorCreationScreen
      companyOptions={previewCompanyOptions}
      profileOptions={previewProfileOptions}
    />
  )
}
