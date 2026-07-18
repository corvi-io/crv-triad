import { createFileRoute } from "@tanstack/react-router"

import { UsersDashboardScreen } from "@/modules/admin/components/users-screen"

export const Route = createFileRoute("/_authenticated/users/")({
  component: UsersDashboardScreen,
})
