import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { AuthFeedback } from "@/modules/auth/components/auth-feedback"
import { PasswordInput } from "@/modules/auth/components/password-input"
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

type LoginFormProps = {
  error?: string | null
  isSubmitting: boolean
  onGoogleSignIn: () => void
  onInviteSignUp: (values: LoginCredentialsFormValues) => void
  onSignIn: (values: LoginCredentialsFormValues) => void
}

export function LoginForm({
  error,
  isSubmitting,
  onGoogleSignIn,
  onInviteSignUp,
  onSignIn,
}: LoginFormProps) {
  const [credentialsError, setCredentialsError] = useState<string | null>(null)
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginCredentialsFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginCredentialsSchema),
  })

  const visibleError = credentialsError ?? error

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSignIn)} noValidate>
      <FieldGroup>
        {visibleError ? <AuthFeedback tone="error">{visibleError}</AuthFeedback> : null}

        <Field>
          <Button
            disabled={isSubmitting}
            onClick={onGoogleSignIn}
            size="lg"
            type="button"
            variant="outline"
          >
            <span aria-hidden="true" className="font-semibold">
              G
            </span>
            Continuar com Google
          </Button>
        </Field>

        <FieldSeparator>ou use e-mail e senha</FieldSeparator>

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
            <Link
              className="ml-auto min-h-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              to="/forgot-password"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <PasswordInput
            id="password"
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

        <FieldSeparator>primeiro acesso</FieldSeparator>

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
