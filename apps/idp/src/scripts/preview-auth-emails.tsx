import { render } from "@react-email/render"
import type { ReactElement } from "react"

import InvitationPreview from "../../emails/invitation.js"
import PasswordResetPreview from "../../emails/password-reset.js"
import VerificationPreview from "../../emails/verification.js"

const previewComponents = new Map<string, ReactElement>([
  ["/invitation", <InvitationPreview />],
  ["/password-reset", <PasswordResetPreview />],
  ["/verification", <VerificationPreview />],
])

const renderedPreviews = new Map(
  await Promise.all(
    [...previewComponents].map(
      async ([path, component]) => [path, await render(component)] as const,
    ),
  ),
)

const previewIndex = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="referrer" content="no-referrer" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Prévia de e-mails do TRIAD</title>
  </head>
  <body>
    <main>
      <h1>Prévia de e-mails do TRIAD</h1>
      <ul>
        <li><a href="/invitation">Convite</a></li>
        <li><a href="/verification">Verificação</a></li>
        <li><a href="/password-reset">Redefinição de senha</a></li>
      </ul>
    </main>
  </body>
</html>`

const server = Bun.serve({
  port: 3002,
  fetch(request) {
    const pathname = new URL(request.url).pathname.replace(/\/$/, "") || "/"
    const body = pathname === "/" ? previewIndex : renderedPreviews.get(pathname)
    return new Response(body ?? "Prévia não encontrada.", {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": body ? "text/html; charset=utf-8" : "text/plain; charset=utf-8",
        "Referrer-Policy": "no-referrer",
      },
      status: body ? 200 : 404,
    })
  },
})

console.info(`Synthetic authentication email preview ready on port ${server.port}.`)
