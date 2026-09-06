export type InvitationDisplayContext = Readonly<{
  organizationName: string
  professionalRole?: string
  unitNames?: readonly string[]
  inviterName?: string
  logoAvailable?: boolean
}>

export type InvitationDisplayContextProvider = (
  invitationId: string,
) => Promise<InvitationDisplayContext | null>
