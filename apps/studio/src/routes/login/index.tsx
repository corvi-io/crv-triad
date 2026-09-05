import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { z } from "zod"

import { LoginScreen } from "@/modules/auth/components/login-screen"

const loginSearchSchema = z.object({
  invitationToken: z.preprocess(
    (value) => (typeof value === "string" && value.length <= 256 ? value : undefined),
    z.string().min(1).optional(),
  ),
  error: z.preprocess((value) => {
    if (value === "INVALID_TOKEN" || value === "invalid_token") return "verification_invalid"
    if (value === "TOKEN_EXPIRED") return "verification_expired"
    if (value === "verification_invalid" || value === "verification_expired") return value
    if (value === "session") return "session"
    if (value === "auth") return "auth"
    if (value === "provider") return "provider"
    return value ? "provider" : undefined
  }, z
    .enum(["auth", "provider", "session", "verification_invalid", "verification_expired"])
    .optional()),
  verified: z.preprocess(
    (value) => (value === "true" || value === true ? true : undefined),
    z.literal(true).optional(),
  ),
})

export const Route = createFileRoute("/login/")({
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: LoginRoute,
})

function LoginRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [verified] = useState(() => (search.error ? undefined : search.verified))

  useEffect(() => {
    if (!search.verified) return

    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, verified: undefined }),
    })
  }, [navigate, search.verified])

  return (
    <LoginScreen
      error={search.error}
      invitationToken={search.invitationToken}
      verified={verified}
    />
  )
}
