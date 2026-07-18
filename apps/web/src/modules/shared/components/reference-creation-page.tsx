import { PlusIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"

import { ModuleLayout } from "@/modules/shared/components/module-layout"
import { PageHeader } from "@/modules/shared/components/page-header"
import { Button } from "@/modules/shared/components/ui/button"

type ReferenceCreationPageProps = {
  actionLabel: string
  children: (state: { isOpen: boolean; onOpenChange: (open: boolean) => void }) => ReactNode
  description: string
  title: string
}

export function ReferenceCreationPage({
  actionLabel,
  children,
  description,
  title,
}: ReferenceCreationPageProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <ModuleLayout
        head={
          <PageHeader
            title={title}
            description={description}
            actions={
              <Button type="button" onClick={() => setIsOpen(true)}>
                <PlusIcon aria-hidden="true" />
                {actionLabel}
              </Button>
            }
          />
        }
      >
        <p className="max-w-2xl text-muted-foreground text-sm">
          Use a ação acima para preencher um novo cadastro.
        </p>
      </ModuleLayout>
      {children({ isOpen, onOpenChange: setIsOpen })}
    </>
  )
}
