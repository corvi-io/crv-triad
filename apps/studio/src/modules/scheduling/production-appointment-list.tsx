import { useQuery } from "@tanstack/react-query"
import { EyeIcon } from "lucide-react"
import { useState } from "react"
import {
  createDataTablePointAnchor,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTablePagination,
  DataTableRow,
  DataTableRowActionsMenu,
  DataTableSortableHeaderCell,
} from "@/modules/shared/components/data-display/data-table"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { useWorkspaceTenantId } from "@/modules/workspace/context-provider"
import type { Appointment, ScheduleRangeQuery } from "./contracts"
import { scheduleParams, schedulingRequest } from "./http-repository"
import { appointmentStatusPresentation } from "./status"
export function ProductionAppointmentList({
  query,
  onAppointment,
  pagination,
  onPaginationChange,
}: {
  query: ScheduleRangeQuery
  pagination?: { page?: number; pageSize?: number; sortDirection?: "asc" | "desc" }
  onPaginationChange?: (value: {
    page?: number
    pageSize?: number
    sortDirection?: "asc" | "desc"
  }) => void
  onAppointment: (appointment: Appointment) => void
}) {
  const tenantId = useWorkspaceTenantId()
  const [localPage, updatePage] = useState(1),
    [localPageSize, updatePageSize] = useState(20),
    [localSort, updateSort] = useState<"asc" | "desc">("asc")
  const page = pagination?.page ?? localPage,
    pageSize = pagination?.pageSize ?? localPageSize,
    sort = pagination?.sortDirection ?? localSort
  const setPage = (page: number) =>
    onPaginationChange ? onPaginationChange({ page }) : updatePage(page)
  const setPageSize = (pageSize: number) =>
    onPaginationChange ? onPaginationChange({ pageSize, page: 1 }) : updatePageSize(pageSize)
  const setSort = (sortDirection: "asc" | "desc") =>
    onPaginationChange ? onPaginationChange({ sortDirection, page: 1 }) : updateSort(sortDirection)
  const [menu, setMenu] = useState<{
    record: Appointment
    anchor: ReturnType<typeof createDataTablePointAnchor>
  } | null>(null)
  const result = useQuery({
    queryKey: ["scheduling", tenantId, "list", query, page, pageSize, sort],
    queryFn: ({ signal }) => {
      const params = scheduleParams(query)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      params.set("sortDirection", sort)
      return schedulingRequest<{
        items: Appointment[]
        page: number
        pageSize: number
        totalCount: number
        totalPages: number
      }>(`/api/scheduling/appointments?${params}`, { signal })
    },
  })
  if (result.isPending)
    return (
      <div role="status" aria-label="Carregando agendamentos">
        <Skeleton className="h-80" />
      </div>
    )
  if (result.isError)
    return (
      <div role="alert">
        <p>{result.error.message}</p>
        <Button variant="outline" onClick={() => void result.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  const data = result.data
  return (
    <>
      <DataTable
        aria-label="Agendamentos"
        className="min-h-80 flex-1"
        footer={
          <DataTablePagination
            page={data.page}
            pageSize={data.pageSize}
            totalCount={data.totalCount}
            totalPages={data.totalPages}
            pageSizeOptions={[10, 20, 50]}
            isLoading={result.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value)
              if (!onPaginationChange) setPage(1)
            }}
          />
        }
      >
        <DataTableHead>
          <DataTableRow>
            <DataTableSortableHeaderCell
              sortKey="date"
              sortedBy="date"
              sortDirection={sort}
              onSortChange={(value) => {
                setSort(value.direction ?? "asc")
                if (!onPaginationChange) setPage(1)
              }}
            >
              Data e horário
            </DataTableSortableHeaderCell>
            <DataTableHeaderCell>Cliente</DataTableHeaderCell>
            <DataTableHeaderCell>Profissional</DataTableHeaderCell>
            <DataTableHeaderCell>Serviço</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {data.items.map((record) => (
            <DataTableRow
              key={record.id}
              tabIndex={0}
              onDoubleClick={() => onAppointment(record)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onAppointment(record)
                if (event.shiftKey && event.key === "F10") {
                  event.preventDefault()
                  const rect = event.currentTarget.getBoundingClientRect()
                  setMenu({ record, anchor: createDataTablePointAnchor(rect.left, rect.bottom) })
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                setMenu({
                  record,
                  anchor: createDataTablePointAnchor(event.clientX, event.clientY),
                })
              }}
            >
              <DataTableCell>
                {new Date(`${record.date}T12:00:00`).toLocaleDateString("pt-BR")} · {record.start}
              </DataTableCell>
              <DataTableCell>
                <Button variant="link" onClick={() => onAppointment(record)}>
                  {record.customerName}
                </Button>
              </DataTableCell>
              <DataTableCell>{record.professionalName}</DataTableCell>
              <DataTableCell>{record.serviceName}</DataTableCell>
              <DataTableCell>{appointmentStatusPresentation[record.status].label}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      {!data.items.length ? (
        <p role="status">Nenhum agendamento corresponde ao período e aos filtros.</p>
      ) : null}
      <DataTableRowActionsMenu
        isOpen={Boolean(menu)}
        anchor={menu?.anchor}
        onOpenChange={(open) => !open && setMenu(null)}
        actions={
          menu
            ? [
                {
                  icon: EyeIcon,
                  label: "Visualizar",
                  onSelect: () => {
                    onAppointment(menu.record)
                    setMenu(null)
                  },
                },
              ]
            : []
        }
      />
    </>
  )
}
