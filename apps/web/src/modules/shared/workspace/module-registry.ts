import type { LucideIcon as LucideIconType } from "lucide-react"
import {
  BellIcon,
  Building2Icon,
  FileChartPieIcon,
  FileTextIcon,
  HomeIcon,
  IdCardLanyardIcon,
  PackageIcon,
  ReceiptIcon,
  Settings2Icon,
  SettingsIcon,
  TruckIcon,
  UserRoundIcon,
  UsersIcon,
  WarehouseIcon,
} from "lucide-react"

export type WorkspaceModulePath =
  | "/overview"
  | "/users"
  | "/companies"
  | "/customers"
  | "/inventory/products"
  | "/inventory/warehouses"
  | "/fleet/trucks"
  | "/drivers"
  | "/users/collaborators"
  | "/users/permission-profiles"
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

type WorkspaceNavigationItemBase = {
  activePathPrefix?: string
  id: string
  label: string
  description: string
  icon: LucideIconType
  showDisclosure?: boolean
}

export type WorkspaceActiveNavigationItem = WorkspaceNavigationItemBase & {
  status: "active"
  path: WorkspaceRoutePath
}

export type WorkspacePlannedNavigationItem = WorkspaceNavigationItemBase & {
  status: "planned"
  path?: never
}

export type WorkspaceNavigationItem = WorkspaceActiveNavigationItem | WorkspacePlannedNavigationItem

export const workspacePrimaryNavigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Entrada principal do workspace.",
    icon: HomeIcon,
    path: "/overview",
    status: "active",
  },
  {
    id: "operations",
    label: "Central de Operações",
    description: "Módulo visual aguardando integração operacional.",
    icon: FileTextIcon,
    showDisclosure: true,
    status: "planned",
  },
  {
    id: "customers",
    label: "Clientes",
    description: "Cadastros e condições comerciais de clientes.",
    icon: UsersIcon,
    path: "/customers",
    showDisclosure: true,
    status: "active",
  },
  {
    id: "fleet",
    label: "Frota",
    description: "Veículos, capacidades e parâmetros da frota.",
    icon: TruckIcon,
    path: "/fleet/trucks",
    showDisclosure: true,
    status: "active",
  },
  {
    id: "drivers",
    label: "Motoristas",
    description: "Motoristas, habilitações e vínculos operacionais.",
    icon: IdCardLanyardIcon,
    path: "/drivers",
    showDisclosure: true,
    status: "active",
  },
  {
    id: "inventory",
    label: "Estoque",
    description: "Produtos, depósitos e parâmetros de estoque.",
    icon: WarehouseIcon,
    activePathPrefix: "/inventory",
    path: "/inventory/products",
    showDisclosure: true,
    status: "active",
  },
  {
    id: "finance",
    label: "Financeiro",
    description: "Módulo visual aguardando a iniciativa financeira.",
    icon: ReceiptIcon,
    showDisclosure: true,
    status: "planned",
  },
  {
    id: "reports",
    label: "Relatórios",
    description: "Módulo visual aguardando a iniciativa de relatórios.",
    icon: FileChartPieIcon,
    showDisclosure: true,
    status: "planned",
  },
] as const satisfies readonly WorkspaceNavigationItem[]

export const workspaceSecondaryNavigation = [
  {
    id: "alerts",
    label: "Central de alertas",
    description: "Superfície reservada sem dados, contadores ou atualização em segundo plano.",
    icon: BellIcon,
    status: "planned",
  },
  {
    id: "settings",
    label: "Configurações",
    description: "Preferências do workspace.",
    icon: SettingsIcon,
    path: "/preferences",
    status: "active",
  },
] as const satisfies readonly WorkspaceNavigationItem[]

