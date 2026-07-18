import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { type UserListRouteSearch, UserListScreen } from "@/modules/admin/components/users-screen"

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

const usersSearchSchema = z.object({
  page: numericParam,
  pageSize: numericParam,
  q: z.string().optional(),
  role: arrayParam,
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  status: arrayParam,
})

export const Route = createFileRoute("/_authenticated/users/list/")({
  validateSearch: (search) => usersSearchSchema.parse(search),
  component: UsersListRoute,
})

function UsersListRoute() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()

  return (
    <UserListScreen
      searchState={search}
      onSearchStateChange={(nextSearch: UserListRouteSearch) => {
        void navigate({ search: nextSearch, replace: true })
      }}
    />
  )
}
