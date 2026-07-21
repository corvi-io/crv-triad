import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import {
  type LoginCredentialsFormValues,
  loginCredentialsSchema,
} from "@/modules/auth/schemas/login-schema"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"
import { cn } from "@/modules/shared/lib/utils"

type LoginFormProps = {
  className?: string
  error?: string | null
  isSubmitting: boolean
  onForgotPassword: (email: string) => void
  onInviteSignUp: (values: LoginCredentialsFormValues) => void
  onSignIn: (values: LoginCredentialsFormValues) => void
}

export function LoginForm({
  className,
  error,
  isSubmitting,
  onForgotPassword,
  onInviteSignUp,
  onSignIn,
}: LoginFormProps) {
  const [credentialsError, setCredentialsError] = useState<string | null>(null)
  const {
    formState: { errors },
    getValues,
    handleSubmit,
    register,
  } = useForm<LoginCredentialsFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginCredentialsSchema),
  })

  function handleForgotPassword() {
    setCredentialsError(null)
    onForgotPassword(getValues("email"))
  }

  const visibleError = credentialsError ?? error

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit(onSignIn)}
      noValidate
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Entrar no TRIAD Studio</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Use o e-mail convidado para acessar o TRIAD Studio.
          </p>
        </div>

        {visibleError && (
          <div
            className="flex gap-3 rounded-lg border border-feedback-destructive-border bg-feedback-destructive p-3 text-sm text-feedback-destructive-foreground"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{visibleError}</span>
          </div>
        )}

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="nome@empresa.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email", {
              onChange: () => setCredentialsError(null),
            })}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <button
              className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
              onClick={handleForgotPassword}
            >
              Esqueceu a senha?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password", {
              onChange: () => setCredentialsError(null),
            })}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Field>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} size="lg">
            Entrar
          </Button>
        </Field>

        <FieldSeparator>Primeiro acesso</FieldSeparator>

        <Field>
          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onInviteSignUp)}
            size="lg"
          >
            Criar acesso com convite
          </Button>
          <FieldDescription className="text-center">
            O cadastro só é concluído para e-mails com convite ativo.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
