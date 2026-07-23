import { ArchiveIcon, Edit3Icon, RotateCcwIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import {
  DrawerItem,
  DrawerSection,
  DrawerSectionHeading,
} from "@/modules/shared/components/overlays/drawer-section"
import {
  DrawerTabsList,
  DrawerTabsPanel,
  DrawerTabsRoot,
} from "@/modules/shared/components/overlays/drawer-tabs"
import { Button } from "@/modules/shared/components/ui/button"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import { applyInputMask } from "@/modules/shared/lib/input-masks"
import { ClientForm } from "./client-form"
import { noteSchema } from "./client-schema"
import type { ClientInput, ClientNote, ClientRecord, ClientScenarioId } from "./contracts"
import {
  useAddClientNote,
  useClient,
  useRemoveClientNote,
  useSetClientArchived,
  useUpdateClient,
  useUpdateClientNote,
} from "./queries"
import { useClientRepository } from "./repository-context"

const tabs = [
  { label: "Resumo", value: "summary" },
  { label: "Agendamentos", value: "appointments" },
  { label: "Notas", value: "notes" },
] as const

export function ClientProfileDrawer({
  clientId,
  onInspectClient,
  onOpenChange,
  scenarioId,
}: {
  clientId: string | null
  onInspectClient: (id: string) => void
  onOpenChange: (open: boolean) => void
  scenarioId: ClientScenarioId
}) {
  const query = useClient(clientId, scenarioId)
  const updateClient = useUpdateClient()
  const archiveClient = useSetClientArchived()
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [tab, setTab] = useState("summary")
  const [confirmArchive, setConfirmArchive] = useState(false)
  const client = query.data
  const formId = "client-profile-form"

  async function save(input: ClientInput) {
    if (!client) return
    try {
      await updateClient.mutateAsync({ id: client.id, input })
      toast.success("Cliente atualizado.")
      setMode("view")
    } catch {
      toast.error("Não foi possível atualizar. Tente novamente.")
    }
  }

  async function setArchived() {
    if (!client) return
    try {
      await archiveClient.mutateAsync({
        archived: client.status === "active",
        id: client.id,
      })
      toast.success(client.status === "active" ? "Cliente arquivado." : "Cliente restaurado.")
      setConfirmArchive(false)
    } catch {
      toast.error("A alteração foi desfeita. Tente novamente.")
    }
  }

  return (
    <>
      <ActionDrawer
        isOpen={Boolean(clientId)}
        onOpenChange={(open) => {
          if (!open) setMode("view")
          onOpenChange(open)
        }}
        context="Clientes"
        title={mode === "edit" ? "Editar cliente" : (client?.name ?? "Perfil do cliente")}
        description="Perfil do cliente"
        size="lg"
        tabs={
          mode === "view" ? (
            <DrawerTabsRoot value={tab} onValueChange={(value) => setTab(String(value))}>
              <DrawerTabsList items={tabs} label="Seções do perfil do cliente" />
            </DrawerTabsRoot>
          ) : undefined
        }
        secondaryActions={
          client ? (
            mode === "edit" ? (
              <Button type="button" variant="outline" onClick={() => setMode("view")}>
                Cancelar
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setMode("edit")}>
                  <Edit3Icon aria-hidden="true" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant={client.status === "active" ? "destructive" : "outline"}
                  onClick={() => setConfirmArchive(true)}
                >
                  {client.status === "active" ? (
                    <ArchiveIcon aria-hidden="true" />
                  ) : (
                    <RotateCcwIcon aria-hidden="true" />
                  )}
                  {client.status === "active" ? "Arquivar" : "Restaurar"}
                </Button>
              </>
            )
          ) : undefined
        }
        primaryAction={
          mode === "edit" ? (
            <Button
              form={formId}
              type="submit"
              isLoading={updateClient.isPending}
              className="hidden sm:inline-flex"
            >
              <SaveIcon aria-hidden="true" />
              Salvar
            </Button>
          ) : undefined
        }
      >
        {query.isLoading ? <div role="status">Carregando perfil…</div> : null}
        {query.isError ? (
          <div role="alert" className="space-y-3">
            <p>Não foi possível carregar o perfil.</p>
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {client && mode === "edit" ? (
          <ClientForm
            client={client}
            clientId={client.id}
            formId={formId}
            isSubmitting={updateClient.isPending}
            onCancel={() => setMode("view")}
            onSubmit={save}
          />
        ) : null}
        {client && mode === "view" ? (
          <DrawerTabsRoot value={tab}>
            <DrawerTabsPanel value="summary">
              <ClientSummary client={client} onInspectClient={onInspectClient} />
            </DrawerTabsPanel>
            <DrawerTabsPanel value="appointments">
              <Appointments client={client} />
            </DrawerTabsPanel>
            <DrawerTabsPanel value="notes">
              <Notes client={client} />
            </DrawerTabsPanel>
          </DrawerTabsRoot>
        ) : null}
      </ActionDrawer>
      {client ? (
        <ConfirmationDialog
          isOpen={confirmArchive}
          title={client.status === "active" ? "Arquivar cliente?" : "Restaurar cliente?"}
          description={
            client.status === "active"
              ? "O registro sairá da lista de clientes ativos e poderá ser restaurado."
              : "O registro voltará para a lista de clientes ativos."
          }
          cancelLabel="Cancelar"
          confirmLabel={client.status === "active" ? "Arquivar" : "Restaurar"}
          confirmVariant={client.status === "active" ? "destructive" : "default"}
          onCancel={() => setConfirmArchive(false)}
          onConfirm={setArchived}
        />
      ) : null}
    </>
  )
}

function ClientSummary({
  client,
  onInspectClient,
}: {
  client: ClientRecord
  onInspectClient: (id: string) => void
}) {
  const repository = useClientRepository()
  const [duplicates, setDuplicates] = useState<
    Awaited<ReturnType<typeof repository.findDuplicates>>
  >([])
  useEffect(() => {
    repository
      .findDuplicates(client, client.id)
      .then(setDuplicates)
      .catch(() => setDuplicates([]))
  }, [client, repository])

  return (
    <div className="space-y-6">
      {duplicates.length > 0 ? (
        <section
          aria-labelledby="duplicate-warning"
          className="rounded-lg border border-warning/50 bg-warning/10 p-4"
        >
          <h2 id="duplicate-warning" className="font-medium">
            Possíveis duplicidades
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Correspondências exatas ajudam na revisão. Nenhum registro será mesclado.
          </p>
          <ul className="mt-3 space-y-2">
            {duplicates.map((warning) => (
              <li key={`${warning.candidateId}-${warning.field}`}>
                <button
                  type="button"
                  className="cursor-pointer rounded text-left text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onInspectClient(warning.candidateId)}
                >
                  {warning.label}: {warning.candidateName}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <DrawerSection>
        <DrawerSectionHeading>Contato e estado</DrawerSectionHeading>
        <DrawerItem>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Nome" value={client.name} />
            <Detail label="Estado" value={client.status === "active" ? "Ativo" : "Arquivado"} />
            <Detail
              label="Telefone"
              value={client.phone ? applyInputMask("brPhone", client.phone) : "-"}
            />
            <Detail label="E-mail" value={client.email || "-"} />
          </dl>
        </DrawerItem>
      </DrawerSection>
      <DrawerSection>
        <DrawerSectionHeading>Atendimento</DrawerSectionHeading>
        <DrawerItem>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Tags" value={client.tags.join(", ") || "-"} />
            <Detail label="Preferências" value={client.servicePreferences.join(", ") || "-"} />
            <Detail label="Última visita" value={formatDateTime(client.lastVisitAt)} />
            <Detail label="Próximo agendamento" value={formatDateTime(client.nextAppointmentAt)} />
            <Detail
              label="Visitas concluídas"
              value={String(
                client.appointments.filter(({ status }) => status === "Concluído").length,
              )}
            />
            <Detail label="Orientação" value={client.preferenceNote || "-"} />
          </dl>
        </DrawerItem>
      </DrawerSection>
    </div>
  )
}

function Appointments({ client }: { client: ClientRecord }) {
  const [limit, setLimit] = useState(6)
  const visible = client.appointments.slice(0, limit)
  return (
    <section aria-labelledby="appointments-heading" className="space-y-3">
      <DrawerSectionHeading id="appointments-heading">
        Histórico de agendamentos
      </DrawerSectionHeading>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum agendamento neste cenário.</p>
      ) : null}
      {visible.map((appointment) => (
        <article key={appointment.id} className="rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{appointment.serviceLabel}</h3>
              <p className="text-sm text-muted-foreground">
                {appointment.date} às {appointment.time}
              </p>
            </div>
            <StatusBadge tone={appointment.status === "Concluído" ? "success" : "info"}>
              {appointment.status}
            </StatusBadge>
          </div>
          <p className="mt-2 text-sm">
            {appointment.professionalLabel} · {appointment.unitLabel}
          </p>
        </article>
      ))}
      {limit < client.appointments.length ? (
        <Button type="button" variant="outline" onClick={() => setLimit((value) => value + 6)}>
          Carregar mais
        </Button>
      ) : null}
    </section>
  )
}

function Notes({ client }: { client: ClientRecord }) {
  const addNote = useAddClientNote()
  const updateNote = useUpdateClientNote()
  const removeNote = useRemoveClientNote()
  const [body, setBody] = useState("")
  const [editing, setEditing] = useState<ClientNote | null>(null)
  const [removing, setRemoving] = useState<ClientNote | null>(null)
  const [error, setError] = useState("")

  async function save() {
    const parsed = noteSchema.safeParse({ body })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise a nota.")
      return
    }
    try {
      if (editing) {
        await updateNote.mutateAsync({
          clientId: client.id,
          noteId: editing.id,
          input: parsed.data,
        })
      } else {
        await addNote.mutateAsync({ clientId: client.id, input: parsed.data })
      }
      toast.success(editing ? "Nota atualizada." : "Nota adicionada.")
      setBody("")
      setEditing(null)
      setError("")
    } catch {
      toast.error("Não foi possível salvar a nota. Tente novamente.")
    }
  }

  async function remove() {
    if (!removing) return
    try {
      await removeNote.mutateAsync({ clientId: client.id, noteId: removing.id })
      toast.success("Nota removida.")
      setRemoving(null)
    } catch {
      toast.error("Não foi possível remover a nota. Tente novamente.")
    }
  }

  return (
    <section aria-labelledby="notes-heading" className="space-y-4">
      <div>
        <DrawerSectionHeading id="notes-heading">Notas internas</DrawerSectionHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Não registre credenciais, cartões, documentos, dados de saúde ou outros dados sensíveis.
        </p>
      </div>
      <label className="block space-y-2 text-sm font-medium" htmlFor="client-note-body">
        {editing ? "Editar nota" : "Nova nota"}
        <Textarea
          id="client-note-body"
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "client-note-error" : "client-note-guidance"}
        />
      </label>
      <p id="client-note-guidance" className="sr-only">
        Use apenas contexto necessário ao atendimento.
      </p>
      {error ? (
        <p id="client-note-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" onClick={save} isLoading={addNote.isPending || updateNote.isPending}>
          {editing ? "Salvar nota" : "Adicionar nota"}
        </Button>
        {editing ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditing(null)
              setBody("")
            }}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
      <div className="space-y-3">
        {client.notes.map((note) => (
          <article key={note.id} className="rounded-lg border p-3">
            <p className="whitespace-pre-wrap text-sm">{note.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(note.updatedAt)}</p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(note)
                  setBody(note.body)
                }}
              >
                <Edit3Icon aria-hidden="true" /> Editar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRemoving(note)}>
                <Trash2Icon aria-hidden="true" /> Remover
              </Button>
            </div>
          </article>
        ))}
      </div>
      <ConfirmationDialog
        isOpen={Boolean(removing)}
        title="Remover nota?"
        description="Esta nota será removida apenas da memória da sessão."
        cancelLabel="Cancelar"
        confirmLabel="Remover"
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
      />
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value}</dd>
    </div>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value))
}
