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

    expect(message.subject).toBe("Seu convite para acessar o TRIAD")
    expect(message.html).toContain("<h1")
    expect(message.html).toContain("Criar minha senha")
    expect(message.text).toContain("VOCÊ RECEBEU UM CONVITE")
    expect(message.text).toContain("Se o botão não funcionar")
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
        invitationRole="member"
      />,
      "Synthetic subject",
      actionUrl,
      ["https://studio.example.test"],
    )

    expect(message.html).toContain("&lt;script")
    expect(message.html).not.toContain('<script data-private="true">')
  })
})
