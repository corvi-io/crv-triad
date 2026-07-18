import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import {
  type InvitationListRouteSearch,
  InvitationsScreen,
} from "@/modules/admin/components/users-screen"

const arrayParam = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
  }

  return typeof value === "string" ? [value] : undefined
}, z.array(z.string()).optional())

const numericParam = z.preprocess((value) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value)
  }

  return undefined
}, z.number().int().positive().optional())

const invitationsSearchSchema = z.object({
  page: numericParam,
  pageSize: numericParam,
  q: z.string().optional(),
  role: arrayParam,
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  status: arrayParam,
})

export const Route = createFileRoute("/_authenticated/users/invitations/")({
  validateSearch: (search) => invitationsSearchSchema.parse(search),
  component: InvitationsRoute,
})

function InvitationsRoute() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()

  return (
    <InvitationsScreen
      searchState={search}
      onSearchStateChange={(nextSearch: InvitationListRouteSearch) => {
        void navigate({ search: nextSearch, replace: true })
      }}
    />
  )
}
