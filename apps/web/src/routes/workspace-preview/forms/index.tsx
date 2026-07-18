import { createFileRoute, Navigate } from "@tanstack/react-router"

export const Route = createFileRoute("/workspace-preview/forms/")({
  component: WorkspaceFormsPreviewIndexRoute,
})

function WorkspaceFormsPreviewIndexRoute() {
  return <Navigate replace to="/workspace-preview/forms/companies" />
}
