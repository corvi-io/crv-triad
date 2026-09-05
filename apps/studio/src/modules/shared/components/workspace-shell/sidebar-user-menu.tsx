import { Link } from "@tanstack/react-router"
import {
  BellIcon,
  Building2Icon,
  ChevronsUpDownIcon,
  LogOutIcon,
  Settings2Icon,
  UserRoundIcon,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/modules/shared/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/modules/shared/components/ui/sidebar"

export function SidebarUserMenu({
  user,
  isSigningOut,
  onSignOut,
  workspaceSwitcher,
}: SidebarUserMenuProps) {
  const { isMobile } = useSidebar()
  const [isSignOutConfirmationOpen, setIsSignOutConfirmationOpen] = useState(false)

  return (
    <>
      <SidebarMenu className="h-17 p-2">
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  aria-label={`Abrir menu de ${user.name}`}
                  className="h-(--workspace-user-row-height)! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:p-2!"
                  size="lg"
                  title={user.name}
                />
              }
            >
              <Avatar className="size-workspace-avatar rounded-lg">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg">{user.initial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-normal">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon
                className="ml-auto size-4 group-data-[collapsible=icon]:hidden"
                aria-hidden="true"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Conta</DropdownMenuLabel>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={user.image ?? undefined} alt={user.name} />
                      <AvatarFallback className="rounded-lg">{user.initial}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link to="/profile" />}>
                  <UserRoundIcon className="size-4" aria-hidden="true" />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link to="/preferences" />}>
                  <Settings2Icon className="size-4" aria-hidden="true" />
                  Preferências
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link search={{ notificationScenario: undefined }} to="/notifications" />}
                >
                  <BellIcon className="size-4" aria-hidden="true" />
                  Notificações
                </DropdownMenuItem>
                {workspaceSwitcher}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Administração da barbearia</DropdownMenuLabel>
                <DropdownMenuItem render={<Link to="/barbershop-setup" />}>
                  <Building2Icon className="size-4" aria-hidden="true" />
                  Configuração da barbearia
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={isSigningOut || !onSignOut}
                  onClick={() => setIsSignOutConfirmationOpen(true)}
                >
                  <LogOutIcon className="size-4" aria-hidden="true" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <ConfirmationDialog
        cancelLabel="Continuar no Studio"
        confirmLabel="Sair da conta"
        description="Você precisará entrar novamente para acessar sua barbearia."
        isLoading={isSigningOut}
        isOpen={isSignOutConfirmationOpen}
        onCancel={() => setIsSignOutConfirmationOpen(false)}
        onConfirm={() => onSignOut?.()}
        title="Deseja realmente sair?"
      />
    </>
  )
}

type SidebarUserMenuProps = {
  isSigningOut?: boolean
  onSignOut?: () => void
  workspaceSwitcher?: ReactNode
  user: {
    email: string
    image?: string | null
    initial: string
    name: string
  }
}
