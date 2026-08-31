export type DashboardPeriod = "today" | "yesterday" | "this-week" | "this-month" | "custom"

export type DashboardFilters = {
  customEnd?: string
  customStart?: string
  period: DashboardPeriod
  professionalId?: string
  unitId: "centro" | "artesao"
}

export type DashboardFilterOption = {
  id: string
  label: string
}

export type DashboardMetric = {
  comparison: {
    amount: string
    direction: "down" | "neutral" | "up"
    percentage?: string
    periodLabel: string
  }
  description: string
  id: "appointments" | "completed" | "paid-value" | "paid-average" | "occupancy"
  label: string
  value: string
}

export type DashboardAppointment = {
  customerName: string
  date: string
  id: string
  professionalName: string
  serviceName: string
  start: string
  status: string
  statusClassName: string
  timeContext: string
}

export type DashboardAttention = {
  appointmentId?: string
  description: string
  id: string
  title: string
  tone: "danger" | "info" | "warning"
}

export type DashboardFlowItem = {
  count: number
  id: string
  label: string
  status?: string
  statusClassName: string
}

export type DashboardProfessional = {
  appointmentCount: number
  availableMinutes: number
  bookedMinutes: number
  id: string
  name: string
  occupancyPercent: number
  paidValue: string
  state: string
  stateTone: "info" | "neutral" | "success" | "warning"
}

export type DashboardCapacityBand = {
  availableMinutes: number
  bookedMinutes: number
  id: string
  label: string
  occupancyPercent: number
  range: string
}

export type DashboardService = {
  count: number
  id: string
  name: string
  paidValue: string
  scheduledValue: string
}

export type WorkspaceOverviewModel = {
  attention: readonly DashboardAttention[]
  cancellations: {
    canceledCount: number
    noShowCount: number
    potentialValue: string
    rate: string
  }
  capacity: {
    availableMinutes: number
    bands: readonly DashboardCapacityBand[]
    bookedMinutes: number
    freeMinutes: number
  }
  clients: {
    completedUniqueCount: number
    newClientCount?: number
    repeatedInPeriodCount: number
  }
  filters: DashboardFilters
  finance: {
    discounts?: string
    paidValue: string
    paymentMethods?: readonly { label: string; value: string }[]
    pendingCompletedValue: string
    scheduledValue: string
  }
  flow: readonly DashboardFlowItem[]
  metrics: readonly DashboardMetric[]
  professionals: readonly DashboardProfessional[]
  professionalOptions: readonly DashboardFilterOption[]
  services: readonly DashboardService[]
  unitOptions: readonly DashboardFilterOption[]
  updatedLabel: string
  upcoming: readonly DashboardAppointment[]
}
