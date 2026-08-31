type VerifyTurnstileInput = {
  token: string
  secret: string
  remoteIp: string
  allowedHostnames: string[]
  fetcher?: typeof fetch
}

type TurnstileResponse = {
  success?: boolean
  hostname?: string
  action?: string
}

export async function verifyLeadTurnstile(input: VerifyTurnstileInput): Promise<boolean> {
  if (!input.secret) return false
  const body = new URLSearchParams({
    secret: input.secret,
    response: input.token,
    remoteip: input.remoteIp,
  })
  const response = await (input.fetcher ?? fetch)(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body, signal: AbortSignal.timeout(4_000) },
  )
  if (!response.ok) return false
  const result = (await response.json()) as TurnstileResponse
  return (
    result.success === true &&
    result.action === "lead_submit" &&
    typeof result.hostname === "string" &&
    input.allowedHostnames.includes(result.hostname)
  )
}
