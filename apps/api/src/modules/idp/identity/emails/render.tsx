import { render } from "@react-email/render"
import type { ReactElement } from "react"

export type RenderedAuthEmail = {
  html: string
  subject: string
  text: string
}

export async function renderAuthEmail(
  component: ReactElement,
  subject: string,
  actionUrl: string,
  trustedOrigins: readonly string[],
): Promise<RenderedAuthEmail> {
  assertTrustedActionUrl(actionUrl, trustedOrigins)
  const [html, text] = await Promise.all([
    render(component),
    render(component, { plainText: true }),
  ])
  return { html, subject, text }
}

export function assertTrustedActionUrl(actionUrl: string, trustedOrigins: readonly string[]): void {
  const parsed = new URL(actionUrl)
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    !trustedOrigins.includes(parsed.origin)
  ) {
    throw new Error("Authentication email action URL is not trusted.")
  }
}
