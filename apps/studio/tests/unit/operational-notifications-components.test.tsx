import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { OperationalNotificationsMemoryRepository } from "@/dev/operational-notifications/memory-repository"
import { NotificationCenterPage } from "@/modules/operational-notifications/notification-center-page"
import { OperationalNotificationTrigger } from "@/modules/operational-notifications/notification-trigger"
import { OperationalNotificationsRepositoryProvider } from "@/modules/operational-notifications/repository-context"

function Wrapper({
  children,
  repository,
}: {
  children: ReactNode
  repository: OperationalNotificationsMemoryRepository
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={queryClient}>
      <OperationalNotificationsRepositoryProvider repository={repository}>
        {children}
      </OperationalNotificationsRepositoryProvider>
    </QueryClientProvider>
  )
}

describe("operational notification presentation", () => {
  it("exposes the exact accessible unread count while visually capping over 99", async () => {
    const repository = new OperationalNotificationsMemoryRepository()
    await repository.listNotifications({ scenarioId: "overflow" })
    render(<OperationalNotificationTrigger scenarioId="overflow" />, {
      wrapper: ({ children }) => <Wrapper repository={repository}>{children}</Wrapper>,
    })
    const trigger = await screen.findByRole("button", {
      name: "Abrir notificações. 105 notificações ativas não lidas.",
    })
    expect(within(trigger).getByText("99+")).toHaveAttribute("aria-hidden", "true")
    await userEvent.click(trigger)
    expect(await screen.findByRole("heading", { name: "Notificações operacionais" })).toBeVisible()
    expect(screen.getAllByText("Marcar como lida")).toHaveLength(4)
    expect(screen.getByRole("link", { name: "Ver todas as notificações" })).toHaveAttribute(
      "href",
      "/notifications",
    )
  })

  it("renders all categories, bounded history, read feedback, and missing-target recovery", async () => {
    const repository = new OperationalNotificationsMemoryRepository()
    const { rerender } = render(
      <Wrapper repository={repository}>
        <NotificationCenterPage scenarioId="normal" />
      </Wrapper>,
    )
    expect(await screen.findByText("Cliente aguardando há muito tempo")).toBeVisible()
    expect(screen.getByText("Agendamento alterado ou cancelado")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Histórico resolvido" })).toBeVisible()
    await userEvent.click(screen.getAllByRole("button", { name: "Marcar como lida" })[0])
    expect(await screen.findByText("Notificação marcada como lida.")).toHaveClass("sr-only")

    rerender(
      <Wrapper repository={repository}>
        <NotificationCenterPage scenarioId="missing-target" />
      </Wrapper>,
    )
    expect(
      await screen.findByRole("link", { name: "Destino indisponível · Abrir Agenda" }),
    ).toHaveAttribute("href", "/agenda")
  })
})
