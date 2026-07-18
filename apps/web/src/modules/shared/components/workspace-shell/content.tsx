import type { ReactNode } from "react"

export function WorkspaceShellContent({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-(--workspace-content-inset-x) py-(--workspace-content-inset-y)"
      data-slot="workspace-content"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
