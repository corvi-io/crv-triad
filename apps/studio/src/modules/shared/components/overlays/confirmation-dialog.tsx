import { Dialog } from "@base-ui/react/dialog"
import { AlertTriangleIcon } from "lucide-react"

import { Button } from "@/modules/shared/components/ui/button"

type ConfirmationDialogProps = {
  cancelLabel?: string
  confirmLabel?: string
  confirmVariant?: "default" | "destructive"
  description: string
  isOpen: boolean
  isLoading?: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
}

export function ConfirmationDialog({
  cancelLabel = "Continuar preenchendo",
  confirmLabel = "Descartar alterações",
  confirmVariant = "destructive",
  description,
  isOpen,
  isLoading = false,
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-(--layer-modal) bg-black/30 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-(--layer-modal) w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
          <div className="flex gap-3">
            <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="flex min-w-0 flex-col gap-1">
              <Dialog.Title className="font-semibold text-base">{title}</Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {description}
              </Dialog.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={isLoading} onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={confirmVariant}
              isLoading={isLoading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
