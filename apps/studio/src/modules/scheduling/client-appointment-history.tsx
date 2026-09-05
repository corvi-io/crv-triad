import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { useWorkspaceTenantId } from "@/modules/workspace/context-provider"
import type { Appointment } from "./contracts"
import { schedulingRequest } from "./http-repository"
import { appointmentStatusPresentation } from "./status"
export function ClientAppointmentHistory({ clientId }: { clientId: string }) {
  const tenantId = useWorkspaceTenantId()
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ["scheduling", tenantId, "client-history", clientId, page],
    queryFn: ({ signal }) =>
      schedulingRequest<{ items: Appointment[]; nextAppointment: Appointment | null }>(
        `/api/scheduling/clients/${encodeURIComponent(clientId)}/history?page=${page}`,
        { signal },
      ),
  })
  if (query.isPending)
    return (
      <div role="status" aria-label="Carregando histórico de agendamentos">
        <Skeleton className="h-40" />
      </div>
    )
  if (query.isError)
    return (
      <div role="alert">
        <p>{query.error.message}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  return (
    <section className="flex flex-col gap-4" aria-label="Histórico de agendamentos">
      <h3 className="font-medium">Histórico de agendamentos</h3>
      {query.data.nextAppointment ? (
        <p className="text-sm">
          Próximo agendamento:{" "}
          {new Date(`${query.data.nextAppointment.date}T12:00:00`).toLocaleDateString("pt-BR")} às{" "}
          {query.data.nextAppointment.start}.
        </p>
      ) : null}
      {query.data.items.length ? (
        query.data.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-1 border-b pb-3 text-sm">
            <a
              className="font-medium underline"
              href={`/agenda?unit=${encodeURIComponent(item.unitId)}&date=${item.date}&appointment=${encodeURIComponent(item.id)}`}
            >
              {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")} · {item.start} ·{" "}
              {item.serviceName}
            </a>
            <p>
              {item.professionalName} · {item.unitName}
            </p>
            <p>{appointmentStatusPresentation[item.status].label}</p>
          </div>
        ))
      ) : (
        <p>Nenhum agendamento neste histórico.</p>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Anterior
        </Button>
        <span className="self-center text-sm">Página {page}</span>
        <Button
          variant="outline"
          disabled={query.data.items.length < 20}
          onClick={() => setPage((value) => value + 1)}
        >
          Próxima
        </Button>
      </div>
    </section>
  )
}
