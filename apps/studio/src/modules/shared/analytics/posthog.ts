import type posthogType from "posthog-js"

import { env } from "@/modules/shared/config/env"

export type ProductEvent =
  | "appointment_cancelled"
  | "appointment_created"
  | "appointment_rescheduled"
  | "appointment_status_changed"
  | "appointment_updated"
  | "cash_day_closed"
  | "cash_day_opened"
  | "cash_day_reopened"
  | "cash_movement_recorded"
  | "checkout_completed"
  | "checkout_updated"
  | "client_created"
  | "client_updated"
  | "module_viewed"
  | "notification_read"
  | "onboarding_completed"
  | "report_export_requested"
  | "report_export_retried"
  | "service_completed"
  | "service_queue_updated"
  | "service_session_completed"
  | "service_session_started"
  | "service_session_updated"
  | "studio_session_started"
  | "workspace_selected"

type SafeProperties = Record<string, boolean | number | string | undefined>

const productPropertyAllowlist: Record<ProductEvent, ReadonlySet<string>> = {
  appointment_cancelled: new Set(),
  appointment_created: new Set(),
  appointment_rescheduled: new Set(),
  appointment_status_changed: new Set(),
  appointment_updated: new Set(),
  cash_day_closed: new Set(),
  cash_day_opened: new Set(),
  cash_day_reopened: new Set(),
  cash_movement_recorded: new Set(),
  checkout_completed: new Set(),
  checkout_updated: new Set(),
  client_created: new Set(),
  client_updated: new Set(),
  module_viewed: new Set(["module", "route"]),
  notification_read: new Set(),
  onboarding_completed: new Set(),
  report_export_requested: new Set(),
  report_export_retried: new Set(),
  service_completed: new Set(),
  service_queue_updated: new Set(),
  service_session_completed: new Set(),
  service_session_started: new Set(),
  service_session_updated: new Set(),
  studio_session_started: new Set(),
  workspace_selected: new Set(["tenant_id"]),
}
const errorPropertyAllowlist = new Set(["boundary", "module", "request_id", "route", "status"])
const sensitivePropertyPattern = /email|name|phone|password|token|secret|cookie|authorization/i

let initialized = false
let initializing = false
let posthog: typeof posthogType | null = null
let identifiedUserId: string | null = null
let activeTenantId: string | null = null
const pendingEvents: Array<{ event: ProductEvent; properties: SafeProperties }> = []

function commonProperties(): SafeProperties {
  return {
    app: "studio",
    environment: env.deployTarget,
    release: env.release,
  }
}

export async function initializeAnalytics() {
  if (
    initialized ||
    initializing ||
    !env.posthogKey ||
    !env.posthogHost ||
    env.isTest ||
    env.deployTarget === "local"
  ) {
    return
  }
  initializing = true
  const loaded = await import("posthog-js").catch(() => null)
  if (!loaded) {
    initializing = false
    return
  }
  posthog = loaded.default
  const recordSession = Math.random() <= env.posthogReplaySampleRate
  posthog.init(env.posthogKey, {
    api_host: env.posthogHost,
    ui_host: "https://us.posthog.com",
    defaults: "2026-08-30",
    autocapture: false,
    capture_exceptions: false,
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: !recordSession,
    person_profiles: "identified_only",
    mask_all_text: true,
    mask_personal_data_properties: true,
    property_denylist: ["email", "name", "phone", "password", "token"],
    session_recording: {
      blockSelector:
        "img, [data-private], [data-sensitive], input[type='file'], input[type='hidden']",
      maskAllInputs: true,
      maskTextSelector: "*",
    },
    before_send: (event) => {
      if (!event) return null
      event.properties = sanitizeProviderProperties({
        ...event.properties,
        ...commonProperties(),
      })
      return event
    },
  })
  registerUnexpectedErrorListeners()
  initialized = true
  initializing = false
  if (identifiedUserId) posthog.identify(identifiedUserId, { app: "studio" })
  if (activeTenantId) posthog.group("tenant", activeTenantId)
  for (const item of pendingEvents.splice(0)) {
    posthog.capture(item.event, { ...commonProperties(), ...item.properties })
  }
}

