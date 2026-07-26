export const setupToSchedulingProfessionalId = {
  "professional-alpha": "professional-carlos",
  "professional-bravo": "professional-bruno",
  "professional-charlie": "professional-ana",
  "professional-delta": "professional-joao",
} as const

export const schedulingToSetupProfessionalId = Object.fromEntries(
  Object.entries(setupToSchedulingProfessionalId).map(([setupId, schedulingId]) => [
    schedulingId,
    setupId,
  ]),
) as Readonly<Record<string, string>>

export const schedulingToSetupServiceId: Readonly<Record<string, string>> = {
  "service-hair-beard": "service-classic",
  "service-fade": "service-beard",
  "service-cut-beard": "service-combo",
  "service-simple-cut": "service-care",
}
