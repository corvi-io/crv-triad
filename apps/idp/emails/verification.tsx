import { VerificationEmailTemplate } from "../src/identity/emails/templates.js"

export default function VerificationPreview() {
  return (
    <VerificationEmailTemplate actionUrl="https://preview.invalid/verify-email?token=synthetic-preview-only" />
  )
}
