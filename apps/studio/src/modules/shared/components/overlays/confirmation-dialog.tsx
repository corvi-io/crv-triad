import { Dialog } from "@base-ui/react/dialog"
import { AlertTriangleIcon } from "lucide-react"

import { Button } from "@/modules/shared/components/ui/button"

type ConfirmationDialogProps = {
  description: string
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
}

export function ConfirmationDialog({
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/30 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[61] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
          <div className="flex gap-3">
            <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="min-w-0 space-y-1">
              <Dialog.Title className="font-semibold text-base">{title}</Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {description}
              </Dialog.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Continuar preenchendo
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm}>
              Descartar alterações
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
