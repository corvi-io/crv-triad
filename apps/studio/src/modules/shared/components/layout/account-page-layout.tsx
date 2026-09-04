import type { ReactNode } from "react"

import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

type AccountPageLayoutProps = {
  actions?: ReactNode
  children: ReactNode
  description: string
  title: string
}

export function AccountPageLayout({
  actions,
  children,
  description,
  title,
}: AccountPageLayoutProps) {
  return (
    <ModuleLayout
      head={<PageHeader actions={actions} description={description} title={title} />}
      bodyViewportClassName="pb-6"
    >
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </ModuleLayout>
  )
}
