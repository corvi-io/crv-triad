import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { z } from "zod"

import { PreferencesScreen } from "@/modules/preferences/components/preferences-screen"

const preferencesSearchSchema = z.object({
  google: z.preprocess(
    (value) => (value === "connected" ? "connected" : value ? "error" : undefined),
    z.enum(["connected", "error"]).optional(),
  ),
})

export const Route = createFileRoute("/_authenticated/preferences/")({
  validateSearch: (search) => preferencesSearchSchema.parse(search),
  component: PreferencesRoute,
})

function PreferencesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [googleResult] = useState(search.google)

  useEffect(() => {
    if (!search.google) return

    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, google: undefined }),
    })
  }, [navigate, search.google])

  return <PreferencesScreen googleResult={googleResult} />
}
