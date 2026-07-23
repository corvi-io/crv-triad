import { z } from "zod"

import { newPasswordSchema } from "@/modules/auth/schemas/password-policy"

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: newPasswordSchema,
    newPasswordConfirmation: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["newPasswordConfirmation"],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
