import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { ResetPasswordScreen } from "@/modules/auth/components/reset-password-screen"

const resetPasswordSearchSchema = z.object({
  error: z.preprocess((value) => Boolean(value), z.boolean()),
  token: z.preprocess(
    (value) => (typeof value === "string" && value.length <= 2_048 ? value : undefined),
    z.string().min(1).optional(),
  ),
})

export const Route = createFileRoute("/reset-password/")({
  validateSearch: (search) => resetPasswordSearchSchema.parse(search),
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const search = Route.useSearch()

  return <ResetPasswordScreen invalidToken={search.error} token={search.token} />
}
