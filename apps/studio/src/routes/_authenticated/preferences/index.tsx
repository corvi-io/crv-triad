import { createFileRoute } from "@tanstack/react-router"

import { PreferencesScreen } from "@/modules/preferences/components/preferences-screen"

export const Route = createFileRoute("/_authenticated/preferences/")({
  component: PreferencesRoute,
})

function PreferencesRoute() {
  return <PreferencesScreen />
}
