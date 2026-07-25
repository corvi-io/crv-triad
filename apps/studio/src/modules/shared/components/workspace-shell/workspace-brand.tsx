import { Link } from "@tanstack/react-router"

export function WorkspaceBrand() {
  return (
    <Link
      aria-label="TRIAD Studio — ir para o Dashboard"
      className="flex h-workspace-brand w-full items-center rounded-md px-(--workspace-brand-padding-inline) py-(--workspace-brand-padding-block) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1"
      to="/overview"
    >
      <span className="flex min-w-0 items-center group-data-[collapsible=icon]:hidden">
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-(--workspace-brand-horizontal-width) dark:hidden"
          src="/brand/crv-triad-horizontal-gold.svg"
        />
        <img
          alt=""
          aria-hidden="true"
          className="hidden h-auto w-(--workspace-brand-horizontal-width) dark:block"
          src="/brand/crv-triad-horizontal-white.svg"
        />
      </span>
      <span className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-(--workspace-brand-symbol-collapsed-width) dark:hidden"
          src="/brand/crv-triad-symbol-gold.svg"
        />
        <img
          alt=""
          aria-hidden="true"
          className="hidden h-auto w-(--workspace-brand-symbol-collapsed-width) dark:block"
          src="/brand/crv-triad-symbol-white.svg"
        />
      </span>
    </Link>
  )
}
