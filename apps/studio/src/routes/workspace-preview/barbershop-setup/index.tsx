import { createBarbershopSetupRepository } from "virtual:studio-barbershop-setup-prototype"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"
import {
  type BarbershopSetupSearch,
  validateBarbershopSetupSearch,
} from "@/modules/barbershop-setup/search"
import { BarbershopSetupPage } from "@/modules/barbershop-setup/setup-page"
import { WorkspacePreviewShell } from "@/modules/shared/components/workspace-shell"
import { env } from "@/modules/shared/config/env"

const repository = createBarbershopSetupRepository?.()

export const Route = createFileRoute("/workspace-preview/barbershop-setup/")({
  component: BarbershopSetupPreviewRoute,
  validateSearch: (search: Record<string, unknown>): BarbershopSetupSearch =>
    validateBarbershopSetupSearch(search),
})

function BarbershopSetupPreviewRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  if (!env.isDevServer || !repository) return <Navigate replace to="/login" />
  return (
    <WorkspacePreviewShell pathname="/overview">
      <BarbershopSetupRepositoryProvider repository={repository}>
        <BarbershopSetupPage
          search={search}
          onSearchChange={(next) =>
            navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
          }
        />
      </BarbershopSetupRepositoryProvider>
    </WorkspacePreviewShell>
  )
}
