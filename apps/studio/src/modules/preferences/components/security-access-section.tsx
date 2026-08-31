import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRoundIcon, LinkIcon, UnlinkIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { PasswordGuidance } from "@/modules/auth/components/password-guidance"
import { PasswordInput } from "@/modules/auth/components/password-input"
import {
  changePassword,
  linkGoogle,
  listAccounts,
  requestPasswordReset,
  unlinkGoogle,
} from "@/modules/auth/services/auth-client"
import { useAuth } from "@/modules/auth/services/auth-provider"
import {
  type ChangePasswordFormValues,
  changePasswordSchema,
} from "@/modules/preferences/schemas/change-password-schema"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/modules/shared/components/ui/field"

const accountsQueryKey = ["auth", "accounts"] as const

type SecurityAccessSectionProps = {
  googleResult?: "connected" | "error"
}

export function SecurityAccessSection({ googleResult }: SecurityAccessSectionProps) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [actionMessage, setActionMessage] = useState<{
    text: string
    tone: "error" | "success"
  } | null>(null)
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    setFocus,
    watch,
  } = useForm<ChangePasswordFormValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirmation: "",
    },
    resolver: zodResolver(changePasswordSchema),
  })
  const newPassword = watch("newPassword")
  const newPasswordConfirmation = watch("newPasswordConfirmation")

  const accountsQuery = useQuery({
    queryKey: accountsQueryKey,
    queryFn: async () => {
      const response = await listAccounts()
      if (response.error) throw new Error("Account methods unavailable.")
      return response.data ?? []
    },
  })
  const linkMutation = useMutation({
    mutationFn: async () => {
      const response = await linkGoogle()
      if (response.error) throw new Error("Google linking unavailable.")
    },
    onError: () => {
      setActionMessage({
        text: "Não foi possível conectar o Google. Tente novamente.",
        tone: "error",
      })
    },
  })
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const response = await unlinkGoogle()
      if (response.error) throw new Error("Google unlinking unavailable.")
    },
    onError: () => {
      setActionMessage({
        text: "Não foi possível desconectar o Google. Atualize a página e tente novamente.",
        tone: "error",
      })
    },
    onSuccess: async () => {
      setActionMessage({ text: "Google desconectado com sucesso.", tone: "success" })
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey })
    },
  })
  const passwordMutation = useMutation({
    mutationFn: async (values: ChangePasswordFormValues) => {
      const response = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      if (response.error?.code === "PASSWORD_POLICY_REJECTED") {
        throw new Error("password_policy")
      }
      if (response.error) throw new Error("password_change_unavailable")
    },
    onError: (error) => {
      if (error.message === "password_policy") {
        setError("newPassword", {
          message: "Escolha uma senha menos comum ou previsível.",
          type: "server",
        })
        setFocus("newPassword")
        return
      }
      setActionMessage({
        text: "Não foi possível alterar a senha. Confira a senha atual e tente novamente.",
        tone: "error",
      })
    },
    onSuccess: () => {
      reset()
      setActionMessage({
        text: "Senha alterada. As outras sessões foram encerradas.",
        tone: "success",
      })
    },
  })
  const recoveryMutation = useMutation({
    mutationFn: async () => {
      const email = session?.user.email
      if (!email) throw new Error("Session email unavailable.")
      const response = await requestPasswordReset(email)
      if (response.error) throw new Error("Password recovery unavailable.")
    },
    onError: () => {
      setActionMessage({
        text: "Não foi possível solicitar a criação de senha. Tente novamente.",
        tone: "error",
      })
    },
    onSuccess: () => {
      setActionMessage({
        text: "Se a conta estiver elegível, enviaremos as instruções para criar uma senha.",
        tone: "success",
      })
    },
  })

  const accounts = accountsQuery.data ?? []
  const hasCredential = accounts.some((account) => account.providerId === "credential")
  const hasGoogle = accounts.some((account) => account.providerId === "google")
  const canUnlinkGoogle = hasGoogle && hasCredential
  const callbackMessage =
    googleResult === "error"
      ? { text: "Não foi possível conectar o Google. Tente novamente.", tone: "error" as const }
      : googleResult === "connected" && accountsQuery.isSuccess
        ? hasGoogle
          ? { text: "Google conectado com sucesso.", tone: "success" as const }
          : {
              text: "Não foi possível confirmar a conexão com o Google. Atualize a página e tente novamente.",
              tone: "error" as const,
            }
        : googleResult === "connected" && accountsQuery.isError
          ? {
              text: "Não foi possível confirmar a conexão com o Google. Atualize a página e tente novamente.",
              tone: "error" as const,
            }
          : null
  const visibleMessage = actionMessage ?? callbackMessage

  return (
    <section
      aria-labelledby="security-access-heading"
      className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold" id="security-access-heading">
          Segurança e acesso
        </h2>
        <p className="text-sm text-muted-foreground">
          Consulte e gerencie os métodos usados para entrar na sua conta.
        </p>
      </div>

      {visibleMessage ? (
        <p
          className={
            visibleMessage.tone === "error"
              ? "mt-4 text-sm text-feedback-destructive-foreground"
              : "mt-4 text-sm text-feedback-success-foreground"
          }
          role={visibleMessage.tone === "error" ? "alert" : "status"}
        >
          {visibleMessage.text}
        </p>
      ) : null}

      {accountsQuery.isPending ? (
        <p className="mt-5 text-sm text-muted-foreground" role="status">
          Carregando métodos de acesso...
        </p>
      ) : null}

      {accountsQuery.isError ? (
        <div className="mt-5 space-y-3" role="alert">
          <p className="text-sm text-feedback-destructive-foreground">
            Não foi possível carregar os métodos de acesso.
          </p>
          <Button onClick={() => accountsQuery.refetch()} type="button" variant="outline">
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {accountsQuery.isSuccess ? (
        <div className="mt-5 space-y-4">
          <ul className="divide-y rounded-lg border" aria-label="Métodos de acesso">
            <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">E-mail e senha</span>
                  <StatusBadge tone={hasCredential ? "success" : "neutral"}>
                    {hasCredential ? "Conectado" : "Não configurado"}
                  </StatusBadge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasCredential
                    ? "Use sua senha atual para fazer alterações."
                    : "Crie uma senha por um link enviado ao seu e-mail verificado."}
                </p>
              </div>
              {!hasCredential ? (
                <Button
                  isLoading={recoveryMutation.isPending}
                  onClick={() => recoveryMutation.mutate()}
                  type="button"
                  variant="outline"
                >
                  <KeyRoundIcon aria-hidden="true" />
                  Criar senha
                </Button>
              ) : null}
            </li>

            <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Google</span>
                  <StatusBadge tone={hasGoogle ? "success" : "neutral"}>
                    {hasGoogle ? "Conectado" : "Disponível"}
                  </StatusBadge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasGoogle
                    ? "Entre com a conta Google que usa o mesmo e-mail verificado."
                    : "Conecte uma conta Google com o mesmo e-mail da sua conta TRIAD."}
                </p>
                {hasGoogle && !canUnlinkGoogle ? (
                  <p className="text-sm text-muted-foreground">
                    Crie uma senha antes de desconectar seu único método de acesso.
                  </p>
                ) : null}
              </div>
              {hasGoogle ? (
                <Button
                  disabled={!canUnlinkGoogle}
                  isLoading={unlinkMutation.isPending}
                  onClick={() => unlinkMutation.mutate()}
                  type="button"
                  variant="outline"
                >
                  <UnlinkIcon aria-hidden="true" />
                  Desconectar Google
                </Button>
              ) : (
                <Button
                  isLoading={linkMutation.isPending}
                  onClick={() => linkMutation.mutate()}
                  type="button"
                  variant="outline"
                >
                  <LinkIcon aria-hidden="true" />
                  Conectar Google
                </Button>
              )}
            </li>
          </ul>

          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground" role="status">
              Nenhum método de acesso pôde ser exibido. Atualize a página.
            </p>
          ) : null}

          {hasCredential ? (
            <form
              className="space-y-4 rounded-lg border p-4"
              noValidate
              onSubmit={handleSubmit((values) => passwordMutation.mutate(values))}
            >
              <div>
                <h3 className="font-medium">Alterar senha</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A senha atual confirma esta alteração. As outras sessões serão encerradas.
                </p>
              </div>
              <FieldGroup>
                <Field data-invalid={!!errors.currentPassword}>
                  <FieldLabel htmlFor="current-password">Senha atual</FieldLabel>
                  <PasswordInput
                    aria-describedby={errors.currentPassword ? "current-password-error" : undefined}
                    aria-invalid={!!errors.currentPassword}
                    autoComplete="current-password"
                    id="current-password"
                    {...register("currentPassword")}
                  />
                  <FieldError errors={[errors.currentPassword]} id="current-password-error" />
                </Field>
                <Field data-invalid={!!errors.newPassword}>
                  <FieldLabel htmlFor="preference-new-password">Nova senha</FieldLabel>
                  <PasswordInput
                    aria-describedby="preference-new-password-guidance preference-new-password-error"
                    aria-invalid={!!errors.newPassword}
                    autoComplete="new-password"
                    id="preference-new-password"
                    {...register("newPassword")}
                  />
                  <PasswordGuidance
                    confirmation={newPasswordConfirmation}
                    id="preference-new-password-guidance"
                    password={newPassword}
                  />
                  <FieldError errors={[errors.newPassword]} id="preference-new-password-error" />
                </Field>
                <Field data-invalid={!!errors.newPasswordConfirmation}>
                  <FieldLabel htmlFor="preference-new-password-confirmation">
                    Confirmar nova senha
                  </FieldLabel>
                  <PasswordInput
                    aria-describedby={
                      errors.newPasswordConfirmation
                        ? "preference-new-password-confirmation-error"
                        : undefined
                    }
                    aria-invalid={!!errors.newPasswordConfirmation}
                    autoComplete="new-password"
                    id="preference-new-password-confirmation"
                    {...register("newPasswordConfirmation")}
                  />
                  <FieldError
                    errors={[errors.newPasswordConfirmation]}
                    id="preference-new-password-confirmation-error"
                  />
                </Field>
                <Field>
                  <Button isLoading={passwordMutation.isPending} type="submit">
                    Alterar senha
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
