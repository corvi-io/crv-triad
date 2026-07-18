import { type ReactNode, useState } from "react"

import { ActionDrawer } from "@/modules/shared/components/action-drawer"
import { ConfirmationDialog } from "@/modules/shared/components/confirmation-dialog"
import { Button } from "@/modules/shared/components/ui/button"

type ReferenceFormDrawerProps = {
  bodyClassName?: string
  children: ReactNode
  context: string
  isDirty: boolean
  isOpen: boolean
  onDiscard: () => void
  onOpenChange: (open: boolean) => void
  primaryAction: ReactNode
  secondaryAction?: (requestClose: () => void) => ReactNode
  title: string
}

export function ReferenceFormDrawer({
  bodyClassName,
  children,
  context,
  isDirty,
  isOpen,
  onDiscard,
  onOpenChange,
  primaryAction,
  secondaryAction,
  title,
}: ReferenceFormDrawerProps) {
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false)

  function finishClose() {
    onDiscard()
    onOpenChange(false)
  }

  function requestOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true)
      return
    }

    if (isDirty) {
      setIsConfirmingDiscard(true)
      return
    }

    finishClose()
  }

  return (
    <>
      <ActionDrawer
        context={context}
        description={`Preencha os dados de ${title.toLocaleLowerCase("pt-BR")}.`}
        isOpen={isOpen}
        onOpenChange={requestOpenChange}
        primaryAction={primaryAction}
        secondaryActions={
          secondaryAction?.(() => requestOpenChange(false)) ?? (
            <Button type="button" variant="outline" onClick={() => requestOpenChange(false)}>
              Cancelar
            </Button>
          )
        }
        size="form"
        title={title}
        bodyClassName={bodyClassName ?? "space-y-4 p-4 sm:p-6"}
        footerClassName="px-4 py-4 sm:px-6"
      >
        {children}
      </ActionDrawer>
      <ConfirmationDialog
        description="As alterações feitas no formulário serão descartadas."
        isOpen={isConfirmingDiscard}
        onCancel={() => setIsConfirmingDiscard(false)}
        onConfirm={() => {
          setIsConfirmingDiscard(false)
          finishClose()
        }}
        title="Descartar alterações?"
      />
    </>
  )
}
