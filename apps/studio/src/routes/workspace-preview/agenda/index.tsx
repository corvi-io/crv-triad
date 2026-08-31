import { createSchedulingRepository } from "virtual:studio-scheduling-prototype"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { validateScheduleSearch } from "@/modules/scheduling/agenda"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { SchedulePage, type ScheduleSearch } from "@/modules/scheduling/schedule-page"
import { formatDateOnly } from "@/modules/shared/components/forms/date-picker"
import { WorkspacePreviewShell } from "@/modules/shared/components/workspace-shell"
import { env } from "@/modules/shared/config/env"

const repository = createSchedulingRepository?.()

export const Route = createFileRoute("/workspace-preview/agenda/")({
  component: SchedulePreviewRoute,
  validateSearch: (search: Record<string, unknown>): ScheduleSearch =>
    validateScheduleSearch(search, formatDateOnly(new Date())),
})

function SchedulePreviewRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  if (!env.isDevServer || !repository) return <Navigate replace to="/login" />
  return (
    <WorkspacePreviewShell pathname="/agenda">
      <SchedulingRepositoryProvider repository={repository}>
        <SchedulePage
          search={search}
          onSearchChange={(next) =>
            navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
          }
        />
      </SchedulingRepositoryProvider>
    </WorkspacePreviewShell>
  )
}
