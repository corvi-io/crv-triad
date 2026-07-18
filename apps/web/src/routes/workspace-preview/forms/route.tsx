import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"

import { env } from "@/modules/shared/config/env"

export const Route = createFileRoute("/workspace-preview/forms")({
  component: WorkspaceFormsPreviewRoute,
})

function WorkspaceFormsPreviewRoute() {
  return env.isDevServer ? <Outlet /> : <Navigate replace to="/login" />
}
