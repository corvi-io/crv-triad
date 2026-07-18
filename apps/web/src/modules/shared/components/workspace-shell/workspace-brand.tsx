import { Link } from "@tanstack/react-router"

export function WorkspaceBrand() {
  return (
    <Link
      aria-label="CRV Triad — ir para o Dashboard"
      className="flex h-workspace-brand w-full items-center gap-2 rounded-md p-(--workspace-brand-padding-block) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1"
      to="/overview"
    >
      <span className="flex size-12 shrink-0 items-center justify-center group-data-[collapsible=icon]:size-8">
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-(--workspace-brand-symbol-width) group-data-[collapsible=icon]:w-(--workspace-brand-symbol-collapsed-width)"
          src="/brand/crv-triad-symbol.svg"
        />
      </span>
      <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
        <span className="block truncate text-workspace-brand-title font-bold text-sidebar-foreground">
          CRV Triad
        </span>
        <span className="block truncate text-workspace-brand-subtitle font-medium text-muted-foreground">
          WORKSPACE
        </span>
      </span>
    </Link>
  )
}
