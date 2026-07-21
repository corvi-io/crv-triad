import { createSchedulingRepository } from "virtual:studio-scheduling-prototype"
import { createFileRoute, Navigate } from "@tanstack/react-router"
import { type AppointmentStatus, appointmentStatuses } from "@/modules/scheduling/contracts"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { SchedulePage, type ScheduleSearch } from "@/modules/scheduling/schedule-page"
import { formatDateOnly } from "@/modules/shared/components/forms/date-picker"
import { WorkspacePreviewShell } from "@/modules/shared/components/workspace-shell"
import { env } from "@/modules/shared/config/env"

const repository = createSchedulingRepository?.()

export const Route = createFileRoute("/workspace-preview/agenda/")({
  component: SchedulePreviewRoute,
  validateSearch: (search: Record<string, unknown>): ScheduleSearch => ({
    date:
      typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : formatDateOnly(new Date()),
    professional: typeof search.professional === "string" ? search.professional : undefined,
    scenario: typeof search.scenario === "string" ? search.scenario : "normal",
    status:
      typeof search.status === "string" &&
      appointmentStatuses.includes(search.status as AppointmentStatus)
        ? (search.status as AppointmentStatus)
        : undefined,
  }),
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
