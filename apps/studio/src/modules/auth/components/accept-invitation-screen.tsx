import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "@tanstack/react-router"
import { LoaderCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import { AuthFeedback } from "@/modules/auth/components/auth-feedback"
import { AuthShell } from "@/modules/auth/components/auth-shell"
import { PasswordGuidance } from "@/modules/auth/components/password-guidance"
import { PasswordInput } from "@/modules/auth/components/password-input"
import {
  type PasswordResetFormValues,
  passwordResetSchema,
} from "@/modules/auth/schemas/recovery-schema"
import {
  acceptInvitation,
  type InvitationResolution,
  resolveInvitation,
} from "@/modules/auth/services/auth-client"
import { Button, buttonVariants } from "@/modules/shared/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/modules/shared/components/ui/field"

type AcceptInvitationScreenProps = {
  token?: string
}

type ScreenState = InvitationResolution["state"] | "network_error" | "validating"

export function AcceptInvitationScreen({ token }: AcceptInvitationScreenProps) {
  const [invitationToken] = useState(token)
  const [resolution, setResolution] = useState<InvitationResolution | null>(null)
  const navigate = useNavigate()
  const [screenState, setScreenState] = useState<ScreenState>(
    invitationToken ? "validating" : "invalid",
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
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

  useEffect(() => {
    if (!invitationToken || screenState !== "validating") return
    const controller = new AbortController()
    let ignore = false
    setScreenState("validating")
    setSubmitError(null)
    window.history.replaceState(window.history.state, "", "/accept-invitation")

    resolveInvitation(invitationToken, controller.signal)
      .then((result) => {
        if (ignore) return
        setResolution(result)
        setScreenState(result.state)
      })
      .catch((error: unknown) => {
        if (!ignore && !(error instanceof DOMException && error.name === "AbortError")) {
          setScreenState("network_error")
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [invitationToken, screenState])

  async function handleAccept(values: PasswordResetFormValues) {
    if (!invitationToken || isSubmitting || screenState !== "valid") return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await acceptInvitation({ password: values.password, token: invitationToken })
      if ("error" in result) {
        if (result.error === "password_policy") {
          setError(
            "password",
            { message: "Escolha uma senha menos comum ou previsível." },
            { shouldFocus: true },
          )
        } else if (result.error === "invalid_invitation") {
          setScreenState("invalid")
        } else {
          setSubmitError("Não foi possível criar sua senha agora. Tente novamente.")
        }
        return
      }
      await navigate({ replace: true, to: "/overview" })
    } catch {
      setSubmitError("Não foi possível criar sua senha agora. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Criar senha de acesso"
      description="Conclua seu convite para acessar o TRIAD Studio."
    >
      {screenState === "validating" ? (
        <div
          className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
          role="status"
        >
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
          Validando convite
        </div>
      ) : null}

      {screenState === "network_error" ? (
        <div className="space-y-4">
          <AuthFeedback tone="error">
            Não foi possível validar o convite. Confira sua conexão e tente novamente.
          </AuthFeedback>
          <Button className="w-full" onClick={() => setScreenState("validating")} variant="outline">
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {isTerminalState(screenState) ? (
        <div className="space-y-5">
          <AuthFeedback tone="error">{terminalStateCopy[screenState]}</AuthFeedback>
          <Link className={buttonVariants({ className: "w-full", variant: "outline" })} to="/login">
            Voltar para entrar
          </Link>
        </div>
      ) : null}

      {screenState === "valid" ? (
        <form className="space-y-5" noValidate onSubmit={handleSubmit(handleAccept)}>
          <AuthFeedback tone="info">
            Convite válido para o perfil de{" "}
            {resolution?.role === "admin" ? "administrador" : "membro"}.
          </AuthFeedback>
          {submitError ? <AuthFeedback tone="error">{submitError}</AuthFeedback> : null}
          <FieldGroup>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="invitation-password">Nova senha</FieldLabel>
              <PasswordInput
                aria-describedby="invitation-password-guidance invitation-password-error"
                aria-invalid={!!errors.password}
                autoComplete="new-password"
                id="invitation-password"
                {...register("password")}
              />
              <PasswordGuidance
                confirmation={passwordConfirmation}
                id="invitation-password-guidance"
                password={password}
              />
              <FieldError errors={[errors.password]} id="invitation-password-error" />
            </Field>
            <Field data-invalid={!!errors.passwordConfirmation}>
              <FieldLabel htmlFor="invitation-password-confirmation">
                Confirmar nova senha
              </FieldLabel>
              <PasswordInput
                aria-describedby={
                  errors.passwordConfirmation ? "invitation-password-confirmation-error" : undefined
                }
                aria-invalid={!!errors.passwordConfirmation}
                autoComplete="new-password"
                id="invitation-password-confirmation"
                {...register("passwordConfirmation")}
              />
              <FieldError
                errors={[errors.passwordConfirmation]}
                id="invitation-password-confirmation-error"
              />
            </Field>
            <Field>
              <Button isLoading={isSubmitting} size="lg" type="submit">
                Criar senha
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ) : null}
    </AuthShell>
  )
}

const terminalStateCopy = {
  accepted: "Este convite já foi usado. Entre com sua conta ou solicite ajuda.",
  expired: "Este convite expirou. Solicite um novo convite ao responsável pelo acesso.",
  invalid: "Este convite é inválido. Confira a mensagem recebida ou solicite um novo convite.",
  revoked: "Este convite foi revogado. Solicite um novo convite ao responsável pelo acesso.",
  superseded: "Este convite foi substituído. Use a mensagem de convite mais recente.",
} as const

function isTerminalState(state: ScreenState): state is keyof typeof terminalStateCopy {
  return state in terminalStateCopy
}