export function identifyAnalyticsUser(userId: string) {
  if (identifiedUserId === userId) return
  identifiedUserId = userId
  if (initialized && posthog) posthog.identify(userId, { app: "studio" })
  captureProductEvent("studio_session_started")
}

export function setAnalyticsTenant(tenantId: string | null) {
  if (activeTenantId === tenantId) return
  activeTenantId = tenantId
  if (!tenantId) {
    if (initialized && posthog) posthog.resetGroups()
    return
  }
  if (initialized && posthog) posthog.group("tenant", tenantId)
  captureProductEvent("workspace_selected", { tenant_id: tenantId })
}

export function resetAnalyticsIdentity() {
  if (!identifiedUserId && !activeTenantId) return
  posthog?.reset(true)
  identifiedUserId = null
  activeTenantId = null
}

export function captureProductEvent(event: ProductEvent, properties: SafeProperties = {}) {
  const safeProperties = allowProperties(properties, productPropertyAllowlist[event])
  if (!initialized || !posthog) {
    if (initializing && pendingEvents.length < 20)
      pendingEvents.push({ event, properties: safeProperties })
    return
  }
  posthog.capture(event, { ...commonProperties(), ...safeProperties })
}

export function captureMutationSuccess(meta: unknown) {
  if (!meta || typeof meta !== "object" || !("analyticsEvent" in meta)) return
  const event = meta.analyticsEvent
  if (typeof event === "string" && event in productPropertyAllowlist)
    captureProductEvent(event as ProductEvent)
}

export function productAnalyticsMeta(event: ProductEvent) {
  return { analyticsEvent: event } as const
}

export function captureUnexpectedError(error: unknown, properties: SafeProperties = {}) {
  if (!initialized || !posthog || isExpectedError(error)) return
  posthog.captureException(sanitizeError(error), {
    ...commonProperties(),
    ...allowProperties(properties, errorPropertyAllowlist),
  })
}

function registerUnexpectedErrorListeners() {
  window.addEventListener("error", (event) =>
    captureUnexpectedError(event.error, { boundary: "runtime" }),
  )
  window.addEventListener("unhandledrejection", (event) =>
    captureUnexpectedError(event.reason, { boundary: "unhandled_rejection" }),
  )
}

function allowProperties(properties: SafeProperties, allowed: ReadonlySet<string>) {
  return Object.fromEntries(Object.entries(properties).filter(([key]) => allowed.has(key)))
}

function sanitizeProviderProperties(properties: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => !sensitivePropertyPattern.test(key))
      .map(([key, value]) => [key, sanitizeProviderValue(key, value)]),
  )
}

function sanitizeProviderValue(key: string, value: unknown) {
  if (typeof value !== "string" || !["$current_url", "$referrer"].includes(key)) return value
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    return undefined
  }
}

function sanitizeError(error: unknown) {
  const safe = new Error("Unexpected application error")
  if (error instanceof Error) {
    safe.name = /^[A-Za-z][A-Za-z0-9]*Error$/.test(error.name) ? error.name : "Error"
    const frames = error.stack?.split("\n").slice(1) ?? []
    safe.stack = [`${safe.name}: ${safe.message}`, ...frames].join("\n")
  }
  return safe
}

function isExpectedError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return true
  if (!(error instanceof Error)) return false
  return [
    "FormSubmissionError",
    "SetupValidationError",
    "ServiceDeskTransitionError",
    "ServiceSessionNotFoundError",
    "OperationalNotificationError",
  ].includes(error.name)
}

export function analyticsTestState() {
  return { activeTenantId, identifiedUserId, initialized }
}
