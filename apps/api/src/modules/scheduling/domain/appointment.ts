import { z } from "zod"
import { localDate, localTime, SchedulingError } from "../../availability/domain/time.js"
export const statuses = [
  "scheduled",
  "confirmed",
  "arrived",
  "waiting",
  "in-progress",
  "completed",
  "canceled",
  "no-show",
] as const
export type AppointmentStatus = (typeof statuses)[number]
export const appointmentInput = z
  .object({
    clientId: z.string().min(1).max(100),
    unitId: z.string().min(1).max(100),
    professionalId: z.string().min(1).max(100),
    serviceId: z.string().min(1).max(100),
    date: localDate,
    start: localTime.refine((value) => Number(value.slice(3)) % 15 === 0),
    notes: z.string().trim().max(2000).default(""),
    origin: z.enum(["phone", "reception", "whatsapp"]).default("reception"),
  })
  .strict()
export type AppointmentInput = z.infer<typeof appointmentInput>
export const commands = ["confirm", "check-in", "cancel", "no-show"] as const
export type AppointmentCommand = (typeof commands)[number]
export function transition(
  status: AppointmentStatus,
  command: AppointmentCommand,
): AppointmentStatus {
  const allowed: Record<AppointmentCommand, readonly AppointmentStatus[]> = {
    confirm: ["scheduled"],
    "check-in": ["scheduled", "confirmed"],
    cancel: ["scheduled", "confirmed", "arrived"],
    "no-show": ["scheduled", "confirmed"],
  }
  if (!allowed[command].includes(status)) throw new SchedulingError("invalid_transition")
  return { confirm: "confirmed", "check-in": "arrived", cancel: "canceled", "no-show": "no-show" }[
    command
  ] as AppointmentStatus
}
export function trustedServiceTransition(
  status: AppointmentStatus,
  next: "waiting" | "in-progress" | "completed",
) {
  if (
    (status === "arrived" && next === "waiting") ||
    (status === "waiting" && next === "in-progress") ||
    (status === "in-progress" && next === "completed")
  )
    return next
  throw new SchedulingError("invalid_transition")
}
export function occupies(status: AppointmentStatus) {
  return status !== "canceled" && status !== "no-show"
}
export function assertEditable(status: AppointmentStatus) {
  if (status !== "scheduled" && status !== "confirmed")
    throw new SchedulingError("invalid_transition")
}
