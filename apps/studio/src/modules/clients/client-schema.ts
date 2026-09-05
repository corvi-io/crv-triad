import { z } from "zod"
import type { ClientInput } from "./contracts"

const contactMessage = "Informe pelo menos um telefone ou e-mail."

export const clientFormSchema = z
  .object({
    email: z.string().trim().email("Informe um e-mail válido.").or(z.literal("")),
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome do cliente.")
      .max(100, "Use no máximo 100 caracteres no nome."),
    phone: z.string().max(13, "Informe um telefone com no máximo 13 dígitos."),
    preferenceNote: z.string().trim().max(240, "Use no máximo 240 caracteres."),
    professionalPreferenceIds: z.array(z.string()).max(5),
    servicePreferenceIds: z.array(z.string()).max(20),
    servicePreferences: z.array(z.string()),
    tagsText: z.string().max(120, "Use no máximo 120 caracteres nas tags."),
    unitPreferenceIds: z.array(z.string()).max(5),
  })
  .refine(({ email, phone }) => email.length > 0 || phone.length >= 10, {
    message: contactMessage,
    path: ["phone"],
  })

export type ClientFormValues = z.infer<typeof clientFormSchema>

export function createClientFormDefaults(client?: ClientInput): ClientFormValues {
  return {
    email: client?.email ?? "",
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    preferenceNote: client?.preferenceNote ?? "",
    professionalPreferenceIds: [...(client?.professionalPreferenceIds ?? [])],
    servicePreferenceIds: [...(client?.servicePreferenceIds ?? [])],
    servicePreferences: [...(client?.servicePreferences ?? [])],
    tagsText: client?.tags.join(", ") ?? "",
    unitPreferenceIds: [...(client?.unitPreferenceIds ?? [])],
  }
}

export function clientFormValuesToInput(values: ClientFormValues): ClientInput {
  return {
    email: values.email.trim().toLocaleLowerCase("pt-BR"),
    name: values.name.trim(),
    phone: values.phone,
    preferenceNote: values.preferenceNote.trim(),
    professionalPreferenceIds: values.professionalPreferenceIds,
    servicePreferenceIds: values.servicePreferenceIds,
    servicePreferences: values.servicePreferences,
    tags: splitLabels(values.tagsText),
    unitPreferenceIds: values.unitPreferenceIds,
  }
}

export const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, "Escreva uma nota antes de salvar.")
    .max(500, "Use no máximo 500 caracteres na nota."),
})

function splitLabels(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 8)
}
