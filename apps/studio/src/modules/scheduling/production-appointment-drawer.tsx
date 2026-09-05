import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { type Control, useController, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { ClientForm } from "@/modules/clients/client-form"
import { ClientHttpRepository } from "@/modules/clients/http-repository"
import { ClientRepositoryProvider } from "@/modules/clients/repository-context"
import { ComboboxInput } from "@/modules/shared/components/forms/combobox-input"
import { FormField, FormSection } from "@/modules/shared/components/forms/form-layout"
import {
  CompactRhfDateField,
  RhfSelectField,
  RhfTextareaField,
} from "@/modules/shared/components/forms/rhf-form-fields"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldLabel } from "@/modules/shared/components/ui/field"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import { FormSubmissionError } from "@/modules/shared/forms/form-submission-error"
import { useWorkspaceTenantId } from "@/modules/workspace/context-provider"
import type { AppointmentDrawer } from "./appointment-drawer"
import type { Appointment, AppointmentInput, Professional, Service } from "./contracts"
import { schedulingRequest } from "./http-repository"
import {
  invalidateSchedulingConsumers,
  useCancelAppointment,
  useCreateAppointment,
  useTransitionAppointment,
  useUpdateAppointment,
} from "./queries"
import { useSchedulingRepository } from "./repository-context"
import { appointmentStatusPresentation } from "./status"

