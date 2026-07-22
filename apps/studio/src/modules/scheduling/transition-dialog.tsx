import { Dialog } from "@base-ui/react/dialog"
import { useState } from "react"
import { Button } from "@/modules/shared/components/ui/button"
import { cn } from "@/modules/shared/lib/utils"
import {
  type AgendaColumnId,
  agendaColumns,
  columnForStatus,
  primaryStatusForColumn,
} from "./agenda"
import type {
  Appointment,
  AppointmentTransitionInput,
  CancellationReason,
  PaymentStatus,
} from "./contracts"

export function TransitionDialog({
  appointment,
  initialColumn,
  isPending,
  onCancel,
  onConfirm,
}: {
  appointment: Appointment
  initialColumn?: AgendaColumnId
  isPending: boolean
  onCancel: () => void
  onConfirm: (input: AppointmentTransitionInput) => void
}) {
  const currentColumn = columnForStatus(appointment.status)
  const [column, setColumn] = useState<AgendaColumnId | undefined>(initialColumn)
  const [reason, setReason] = useState<CancellationReason | undefined>()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | undefined>()
  const needsReason = column === "canceled-no-show"
  const needsPayment = column === "completed" && appointment.paymentStatus === "pending"
  const canConfirm = Boolean(column && (!needsReason || reason) && (!needsPayment || paymentStatus))

  function confirm() {
    if (!column) return
    const status =
      column === "canceled-no-show"
        ? reason === "no-show"
          ? "no-show"
          : "canceled"
        : primaryStatusForColumn(column)
    onConfirm({
      cancellationReason: needsReason ? reason : undefined,
      id: appointment.id,
      paymentStatus: needsPayment ? paymentStatus : undefined,
      status,
    })
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[61] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
          <Dialog.Title className="font-semibold text-lg">Alterar status</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Escolha o próximo estado do agendamento sintético.
          </Dialog.Description>

          <fieldset className="mt-5 grid gap-2">
            <legend className="font-medium text-sm">Novo status</legend>
            {agendaColumns.map((candidate) => (
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm outline-none focus-within:ring-3 focus-within:ring-ring/50",
                  column === candidate.id && "border-primary bg-accent",
                  currentColumn === candidate.id && "opacity-60",
                )}
                key={candidate.id}
              >
                <input
                  checked={column === candidate.id}
                  disabled={currentColumn === candidate.id || isPending}
                  name="transition-column"
                  type="radio"
                  value={candidate.id}
                  onChange={() => {
                    setColumn(candidate.id)
                    setReason(undefined)
                    setPaymentStatus(undefined)
                  }}
                />
                {candidate.label}
              </label>
            ))}
          </fieldset>

          {needsReason ? (
            <fieldset className="mt-5 grid gap-2">
              <legend className="font-medium text-sm">Qual o motivo?</legend>
              {(
                [
                  ["client", "Cliente cancelou"],
                  ["barbershop", "Barbearia cancelou"],
                  ["no-show", "Não compareceu"],
                ] as const
              ).map(([value, label]) => (
                <label
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
                  key={value}
                >
                  <input
                    checked={reason === value}
                    disabled={isPending}
                    name="cancellation-reason"
                    type="radio"
                    value={value}
                    onChange={() => setReason(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          ) : null}

          {needsPayment ? (
            <fieldset className="mt-5 grid gap-2">
              <legend className="font-medium text-sm">Decisão de pagamento</legend>
              {(
                [
                  ["paid", "Marcar como pago"],
                  ["pending", "Manter pagamento pendente"],
                ] as const
              ).map(([value, label]) => (
                <label
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
                  key={value}
                >
                  <input
                    checked={paymentStatus === value}
                    disabled={isPending}
                    name="payment-status"
                    type="radio"
                    value={value}
                    onChange={() => setPaymentStatus(value)}
                  />
                  {label}
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                Esta escolha altera apenas o estado visual do protótipo; nenhum pagamento real é
                processado.
              </p>
            </fieldset>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button disabled={isPending} type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button disabled={!canConfirm} isLoading={isPending} type="button" onClick={confirm}>
              Confirmar alteração
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
