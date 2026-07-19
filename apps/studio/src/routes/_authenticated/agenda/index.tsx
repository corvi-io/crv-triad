import { createSchedulingRepository } from "virtual:studio-scheduling-prototype"
import { createFileRoute } from "@tanstack/react-router"
import { type AppointmentStatus, appointmentStatuses } from "@/modules/scheduling/contracts"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { SchedulePage, type ScheduleSearch } from "@/modules/scheduling/schedule-page"
import { formatDateOnly } from "@/modules/shared/components/forms/date-picker"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

const repository = createSchedulingRepository?.()

export const Route = createFileRoute("/_authenticated/agenda/")({
  component: AgendaRoute,
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

function AgendaRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  if (!repository) {
    return (
      <ModuleLayout head={<PageHeader title="Agenda" description="Agenda diária da unidade." />}>
        <div
          role="status"
          className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
        >
          O protótipo visual da agenda está desativado neste ambiente.
        </div>
      </ModuleLayout>
    )
  }
  return (
    <SchedulingRepositoryProvider repository={repository}>
      <SchedulePage
        search={search}
        onSearchChange={(next) =>
          navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
        }
      />
    </SchedulingRepositoryProvider>
  )
}
