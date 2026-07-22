import { z } from "zod"

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z
      .string()
      .min(12, "Use pelo menos 12 caracteres.")
      .max(256, "Use no máximo 256 caracteres."),
    newPasswordConfirmation: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["newPasswordConfirmation"],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
