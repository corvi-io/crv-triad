import posthog from "posthog-js"

export type AnalyticsProperties = Record<string, boolean | number | string | string[] | undefined>

type AnalyticsEvent =
  | "cta_clicked"
  | "faq_item_opened"
  | "feature_pill_clicked"
  | "lead_form_opened"
  | "lead_form_started"
  | "lead_form_validation_failed"
  | "lead_submission_failed"
  | "lead_submission_succeeded"
  | "scroll_depth_reached"
  | "section_viewed"
  | "solution_selected"

declare global {
  interface Window {
    triadAnalytics?: {
      capture: (event: AnalyticsEvent, properties?: AnalyticsProperties) => void
      consent: (allowed: boolean) => void
    }
  }
}

const root = document.documentElement
const projectKey = root.dataset.posthogKey ?? ""
const apiHost = root.dataset.posthogHost ?? ""
const environment = root.dataset.analyticsEnvironment ?? "development"
const consentKey = "triad_analytics_consent"
let initialized = false
const normalizedPath = () => location.pathname.replace(/\/+$/, "") || "/"

const pageType = () => {
  if (normalizedPath() === "/studio") return "studio"
  if (normalizedPath() === "/pro-barber") return "pro_barber"
  return "home"
}

const deviceType = () => {
  if (matchMedia("(max-width: 639px)").matches) return "mobile"
  if (matchMedia("(max-width: 1023px)").matches) return "tablet"
  return "desktop"
}

const commonProperties = (): AnalyticsProperties => ({
  page_path: location.pathname,
  page_type: pageType(),
  device_type: deviceType(),
  environment,
})

const capture = (event: AnalyticsEvent, properties: AnalyticsProperties = {}) => {
  if (!initialized) return
  try {
    posthog.capture(event, { ...commonProperties(), ...properties })
  } catch {
    // Analytics must never affect the visitor journey.
  }
}

const capturePageview = () => {
  if (!initialized) return
  posthog.capture("$pageview", { ...commonProperties(), $current_url: location.href })
}

const initialize = () => {
  if (
    initialized ||
    !projectKey ||
    !apiHost ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  )
    return
  try {
    posthog.init(projectKey, {
      api_host: apiHost,
      ui_host: "https://us.posthog.com",
      defaults: "2026-05-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: false,
      person_profiles: "identified_only",
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-lead-dialog]",
      },
    })
    initialized = true
    capturePageview()
  } catch {
    initialized = false
  }
}

const consent = (allowed: boolean) => {
  localStorage.setItem(consentKey, allowed ? "granted" : "denied")
  if (allowed) initialize()
  else if (initialized) {
    posthog.opt_out_capturing()
    posthog.stopSessionRecording()
  }
}

window.triadAnalytics = { capture, consent }

if (localStorage.getItem(consentKey) === "granted") initialize()

document.addEventListener(
  "click",
  (event) => {
    const target = event.target as HTMLElement
    const cta = target.closest<HTMLElement>('[data-analytics-cta], a[href$="#comecar"]')
    if (cta) {
      const label = (cta.dataset.analyticsCta || cta.textContent || "cta")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
      const locationName =
        cta.dataset.analyticsLocation ||
        (cta.closest(".site-header")
          ? "header"
          : cta.closest(".home-hero, .solution-hero")
            ? "hero"
            : cta.closest(".final-cta")
              ? "final_cta"
              : "product_section")
      const product =
        cta.dataset.analyticsProduct ||
        (normalizedPath() === "/studio"
          ? "studio"
          : normalizedPath() === "/pro-barber"
            ? "pro_barber"
            : "ecosystem")
      capture("cta_clicked", {
        cta_label: label,
        cta_location: locationName,
        destination: cta.dataset.analyticsDestination || "lead_form",
        product,
        section_name: cta.closest<HTMLElement>("[data-analytics-section]")?.dataset
          .analyticsSection,
      })
    }
    const solution = target.closest<HTMLAnchorElement>(
      "[data-analytics-solution], .solution-card, .studio-spotlight a",
    )
    if (solution) {
      capture("solution_selected", {
        product:
          solution.dataset.analyticsSolution ||
          (solution.pathname === "/pro-barber" ? "pro_barber" : "studio"),
        source_section: solution.closest<HTMLElement>("[data-analytics-section]")?.dataset
          .analyticsSection,
      })
    }
  },
  true,
)

const milestones = [25, 50, 75, 90]
const reached = new Set<number>()
const onScroll = () => {
  const scrollable = document.documentElement.scrollHeight - innerHeight
  if (scrollable <= 0) return
  const depth = Math.round((scrollY / scrollable) * 100)
  for (const milestone of milestones) {
    if (depth >= milestone && !reached.has(milestone)) {
      reached.add(milestone)
      capture("scroll_depth_reached", { depth_percent: milestone })
    }
  }
}
addEventListener("scroll", onScroll, { passive: true })

const visibleSections = new Set<string>()
const timers = new Map<string, number>()
const sectionSelectors: Record<string, string> = {
  hero: ".home-hero, .solution-hero",
  journey: ".journey-map",
  product_overview: ".dual, .st-capabilities, .pb-capabilities",
  final_cta: ".final-cta",
}
for (const [name, selector] of Object.entries(sectionSelectors)) {
  document.querySelectorAll<HTMLElement>(selector).forEach((section) => {
    section.dataset.analyticsSection = name
  })
}
const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const section = entry.target as HTMLElement
      const name = section.dataset.analyticsSection
      if (!name || visibleSections.has(name)) continue
      const timer = timers.get(name)
      if (timer) clearTimeout(timer)
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        timers.set(
          name,
          window.setTimeout(() => {
            visibleSections.add(name)
            capture("section_viewed", { section_name: name })
          }, 1000),
        )
      }
    }
  },
  { threshold: [0.5] },
)
document.querySelectorAll<HTMLElement>("[data-analytics-section]").forEach((section) => {
  sectionObserver.observe(section)
})
