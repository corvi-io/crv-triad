import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { AuthFeedback } from "@/modules/auth/components/auth-feedback"
import { AuthShell } from "@/modules/auth/components/auth-shell"
import { PasswordGuidance } from "@/modules/auth/components/password-guidance"
import { PasswordInput } from "@/modules/auth/components/password-input"
import {
  type PasswordResetFormValues,
  passwordResetSchema,
} from "@/modules/auth/schemas/recovery-schema"
import { resetPassword } from "@/modules/auth/services/auth-client"
import { Button, buttonVariants } from "@/modules/shared/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/modules/shared/components/ui/field"

type ResetPasswordScreenProps = {
  invalidToken: boolean
  token?: string
}

export function ResetPasswordScreen({ invalidToken, token }: ResetPasswordScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<"invalid" | "success" | null>(
    invalidToken || !token ? "invalid" : null,
  )
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
    watch,
  } = useForm<PasswordResetFormValues>({
    defaultValues: { password: "", passwordConfirmation: "" },
    resolver: zodResolver(passwordResetSchema),
  })
  const password = watch("password")
  const passwordConfirmation = watch("passwordConfirmation")

  async function handleReset(values: PasswordResetFormValues) {
    if (!token || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await resetPassword({ newPassword: values.password, token })
      if (response?.error?.code === "PASSWORD_POLICY_REJECTED") {
        setError(
          "password",
          { message: "Escolha uma senha menos comum ou previsível." },
          { shouldFocus: true },
        )
        return
      }
      setResult(response?.error ? "invalid" : "success")
    } catch {
      setResult("invalid")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Criar nova senha"
      description="Defina uma nova senha para voltar a acessar o TRIAD Backstage."
    >
      {result === "invalid" ? (
        <div className="space-y-5">
          <AuthFeedback tone="error">
            Este link é inválido, expirou ou já foi usado. Solicite uma nova redefinição.
          </AuthFeedback>
          <Link
            className={buttonVariants({ className: "w-full", size: "lg" })}
            to="/forgot-password"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : null}

      {result === "success" ? (
        <div className="space-y-5">
          <AuthFeedback tone="success">
            Sua senha foi redefinida. As sessões anteriores foram encerradas.
          </AuthFeedback>
          <Link className={buttonVariants({ className: "w-full", size: "lg" })} to="/login">
            Voltar para entrar
          </Link>
        </div>
      ) : null}

      {!result ? (
        <form className="space-y-5" noValidate onSubmit={handleSubmit(handleReset)}>
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
              <PasswordInput
                aria-describedby="new-password-guidance new-password-error"
                aria-invalid={!!errors.password}
                autoComplete="new-password"
                id="new-password"
                {...register("password")}
              />
              <PasswordGuidance
                confirmation={passwordConfirmation}
                id="new-password-guidance"
                password={password}
              />
              <FieldError errors={[errors.password]} id="new-password-error" />
            </Field>

            <Field data-invalid={!!errors.passwordConfirmation}>
              <FieldLabel htmlFor="new-password-confirmation">Confirmar nova senha</FieldLabel>
              <PasswordInput
                aria-describedby={
                  errors.passwordConfirmation ? "new-password-confirmation-error" : undefined
                }
                aria-invalid={!!errors.passwordConfirmation}
                autoComplete="new-password"
                id="new-password-confirmation"
                {...register("passwordConfirmation")}
              />
              <FieldError
                errors={[errors.passwordConfirmation]}
                id="new-password-confirmation-error"
              />
            </Field>

            <Field>
              <Button isLoading={isSubmitting} size="lg" type="submit">
                Redefinir senha
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ) : null}
    </AuthShell>
  )
}
