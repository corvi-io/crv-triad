import type { LucideIcon as LucideIconType } from "lucide-react"
import {
  Building2Icon,
  CalendarDaysIcon,
  ContactRoundIcon,
  HomeIcon,
  Settings2Icon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react"

export type WorkspaceModulePath = "/agenda" | "/barbershop-setup" | "/clients" | "/overview"
export type WorkspaceRoutePath = WorkspaceModulePath | "/profile" | "/preferences"

type WorkspaceRoute = {
  id: string
  label: string
  path: WorkspaceRoutePath
  icon: LucideIconType
  breadcrumbLabel: string
  description: string
  commandKeywords: readonly string[]
}

export type WorkspaceModule = WorkspaceRoute & {
  path: WorkspaceModulePath
}

export type WorkspaceNavigationItem = {
  id: string
  label: string
  description: string
  icon: LucideIconType
  path: WorkspaceRoutePath
  status: "active"
}

export const workspacePrimaryNavigation = [
  {
    id: "clients",
    label: "Clientes",
    description: "Diretório e histórico de clientes.",
    icon: ContactRoundIcon,
    path: "/clients",
    status: "active",
  },
  {
    id: "schedule",
    label: "Agenda",
    description: "Agenda diária da unidade.",
    icon: CalendarDaysIcon,
    path: "/agenda",
    status: "active",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Entrada principal do TRIAD Studio.",
    icon: HomeIcon,
    path: "/overview",
    status: "active",
  },
] as const satisfies readonly WorkspaceNavigationItem[]

export const workspaceSecondaryNavigation = [
  {
    id: "barbershop-setup",
    label: "Barbearia",
    description: "Configuração da barbearia.",
    icon: Building2Icon,
    path: "/barbershop-setup",
    status: "active",
  },
  {
    id: "settings",
    label: "Configurações",
    description: "Preferências do TRIAD Studio.",
    icon: SettingsIcon,
    path: "/preferences",
    status: "active",
  },
] as const satisfies readonly WorkspaceNavigationItem[]

export const workspaceModules = [
  {
    id: "clients",
    label: "Clientes",
    path: "/clients",
    icon: ContactRoundIcon,
    breadcrumbLabel: "Clientes",
    description: "Encontre clientes e consulte o histórico de atendimento.",
    commandKeywords: ["cliente", "clientes", "contato", "histórico", "nota"],
  },
  {
    id: "schedule",
    label: "Agenda",
    path: "/agenda",
    icon: CalendarDaysIcon,
    breadcrumbLabel: "Agenda",
    description: "Agenda diária da unidade.",
    commandKeywords: ["agenda", "agendamento", "horário", "profissional"],
  },
  {
    id: "barbershop-setup",
    label: "Barbearia",
    path: "/barbershop-setup",
    icon: Building2Icon,
    breadcrumbLabel: "Configuração da barbearia",
    description: "Gerencie unidades, profissionais, serviços e disponibilidade.",
    commandKeywords: ["barbearia", "unidade", "profissional", "serviço", "disponibilidade"],
  },
  {
    id: "overview",
    label: "Dashboard",
    path: "/overview",
    icon: HomeIcon,
    breadcrumbLabel: "Dashboard",
    description: "Entrada principal do TRIAD Studio.",
    commandKeywords: ["dashboard", "home", "studio", "início"],
  },
] as const satisfies readonly WorkspaceModule[]

export const workspaceAccountRoutes = [
  {
    id: "profile",
    label: "Meu perfil",
    path: "/profile",
    icon: UserRoundIcon,
    breadcrumbLabel: "Meu perfil",
    description: "Dados básicos da conta.",
    commandKeywords: ["conta", "usuário", "perfil"],
  },
  {
    id: "preferences",
    label: "Configurações",
    path: "/preferences",
    icon: Settings2Icon,
    breadcrumbLabel: "Configurações",
    description: "Preferências de uso do sistema.",
    commandKeywords: ["tema", "aparência", "configurações"],
  },
] as const satisfies readonly WorkspaceRoute[]

const workspaceRoutes = [...workspaceModules, ...workspaceAccountRoutes] as const

export function isWorkspaceNavigationItemActive(item: WorkspaceNavigationItem, pathname: string) {
  return pathname === item.path || (item.path !== "/overview" && pathname.startsWith(item.path))
}

export function getWorkspaceRouteByPath(pathname: string) {
  const normalizedPath = pathname === "/" ? "/overview" : pathname

  return [...workspaceRoutes]
    .sort((left, right) => right.path.length - left.path.length)
    .find((route) => normalizedPath.startsWith(route.path))
}
