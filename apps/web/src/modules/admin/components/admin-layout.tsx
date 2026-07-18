import type { ReactNode } from "react"

import { ModuleLayout } from "@/modules/shared/components/module-layout"
import { ModuleTabs } from "@/modules/shared/components/module-tabs"

import { usersSubnavItems } from "../lib/labels"

type UsersLayoutProps = {
  children?: ReactNode
  head?: ReactNode
}

export function UsersLayout({ children, head }: UsersLayoutProps) {
  return (
    <ModuleLayout
      bodyViewportClassName="flex h-full min-h-0 flex-col gap-5 space-y-0 pb-0"
      head={
        <>
          <ModuleTabs label="Navegação de usuários" items={usersSubnavItems} />
          {head}
        </>
      }
    >
      {children}
    </ModuleLayout>
  )
}
