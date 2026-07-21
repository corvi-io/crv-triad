import { Navigate } from "@tanstack/react-router"
import { LoaderCircle } from "lucide-react"
import { useState } from "react"

import type { LoginCredentialsFormValues } from "@/modules/auth/schemas/login-schema"
import {
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from "@/modules/auth/services/auth-client"
import { useAuth } from "@/modules/auth/services/auth-provider"

import { LoginForm } from "./login-form"

type LoginScreenProps = {
  error?: "auth" | "session"
}

export function LoginScreen({ error }: LoginScreenProps) {
  const { isPending, session } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

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
    return <Navigate to="/overview" replace />
  }

  async function handleEmailSignIn(values: LoginCredentialsFormValues) {
    if (isSubmitting) return

    setIsSubmitting(true)
    setLocalError(null)
    const result = await signInWithEmail(values)

    if (result?.error) {
      setLocalError("Não foi possível entrar com esse e-mail e senha.")
      setIsSubmitting(false)
    }
  }

  async function handleInviteSignUp(values: LoginCredentialsFormValues) {
    if (isSubmitting) return

    setIsSubmitting(true)
    setLocalError(null)
    const result = await signUpWithEmail({
      email: values.email,
      name: values.email.split("@")[0] || values.email,
      password: values.password,
    })

    if (result?.error) {
      setLocalError("Não foi possível criar o acesso. Confirme se há um convite ativo.")
      setIsSubmitting(false)
    }
  }

  async function handlePasswordReset(email: string) {
    if (!email) {
      setLocalError("Informe o e-mail para solicitar a redefinição de senha.")
      return
    }

    const result = await requestPasswordReset(email)
    if (result?.error) {
      setLocalError("Não foi possível solicitar a redefinição de senha.")
      return
    }

    setLocalError("Se o e-mail estiver cadastrado, enviaremos as instruções de redefinição.")
  }

  const routeError =
    error === "auth"
      ? "O acesso não foi concluído."
      : error === "session"
        ? "Sua sessão não pôde ser validada."
        : null

  return (
    <main
      id="main-content"
      className="grid min-h-svh bg-background text-foreground lg:h-svh lg:overflow-hidden lg:grid-cols-2"
    >
      <section className="flex min-h-svh flex-col p-6 md:p-10 lg:h-svh lg:min-h-0 lg:overflow-hidden">
        <header>
          <a className="flex w-fit items-center gap-2 text-sm font-medium" href="/">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              T
            </span>
            TRIAD Studio
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <LoginForm
            className="w-full max-w-sm"
            error={localError ?? routeError}
            isSubmitting={isSubmitting}
            onForgotPassword={handlePasswordReset}
            onInviteSignUp={handleInviteSignUp}
            onSignIn={handleEmailSignIn}
          />
        </div>
      </section>

      <section
        className="auth-brand-surface relative hidden h-svh overflow-hidden lg:block"
        aria-label="Prévia do TRIAD Studio"
      >
        <img
          src="/placeholder.svg"
          alt="Imagem placeholder"
          className="absolute inset-0 size-full object-cover opacity-15 mix-blend-luminosity"
        />
      </section>
    </main>
  )
}
