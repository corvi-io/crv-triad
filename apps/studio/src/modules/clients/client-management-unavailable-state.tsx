import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

export function ClientManagementUnavailableState() {
  return (
    <ModuleLayout
      head={
        <PageHeader
          title="Clientes"
          description="Encontre clientes e consulte o histórico de atendimento."
        />
      }
    >
      <div
        role="status"
        className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
      >
        O gerenciamento de clientes está indisponível neste ambiente.
      </div>
    </ModuleLayout>
  )
}
