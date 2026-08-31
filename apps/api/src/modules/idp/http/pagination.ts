import { z } from "zod"

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function parsePaginationQuery(request: Request) {
  const searchParams = new URL(request.url).searchParams

  return paginationQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortDirection: searchParams.get("sortDirection") ?? undefined,
  })
}

export function getRepeatedQueryValues(request: Request, key: string) {
  return new URL(request.url).searchParams.getAll(key).filter(Boolean)
}

export function buildPageMeta(page: number, pageSize: number, totalCount: number) {
  return {
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  }
}
