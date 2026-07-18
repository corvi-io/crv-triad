import { zodResolver } from "@hookform/resolvers/zod"
import {
  BadgeIcon,
  Building2Icon,
  HashIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  TextCursorInputIcon,
  UserRoundIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { type Control, useController, useForm } from "react-hook-form"
import { z } from "zod"

import type { ComboboxInputOption } from "@/modules/shared/components/combobox-input"
import {
  CompactFormField,
  CompactFormGroup,
  CompactFormSwitchStack,
  FormSection,
} from "@/modules/shared/components/form-layout"
import { ReferenceCreationPage } from "@/modules/shared/components/reference-creation-page"
import { ReferenceFormDrawer } from "@/modules/shared/components/reference-form-drawer"
import {
  CompactRhfMaskedField,
  CompactRhfSelectField,
  CompactRhfSwitchField,
  CompactRhfTextareaField,
  CompactRhfTextField,
} from "@/modules/shared/components/rhf-form-fields"
import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import { optionalEmail, optionalText, requiredText } from "@/modules/shared/lib/form-schema"

export const collaboratorSchema = z.object({
  name: requiredText,
  email: optionalEmail,
  phone: optionalText,
  username: requiredText,
  password: requiredText.min(12, "A senha deve ter pelo menos 12 caracteres."),
  company: requiredText,
  profile: requiredText,
  receivesNotifications: z.boolean(),
  isActive: z.boolean(),
  changePasswordOnFirstAccess: z.boolean(),
  notes: optionalText,
})

export type CollaboratorFormValues = z.infer<typeof collaboratorSchema>
export type CollaboratorSubmitIntent = "save-and-add-another" | "save-collaborator"

export function getCollaboratorDefaultValues(): CollaboratorFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    company: "",
    profile: "",
    receivesNotifications: true,
    isActive: true,
    changePasswordOnFirstAccess: true,
    notes: "",
  }
}

export function CollaboratorCreationScreen({
  companyOptions = [],
  profileOptions = [],
}: {
  companyOptions?: readonly ComboboxInputOption[]
  profileOptions?: readonly ComboboxInputOption[]
} = {}) {
  return (
    <ReferenceCreationPage
      actionLabel="Novo colaborador"
      description="Gerencie dados de acesso, empresa e configurações dos colaboradores."
      title="Colaboradores"
    >
      {({ isOpen, onOpenChange }) => (
        <CollaboratorCreationDrawer
          companyOptions={companyOptions}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          profileOptions={profileOptions}
        />
      )}
    </ReferenceCreationPage>
  )
}

export function CollaboratorCreationDrawer({
  companyOptions = [],
  isOpen,
  onReview,
  onOpenChange,
  profileOptions = [],
}: {
  companyOptions?: readonly ComboboxInputOption[]
  isOpen: boolean
  onReview?: (values: CollaboratorFormValues, intent: CollaboratorSubmitIntent) => void
  onOpenChange: (open: boolean) => void
  profileOptions?: readonly ComboboxInputOption[]
}) {
  const {
    control,
    formState: { isDirty },
    handleSubmit,
    reset,
    setFocus,
  } = useForm<CollaboratorFormValues>({
    defaultValues: getCollaboratorDefaultValues(),
    resolver: zodResolver(collaboratorSchema),
  })

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("name"))
  }, [isOpen, setFocus])

  function discard() {
    reset(getCollaboratorDefaultValues())
  }

  return (
    <ReferenceFormDrawer
      bodyClassName="px-4 py-4 sm:px-6"
      context="Novo"
      isDirty={isDirty}
      isOpen={isOpen}
      onDiscard={discard}
      onOpenChange={onOpenChange}
      primaryAction={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            form="collaborator-reference-form"
            name="collaboratorSubmitIntent"
            size="form"
            type="submit"
            value="save-and-add-another"
            variant="secondary"
          >
            Salvar e adicionar outro
          </Button>
          <Button
            form="collaborator-reference-form"
            name="collaboratorSubmitIntent"
            size="form"
            type="submit"
            value="save-collaborator"
          >
            Salvar colaborador
          </Button>
        </div>
      }
      secondaryAction={(requestClose) => (
        <Button size="form" type="button" variant="outline" onClick={requestClose}>
          Cancelar
        </Button>
      )}
      title="Colaborador"
    >
      <form
        id="collaborator-reference-form"
        noValidate
        className="space-y-6"
        onSubmit={handleSubmit((values, event) => {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)
            ?.submitter as HTMLButtonElement | null
          const intent: CollaboratorSubmitIntent =
            submitter?.value === "save-and-add-another"
              ? "save-and-add-another"
              : "save-collaborator"
          onReview?.(values, intent)
        })}
      >
        <FormSection title="Identificação">
          <CompactRhfTextField
            autoComplete="name"
            control={control}
            id="collaborator-name"
            icon={TextCursorInputIcon}
            label="Nome"
            name="name"
            placeholder="Insira o nome do colaborador"
            required
          />
          <CompactRhfTextField
            autoComplete="email"
            control={control}
            id="collaborator-email"
            icon={MailIcon}
            label="E-mail"
            name="email"
            placeholder="email@empresa.com.br"
            type="email"
          />
          <CompactRhfMaskedField
            control={control}
            id="collaborator-phone"
            icon={PhoneIcon}
            label="Telefone"
            mask="brPhone"
            name="phone"
            placeholder="(00) 00000-0000"
          />
        </FormSection>
        <FormSection title="Acesso">
          <CompactRhfTextField
            autoComplete="username"
            control={control}
            id="collaborator-username"
            icon={UserRoundIcon}
            label="Usuário"
            name="username"
            placeholder="Insira o nome do usuário"
            required
          />
          <CollaboratorPasswordField control={control} />
        </FormSection>
        <FormSection title="Empresa">
          <CompactRhfSelectField
            control={control}
            id="collaborator-company"
            icon={Building2Icon}
            label="Empresa"
            name="company"
            options={companyOptions}
            placeholder="Selecione a empresa"
            required
          />
          <CompactRhfSelectField
            control={control}
            id="collaborator-profile"
            icon={BadgeIcon}
            label="Perfil"
            name="profile"
            options={profileOptions}
            placeholder="Selecione o tipo de perfil"
            required
          />
        </FormSection>
        <FormSection title="Configurações">
          <CompactFormGroup icon={HashIcon} label="Parâmetros">
            <CompactFormSwitchStack label="Parâmetros">
              <CompactRhfSwitchField
                control={control}
                label="Recebe notificações"
                name="receivesNotifications"
              />
              <CompactRhfSwitchField control={control} label="Usuário ativo" name="isActive" />
              <CompactRhfSwitchField
                control={control}
                label="Alterar senha no primeiro acesso"
                name="changePasswordOnFirstAccess"
              />
            </CompactFormSwitchStack>
          </CompactFormGroup>
        </FormSection>
        <FormSection title="Observações">
          <CompactRhfTextareaField
            control={control}
            id="collaborator-notes"
            label="Observações"
            name="notes"
            placeholder="Insira as observações necessárias"
          />
        </FormSection>
      </form>
    </ReferenceFormDrawer>
  )
}

