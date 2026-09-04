import { SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"

import { ClientForm } from "./client-form"
import type { ClientInput, ClientScenarioId } from "./contracts"
import { useClient, useUpdateClient } from "./queries"

export function ClientEditDrawer({
  clientId,
  onOpenChange,
  scenarioId,
}: {
  clientId: string | null
  onOpenChange: (open: boolean) => void
  scenarioId: ClientScenarioId
}) {
  const query = useClient(clientId, scenarioId)
  const updateClient = useUpdateClient()
  const client = query.data
  const formId = "edit-client-form"

  async function save(input: ClientInput) {
    if (!client) return
    try {
      await updateClient.mutateAsync({ id: client.id, input })
      toast.success("Cliente atualizado.")
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível atualizar. Tente novamente.")
    }
  }

  return (
    <ActionDrawer
      isOpen={Boolean(clientId)}
      onOpenChange={onOpenChange}
      context="Clientes"
      title="Editar cliente"
      description={
        client ? `Atualize os dados de ${client.name}.` : "Atualize os dados do cliente."
      }
      size="form"
      secondaryActions={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
      }
      primaryAction={
        <Button
          className="hidden sm:inline-flex"
          form={formId}
          isLoading={updateClient.isPending}
          type="submit"
        >
          <SaveIcon aria-hidden="true" />
          Salvar alterações
        </Button>
      }
    >
      {query.isLoading ? <ClientFormSkeleton /> : null}
      {query.isError ? (
        <div className="flex flex-col gap-3" role="alert">
          <p>Não foi possível carregar o cliente.</p>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {client ? (
        <ClientForm
          client={client}
          clientId={client.id}
          formId={formId}
          isSubmitting={updateClient.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={save}
        />
      ) : null}
    </ActionDrawer>
  )
}

function ClientFormSkeleton() {
  const fields = ["name", "phone", "email", "tags", "services", "note"] as const
  return (
    <div aria-label="Carregando formulário do cliente" className="space-y-4" role="status">
      {fields.map((field) => (
        <div className="space-y-2" key={field}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className={field === "note" ? "h-24 w-full" : "h-10 w-full"} />
        </div>
      ))}
    </div>
  )
}
