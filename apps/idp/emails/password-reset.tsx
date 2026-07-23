import { PasswordResetEmailTemplate } from "../src/identity/emails/templates.js"

export default function PasswordResetPreview() {
  return (
    <PasswordResetEmailTemplate actionUrl="https://preview.invalid/reset-password?token=synthetic-preview-only" />
  )
}
