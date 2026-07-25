import {
  type MarkReadInput,
  type NotificationPage,
  type NotificationQuery,
  OperationalNotificationError,
  type OperationalNotificationsRepository,
} from "@/modules/operational-notifications/contracts"
import { projectOperationalNotifications } from "@/modules/operational-notifications/rules"
import {
  factsForScenario,
  type OperationalNotificationScenarioId,
  operationalNotificationScenarioIds,
} from "./scenarios"

const PREVIEW_LIMIT = 4
const ACTIVE_LIMIT = 120
const HISTORY_LIMIT = 24

export class OperationalNotificationsMemoryRepository
  implements OperationalNotificationsRepository
{
  #failNextRead = true
  #generation = 0
  #readIds = new Set<string>()
  #scenario: OperationalNotificationScenarioId = "normal"

  scenarios() {
    return operationalNotificationScenarioIds.map((id) => ({
      id,
      label: id,
    }))
  }

  async getPreview(query: NotificationQuery = {}) {
    return this.#read({ activeLimit: PREVIEW_LIMIT, historyLimit: 0, ...query })
  }

  async getNotification(id: string, query: Pick<NotificationQuery, "scenarioId"> = {}) {
    const page = await this.#read({
      activeLimit: ACTIVE_LIMIT,
      historyLimit: HISTORY_LIMIT,
      ...query,
    })
    const notification = [...page.active, ...page.resolved].find((item) => item.id === id)
    if (!notification)
      throw new OperationalNotificationError("Notificação não encontrada.", "not-found")
    return notification
  }

  async listNotifications(query: NotificationQuery = {}) {
    return this.#read({ activeLimit: ACTIVE_LIMIT, historyLimit: HISTORY_LIMIT, ...query })
  }

  async markRead(input: MarkReadInput) {
    this.#select(input.scenarioId)
    const generation = this.#generation
    if (this.#scenario === "slow-read") await delay(350)
    if (generation !== this.#generation)
      throw new OperationalNotificationError("A operação ficou desatualizada.", "stale")
    if (this.#scenario === "fail-next-read" && this.#failNextRead) {
      this.#failNextRead = false
      throw new OperationalNotificationError(
        "Não foi possível marcar a notificação como lida.",
        "mark-read-failed",
      )
    }
    const notification = projectOperationalNotifications(
      factsForScenario(this.#scenario),
      this.#readIds,
    ).find(({ id }) => id === input.id)
    if (!notification)
      throw new OperationalNotificationError("Notificação não encontrada.", "not-found")
    this.#readIds.add(input.id)
    return { ...notification, isRead: true }
  }

  async markAllActiveRead(query: Pick<NotificationQuery, "scenarioId"> = {}) {
    this.#select(query.scenarioId)
    const active = projectOperationalNotifications(
      factsForScenario(this.#scenario),
      this.#readIds,
    ).filter(({ lifecycle }) => lifecycle === "active")
    for (const item of active) this.#readIds.add(item.id)
    return active.length
  }

  async reset(query: Pick<NotificationQuery, "scenarioId"> = {}) {
    this.#generation += 1
    this.#readIds.clear()
    this.#failNextRead = true
    this.#select(query.scenarioId)
  }

  async #read(query: NotificationQuery): Promise<NotificationPage> {
    this.#select(query.scenarioId)
    const generation = this.#generation
    if (this.#scenario === "slow") await delay(500)
    if (generation !== this.#generation)
      throw new OperationalNotificationError("A consulta ficou desatualizada.", "stale")
    if (this.#scenario === "persistent-error")
      throw new OperationalNotificationError(
        "Não foi possível carregar as notificações.",
        "load-failed",
      )
    const projected = projectOperationalNotifications(
      factsForScenario(this.#scenario),
      this.#readIds,
    )
    const allActive = projected.filter(({ lifecycle }) => lifecycle === "active")
    const activeLimit = Math.min(Math.max(query.activeLimit ?? ACTIVE_LIMIT, 0), ACTIVE_LIMIT)
    const historyLimit = Math.min(Math.max(query.historyLimit ?? HISTORY_LIMIT, 0), HISTORY_LIMIT)
    return {
      active: allActive.slice(0, activeLimit),
      activeCount: allActive.length,
      generation,
      resolved: projected
        .filter(({ lifecycle }) => lifecycle === "resolved")
        .slice(0, historyLimit),
      unreadActiveCount: allActive.filter(({ isRead }) => !isRead).length,
    }
  }

  #select(candidate?: string) {
    if (!candidate || !operationalNotificationScenarioIds.includes(candidate as never)) return
    if (candidate === this.#scenario) return
    this.#scenario = candidate as OperationalNotificationScenarioId
    this.#generation += 1
    this.#readIds.clear()
    this.#failNextRead = true
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
