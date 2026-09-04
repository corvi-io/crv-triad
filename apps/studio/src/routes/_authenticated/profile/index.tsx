import { createFileRoute } from "@tanstack/react-router"

import { useAuth } from "@/modules/auth/services/auth-provider"
import { ProfileScreen } from "@/modules/profile/components/profile-screen"
import { AccountPageLayout } from "@/modules/shared/components/layout/account-page-layout"

export const Route = createFileRoute("/_authenticated/profile/")({
  component: ProfileRoute,
})

function ProfileRoute() {
  const { session } = useAuth()

  if (!session) {
    return null
  }

  return (
    <AccountPageLayout
      title="Meu perfil"
      description="Gerencie as informações usadas para identificar sua conta no TRIAD Studio."
    >
      <ProfileScreen session={session} />
    </AccountPageLayout>
  )
}
