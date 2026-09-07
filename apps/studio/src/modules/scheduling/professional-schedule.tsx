import { useQuery } from "@tanstack/react-query"
import { formatDateOnly } from "@/modules/shared/components/forms/date-picker"
import { FormSection } from "@/modules/shared/components/forms/form-layout"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { useWorkspaceTenantId } from "@/modules/workspace/context-provider"
import type { Appointment } from "./contracts"
import { schedulingRequest } from "./http-repository"
import { appointmentStatusPresentation } from "./status"
export function ProfessionalSchedule({ professionalId }: { professionalId: string }) {
  const tenantId = useWorkspaceTenantId()
  const date = formatDateOnly(new Date())
  const query = useQuery({
    queryKey: ["scheduling", tenantId, "professional", professionalId, date],
    queryFn: ({ signal }) =>
      schedulingRequest<Appointment[]>(
        `/api/scheduling/professionals/${encodeURIComponent(professionalId)}?date=${date}`,
        { signal },
      ),
  })
  return (
    <FormSection title="Próximos agendamentos">
      {query.isPending ? (
        <div role="status" aria-label="Carregando agendamentos do profissional">
          <Skeleton className="h-24" />
        </div>
      ) : query.isError ? (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : query.data.length ? (
        <ul className="flex flex-col gap-3">
          {query.data.map((item) => (
            <li key={item.id} className="text-sm">
              <a
                className="underline"
                href={`/agenda?unit=${encodeURIComponent(item.unitId)}&professional=${encodeURIComponent(professionalId)}&date=${item.date}&appointment=${encodeURIComponent(item.id)}`}
              >
                {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")} · {item.start} ·{" "}
                {item.customerName}
              </a>
              <p className="text-muted-foreground">
                {item.serviceName} · {appointmentStatusPresentation[item.status].label}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum agendamento nos próximos 30 dias.</p>
      )}
    </FormSection>
  )
}
