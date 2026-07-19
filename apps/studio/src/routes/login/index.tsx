import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { LoginScreen } from "@/modules/auth/components/login-screen"

const loginSearchSchema = z.object({
  error: z.preprocess(
    (value) => (value === "session" ? "session" : value ? "auth" : undefined),
    z.enum(["auth", "session"]).optional(),
  ),
})

export const Route = createFileRoute("/login/")({
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: LoginRoute,
})

function LoginRoute() {
  const search = Route.useSearch()

  return <LoginScreen error={search.error} />
}
