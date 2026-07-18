import { createFileRoute } from "@tanstack/react-router"

import { useAuth } from "@/modules/auth/services/auth-provider"
import { ProfileScreen } from "@/modules/profile/components/profile-screen"

export const Route = createFileRoute("/_authenticated/profile/")({
  component: ProfileRoute,
})

function ProfileRoute() {
  const { session } = useAuth()

  if (!session) {
    return null
  }

  return <ProfileScreen session={session} />
}
