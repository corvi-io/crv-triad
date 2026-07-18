import { z } from "zod"

export const loginCredentialsSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
})

export type LoginCredentialsFormValues = z.infer<typeof loginCredentialsSchema>
