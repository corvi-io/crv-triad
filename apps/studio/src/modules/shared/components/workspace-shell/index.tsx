import { useLocation, useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useState } from "react"

import { signOut } from "@/modules/auth/services/auth-client"
import { useAuth } from "@/modules/auth/services/auth-provider"
import { SidebarInset, SidebarProvider } from "@/modules/shared/components/ui/sidebar"
import { TooltipProvider } from "@/modules/shared/components/ui/tooltip"

import { WorkspaceShellContent } from "./content"
import { WorkspaceShellHeader } from "./header"
import { WorkspaceShellSidebar } from "./sidebar"

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { refetch, session } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const userName = session?.user.name || "Usuário"
  const userEmail = session?.user.email || "E-mail não informado"
  const userInitial =
    userName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "C"
  const userImage = session?.user.image ?? null

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    await signOut()
    refetch()
    await navigate({ to: "/login", replace: true })
  }

  return (
    <WorkspaceShellFrame
      isSigningOut={isSigningOut}
      onSignOut={handleSignOut}
      pathname={location.pathname}
      user={{
        email: userEmail,
        image: userImage,
        initial: userInitial,
        name: userName,
      }}
    >
      {children}
    </WorkspaceShellFrame>
  )
}

export function WorkspacePreviewShell({
  children,
  pathname = "/overview",
}: {
  children: ReactNode
  pathname?: string
}) {
  return (
    <WorkspaceShellFrame
      pathname={pathname}
      user={{
        email: "email@militar.com.br",
        image: "/brand/workspace-preview-avatar.svg",
        initial: "NM",
        name: "Nome Militar",
      }}
    >
      {children}
    </WorkspaceShellFrame>
  )
}

function WorkspaceShellFrame({
  children,
  isSigningOut = false,
  onSignOut,
  pathname,
  user,
}: {
  children: ReactNode
  isSigningOut?: boolean
  onSignOut?: () => void
  pathname: string
  user: {
    email: string
    image?: string | null
    initial: string
    name: string
  }
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <WorkspaceShellSidebar
          isSigningOut={isSigningOut}
          onSignOut={onSignOut}
          pathname={pathname}
          user={user}
        />
        <SidebarInset
          id="main-content"
          className="min-h-0 overflow-hidden bg-card text-card-foreground"
          tabIndex={-1}
        >
          <WorkspaceShellHeader pathname={pathname} />
          <WorkspaceShellContent>{children}</WorkspaceShellContent>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
