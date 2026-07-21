declare module "virtual:studio-development-sandbox" {
  export const loadDevelopmentSandbox:
    | (() => Promise<{ default: import("react").ComponentType }>)
    | null
}
