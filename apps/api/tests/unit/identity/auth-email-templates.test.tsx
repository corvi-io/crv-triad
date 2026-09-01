import { describe, expect, it } from "vitest"

import {
  assertTrustedActionUrl,
  renderAuthEmail,
} from "../../../src/modules/idp/identity/emails/render.js"
import { InvitationEmailTemplate } from "../../../src/modules/idp/identity/emails/templates.js"
import { buildInvitationMessage } from "../../../src/modules/idp/identity/transactional-email.js"

const env = {
  BETTER_AUTH_URL: "https://idp.example.test",
  IDP_STUDIO_URL: "https://studio.example.test",
} as never

describe("authentication email templates", () => {
  it("renders semantic HTML and plain text from trusted synthetic props", async () => {
    const message = await buildInvitationMessage(env, {
      email: "recipient@example.invalid",
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      role: "member",
      token: "synthetic-invitation-proof",
    })

    expect(message.subject).toBe("Seu convite para o TRIAD Studio")
    expect(message.html).toContain("<h1")
    expect(message.html).toContain("Aceitar convite")
    expect(message.text).toContain("A ROTINA DA BARBEARIA COMEÇA POR AQUI.")
    expect(message.text).toContain("Se preferir, copie e cole este endereço")
    expect(message.text).not.toContain("Perfil de acesso")
    expect(message.html).toContain("background-color:#86652f")
    expect(contrastRatio("#86652f", "#ffffff")).toBeGreaterThanOrEqual(4.5)
    expect(message.html).toContain("color:#5f6b7f")
    expect(contrastRatio("#5f6b7f", "#f8f5ee")).toBeGreaterThanOrEqual(4.5)
    expect(message.html).not.toContain("<script")
    expect(message.html).not.toContain("<img")
  })

  it("rejects non-allowlisted and credential-bearing action URLs", () => {
    expect(() =>
      assertTrustedActionUrl("https://untrusted.example.test/action", [
        "https://studio.example.test",
      ]),
    ).toThrow("Authentication email action URL is not trusted.")
    expect(() =>
      assertTrustedActionUrl("https://user:secret@studio.example.test/action", [
        "https://studio.example.test",
      ]),
    ).toThrow("Authentication email action URL is not trusted.")
  })

  it("escapes untrusted presentation text through React rendering", async () => {
    const actionUrl = "https://studio.example.test/accept-invitation"
    const message = await renderAuthEmail(
      <InvitationEmailTemplate
        actionUrl={actionUrl}
        expiresAtLabel={'<script data-private="true">'}
      />,
      "Synthetic subject",
      actionUrl,
      ["https://studio.example.test"],
    )

    expect(message.html).toContain("&lt;script")
    expect(message.html).not.toContain('<script data-private="true">')
  })
})

function contrastRatio(foreground: string, background: string): number {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (left, right) => right - left,
  )
  return ((luminances[0] ?? 0) + 0.05) / ((luminances[1] ?? 0) + 0.05)
}

function relativeLuminance(color: string): number {
  const [red = 0, green = 0, blue = 0] = color
    .match(/[a-f\d]{2}/gi)
    ?.map((channel) => Number.parseInt(channel, 16) / 255) ?? [0, 0, 0]
  const linear = [red, green, blue].map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
}
