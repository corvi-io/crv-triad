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
} from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"
import { Separator } from "@/modules/shared/components/ui/separator"

type LoginFormProps = {
  error?: string | null
  isSubmitting: boolean
  onGoogleSignIn: () => void
  onSignIn: (values: LoginCredentialsFormValues) => void
}

export function LoginForm({ error, isSubmitting, onGoogleSignIn, onSignIn }: LoginFormProps) {
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

        <div className="-my-2 flex items-center gap-3 text-sm text-muted-foreground">
          <Separator className="flex-1" />
          <span>ou use e-mail e senha</span>
          <Separator className="flex-1" />
        </div>

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

        <FieldDescription className="text-center">
          Primeiro acesso? Use o link seguro enviado no convite.
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
