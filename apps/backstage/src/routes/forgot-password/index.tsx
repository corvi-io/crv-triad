import { createFileRoute } from "@tanstack/react-router"

import { ForgotPasswordScreen } from "@/modules/auth/components/forgot-password-screen"

export const Route = createFileRoute("/forgot-password/")({
  component: ForgotPasswordScreen,
})
