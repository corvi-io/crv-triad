import { z } from "zod"
import type { WalkInInput } from "./contracts"

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export const walkInFormSchema = z
  .object({
    arrivalTime: z
      .string()
      .min(1, "Informe o horário de chegada.")
      .regex(timePattern, "Informe um horário válido entre 00:00 e 23:59."),
    identityKind: z.enum(["client", "guest"]),
    clientId: z.string(),
    customerName: z.string().trim().max(100, "Use no máximo 100 caracteres no nome."),
    customerPhone: z
      .string()
      .max(13, "Informe um telefone com no máximo 13 dígitos.")
      .refine(
        (value) => value.length === 0 || value.length >= 10,
        "Informe um telefone com 10 ou 11 dígitos.",
      ),
    notes: z.string().trim().max(300, "Use no máximo 300 caracteres nas observações."),
    preferenceKind: z.enum(["specific", "first-available"], {
      error: "Escolha uma preferência de profissional.",
    }),
    priority: z.enum(["normal", "fit-in"], { error: "Escolha a prioridade." }),
    professionalId: z.string(),
    serviceId: z.string().min(1, "Escolha um serviço."),
  })
  .superRefine((values, context) => {
    if (values.identityKind === "client" && !values.clientId) {
      context.addIssue({
        code: "custom",
        message: "Escolha um cliente cadastrado.",
        path: ["clientId"],
      })
    }
    if (values.identityKind === "guest" && values.customerName.trim().length < 2) {
      context.addIssue({
        code: "custom",
        message: "Informe o nome do cliente com pelo menos 2 caracteres.",
        path: ["customerName"],
      })
    }
    if (values.preferenceKind === "specific" && !values.professionalId) {
      context.addIssue({
        code: "custom",
        message: "Escolha o profissional específico.",
        path: ["professionalId"],
      })
    }
  })

export type WalkInFormValues = z.infer<typeof walkInFormSchema>

function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  }
}

function toInstant(date: string, time: string, timezone: string) {
  const naive = Date.parse(`${date}T${time}:00Z`)
  const offsets = new Set<number>()
  for (let hour = -48; hour <= 48; hour += 6) {
    const sample = naive + hour * 3_600_000
    const parts = localParts(new Date(sample), timezone)
    offsets.add(Date.parse(`${parts.date}T${parts.time}:00Z`) - sample)
  }
  const matches = [...offsets]
    .map((offset) => new Date(naive - offset))
    .filter((instant) => {
      const parts = localParts(instant, timezone)
      return parts.date === date && parts.time === time
    })
  if (matches.length !== 1) throw new Error("Horário de chegada inválido para o fuso da unidade.")
  return matches[0]
}

export function createWalkInFormDefaults(now: Date, timezone = "UTC"): WalkInFormValues {
  const parts = localParts(now, timezone)
  return {
    arrivalTime: parts.time,
    identityKind: "guest",
    clientId: "",
    customerName: "",
    customerPhone: "",
    notes: "",
    preferenceKind: "first-available",
    priority: "normal",
    professionalId: "",
    serviceId: "",
  }
}

export function walkInFormValuesToInput(
  values: WalkInFormValues,
  now: Date,
  unitId: string,
  timezone = "UTC",
): WalkInInput {
  const [hours, minutes] = values.arrivalTime.split(":").map(Number)
  const arrival = toInstant(
    localParts(now, timezone).date,
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    timezone,
  )
  return {
    arrivalAt: arrival.toISOString(),
    clientId: values.identityKind === "client" ? values.clientId : undefined,
    customerName: values.identityKind === "guest" ? values.customerName.trim() : undefined,
    customerPhone: values.identityKind === "guest" ? values.customerPhone || undefined : undefined,
    notes: values.notes.trim() || undefined,
    preferenceKind: values.preferenceKind,
    priority: values.priority,
    professionalId:
      values.preferenceKind === "specific" ? values.professionalId || undefined : undefined,
    serviceId: values.serviceId,
    unitId,
  }
}
