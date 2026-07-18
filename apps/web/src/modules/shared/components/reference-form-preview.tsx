import { useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { SelectInput } from "@/modules/shared/components/form-controls"
import { WorkspacePreviewShell } from "@/modules/shared/components/workspace-shell"

export const referenceFormPreviews = [
  {
    id: "companies",
    label: "Empresas",
    previewPath: "/workspace-preview/forms/companies",
    workspacePath: "/companies",
  },
  {
    id: "customers",
    label: "Clientes",
    previewPath: "/workspace-preview/forms/customers",
    workspacePath: "/customers",
  },
  {
    id: "products",
    label: "Produtos",
    previewPath: "/workspace-preview/forms/products",
    workspacePath: "/inventory/products",
  },
  {
    id: "warehouses",
    label: "Depósitos",
    previewPath: "/workspace-preview/forms/warehouses",
    workspacePath: "/inventory/warehouses",
  },
  {
    id: "trucks",
    label: "Caminhões",
    previewPath: "/workspace-preview/forms/trucks",
    workspacePath: "/fleet/trucks",
  },
  {
    id: "drivers",
    label: "Motoristas",
    previewPath: "/workspace-preview/forms/drivers",
    workspacePath: "/drivers",
  },
  {
    id: "collaborators",
    label: "Colaboradores",
    previewPath: "/workspace-preview/forms/collaborators",
    workspacePath: "/users/collaborators",
  },
  {
    id: "permission-profiles",
    label: "Perfis de permissão",
    previewPath: "/workspace-preview/forms/permission-profiles",
    workspacePath: "/users/permission-profiles",
  },
] as const

export type ReferenceFormPreviewId = (typeof referenceFormPreviews)[number]["id"]
type ReferenceFormPreviewPath = (typeof referenceFormPreviews)[number]["previewPath"]

export function ReferenceFormPreview({
  children,
  selectedId,
}: {
  children: ReactNode
  selectedId: ReferenceFormPreviewId
}) {
  const navigate = useNavigate()
  const selected =
    referenceFormPreviews.find((preview) => preview.id === selectedId) ?? referenceFormPreviews[0]

  return (
    <WorkspacePreviewShell pathname={selected.workspacePath}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 justify-end">
          <div className="w-full max-w-64 space-y-1">
            <label className="font-medium text-sm" htmlFor="reference-preview-form">
              Formulário
            </label>
            <SelectInput
              id="reference-preview-form"
              placeholder="Selecione um formulário"
              value={selectedId}
              options={referenceFormPreviews.map((preview) => ({
                label: preview.label,
                value: preview.id,
              }))}
              onValueChange={(value) => {
                const preview = referenceFormPreviews.find((candidate) => candidate.id === value)
                if (preview) void navigate({ to: preview.previewPath as ReferenceFormPreviewPath })
              }}
            />
          </div>
        </div>
        {children}
      </div>
    </WorkspacePreviewShell>
  )
}
