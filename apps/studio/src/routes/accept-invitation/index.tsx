import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { AcceptInvitationScreen } from "@/modules/auth/components/accept-invitation-screen"

const acceptInvitationSearchSchema = z.object({
  token: z.preprocess(
    (value) => (typeof value === "string" && value.length <= 256 ? value : undefined),
    z.string().min(1).optional(),
  ),
})

export const Route = createFileRoute("/accept-invitation/")({
  validateSearch: (search) => acceptInvitationSearchSchema.parse(search),
  component: AcceptInvitationRoute,
})

function AcceptInvitationRoute() {
  const search = Route.useSearch()
  return <AcceptInvitationScreen token={search.token} />
}
