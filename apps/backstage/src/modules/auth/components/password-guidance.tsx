import { CheckCircle2Icon, CircleIcon, InfoIcon } from "lucide-react"

import {
  hasDigit,
  hasLowercaseLetter,
  hasMinimumPasswordLength,
  hasSpecialCharacter,
  hasUppercaseLetter,
} from "@/modules/auth/schemas/password-policy"

type PasswordGuidanceProps = {
  confirmation: string
  id: string
  password: string
}

export function PasswordGuidance({ confirmation, id, password }: PasswordGuidanceProps) {
  const minimumMet = hasMinimumPasswordLength(password)
  const confirmationMet = confirmation.length > 0 && confirmation === password

  return (
    <div className="space-y-2 text-sm" id={id}>
      <p className="font-medium text-foreground">Sua nova senha deve:</p>
      <ul className="space-y-1.5" aria-label="Requisitos da nova senha">
        <GuidanceItem met={minimumMet}>Ter pelo menos 8 caracteres</GuidanceItem>
        <GuidanceItem met={hasUppercaseLetter(password)}>Ter uma letra maiúscula</GuidanceItem>
        <GuidanceItem met={hasLowercaseLetter(password)}>Ter uma letra minúscula</GuidanceItem>
        <GuidanceItem met={hasDigit(password)}>Ter um número</GuidanceItem>
        <GuidanceItem met={hasSpecialCharacter(password)}>Ter um caractere especial</GuidanceItem>
        <GuidanceItem met={confirmationMet}>Ser igual nos dois campos</GuidanceItem>
      </ul>
      <p className="flex gap-2 text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Evite senhas comuns ou previsíveis. Espaços são permitidos, mas não contam como caractere
          especial.
        </span>
      </p>
    </div>
  )
}

function GuidanceItem({ children, met }: { children: React.ReactNode; met: boolean }) {
  const Icon = met ? CheckCircle2Icon : CircleIcon
  return (
    <li className="flex gap-2 text-muted-foreground">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">{met ? "Atendido: " : "Pendente: "}</span>
        {children}
      </span>
    </li>
  )
}
