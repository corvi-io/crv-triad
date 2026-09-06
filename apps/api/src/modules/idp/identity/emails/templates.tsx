import { Img, Text } from "@react-email/components"
import type { InvitationDisplayContext } from "../invitation-display-context.js"
import { AuthEmailLayout, authEmailTextStyle } from "./auth-email-layout.js"

export const invitationEmailSubject = "Seu convite para o TRIAD Studio"
export const verificationEmailSubject = "Confirme seu e-mail no TRIAD"
export const passwordResetEmailSubject = "Redefina sua senha do TRIAD"

export type InvitationEmailTemplateProps = {
  actionUrl: string
  expiresAtLabel: string
  context?: InvitationDisplayContext | null
}

export function InvitationEmailTemplate({
  actionUrl,
  expiresAtLabel,
  context,
}: InvitationEmailTemplateProps) {
  return (
    <AuthEmailLayout
      actionLabel="Aceitar convite"
      actionUrl={actionUrl}
      preview={
        context
          ? `Aceite o convite para ${context.organizationName} no TRIAD Studio.`
          : "Aceite o convite e comece a organizar a rotina da barbearia no TRIAD Studio."
      }
      title={
        context
          ? `Você foi convidado para ${context.organizationName}.`
          : "A rotina da barbearia começa por aqui."
      }
    >
      {context?.logoDataUrl ? (
        <Img
          alt={`Logo de ${context.organizationName}`}
          height="64"
          src={context.logoDataUrl}
          style={{ borderRadius: "32px", margin: "0 0 20px", objectFit: "cover" }}
          width="64"
        />
      ) : null}
      <Text style={authEmailTextStyle}>
        {context
          ? `Confirme o acesso à barbearia ${context.organizationName}${context.professionalRole ? ` como ${context.professionalRole}` : ""}.`
          : "Você recebeu um convite para acessar o TRIAD Studio, onde a equipe acompanha agenda, atendimento e resultados em um só lugar."}
      </Text>
      {context?.unitNames?.length ? (
        <Text style={authEmailTextStyle}>Unidades: {context.unitNames.join(", ")}.</Text>
      ) : null}
      {context?.inviterName ? (
        <Text style={authEmailTextStyle}>Convite enviado por {context.inviterName}.</Text>
      ) : null}
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
