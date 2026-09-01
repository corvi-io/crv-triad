import { Text } from "@react-email/components"

import { AuthEmailLayout, authEmailTextStyle } from "./auth-email-layout.js"

export const invitationEmailSubject = "Seu convite para o TRIAD Studio"
export const verificationEmailSubject = "Confirme seu e-mail no TRIAD"
export const passwordResetEmailSubject = "Redefina sua senha do TRIAD"

export type InvitationEmailTemplateProps = {
  actionUrl: string
  expiresAtLabel: string
}

export function InvitationEmailTemplate({
  actionUrl,
  expiresAtLabel,
}: InvitationEmailTemplateProps) {
  return (
    <AuthEmailLayout
      actionLabel="Aceitar convite"
      actionUrl={actionUrl}
      preview="Aceite o convite e comece a organizar a rotina da barbearia no TRIAD Studio."
      title="A rotina da barbearia começa por aqui."
    >
      <Text style={authEmailTextStyle}>
        Você recebeu um convite para acessar o TRIAD Studio, onde a equipe acompanha agenda,
        atendimento e resultados em um só lugar.
      </Text>
      <Text style={authEmailTextStyle}>
        Aceite o convite até <strong>{expiresAtLabel}</strong> para criar sua senha e entrar.
      </Text>
      <Text style={authEmailTextStyle}>
        Não esperava este convite? Você pode ignorar esta mensagem.
      </Text>
    </AuthEmailLayout>
  )
}

export function VerificationEmailTemplate({ actionUrl }: { actionUrl: string }) {
  return (
    <AuthEmailLayout
      actionLabel="Confirmar e-mail"
      actionUrl={actionUrl}
      preview="Confirme seu e-mail para continuar no TRIAD Studio."
      title="Só falta confirmar seu e-mail."
    >
      <Text style={authEmailTextStyle}>
        Confirme este endereço para continuar usando o TRIAD Studio. Este link fica disponível por 1
        hora.
      </Text>
      <Text style={authEmailTextStyle}>
        Não pediu esta confirmação? Você pode ignorar esta mensagem.
      </Text>
    </AuthEmailLayout>
  )
}

export function PasswordResetEmailTemplate({ actionUrl }: { actionUrl: string }) {
  return (
    <AuthEmailLayout
      actionLabel="Criar nova senha"
      actionUrl={actionUrl}
      preview="Crie uma nova senha para voltar ao TRIAD Studio."
      title="Crie uma nova senha."
    >
      <Text style={authEmailTextStyle}>
        Use o botão abaixo para escolher uma nova senha e voltar ao TRIAD Studio. Este link fica
        disponível por 1 hora.
      </Text>
      <Text style={authEmailTextStyle}>
        Não pediu para trocar sua senha? Ignore esta mensagem. Seu acesso continua protegido.
      </Text>
    </AuthEmailLayout>
  )
}
