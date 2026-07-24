import {
  ArrowLeftIcon,
  CircleCheckIcon,
  Clock3Icon,
  PlusIcon,
  ScissorsIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Badge } from "@/modules/shared/components/ui/badge"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/modules/shared/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/modules/shared/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import type { ServiceSession } from "./contracts"
import {
  useAddServiceItem,
  useAssignServiceItemProfessional,
  useFinishSession,
  useRemoveServiceItem,
  useServiceSession,
  useUpdateSessionNotes,
} from "./queries"
import {
  formatSessionElapsed,
  formatSessionTime,
  isSessionReadyToFinish,
  SESSION_NOTES_MAX_LENGTH,
} from "./session-projection"

export function ServiceSessionPage({
  onBack,
  sessionId,
}: {
  onBack: () => void
  sessionId: string
}) {
  const query = useServiceSession(sessionId)
  if (query.isLoading) {
    return <Skeleton className="h-80 w-full" aria-label="Carregando atendimento" />
  }
  if (query.isError || !query.data) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Atendimento não encontrado</EmptyTitle>
          <EmptyDescription>
            O atendimento pode ter sido restaurado ou não estar disponível.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onBack}>
            Voltar para atendimentos
          </Button>
        </EmptyContent>
      </Empty>
    )
  }
  return (
    <SessionWorkspace
      key={`${query.data.id}-${query.data.status}`}
      session={query.data}
      onBack={onBack}
    />
  )
}

