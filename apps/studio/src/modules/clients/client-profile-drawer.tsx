import { ArchiveIcon, Edit3Icon, RotateCcwIcon, Trash2Icon } from "lucide-react"
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
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import { applyInputMask } from "@/modules/shared/lib/input-masks"
import { noteSchema } from "./client-schema"
import type { ClientNote, ClientRecord, ClientScenarioId } from "./contracts"
import {
  useAddClientNote,
  useClient,
  useRemoveClientNote,
  useSetClientArchived,
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
  onEditClient,
  onInspectClient,
  onOpenChange,
  scenarioId,
}: {
  clientId: string | null
  onEditClient: (id: string) => void
  onInspectClient: (id: string) => void
  onOpenChange: (open: boolean) => void
  scenarioId: ClientScenarioId
}) {
  const query = useClient(clientId, scenarioId)
  const archiveClient = useSetClientArchived()
  const [tab, setTab] = useState("summary")
  const [confirmArchive, setConfirmArchive] = useState(false)
  const client = query.data

  async function setArchived() {
    if (!client) return
    try {
      await archiveClient.mutateAsync({
        archived: client.status === "active",
        id: client.id,
        version: client.version ?? 1,
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
        onOpenChange={onOpenChange}
        context="Clientes"
        title={client?.name ?? "Perfil do cliente"}
        description="Perfil do cliente"
        size="lg"
        tabs={
          <DrawerTabsRoot value={tab} onValueChange={(value) => setTab(String(value))}>
            <DrawerTabsList items={tabs} label="Seções do perfil do cliente" />
          </DrawerTabsRoot>
        }
        secondaryActions={
          client ? (
            <>
              <Button type="button" variant="outline" onClick={() => onEditClient(client.id)}>
                <Edit3Icon aria-hidden="true" /> Editar
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
          ) : undefined
        }
      >
        {query.isLoading ? <ClientProfileSkeleton /> : null}
        {query.isError ? (
          <div role="alert" className="space-y-3">
            <p>Não foi possível carregar o perfil.</p>
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {client ? (
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

function ClientProfileSkeleton() {
  const sections = ["contact", "service"] as const
  const items = ["primary", "secondary", "tertiary", "quaternary"] as const
  return (
    <div aria-label="Carregando perfil do cliente" className="space-y-6" role="status">
      {sections.map((section) => (
        <section className="space-y-3" key={section}>
          <Skeleton className="h-5 w-36" />
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
            {items.map((item) => (
              <div className="space-y-2" key={item}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-36" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
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
            <Detail
              label="Preferências"
              value={
                client.preferredServices
                  ?.map(({ name, status }) =>
                    status === "archived" ? `${name} (arquivado)` : name,
                  )
                  .join(", ") ||
                client.servicePreferences.join(", ") ||
                "-"
              }
            />
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
  const [editingBody, setEditingBody] = useState("")
  const [removing, setRemoving] = useState<ClientNote | null>(null)
  const [newNoteError, setNewNoteError] = useState("")
  const [editingError, setEditingError] = useState("")

  async function add() {
    const parsed = noteSchema.safeParse({ body })
    if (!parsed.success) {
      setNewNoteError(parsed.error.issues[0]?.message ?? "Revise a nota.")
      return
    }
    try {
      await addNote.mutateAsync({ clientId: client.id, input: parsed.data })
      toast.success("Nota adicionada.")
      setBody("")
      setNewNoteError("")
    } catch {
      toast.error("Não foi possível salvar a nota. Tente novamente.")
    }
  }

  async function saveEdit() {
    if (!editing) return
    const parsed = noteSchema.safeParse({ body: editingBody })
    if (!parsed.success) {
      setEditingError(parsed.error.issues[0]?.message ?? "Revise a nota.")
      return
    }
    try {
      await updateNote.mutateAsync({
        clientId: client.id,
        noteId: editing.id,
        input: parsed.data,
        version: editing.version ?? 1,
      })
      toast.success("Nota atualizada.")
      setEditing(null)
      setEditingBody("")
      setEditingError("")
    } catch {
      toast.error("Não foi possível salvar a nota. Tente novamente.")
    }
  }

  async function remove(note: ClientNote) {
    try {
      await removeNote.mutateAsync({
        clientId: client.id,
        noteId: note.id,
        version: note.version ?? 1,
      })
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
        Nova nota
        <Textarea
          id="client-note-body"
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          aria-invalid={Boolean(newNoteError)}
          aria-describedby={newNoteError ? "client-note-error" : "client-note-guidance"}
        />
      </label>
      <p id="client-note-guidance" className="sr-only">
        Use apenas contexto necessário ao atendimento.
      </p>
      {newNoteError ? (
        <p id="client-note-error" role="alert" className="text-sm text-destructive">
          {newNoteError}
        </p>
      ) : null}
      <div>
        <Button type="button" onClick={add} isLoading={addNote.isPending}>
          Adicionar nota
        </Button>
      </div>
      <div className="space-y-3">
        {client.notes.map((note) => {
          const isEditing = editing?.id === note.id
          const isRemoving = removing?.id === note.id

          return (
            <article key={note.id} className="rounded-lg border p-3">
              {isEditing ? (
                <div className="animate-in space-y-3 fade-in duration-200 motion-reduce:animate-none">
                  <label
                    className="block space-y-2 text-sm font-medium"
                    htmlFor={`note-${note.id}`}
                  >
                    Editar nota
                    <Textarea
                      id={`note-${note.id}`}
                      autoFocus
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.currentTarget.value)}
                      aria-invalid={Boolean(editingError)}
                      aria-describedby={editingError ? `note-${note.id}-error` : undefined}
                    />
                  </label>
                  {editingError ? (
                    <p
                      id={`note-${note.id}-error`}
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {editingError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(null)
                        setEditingBody("")
                        setEditingError("")
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveEdit}
                      isLoading={updateNote.isPending}
                    >
                      Salvar nota
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-200 motion-reduce:animate-none">
                  <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(note.updatedAt)}
                  </p>
                  {isRemoving ? (
                    <div
                      className="animate-in mt-3 rounded-lg bg-destructive/10 p-3 fade-in duration-200 motion-reduce:animate-none"
                      role="alert"
                    >
                      <p className="text-sm font-medium">Remover esta nota?</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Essa ação não pode ser desfeita.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          autoFocus
                          size="sm"
                          variant="outline"
                          onClick={() => setRemoving(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          isLoading={removeNote.isPending}
                          onClick={() => remove(note)}
                        >
                          <Trash2Icon aria-hidden="true" /> Remover nota
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in mt-3 flex gap-2 fade-in duration-150 motion-reduce:animate-none">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRemoving(null)
                          setEditing(note)
                          setEditingBody(note.body)
                          setEditingError("")
                        }}
                      >
                        <Edit3Icon aria-hidden="true" /> Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(null)
                          setEditingBody("")
                          setEditingError("")
                          setRemoving(note)
                        }}
                      >
                        <Trash2Icon aria-hidden="true" /> Remover
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
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
