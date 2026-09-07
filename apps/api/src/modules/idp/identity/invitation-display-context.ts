export type InvitationDisplayContext = Readonly<{
  organizationName: string
  professionalRole?: string
  unitNames?: readonly string[]
  inviterName?: string
  logoAvailable?: boolean
  /** Derived bytes for server-rendered email only. Never serialize in invitation resolution. */
  logoDataUrl?: string
}>

export type InvitationDisplayContextProvider = (
  invitationId: string,
) => Promise<InvitationDisplayContext | null>

export type InvitationLogo = Readonly<{ body: Uint8Array; contentType: string }>
export type InvitationLogoProvider = (invitationId: string) => Promise<InvitationLogo | null>
