import { useQuery } from "@tanstack/react-query"
import { MapPinIcon } from "lucide-react"
import { useEffect } from "react"
import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { useWorkspaceContext } from "@/modules/workspace/context-provider"
import { type ScheduleSearch, visibleScheduleBounds } from "./agenda"
import { useSchedulingRepository } from "./repository-context"
import { SchedulePage } from "./schedule-page"
export function ProductionAgenda({
  search,
  onSearchChange,
}: {
  search: ScheduleSearch
  onSearchChange: (value: Partial<ScheduleSearch>) => void
}) {
  const repository = useSchedulingRepository()
  const { activeTenant } = useWorkspaceContext()
  const units = useQuery({
    queryKey: ["scheduling", activeTenant?.id, "units"],
    queryFn: ({ signal }) => {
      if (!repository.units) throw new Error("Não foi possível carregar as unidades.")
      return repository.units(signal)
    },
  })
  const bounds = visibleScheduleBounds(search)
  const needsList = Date.parse(bounds.endDate) - Date.parse(bounds.startDate) >= 7 * 86400000
  useEffect(() => {
    if (needsList && search.view !== "list") onSearchChange({ view: "list" })
  }, [needsList, search.view, onSearchChange])
  const selected = units.data?.find((item) => item.id === search.unit)
  useEffect(() => {
    if (units.data?.length === 1 && !selected && search.unit === "centro")
      onSearchChange({ unit: units.data[0].id })
  }, [units.data, selected, onSearchChange, search.unit])
  if (units.isPending)
    return (
      <div role="status" aria-label="Carregando unidades">
        <Skeleton className="h-12" />
        <Skeleton className="mt-4 h-96" />
      </div>
    )
  if (units.isError || !selected)
    return (
      <ModuleLayout
        head={
          <PageHeader
            title="Agenda"
            description="Consulte e organize os agendamentos da unidade."
          />
        }
      >
        <div className="flex flex-col items-start gap-4">
          {units.isError ? (
            <>
              <p role="alert">{units.error.message}</p>
              <Button onClick={() => void units.refetch()}>Tentar novamente</Button>
            </>
          ) : units.data?.length ? (
            <>
              <p>Selecione a unidade para consultar os horários.</p>
              <SingleSelectListFilter
                showSelectedLabel
                icon={MapPinIcon}
                id="agenda-unit"
                label="Unidade"
                inactiveValue=""
                value=""
                options={units.data.map((item) => ({ label: item.name, value: item.id }))}
                onValueChange={(unit) => onSearchChange({ unit })}
              />
            </>
          ) : (
            <>
              <p>Nenhuma unidade ativa foi cadastrada.</p>
              <a className="underline" href="/barbershop-setup/units">
                Cadastrar unidade
              </a>
            </>
          )}
        </div>
      </ModuleLayout>
    )
  if (!selected.timezone)
    return (
      <ModuleLayout head={<PageHeader title="Agenda" description={selected.name} />}>
        <div className="flex flex-col gap-3">
          <p role="status">
            Confirme o fuso horário da unidade para configurar a disponibilidade e agendar.
          </p>
          <a
            className="underline"
            href={`/barbershop-setup/availability?unitId=${encodeURIComponent(selected.id)}`}
          >
            Configurar disponibilidade
          </a>
        </div>
      </ModuleLayout>
    )
  return (
    <SchedulePage
      key={activeTenant?.id}
      search={needsList ? { ...search, view: "list" } : search}
      onSearchChange={onSearchChange}
      units={units.data}
    />
  )
}
