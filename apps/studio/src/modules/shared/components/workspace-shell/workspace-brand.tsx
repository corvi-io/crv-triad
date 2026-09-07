import { Link } from "@tanstack/react-router"

import { StudioLogo } from "@/modules/shared/components/branding/studio-logo"

export function WorkspaceBrand() {
  return (
    <Link
      aria-label="TRIAD Studio — ir para o Dashboard"
      className="flex h-workspace-brand w-full items-center rounded-md px-(--workspace-brand-padding-inline) py-(--workspace-brand-padding-block) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1"
      to="/overview"
    >
      <span className="flex min-w-0 items-center group-data-[collapsible=icon]:hidden">
        <StudioLogo className="w-(--workspace-brand-horizontal-width)" />
      </span>
      <span className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
        <StudioLogo className="size-(--workspace-brand-symbol-collapsed-width)" variant="icon" />
      </span>
    </Link>
  )
}