export const workspaceModules = [
  {
    id: "overview",
    label: "Dashboard",
    path: "/overview",
    icon: HomeIcon,
    breadcrumbLabel: "Dashboard",
    description: "Entrada principal do workspace.",
    commandKeywords: ["dashboard", "home", "workspace", "início"],
  },
  {
    id: "users",
    label: "Usuários",
    path: "/users",
    icon: UsersIcon,
    breadcrumbLabel: "Usuários",
    description: "Usuários e convites do provedor de identidade.",
    commandKeywords: ["usuários", "convites", "identidade"],
  },
] as const satisfies readonly WorkspaceModule[]

export const workspaceReferenceRoutes = [
  {
    id: "companies",
    label: "Empresas",
    path: "/companies",
    icon: Building2Icon,
    breadcrumbLabel: "Empresas",
    description: "Dados cadastrais, fiscais e operacionais das empresas.",
    commandKeywords: ["empresas", "companhias", "cnpj"],
  },
  {
    id: "customers",
    label: "Clientes",
    path: "/customers",
    icon: UsersIcon,
    breadcrumbLabel: "Clientes",
    description: "Dados cadastrais e condições comerciais dos clientes.",
    commandKeywords: ["clientes", "cpf", "cnpj"],
  },
  {
    id: "products",
    label: "Produtos",
    path: "/inventory/products",
    icon: PackageIcon,
    breadcrumbLabel: "Produtos",
    description: "Informações fiscais, comerciais e de estoque dos produtos.",
    commandKeywords: ["produtos", "estoque", "inventário"],
  },
  {
    id: "warehouses",
    label: "Depósitos",
    path: "/inventory/warehouses",
    icon: WarehouseIcon,
    breadcrumbLabel: "Depósitos",
    description: "Localização, responsáveis e parâmetros dos depósitos.",
    commandKeywords: ["depósitos", "armazéns", "estoque"],
  },
  {
    id: "trucks",
    label: "Caminhões",
    path: "/fleet/trucks",
    icon: TruckIcon,
    breadcrumbLabel: "Caminhões",
    description: "Identificação, capacidade e operação dos caminhões.",
    commandKeywords: ["caminhões", "frota", "veículos"],
  },
  {
    id: "drivers",
    label: "Motoristas",
    path: "/drivers",
    icon: IdCardLanyardIcon,
    breadcrumbLabel: "Motoristas",
    description: "Dados pessoais, habilitação e operação dos motoristas.",
    commandKeywords: ["motoristas", "cnh", "frota"],
  },
  {
    id: "collaborators",
    label: "Colaboradores",
    path: "/users/collaborators",
    icon: UsersIcon,
    breadcrumbLabel: "Colaboradores",
    description: "Dados de acesso, empresa e configurações dos colaboradores.",
    commandKeywords: ["colaboradores", "usuários", "equipe"],
  },
  {
    id: "permission-profiles",
    label: "Perfis de permissão",
    path: "/users/permission-profiles",
    icon: Settings2Icon,
    breadcrumbLabel: "Perfis de permissão",
    description: "Conjuntos de permissões atribuídos aos colaboradores.",
    commandKeywords: ["permissões", "perfis", "acesso"],
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

export const workspacePlannedModules: readonly WorkspacePlannedNavigationItem[] =
  workspacePrimaryNavigation.filter((item) => item.status === "planned")

const workspaceRoutes = [
  ...workspaceReferenceRoutes,
  ...workspaceModules,
  ...workspaceAccountRoutes,
] as const

export function isWorkspaceNavigationItemActive(item: WorkspaceNavigationItem, pathname: string) {
  if (item.status !== "active") {
    return false
  }

  const activePath = item.activePathPrefix ?? item.path
  return pathname === item.path || (activePath !== "/overview" && pathname.startsWith(activePath))
}

export function getWorkspaceRouteByPath(pathname: string) {
  const normalizedPath = pathname === "/" ? "/overview" : pathname

  return [...workspaceRoutes]
    .sort((left, right) => right.path.length - left.path.length)
    .find((route) => normalizedPath.startsWith(route.path))
}
