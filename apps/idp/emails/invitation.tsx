import { InvitationEmailTemplate } from "../src/identity/emails/templates.js"

export default function InvitationPreview() {
  return (
    <InvitationEmailTemplate
      actionUrl="https://preview.invalid/accept-invitation?token=synthetic-preview-only"
      expiresAtLabel="31/12/2099, 23:59"
      invitationRole="member"
    />
  )
}
