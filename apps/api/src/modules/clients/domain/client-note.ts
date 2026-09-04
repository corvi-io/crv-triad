import { z } from "zod"

import { ClientValidationError } from "./errors.js"

const noteSchema = z.object({ body: z.string().trim().min(1).max(2_000) })

export function validateClientNote(input: unknown) {
  const result = noteSchema.safeParse(input)
  if (!result.success) throw new ClientValidationError(result.error.flatten().fieldErrors)
  return result.data
}
