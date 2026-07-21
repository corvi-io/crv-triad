import { z } from "zod"

export const emailRecoverySchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("Informe um e-mail válido."),
})

export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(12, "Use pelo menos 12 caracteres.")
      .max(256, "Use no máximo 256 caracteres."),
    passwordConfirmation: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  })

export type EmailRecoveryFormValues = z.infer<typeof emailRecoverySchema>
export type PasswordResetFormValues = z.infer<typeof passwordResetSchema>
