import { z } from "zod"

import { ClientValidationError } from "./errors.js"

const pageSizes = [10, 20, 50] as const
const sortFields = ["name", "createdAt", "lastVisitAt", "nextAppointmentAt"] as const

const querySchema = z.object({
  contact: z.enum(["all", "complete", "incomplete"]).default("all"),
  duplicate: z.enum(["all", "possible"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union(pageSizes.map((value) => z.literal(value))))
    .default(20),
  search: z.string().trim().max(120).default(""),
  sortBy: z.enum(sortFields).default("name"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["active", "archived"]).default("active"),
  tag: z.string().trim().max(60).default(""),
})

export type ClientListQuery = z.output<typeof querySchema>

export function parseClientListQuery(input: unknown): ClientListQuery {
  const result = querySchema.safeParse(input)
  if (!result.success) throw new ClientValidationError(result.error.flatten().fieldErrors)
  return result.data
}
