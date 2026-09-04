import { zodResolver } from "@hookform/resolvers/zod"
import { CameraIcon, MailIcon, Trash2Icon, UserRoundIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { updateDisplayName } from "@/modules/auth/services/auth-client"
import type { AuthSession } from "@/modules/auth/services/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/modules/shared/components/ui/avatar"
import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(80, "Use no máximo 80 caracteres."),
})

type ProfileValues = z.infer<typeof profileSchema>

export function ProfileScreen({
  session,
  onUpdated,
}: {
  session: AuthSession
  onUpdated: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState({
    isLocal: false,
    url: session.user.image ?? null,
  })
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const form = useForm<ProfileValues>({
    defaultValues: { name: session.user.name ?? "" },
    resolver: zodResolver(profileSchema),
  })

  async function submit(values: ProfileValues) {
    try {
      const result = await updateDisplayName(values.name.trim())
      if (result.error) throw new Error("update failed")
      onUpdated()
      toast.success("Nome atualizado.")
    } catch {
      toast.error("Não foi possível atualizar seu nome. Tente novamente.")
    }
  }

  const nameError = form.formState.errors.name?.message
  const initial = (
    session.user.name?.trim()[0] ||
    session.user.email?.trim()[0] ||
    "U"
  ).toUpperCase()

  useEffect(() => {
    if (!avatarPreview.isLocal || !avatarPreview.url) return
    const objectUrl = avatarPreview.url
    return () => URL.revokeObjectURL(objectUrl)
  }, [avatarPreview])

  function previewAvatar(file: File | undefined) {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Escolha uma imagem PNG, JPEG ou WebP.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Escolha uma imagem de até 2 MB.")
      return
    }

    setAvatarError(null)
    setAvatarPreview({ isLocal: true, url: URL.createObjectURL(file) })
  }

  return (
    <form
      className="w-full space-y-5 rounded-xl border bg-card p-5"
      noValidate
      onSubmit={form.handleSubmit(submit)}
    >
      <section className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center">
        <Avatar className="size-20" size="lg">
          {avatarPreview.url ? (
            <AvatarImage alt="Prévia da foto de perfil" src={avatarPreview.url} />
          ) : null}
          <AvatarFallback className="text-xl">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h2 className="font-semibold">Foto de perfil</h2>
            <p className="text-sm text-muted-foreground">PNG, JPEG ou WebP, até 2 MB.</p>
          </div>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              previewAvatar(event.target.files?.[0])
              event.target.value = ""
            }}
            ref={fileInputRef}
            type="file"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <CameraIcon data-icon="inline-start" aria-hidden="true" />
              Escolher imagem
            </Button>
            {avatarPreview.url ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAvatarError(null)
                  setAvatarPreview({ isLocal: false, url: null })
                }}
              >
                <Trash2Icon data-icon="inline-start" aria-hidden="true" />
                Remover
              </Button>
            ) : null}
          </div>
          {avatarError ? (
            <p className="text-sm text-destructive" role="alert">
              {avatarError}
            </p>
          ) : null}
        </div>
      </section>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium" htmlFor="profile-name">
          <UserRoundIcon className="size-4" aria-hidden="true" />
          Nome
        </label>
        <Input
          id="profile-name"
          aria-describedby={nameError ? "profile-name-error" : undefined}
          aria-invalid={!!nameError}
          autoComplete="name"
          {...form.register("name")}
        />
        {nameError ? (
          <p className="text-sm text-destructive" id="profile-name-error">
            {nameError}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium" htmlFor="profile-email">
          <MailIcon className="size-4" aria-hidden="true" />
          E-mail
        </label>
        <Input
          id="profile-email"
          className="cursor-default bg-muted/60 text-muted-foreground shadow-none focus-visible:border-input focus-visible:ring-0 dark:bg-muted/45"
          readOnly
          value={session.user.email ?? "E-mail não informado"}
        />
      </div>
      <div className="flex justify-end">
        <Button isLoading={form.formState.isSubmitting} type="submit">
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}
