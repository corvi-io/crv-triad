import { Text } from "@react-email/components"

import type { IdpRole } from "../access-policy.js"
import { AuthEmailLayout, authEmailTextStyle } from "./auth-email-layout.js"

export const invitationEmailSubject = "Seu convite para acessar o TRIAD"
export const verificationEmailSubject = "Confirme seu e-mail no TRIAD"
export const passwordResetEmailSubject = "Redefina sua senha do TRIAD"

export type InvitationEmailTemplateProps = {
  actionUrl: string
  expiresAtLabel: string
  invitationRole: IdpRole
}

export function InvitationEmailTemplate({
  actionUrl,
  expiresAtLabel,
  invitationRole,
}: InvitationEmailTemplateProps) {
  const roleLabel = invitationRole === "admin" ? "administrador" : "membro"
  return (
    <AuthEmailLayout
      actionLabel="Criar minha senha"
      actionUrl={actionUrl}
      preview="Use este convite para criar sua senha e acessar o TRIAD."
      title="Você recebeu um convite"
    >
      <Text style={authEmailTextStyle}>Use o link abaixo para criar sua senha de acesso.</Text>
      <Text style={authEmailTextStyle}>
        Perfil de acesso: <strong>{roleLabel}</strong>.
      </Text>
      <Text style={authEmailTextStyle}>
        Este convite expira em <strong>{expiresAtLabel}</strong> e só pode ser usado uma vez.
      </Text>
      <Text style={authEmailTextStyle}>
        Se você não esperava este convite, ignore esta mensagem e avise o responsável pelo acesso.
      </Text>
    </AuthEmailLayout>
  )
}

export function VerificationEmailTemplate({ actionUrl }: { actionUrl: string }) {
  return (
    <AuthEmailLayout
      actionLabel="Confirmar meu e-mail"
      actionUrl={actionUrl}
      preview="Confirme seu e-mail para continuar usando o TRIAD."
      title="Confirme seu e-mail"
    >
      <Text style={authEmailTextStyle}>
        Confirme que este endereço de e-mail pertence a você. O link expira em 1 hora.
      </Text>
      <Text style={authEmailTextStyle}>
        Se você não solicitou esta confirmação, ignore esta mensagem.
      </Text>
    </AuthEmailLayout>
  )
}

export function PasswordResetEmailTemplate({ actionUrl }: { actionUrl: string }) {
  return (
    <AuthEmailLayout
      actionLabel="Redefinir minha senha"
      actionUrl={actionUrl}
      preview="Use este link para redefinir sua senha do TRIAD."
      title="Redefina sua senha"
    >
      <Text style={authEmailTextStyle}>
        Recebemos uma solicitação para redefinir sua senha. O link expira em 1 hora e só pode ser
        usado uma vez.
      </Text>
      <Text style={authEmailTextStyle}>
        Se você não solicitou esta alteração, ignore esta mensagem. Sua senha atual continuará
        válida.
      </Text>
    </AuthEmailLayout>
  )
}
