import { zodResolver } from "@hookform/resolvers/zod"
import {
  CalendarDaysIcon,
  Clock3Icon,
  FileTextIcon,
  PhoneIcon,
  ScissorsIcon,
  UserRoundIcon,
} from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { FormSection } from "@/modules/shared/components/forms/form-layout"
import {
  CompactRhfDateField,
  CompactRhfMaskedField,
  CompactRhfSelectField,
  CompactRhfTextareaField,
  CompactRhfTextField,
} from "@/modules/shared/components/forms/rhf-form-fields"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import type {
  Appointment,
  AppointmentInput,
  CancellationReason,
  Professional,
  SchedulingUnitId,
  Service,
} from "./contracts"
import { ScheduleConflictError } from "./contracts"
import { useCancelAppointment, useCreateAppointment, useUpdateAppointment } from "./queries"
import { appointmentStatusPresentation, isTerminalAppointmentStatus } from "./status"

export type DrawerMode = "cancel" | "create" | "edit" | "reschedule" | "view"

export const appointmentFormSchema = z.object({
  customerName: z.string().trim().min(2, "Informe o nome do cliente."),
  customerPhone: z.string().regex(/^\d{10,11}$/, "Informe um telefone válido."),
  date: z.iso.date("Informe uma data válida."),
  notes: z.string().max(500, "Use no máximo 500 caracteres."),
  origin: z.enum(["phone", "reception", "whatsapp"]),
  paymentStatus: z.enum(["pending", "paid"]),
  professionalId: z.string().min(1, "Selecione um profissional."),
  serviceId: z.string().min(1, "Selecione um serviço."),
  status: z.enum([
    "scheduled",
    "confirmed",
    "arrived",
    "waiting",
    "in-progress",
    "completed",
    "canceled",
    "no-show",
  ]),
  start: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):(?:00|15|30|45)$/,
      "Use horários de 15 em 15 minutos (00, 15, 30 ou 45).",
    ),
  unitId: z.enum(["centro", "artesao"]),
})

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>