const clientRepository = new ClientHttpRepository()
const schema = z.object({
  clientId: z.string().min(1, "Selecione um cliente."),
  unitId: z.string().min(1, "Selecione uma unidade."),
  serviceId: z.string().min(1, "Selecione um serviço."),
  professionalId: z.string().min(1, "Selecione um profissional."),
  date: z.iso.date("Informe uma data válida."),
  start: z
    .string()
    .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Selecione um horário de 15 em 15 minutos."),
  notes: z.string().max(2000, "Use no máximo 2.000 caracteres."),
  origin: z.enum(["phone", "reception", "whatsapp"]),
})
const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const value = `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`
  return { value, label: value }
})
type Props = React.ComponentProps<typeof AppointmentDrawer>
export function ProductionAppointmentDrawer(props: Props) {
  const tenantId = useWorkspaceTenantId()
  const repository = useSchedulingRepository()
  const detail = useQuery({
    queryKey: ["scheduling", tenantId, "detail", props.appointment?.id],
    queryFn: ({ signal }) => {
      if (!repository.detail || !props.appointment) throw new Error("Appointment unavailable")
      return repository.detail(props.appointment.id, signal)
    },
    enabled: Boolean(props.appointment) && props.isOpen,
  })
  return (
    <ProductionEditor
      key={`${props.appointment?.id ?? "new"}:${props.mode}:${props.selectedUnit}`}
      {...props}
      appointment={detail.data ?? props.appointment}
    />
  )
}
function ProductionEditor({
  appointment,
  initialSlot,
  isOpen,
  mode,
  onModeChange,
  onOpenChange,
  professionals: initialProfessionals,
  selectedDate,
  selectedUnit,
  services: initialServices,
}: Props) {
  const tenantId = useWorkspaceTenantId()
  const repository = useSchedulingRepository()
  const cache = useQueryClient()
  const create = useCreateAppointment(),
    update = useUpdateAppointment(),
    cancel = useCancelAppointment(),
    change = useTransitionAppointment()
  const [expectedVersion, setExpectedVersion] = useState(appointment?.version)
  const [clientSearch, setClientSearch] = useState("")
  const [professionalSearch, setProfessionalSearch] = useState(""),
    [serviceSearch, setServiceSearch] = useState("")
  const [creatingClient, setCreatingClient] = useState(false),
    [savingClient, setSavingClient] = useState(false)
  const [failure, setFailure] = useState<FormSubmissionError | null>(null)
  const [cancellationNote, setCancellationNote] = useState("")
  const [reason, setReason] = useState<"client" | "barbershop" | undefined>()
  const [confirmation, setConfirmation] = useState<"confirmed" | "arrived" | "no-show" | null>(null)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: appointment?.clientId ?? "",
      unitId: appointment?.unitId ?? selectedUnit,
      serviceId: appointment?.serviceId ?? "",
      professionalId: appointment?.professionalId ?? initialSlot?.professionalId ?? "",
      date: appointment?.date ?? selectedDate,
      start: appointment?.start ?? initialSlot?.start ?? "",
      notes: appointment?.notes ?? "",
      origin: appointment?.origin ?? "reception",
    },
  })
  const [clientId, serviceId, professionalId] = useWatch({
    control: form.control,
    name: ["clientId", "serviceId", "professionalId"],
  })
  const catalog = useQuery({
    queryKey: [
      "scheduling",
      tenantId,
      "options",
      selectedUnit,
      professionalSearch,
      serviceSearch,
      serviceId,
      professionalId,
    ],
    queryFn: ({ signal }) =>
      schedulingRequest<{ professionals: Professional[]; services: Service[] }>(
        `/api/scheduling/options?${new URLSearchParams({ unitId: selectedUnit, professionalSearch, serviceSearch, serviceId, professionalId })}`,
        { signal },
      ),
    enabled: isOpen && mode !== "view" && mode !== "cancel",
  })
  const services = catalog.data?.services ?? initialServices,
    professionals = catalog.data?.professionals ?? initialProfessionals
  const clients = useQuery({
    queryKey: ["clients", tenantId, "appointment-options", clientSearch],
    queryFn: () =>
      clientRepository.list({
        contact: "all",
        duplicate: "all",
        page: 1,
        pageSize: 20,
        scenarioId: "typical",
        search: clientSearch,
        sort: { field: "name", direction: "asc" },
        status: "active",
        tag: "",
      }),
    enabled: isOpen && mode !== "view" && mode !== "cancel",
  })
  const selectedClient = useQuery({
    queryKey: ["clients", tenantId, "appointment-client", clientId],
    queryFn: () => clientRepository.get(clientId),
    enabled: Boolean(clientId) && isOpen,
  })
  const preferences = useQuery({
    queryKey: [
      "clients",
      tenantId,
      "appointment-preferences",
      clientId,
      selectedClient.data?.unitPreferenceIds,
      selectedClient.data?.professionalPreferenceIds,
    ],
    queryFn: async () => {
      const [units, people] = await Promise.all([
        clientRepository.listCatalogOptions("units", selectedClient.data?.unitPreferenceIds ?? []),
        clientRepository.listCatalogOptions(
          "professionals",
          selectedClient.data?.professionalPreferenceIds ?? [],
        ),
      ])
      return [
        ...units
          .filter((item) => selectedClient.data?.unitPreferenceIds?.includes(item.id))
          .map((item) => ({ ...item, kind: "Unidade" })),
        ...people
          .filter((item) => selectedClient.data?.professionalPreferenceIds?.includes(item.id))
          .map((item) => ({ ...item, kind: "Profissional" })),
      ]
    },
    enabled: Boolean(
      selectedClient.data &&
        (selectedClient.data.unitPreferenceIds?.length ?? 0) +
          (selectedClient.data.professionalPreferenceIds?.length ?? 0) >
          0,
    ),
  })
  const [eventPage, setEventPage] = useState(1)
  const detail = useQuery({
    queryKey: ["scheduling", tenantId, "detail", appointment?.id, eventPage],
    queryFn: ({ signal }) => {
      if (!repository.detail || !appointment)
        throw new Error("Não foi possível carregar o agendamento.")
      return schedulingRequest<Appointment>(
        `/api/scheduling/appointments/${encodeURIComponent(appointment.id)}?page=${eventPage}`,
        { signal },
      )
    },
    enabled: Boolean(appointment) && isOpen && mode === "view",
  })
  const current = detail.data ?? appointment
  const selectedService = services.find((item) => item.id === serviceId)
  useEffect(() => {
    const subscription = form.watch((values, info) => {
      if (
        info.name === "serviceId" &&
        values.professionalId &&
        !services
          .find((item) => item.id === values.serviceId)
          ?.eligibleProfessionalIds.includes(values.professionalId)
      )
        form.setValue("professionalId", "")
    })
    return () => subscription.unsubscribe()
  }, [form, services])
  const clientOptions = [
    ...new Map(
      [...(selectedClient.data ? [selectedClient.data] : []), ...(clients.data?.items ?? [])].map(
        (item) => [item.id, item],
      ),
    ).values(),
  ].map((item) => ({ label: item.name, value: item.id }))
  const pending = create.isPending || update.isPending || cancel.isPending || change.isPending
  function fail(error: unknown) {
    const value =
      error instanceof FormSubmissionError
        ? error
        : new FormSubmissionError(
            "source_error",
            "Não foi possível concluir a ação. Tente novamente.",
          )
    setFailure(value)
    if (value.field && value.field in form.getValues())
      form.setError(
        value.field as keyof z.infer<typeof schema>,
        { message: value.message },
        { shouldFocus: true },
      )
  }
  async function submit(values: z.infer<typeof schema>) {
    if (pending) return
    setFailure(null)
    try {
      const input = { ...values, version: expectedVersion } as AppointmentInput
      if (appointment)
        await update.mutateAsync({ id: appointment.id, input, reschedule: mode === "reschedule" })
      else await create.mutateAsync(input)
      toast.success(appointment ? "Agendamento atualizado." : "Agendamento criado.")
      onOpenChange(false)
    } catch (error) {
      fail(error)
    }
  }
  async function transition(status: "confirmed" | "arrived" | "no-show") {
    if (!current || pending) return
    try {
      await change.mutateAsync({ id: current.id, version: current.version, status })
      toast.success("Agendamento atualizado.")
      onOpenChange(false)
    } catch (error) {
      fail(error)
    }
  }
  const errorContent = failure ? (
    <div role="alert" className="flex flex-col gap-2 text-sm text-destructive">
      <p>{failure.message}</p>
      {failure.code === "version_conflict" && appointment ? (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              if (!repository.detail) return
              const latest = await repository.detail(appointment.id)
              form.reset({
                clientId: latest.clientId,
                unitId: latest.unitId,
                serviceId: latest.serviceId,
                professionalId: latest.professionalId,
                date: latest.date,
                start: latest.start,
                notes: latest.notes,
                origin: latest.origin,
              })
              setExpectedVersion(latest.version)
              setFailure(null)
            } catch (error) {
              fail(error)
            }
          }}
        >
          Recarregar versão atual
        </Button>
      ) : null}
    </div>
  ) : null
  if (mode === "view" && current)
    return (
      <ActionDrawer
        context="Agenda"
        title="Agendamento"
        description="Consulte os dados e o histórico deste agendamento."
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        primaryAction={
          ["scheduled", "confirmed"].includes(current.status) ? (
            <Button onClick={() => onModeChange("edit")}>Editar agendamento</Button>
          ) : undefined
        }
        secondaryActions={
          ["scheduled", "confirmed", "arrived"].includes(current.status) ? (
            <Button variant="destructive" onClick={() => onModeChange("cancel")}>
              Cancelar agendamento
            </Button>
          ) : undefined
        }
      >
        <dl className="grid gap-4 text-sm">
          {[
            ["Cliente", current.customerName],
            ["Serviço", current.serviceName],
            ["Profissional", current.professionalName],
            ["Unidade", current.unitName],
            ["Data e horário", `${current.date} às ${current.start}`],
            ["Fuso horário", current.timezone],
            ["Status", appointmentStatusPresentation[current.status].label],
            ["Duração", `${current.durationMinutes} min`],
            [
              "Valor",
              new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                current.priceCents / 100,
              ),
            ],
            ["Observações", current.notes || "-"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value ?? "-"}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {current.status === "scheduled" ? (
            <Button isLoading={pending} onClick={() => setConfirmation("confirmed")}>
              Confirmar agendamento
            </Button>
          ) : null}
          {["scheduled", "confirmed"].includes(current.status) ? (
            <>
              <Button
                variant="outline"
                isLoading={pending}
                onClick={() => setConfirmation("arrived")}
              >
                Registrar check-in
              </Button>
              <Button variant="outline" onClick={() => onModeChange("reschedule")}>
                Remarcar
              </Button>
              <Button
                variant="outline"
                isLoading={pending}
                disabled={Boolean(current.startsAt && new Date(current.startsAt) > new Date())}
                onClick={() => setConfirmation("no-show")}
              >
                Registrar falta
              </Button>
            </>
          ) : null}
        </div>
        {errorContent}
        <ConfirmationDialog
          isOpen={Boolean(confirmation)}
          title={
            confirmation === "confirmed"
              ? "Confirmar agendamento?"
              : confirmation === "arrived"
                ? "Registrar check-in?"
                : "Registrar falta?"
          }
          description={
            confirmation === "arrived"
              ? "Confirme que o cliente chegou à unidade."
              : confirmation === "no-show"
                ? "O horário será liberado e a falta ficará registrada no histórico."
                : "Confirme o compromisso com o cliente."
          }
          confirmLabel="Confirmar"
          cancelLabel="Voltar"
          confirmVariant="default"
          isLoading={pending}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => confirmation && void transition(confirmation)}
        />
        <section className="mt-6 flex flex-col gap-3" aria-label="Histórico do agendamento">
          <h3 className="font-medium">Histórico</h3>
          {detail.isError ? (
            <div role="alert">
              <p>Não foi possível carregar o histórico.</p>
              <Button variant="outline" onClick={() => void detail.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}
          {detail.isPending ? (
            <Skeleton className="h-20" />
          ) : (
            current.events?.map((event) => (
              <p key={event.id} className="text-sm">
                {new Date(event.createdAt).toLocaleString("pt-BR")} · {event.actorName} ·{" "}
                {(
                  {
                    create: "Criação",
                    edit: "Edição",
                    reschedule: "Remarcação",
                    confirm: "Confirmação",
                    "check-in": "Check-in",
                    cancel: "Cancelamento",
                    "no-show": "Falta",
                  } as Record<string, string>
                )[event.action] ?? "Atualização"}{" "}
                ·{" "}
                {appointmentStatusPresentation[
                  event.toStatus as keyof typeof appointmentStatusPresentation
                ]?.label ?? event.toStatus}
              </p>
            ))
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={eventPage === 1 || detail.isFetching}
              onClick={() => setEventPage((value) => value - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm">Página {eventPage}</span>
            <Button
              variant="outline"
              disabled={detail.isFetching || (current.events?.length ?? 0) < 50}
              onClick={() => setEventPage((value) => value + 1)}
            >
              Próxima
            </Button>
          </div>
        </section>
      </ActionDrawer>
    )
  if (mode === "cancel" && appointment)
    return (
      <ActionDrawer
        context="Agenda"
        title="Cancelar agendamento"
        description="O horário será liberado e o registro continuará no histórico."
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        primaryAction={
          <Button
            variant="destructive"
            isLoading={pending}
            onClick={async () => {
              if (!reason) {
                setFailure(
                  new FormSubmissionError("invalid_request", "Selecione o motivo do cancelamento."),
                )
                return
              }
              try {
                await cancel.mutateAsync({
                  id: appointment.id,
                  reason,
                  note: cancellationNote,
                  version: expectedVersion,
                })
                toast.success("Agendamento cancelado.")
                onOpenChange(false)
              } catch (error) {
                fail(error)
              }
            }}
          >
            Cancelar agendamento
          </Button>
        }
        secondaryActions={
          <Button variant="outline" onClick={() => onModeChange("view")}>
            Manter agendamento
          </Button>
        }
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-medium">Motivo do cancelamento</legend>
          {(
            [
              ["client", "Cliente cancelou"],
              ["barbershop", "Barbearia cancelou"],
            ] as const
          ).map(([value, label]) => (
            <label className="flex min-h-10 items-center gap-2" key={value}>
              <input
                type="radio"
                name="reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <Field className="mt-4">
          <FieldLabel htmlFor="cancellation-note">Observações do cancelamento</FieldLabel>
          <Textarea
            id="cancellation-note"
            maxLength={500}
            value={cancellationNote}
            onChange={(event) => setCancellationNote(event.target.value)}
            placeholder="Se necessário, registre um detalhe do cancelamento"
          />
        </Field>
        {errorContent}
      </ActionDrawer>
    )
  return (
    <ClientRepositoryProvider repository={clientRepository}>
      <ActionDrawer
        context="Agenda"
        title={
          appointment
            ? mode === "reschedule"
              ? "Remarcar agendamento"
              : "Editar agendamento"
            : "Novo agendamento"
        }
        description="Selecione o cliente e um horário disponível na unidade."
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        primaryAction={
          <Button type="submit" form="production-appointment" isLoading={pending}>
            {appointment ? "Salvar alterações" : "Criar agendamento"}
          </Button>
        }
        secondaryActions={
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        }
      >
        <form
          id="production-appointment"
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-5"
        >
          <FormSection title="Cliente">
            {clients.isError ? (
              <div role="alert">
                Não foi possível carregar os clientes.{" "}
                <Button variant="outline" type="button" onClick={() => void clients.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : null}
            <AppointmentSearchField
              control={form.control}
              id="appointment-client"
              search={clientSearch}
              onSearchChange={setClientSearch}
              name="clientId"
              label="Cliente"
              placeholder="Selecione um cliente"
              options={clientOptions}
              required
            />
            <Button type="button" variant="outline" onClick={() => setCreatingClient(true)}>
              Cadastrar cliente
            </Button>
            {selectedClient.data &&
            ((selectedClient.data.preferredServices?.length ?? 0) > 0 ||
              (selectedClient.data.unitPreferenceIds?.length ?? 0) > 0 ||
              (selectedClient.data.professionalPreferenceIds?.length ?? 0) > 0) ? (
              <p className="text-sm text-muted-foreground">
                Sugestões do cliente:{" "}
                {[
                  ...(selectedClient.data.preferredServices ?? []).map((item) => ({
                    ...item,
                    kind: "Serviço",
                  })),
                  ...(preferences.data ?? []),
                ]
                  .map(
                    (item) =>
                      `${item.kind}: ${item.name}${item.status === "archived" ? " (arquivado)" : ""}`,
                  )
                  .join("; ")}
                {preferences.isPending && preferences.fetchStatus === "fetching"
                  ? " Carregando preferências…"
                  : null}
                {preferences.isError
                  ? " Não foi possível carregar as preferências de unidade e profissional."
                  : null}{" "}
                Nenhuma preferência é selecionada automaticamente.
              </p>
            ) : null}
          </FormSection>
          <FormSection title="Horário e serviço">
            <p className="text-sm text-muted-foreground">
              Unidade selecionada na Agenda. Para mudar de unidade, feche este formulário e
              selecione outra unidade.
            </p>
            {catalog.isError ? (
              <p role="alert">
                Não foi possível atualizar as opções.{" "}
                <Button type="button" variant="outline" onClick={() => void catalog.refetch()}>
                  Tentar novamente
                </Button>
              </p>
            ) : null}
            <AppointmentSearchField
              control={form.control}
              id="appointment-service"
              search={serviceSearch}
              onSearchChange={setServiceSearch}
              name="serviceId"
              label="Serviço"
              placeholder="Selecione um serviço"
              options={services.map((item) => ({ label: item.name, value: item.id }))}
              required
            />
            <AppointmentSearchField
              control={form.control}
              id="appointment-professional"
              search={professionalSearch}
              onSearchChange={setProfessionalSearch}
              name="professionalId"
              label="Profissional"
              placeholder="Selecione um profissional"
              options={professionals
                .filter((item) => selectedService?.eligibleProfessionalIds.includes(item.id))
                .map((item) => ({ label: item.name, value: item.id }))}
              required
            />
            <CompactRhfDateField
              control={form.control}
              id="appointment-date"
              name="date"
              label="Data"
              placeholder="Selecione a data"
              required
            />
            <RhfSelectField
              control={form.control}
              id="appointment-start"
              name="start"
              label="Horário"
              placeholder="Selecione um horário"
              options={timeOptions}
              required
            />
            {selectedService ? (
              <p className="text-sm">
                {selectedService.durationMinutes} min ·{" "}
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  selectedService.priceCents / 100,
                )}
              </p>
            ) : null}
            <RhfSelectField
              control={form.control}
              id="appointment-origin"
              name="origin"
              label="Origem"
              placeholder="Selecione a origem"
              options={[
                { label: "Recepção", value: "reception" },
                { label: "Telefone", value: "phone" },
                { label: "WhatsApp", value: "whatsapp" },
              ]}
              required
            />
            <RhfTextareaField
              control={form.control}
              id="appointment-notes"
              name="notes"
              label="Observações"
              placeholder="Ex.: Preferência de acabamento"
            />
          </FormSection>
          {errorContent}
        </form>
      </ActionDrawer>
      <ActionDrawer
        context="Clientes"
        title="Novo cliente"
        description="Cadastre o cliente para continuar o agendamento."
        isOpen={creatingClient}
        onOpenChange={setCreatingClient}
        primaryAction={
          <Button form="appointment-new-client" type="submit" isLoading={savingClient}>
            Salvar cliente
          </Button>
        }
        secondaryActions={
          <Button variant="outline" onClick={() => setCreatingClient(false)}>
            Cancelar
          </Button>
        }
      >
        <ClientForm
          formId="appointment-new-client"
          isSubmitting={savingClient}
          onCancel={() => setCreatingClient(false)}
          onSubmit={async (input) => {
            setSavingClient(true)
            try {
              const created = await clientRepository.create(input)
              form.setValue("clientId", created.id, { shouldValidate: true })
              cache.setQueryData(["clients", tenantId, "appointment-client", created.id], created)
              await invalidateSchedulingConsumers(cache)
              setCreatingClient(false)
              toast.success("Cliente cadastrado.")
            } finally {
              setSavingClient(false)
            }
          }}
        />
      </ActionDrawer>
    </ClientRepositoryProvider>
  )
}

function AppointmentSearchField({
  control,
  id,
  name,
  label,
  placeholder,
  options,
  search,
  onSearchChange,
}: {
  control: Control<z.infer<typeof schema>>
  id: string
  name: "clientId" | "serviceId" | "professionalId"
  label: string
  placeholder: string
  required?: boolean
  options: readonly { label: string; value: string }[]
  search: string
  onSearchChange: (value: string) => void
}) {
  const { field, fieldState } = useController({ control, name })
  const selectedLabel = options.find((option) => option.value === field.value)?.label
  return (
    <FormField id={id} label={label} required error={fieldState.error?.message}>
      <ComboboxInput
        id={id}
        ref={field.ref}
        value={selectedLabel ?? search}
        options={options}
        placeholder={placeholder}
        required
        onBlur={field.onBlur}
        onValueChange={(value) => {
          field.onChange("")
          onSearchChange(value)
        }}
        onOptionSelect={(option) => {
          field.onChange(option.value)
          onSearchChange("")
        }}
        aria-invalid={Boolean(fieldState.error)}
        aria-describedby={fieldState.error ? `${id}-error` : undefined}
      />
    </FormField>
  )
}
