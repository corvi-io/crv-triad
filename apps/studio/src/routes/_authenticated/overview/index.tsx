import { createFileRoute } from "@tanstack/react-router"

import { WorkspaceOverview } from "@/modules/shared/components/workspace-overview"

export const Route = createFileRoute("/_authenticated/overview/")({
  component: OverviewRoute,
})

function OverviewRoute() {
  return <WorkspaceOverview />
}
