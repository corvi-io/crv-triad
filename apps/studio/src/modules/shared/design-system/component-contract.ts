export const sharedComponentResponsibilities = [
  "data-display",
  "feedback",
  "forms",
  "layout",
  "overlays",
  "ui",
] as const

export type SharedComponentResponsibility = (typeof sharedComponentResponsibilities)[number]

export const tokenLayers = [
  { id: "primitive", prefix: "--primitive-", purpose: "Raw visual anchors" },
  { id: "semantic", prefix: "--background / --primary / …", purpose: "Theme-aware meaning" },
  {
    id: "component",
    prefix: "--workspace- / component prefix",
    purpose: "Component geometry and states",
  },
] as const
