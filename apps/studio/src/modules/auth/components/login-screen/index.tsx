import { Navigate } from "@tanstack/react-router"
import { LoaderCircle } from "lucide-react"
import { useState } from "react"

import { AuthFeedback } from "@/modules/auth/components/auth-feedback"
import { AuthShell } from "@/modules/auth/components/auth-shell"
import type { LoginCredentialsFormValues } from "@/modules/auth/schemas/login-schema"
import {
  resendVerificationEmail,
  signInWithEmail,
  signInWithGoogle,
} from "@/modules/auth/services/auth-client"
import { useAuth } from "@/modules/auth/services/auth-provider"
import { Button } from "@/modules/shared/components/ui/button"

import { LoginForm } from "./login-form"

type LoginScreenProps = {
  error?: "auth" | "provider" | "session" | "verification_expired" | "verification_invalid"
  verified?: true
  invitationToken?: string
}

export function LoginScreen({ error, invitationToken, verified }: LoginScreenProps) {
  const { isPending, session } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<string | null>(null)

  if (isPending) {
    return (
      <main
        id="main-content"
        className="grid min-h-svh place-items-center bg-background px-5 py-10 text-foreground"
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Verificando acesso...
        </div>
      </main>
    )
  }

  if (session) {
    return invitationToken ? (
      <Navigate to="/accept-invitation" search={{ token: invitationToken }} replace />
    ) : (
      <Navigate to="/overview" replace />
    )
  }

  async function handleEmailSignIn(values: LoginCredentialsFormValues) {
    if (isSubmitting) return

    setIsSubmitting(true)
    setLocalError(null)
    try {
      const result = await signInWithEmail(values)

      if (result?.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          setVerificationEmail(values.email)
        } else {
          setLocalError("Não foi possível entrar com esse e-mail e senha.")
        }
      }
    } catch {
      setLocalError("Não foi possível entrar agora. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    if (isSubmitting) return

    setIsSubmitting(true)
    setLocalError(null)
    try {
      const result = await signInWithGoogle()
      if (result?.error) {
        setLocalError("Não foi possível continuar com o Google. Tente novamente.")
      }
    } catch {
      setLocalError("Não foi possível continuar com o Google. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerificationResend() {
    if (!verificationEmail || isResending) return

    setIsResending(true)
    setResendStatus(null)
    try {
      const result = await resendVerificationEmail(verificationEmail)
      setResendStatus(
        result?.error
          ? "Não foi possível solicitar uma nova mensagem. Tente novamente."
          : "Se o endereço estiver elegível, enviaremos uma nova mensagem de verificação.",
      )
    } catch {
      setResendStatus("Não foi possível solicitar uma nova mensagem. Tente novamente.")
    } finally {
      setIsResending(false)
    }
  }

  const routeError =
    error === "auth"
      ? "O acesso não foi concluído."
      : error === "session"
        ? "Sua sessão não pôde ser validada."
        : error === "verification_invalid"
          ? "O link de verificação é inválido ou já foi usado. Solicite uma nova verificação."
          : error === "verification_expired"
            ? "O link de verificação expirou. Solicite uma nova verificação."
            : error === "provider"
              ? "O acesso com o Google não foi concluído. Tente novamente."
              : null

  return (
    <AuthShell
      title="Bem-vindo de volta"
      description="Use o e-mail convidado para acessar sua conta."
    >
      {verified && !error ? (
        <AuthFeedback tone="success">E-mail confirmado. Você já pode entrar.</AuthFeedback>
      ) : null}
      {verificationEmail ? (
        <div className="space-y-3">
          <AuthFeedback tone="info">
            Verifique sua caixa de entrada antes de entrar. O acesso só será liberado após a
            confirmação do e-mail.
          </AuthFeedback>
          <Button
            className="w-full"
            isLoading={isResending}
            onClick={handleVerificationResend}
            type="button"
            variant="outline"
          >
            Reenviar verificação
          </Button>
          {resendStatus ? (
            <p className="text-sm text-muted-foreground" role="status">
              {resendStatus}
            </p>
          ) : null}
        </div>
      ) : null}
      <LoginForm
        error={localError ?? routeError}
        isSubmitting={isSubmitting}
        onGoogleSignIn={handleGoogleSignIn}
        onSignIn={handleEmailSignIn}
      />
    </AuthShell>
  )
}