export function AppointmentDrawer({
  appointment,
  initialSlot,
  isOpen,
  mode,
  onModeChange,
  onOpenChange,
  professionals,
  selectedDate,
  selectedUnit,
  services,
}: {
  appointment?: Appointment
  initialSlot?: { professionalId: string; start: string }
  isOpen: boolean
  mode: DrawerMode
  onModeChange: (mode: DrawerMode) => void
  onOpenChange: (open: boolean) => void
  professionals: readonly Professional[]
  selectedDate: string
  selectedUnit: SchedulingUnitId
  services: readonly Service[]
}) {
  const createMutation = useCreateAppointment()
  const updateMutation = useUpdateAppointment()
  const cancelMutation = useCancelAppointment()
  const [cancelReason, setCancelReason] = useState<Exclude<CancellationReason, "no-show">>()
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    values: valuesFor(appointment, initialSlot, selectedDate, selectedUnit),
  })
  const selectedService = services.find(({ id }) => id === form.watch("serviceId")) ?? services[0]
  const eligibleProfessionals = professionals.filter(({ id }) =>
    selectedService?.eligibleProfessionalIds.includes(id),
  )
  const isPending = createMutation.isPending || updateMutation.isPending || cancelMutation.isPending
  const title = modeTitle(mode)

  function switchMode(nextMode: Exclude<DrawerMode, "create">) {
    requestAnimationFrame(() => {
      onModeChange(nextMode)
      requestAnimationFrame(() => focusMode(nextMode))
    })
  }

  async function submit(values: AppointmentFormValues) {
    if (!selectedService) return
    const input: AppointmentInput = {
      ...values,
      cancellationReason: appointment?.cancellationReason,
      clientId: appointment?.clientId ?? `client-${globalThis.crypto.randomUUID()}`,
      durationMinutes: selectedService.durationMinutes,
      priceCents: selectedService.priceCents,
      rating: appointment?.rating,
      tags: appointment?.tags ?? [],
      ...(appointment
        ? {
            cancellationReason: appointment.cancellationReason,
            paymentStatus: appointment.paymentStatus,
            status: appointment.status,
          }
        : {}),
    }
    try {
      if (appointment) await updateMutation.mutateAsync({ id: appointment.id, input })
      else await createMutation.mutateAsync(input)
      toast.success(appointment ? "Agendamento atualizado." : "Agendamento criado.")
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof ScheduleConflictError
          ? error.message
          : "Não foi possível salvar. Tente novamente."
      form.setError("start", { message })
      form.setFocus("start")
      toast.error(message)
    }
  }

  async function cancelAppointment() {
    if (!appointment || !cancelReason) return
    try {
      await cancelMutation.mutateAsync({ id: appointment.id, reason: cancelReason })
      toast.success("Agendamento cancelado.")
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível cancelar. Tente novamente.")
    }
  }

  if (mode === "view" && appointment) {
    const status = appointmentStatusPresentation[appointment.status]
    const isTerminal = isTerminalAppointmentStatus(appointment.status)
    return (
      <ActionDrawer
        context="Agenda"
        description="Detalhes do agendamento sintético."
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={title}
        primaryAction={
          isTerminal ? undefined : (
            <Button id="appointment-mode-edit" type="button" onClick={() => switchMode("edit")}>
              Editar agendamento
            </Button>
          )
        }
        secondaryActions={
          isTerminal ? undefined : (
            <>
              <Button
                id="appointment-mode-reschedule"
                type="button"
                variant="outline"
                onClick={() => switchMode("reschedule")}
              >
                Remarcar
              </Button>
              <Button
                id="appointment-mode-cancel"
                type="button"
                variant="destructive"
                onClick={() => switchMode("cancel")}
              >
                Cancelar agendamento
              </Button>
            </>
          )
        }
      >
        <dl className="grid gap-4 text-sm">
          <Detail label="Cliente" value={appointment.customerName} />
          <Detail label="Telefone" value={appointment.customerPhone} />
          <Detail label="Data e horário" value={`${appointment.date} às ${appointment.start}`} />
          <Detail label="Status" value={`${status.symbol} ${status.label}`} />
          <Detail label="Unidade" value={appointment.unitId === "centro" ? "Centro" : "Artesão"} />
          <Detail
            label="Pagamento"
            value={appointment.paymentStatus === "paid" ? "Pago" : "Pendente"}
          />
          <Detail
            label="Duração e valor"
            value={`${appointment.durationMinutes} min · ${formatPrice(appointment.priceCents)}`}
          />
          <Detail label="Observações" value={appointment.notes || "Sem observações."} />
        </dl>
      </ActionDrawer>
    )
  }

  if (mode === "cancel" && appointment) {
    return (
      <ActionDrawer
        context="Agenda"
        description="Confirme o cancelamento deste agendamento sintético."
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={title}
        primaryAction={
          <Button
            disabled={!cancelReason}
            isLoading={isPending}
            type="button"
            variant="destructive"
            onClick={cancelAppointment}
          >
            Cancelar agendamento
          </Button>
        }
        secondaryActions={
          <Button type="button" variant="outline" onClick={() => switchMode("view")}>
            Manter agendamento
          </Button>
        }
      >
        <div className="rounded-lg border border-destructive p-4 text-sm">
          <p className="font-medium">Cancelar o horário de {appointment.customerName}?</p>
          <p className="mt-2 text-muted-foreground">
            O protótipo manterá o registro com o status “Cancelado” até o cenário ser restaurado.
          </p>
          <fieldset className="mt-4 grid gap-2">
            <legend className="font-medium">Qual o motivo?</legend>
            {(
              [
                ["client", "Cliente cancelou"],
                ["barbershop", "Barbearia cancelou"],
              ] as const
            ).map(([value, label]) => (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3"
                key={value}
              >
                <input
                  checked={cancelReason === value}
                  disabled={isPending}
                  name="drawer-cancellation-reason"
                  type="radio"
                  value={value}
                  onChange={() => setCancelReason(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
      </ActionDrawer>
    )
  }

  return (
    <ActionDrawer
      context="Agenda"
      description="Formulário de agendamento com dados sintéticos."
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="form"
      title={title}
      primaryAction={
        <Button form="appointment-form" isLoading={isPending} type="submit">
          {mode === "create"
            ? "Criar agendamento"
            : mode === "reschedule"
              ? "Confirmar remarcação"
              : "Salvar alterações"}
        </Button>
      }
      secondaryActions={
        <Button
          type="button"
          variant="outline"
          onClick={() => (appointment ? switchMode("view") : onOpenChange(false))}
        >
          Voltar
        </Button>
      }
    >
      <form
        id="appointment-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(submit)}
      >
        <FormSection title="Cliente">
          <CompactRhfTextField
            control={form.control}
            id="customer-name"
            icon={UserRoundIcon}
            label="Nome"
            name="customerName"
            placeholder="Nome sintético"
            required
          />
          <CompactRhfMaskedField
            control={form.control}
            id="customer-phone"
            icon={PhoneIcon}
            label="Telefone"
            mask="brPhone"
            name="customerPhone"
            placeholder="(81) 90000-0000"
            required
          />
        </FormSection>
        <FormSection title="Horário e serviço">
          <CompactRhfSelectField
            control={form.control}
            id="service"
            icon={ScissorsIcon}
            label="Serviço"
            name="serviceId"
            options={services.map(({ id, name }) => ({ label: name, value: id }))}
            placeholder="Selecione"
            required
          />
          <CompactRhfSelectField
            control={form.control}
            id="unit"
            label="Unidade"
            name="unitId"
            options={[
              { label: "Centro", value: "centro" },
              { label: "Artesão", value: "artesao" },
            ]}
            placeholder="Selecione"
            required
          />
          {mode === "create" ? (
            <>
              <CompactRhfSelectField
                control={form.control}
                id="initial-status"
                label="Status inicial"
                name="status"
                options={[
                  { label: "Agendado", value: "scheduled" },
                  { label: "Confirmado", value: "confirmed" },
                  { label: "Check-in", value: "arrived" },
                  { label: "Em espera", value: "waiting" },
                  { label: "Em atendimento", value: "in-progress" },
                  { label: "Finalizado", value: "completed" },
                ]}
                placeholder="Selecione"
                required
              />
              <CompactRhfSelectField
                control={form.control}
                id="payment-status"
                label="Pagamento"
                name="paymentStatus"
                options={[
                  { label: "Pendente", value: "pending" },
                  { label: "Pago", value: "paid" },
                ]}
                placeholder="Selecione"
                required
              />
            </>
          ) : null}
          <CompactRhfSelectField
            control={form.control}
            id="professional"
            icon={UserRoundIcon}
            label="Profissional"
            name="professionalId"
            options={eligibleProfessionals.map(({ id, name }) => ({ label: name, value: id }))}
            placeholder="Selecione"
            required
          />
          <CompactRhfDateField
            control={form.control}
            id="appointment-date"
            icon={CalendarDaysIcon}
            label="Data"
            name="date"
            placeholder="Selecione"
            required
          />
          <CompactRhfTextField
            control={form.control}
            id="appointment-time"
            icon={Clock3Icon}
            label="Horário"
            name="start"
            placeholder="09:00"
            required
          />
          <ReadonlyField
            label="Duração"
            value={`${selectedService?.durationMinutes ?? 0} minutos`}
          />
          <ReadonlyField label="Valor" value={formatPrice(selectedService?.priceCents ?? 0)} />
          <CompactRhfSelectField
            control={form.control}
            id="origin"
            label="Origem"
            name="origin"
            options={[
              { label: "Recepção", value: "reception" },
              { label: "Telefone", value: "phone" },
              { label: "WhatsApp", value: "whatsapp" },
            ]}
            placeholder="Selecione"
            required
          />
          <CompactRhfTextareaField
            control={form.control}
            id="notes"
            icon={FileTextIcon}
            label="Observações"
            name="notes"
            placeholder="Informações sintéticas para o atendimento"
          />
        </FormSection>
      </form>
    </ActionDrawer>
  )
}

function valuesFor(
  appointment: Appointment | undefined,
  slot: { professionalId: string; start: string } | undefined,
  date: string,
  unit: SchedulingUnitId,
): AppointmentFormValues {
  return {
    customerName: appointment?.customerName ?? "",
    customerPhone: appointment?.customerPhone ?? "",
    date: appointment?.date ?? date,
    notes: appointment?.notes ?? "",
    origin: appointment?.origin ?? "reception",
    paymentStatus: appointment?.paymentStatus ?? "pending",
    professionalId: appointment?.professionalId ?? slot?.professionalId ?? "professional-carlos",
    serviceId: appointment?.serviceId ?? "service-hair-beard",
    start: appointment?.start ?? slot?.start ?? "09:00",
    status: appointment?.status ?? "confirmed",
    unitId: appointment?.unitId ?? unit,
  }
}

function modeTitle(mode: DrawerMode) {
  return {
    cancel: "Cancelar agendamento",
    create: "Novo agendamento",
    edit: "Editar agendamento",
    reschedule: "Remarcar agendamento",
    view: "Ver agendamento",
  }[mode]
}

function focusMode(mode: Exclude<DrawerMode, "create">) {
  const selector = {
    cancel: 'input[name="drawer-cancellation-reason"]',
    edit: "#customer-name",
    reschedule: "#appointment-date",
    view: "#appointment-mode-edit",
  }[mode]
  document.querySelector<HTMLElement>(selector)?.focus()
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100)
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  )
}
function ReadonlyField({ label, value }: { label: string; value: string }) {
  const id = `appointment-${label === "Duração" ? "duration" : "price"}`
  return (
    <label
      className="grid gap-1 text-sm sm:grid-cols-[12.5rem_minmax(0,1fr)] sm:items-center sm:gap-6"
      htmlFor={id}
    >
      <span className="text-muted-foreground">{label}</span>
      <Input id={id} aria-readonly readOnly value={value} />
    </label>
  )
}
