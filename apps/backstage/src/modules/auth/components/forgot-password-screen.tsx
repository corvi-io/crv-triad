import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { AuthFeedback } from "@/modules/auth/components/auth-feedback"
import { AuthShell } from "@/modules/auth/components/auth-shell"
import {
  type EmailRecoveryFormValues,
  emailRecoverySchema,
} from "@/modules/auth/schemas/recovery-schema"
import { requestPasswordReset } from "@/modules/auth/services/auth-client"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"

export function ForgotPasswordScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestState, setRequestState] = useState<"error" | "sent" | null>(null)
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<EmailRecoveryFormValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(emailRecoverySchema),
  })

  async function handleRequest(values: EmailRecoveryFormValues) {
    if (isSubmitting) return

    setIsSubmitting(true)
    setRequestState(null)
    try {
      const result = await requestPasswordReset(values.email)
      setRequestState(result?.error ? "error" : "sent")
    } catch {
      setRequestState("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Redefinir senha"
      description="Informe seu e-mail para receber as instruções de redefinição."
    >
      {requestState === "sent" ? (
        <AuthFeedback tone="success">
          Se houver uma conta elegível para esse endereço, enviaremos as instruções por e-mail.
        </AuthFeedback>
      ) : null}
      {requestState === "error" ? (
        <AuthFeedback tone="error">
          Não foi possível concluir a solicitação. Tente novamente.
        </AuthFeedback>
      ) : null}

      <form className="space-y-5" noValidate onSubmit={handleSubmit(handleRequest)}>
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="recovery-email">E-mail</FieldLabel>
            <Input
              aria-describedby={errors.email ? "recovery-email-error" : undefined}
              aria-invalid={!!errors.email}
              autoComplete="email"
              id="recovery-email"
              placeholder="nome@empresa.com"
              type="email"
              {...register("email")}
            />
            <FieldError errors={[errors.email]} id="recovery-email-error" />
          </Field>
          <Field>
            <Button isLoading={isSubmitting} size="lg" type="submit">
              Enviar instruções
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          className="min-h-6 underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          to="/login"
        >
          Voltar para entrar
        </Link>
      </p>
    </AuthShell>
  )
}