function SessionWorkspace({ session, onBack }: { session: ServiceSession; onBack: () => void }) {
  const [serviceId, setServiceId] = useState("")
  const [professionalId, setProfessionalId] = useState("")
  const [notes, setNotes] = useState(session.notes)
  const [confirming, setConfirming] = useState(false)
  const addItem = useAddServiceItem(session.id)
  const removeItem = useRemoveServiceItem(session.id)
  const assign = useAssignServiceItemProfessional(session.id)
  const updateNotes = useUpdateSessionNotes(session.id)
  const finish = useFinishSession(session.id)
  const selectedService = session.services.find(({ id }) => id === serviceId)
  const eligible = session.professionals.filter(
    ({ id }) =>
      selectedService?.eligibleProfessionalIds.includes(id) &&
      !session.unavailableProfessionalIds.includes(id),
  )
  const active = session.status === "in-progress"
  const pending =
    addItem.isPending || removeItem.isPending || assign.isPending || updateNotes.isPending

  async function add() {
    if (!serviceId || !professionalId || pending) return
    try {
      await addItem.mutateAsync({ professionalId, serviceId, sessionId: session.id })
      setServiceId("")
      setProfessionalId("")
      toast.success("Serviço adicionado.")
    } catch {
      toast.error("Não foi possível adicionar o serviço.")
    }
  }

  async function saveNotes() {
    if (notes.length > SESSION_NOTES_MAX_LENGTH || updateNotes.isPending) return
    try {
      await updateNotes.mutateAsync({ notes, sessionId: session.id })
      toast.success("Observações atualizadas.")
    } catch {
      toast.error("Não foi possível atualizar as observações.")
    }
  }

  async function complete() {
    try {
      await finish.mutateAsync(undefined)
      setConfirming(false)
      toast.success("Atendimento pronto para pagamento.")
    } catch {
      toast.error("Não foi possível finalizar o atendimento.")
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Button type="button" variant="ghost" className="w-fit" onClick={onBack}>
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        Voltar para atendimentos
      </Button>
      <header className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {session.source === "scheduled" ? "Agendado" : "Sem agendamento"}
          </p>
          <h1 className="truncate font-heading text-2xl font-semibold">{session.customerName}</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3Icon aria-hidden="true" />
            Iniciado às {formatSessionTime(session.startedAt)} ·{" "}
            {formatSessionElapsed(session.startedAt, session.finishedAt ?? session.now)}
          </p>
        </div>
        <Badge variant={active ? "secondary" : "outline"}>
          {active ? "Em atendimento" : "Pronto para pagamento"}
        </Badge>
      </header>
      {!active ? (
        <Alert>
          <CircleCheckIcon aria-hidden="true" />
          <AlertTitle>Pronto para pagamento</AlertTitle>
          <AlertDescription>
            O serviço foi finalizado. O pagamento pertence à próxima etapa.
          </AlertDescription>
        </Alert>
      ) : null}
      <section aria-labelledby="performed-services" className="flex flex-col gap-3">
        <h2 id="performed-services" className="font-heading text-lg font-semibold">
          Serviços realizados
        </h2>
        {session.items.map((item) => {
          const service = session.services.find(({ id }) => id === item.serviceId)
          const professionals = session.professionals.filter(
            ({ id }) =>
              service?.eligibleProfessionalIds.includes(id) &&
              !session.unavailableProfessionalIds.includes(id),
          )
          return (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{service?.name ?? "Serviço indisponível"}</CardTitle>
                <CardDescription>
                  {item.source === "initial" ? "Serviço inicial" : "Serviço adicionado"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor={`professional-${item.id}`}>
                    Profissional responsável
                  </FieldLabel>
                  <Select
                    disabled={!active || pending}
                    items={professionals.map(({ id, name }) => ({ label: name, value: id }))}
                    value={item.professionalId}
                    onValueChange={(value) =>
                      value &&
                      assign.mutate({
                        itemId: item.id,
                        professionalId: value,
                        sessionId: session.id,
                      })
                    }
                  >
                    <SelectTrigger id={`professional-${item.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map(({ id, name }) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </CardContent>
              {active && item.source === "added" ? (
                <CardFooter>
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={removeItem.isPending}
                    onClick={() => removeItem.mutate({ itemId: item.id, sessionId: session.id })}
                  >
                    <Trash2Icon data-icon="inline-start" aria-hidden="true" />
                    Remover serviço
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          )
        })}
      </section>
      {active ? (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar serviço</CardTitle>
            <CardDescription>Escolha o serviço realizado e quem o executou.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="new-service" required>
                Serviço
              </FieldLabel>
              <Select
                items={session.services.map(({ id, name }) => ({ label: name, value: id }))}
                value={serviceId || null}
                onValueChange={(value) => {
                  setServiceId(value ?? "")
                  setProfessionalId("")
                }}
              >
                <SelectTrigger id="new-service">
                  <SelectValue>{selectedService?.name ?? "Escolha um serviço"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {session.services.map(({ id, name }) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-professional" required>
                Profissional responsável
              </FieldLabel>
              <Select
                disabled={!serviceId}
                items={eligible.map(({ id, name }) => ({ label: name, value: id }))}
                value={professionalId || null}
                onValueChange={(value) => setProfessionalId(value ?? "")}
              >
                <SelectTrigger id="new-professional">
                  <SelectValue>
                    {eligible.find(({ id }) => id === professionalId)?.name ??
                      "Escolha um profissional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {eligible.map(({ id, name }) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              disabled={!serviceId || !professionalId}
              isLoading={addItem.isPending}
              onClick={add}
            >
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Adicionar serviço
            </Button>
          </CardFooter>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Observações do atendimento</CardTitle>
          <CardDescription>
            Não informe senhas, cartões, documentos ou dados de saúde.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field data-invalid={notes.length > SESSION_NOTES_MAX_LENGTH || undefined}>
            <FieldLabel htmlFor="session-notes">Observações</FieldLabel>
            <Textarea
              id="session-notes"
              disabled={!active}
              value={notes}
              maxLength={SESSION_NOTES_MAX_LENGTH + 1}
              aria-invalid={notes.length > SESSION_NOTES_MAX_LENGTH}
              onChange={(event) => setNotes(event.currentTarget.value)}
            />
            <FieldDescription>
              {notes.length}/{SESSION_NOTES_MAX_LENGTH} caracteres
            </FieldDescription>
            {notes.length > SESSION_NOTES_MAX_LENGTH ? (
              <FieldError>Use no máximo 500 caracteres nas observações.</FieldError>
            ) : null}
          </Field>
        </CardContent>
        {active ? (
          <CardFooter>
            <Button
              type="button"
              variant="outline"
              isLoading={updateNotes.isPending}
              onClick={saveNotes}
            >
              Salvar observações
            </Button>
          </CardFooter>
        ) : null}
      </Card>
      {active ? (
        <Card>
          <CardHeader>
            <CardTitle>Finalizar atendimento</CardTitle>
            <CardDescription>
              Confirme os serviços e profissionais antes de encaminhar para pagamento.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              type="button"
              disabled={!isSessionReadyToFinish(session) || pending}
              onClick={() => setConfirming(true)}
            >
              <ScissorsIcon data-icon="inline-start" aria-hidden="true" />
              Finalizar atendimento
            </Button>
          </CardFooter>
        </Card>
      ) : null}
      <ConfirmationDialog
        isOpen={confirming}
        isLoading={finish.isPending}
        title="Finalizar atendimento?"
        description="O atendimento ficará Pronto para pagamento e não poderá ser reaberto nesta etapa."
        cancelLabel="Continuar atendimento"
        confirmLabel="Finalizar atendimento"
        confirmVariant="default"
        onCancel={() => setConfirming(false)}
        onConfirm={complete}
      />
    </div>
  )
}