function CollaboratorPasswordField({ control }: { control: Control<CollaboratorFormValues> }) {
  const { field, fieldState } = useController({ control, name: "password" })
  const error = fieldState.error?.message
  const [generationStatus, setGenerationStatus] = useState("")

  function generatePassword() {
    field.onChange(generateSecurePassword())
    setGenerationStatus("")
    requestAnimationFrame(() => setGenerationStatus("Senha segura gerada."))
  }

  return (
    <CompactFormField
      id="collaborator-password"
      icon={LockIcon}
      label="Senha"
      required
      error={error}
    >
      <div className="relative">
        <Input
          {...field}
          aria-describedby={error ? "collaborator-password-error" : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="new-password"
          className="h-8 rounded-sm py-1 pr-[81px] pl-2"
          id="collaborator-password"
          placeholder="Insira a senha"
          required
          type="password"
          value={String(field.value ?? "")}
        />
        <Button
          aria-label="Gerar senha segura"
          className="absolute top-1/2 right-0.5 h-6 w-[73px] -translate-y-1/2 border-transparent bg-transparent p-0 text-[#3b82f6] hover:bg-transparent hover:text-[#3b82f6] dark:border-transparent dark:bg-transparent dark:text-[#3b82f6] dark:hover:bg-transparent dark:hover:text-[#3b82f6]"
          size="xs"
          type="button"
          variant="outline"
          onClick={generatePassword}
        >
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-[69px] items-center justify-center rounded-[4px] border border-[#3b82f6] px-1.5 py-1 text-[10px] leading-3 font-medium text-[#3b82f6]"
            data-slot="password-generator-frame"
          >
            Gerar senha
          </span>
        </Button>
      </div>
      <p aria-atomic="true" className="sr-only" role="status">
        {generationStatus}
      </p>
    </CompactFormField>
  )
}

export function generateSecurePassword(length = 20) {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%&*+-_=",
  ] as const
  const alphabet = groups.join("")
  const characters = groups.map((group) => secureRandomCharacter(group))
  while (characters.length < Math.max(12, length)) {
    characters.push(secureRandomCharacter(alphabet))
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1)
    ;[characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]]
  }
  return characters.join("")
}

function secureRandomCharacter(alphabet: string) {
  return alphabet[secureRandomIndex(alphabet.length)] ?? ""
}

function secureRandomIndex(maxExclusive: number) {
  const rejectionLimit = Math.floor(256 / maxExclusive) * maxExclusive
  const randomByte = new Uint8Array(1)
  do {
    crypto.getRandomValues(randomByte)
  } while ((randomByte[0] ?? 0) >= rejectionLimit)
  return (randomByte[0] ?? 0) % maxExclusive
}
