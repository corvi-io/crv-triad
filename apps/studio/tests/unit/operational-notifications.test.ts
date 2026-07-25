import { describe, expect, it } from "vitest"
import { OperationalNotificationsMemoryRepository } from "@/dev/operational-notifications/memory-repository"
import { factsForScenario } from "@/dev/operational-notifications/scenarios"
import {
  notificationCategories,
  OperationalNotificationError,
} from "@/modules/operational-notifications/contracts"
import { resolveNotificationDestination } from "@/modules/operational-notifications/destinations"
import { projectOperationalNotifications } from "@/modules/operational-notifications/rules"

describe("operational notification rules and repository", () => {
  it("covers every official category with stable dedupe, ordering, and bounded history", async () => {
    const repository = new OperationalNotificationsMemoryRepository()
    const page = await repository.listNotifications({ scenarioId: "normal" })
    expect(new Set(page.active.map(({ category }) => category))).toEqual(
      new Set(notificationCategories),
    )
    expect(page.active.map(({ severity }) => severity).slice(0, 2)).toEqual([
      "critical",
      "critical",
    ])
    expect(page.resolved).toHaveLength(1)
    await expect(repository.getNotification(page.active[0].id)).resolves.toEqual(page.active[0])
    expect(
      projectOperationalNotifications(factsForScenario("duplicates"), new Set()).filter(
        ({ lifecycle }) => lifecycle === "active",
      ),
    ).toHaveLength(7)
  })

  it("caps independent result windows while preserving exact unread count over 99", async () => {
    const repository = new OperationalNotificationsMemoryRepository()
    const preview = await repository.getPreview({ scenarioId: "overflow" })
    const page = await repository.listNotifications({
      activeLimit: 12,
      historyLimit: 0,
      scenarioId: "overflow",
    })
    expect(preview.active).toHaveLength(4)
    expect(preview.unreadActiveCount).toBe(105)
    expect(page.active).toHaveLength(12)
    expect(page.activeCount).toBe(105)
  })

  it("keeps read state separate from lifecycle and handles idempotent atomic actions", async () => {
    const repository = new OperationalNotificationsMemoryRepository()
    const initial = await repository.listNotifications({ scenarioId: "normal" })
    const target = initial.active[0]
    await repository.markRead({ id: target.id, scenarioId: "normal" })
    await repository.markRead({ id: target.id, scenarioId: "normal" })
    const updated = await repository.listNotifications({ scenarioId: "normal" })
    expect(updated.active.find(({ id }) => id === target.id)?.isRead).toBe(true)
    expect(updated.active.find(({ id }) => id === target.id)?.lifecycle).toBe("active")
    expect(updated.resolved[0].lifecycle).toBe("resolved")
  })

  it("provides deterministic empty, failure, reset, and source-resolution scenarios", async () => {
    const repository = new OperationalNotificationsMemoryRepository()
    expect((await repository.listNotifications({ scenarioId: "empty" })).active).toEqual([])
    expect((await repository.listNotifications({ scenarioId: "resolved" })).activeCount).toBe(0)
    await expect(
      repository.listNotifications({ scenarioId: "persistent-error" }),
    ).rejects.toMatchObject({ code: "load-failed" })

    const failing = await repository.listNotifications({ scenarioId: "fail-next-read" })
    await expect(
      repository.markRead({ id: failing.active[0].id, scenarioId: "fail-next-read" }),
    ).rejects.toMatchObject({ code: "mark-read-failed" })
    await expect(
      repository.markRead({ id: failing.active[0].id, scenarioId: "fail-next-read" }),
    ).resolves.toMatchObject({ isRead: true })
    await repository.reset({ scenarioId: "fail-next-read" })
    expect(
      (await repository.listNotifications({ scenarioId: "fail-next-read" })).unreadActiveCount,
    ).toBe(7)
  })

  it("discards delayed reads and mutations after a scenario generation change", async () => {
    const repository = new OperationalNotificationsMemoryRepository()
    const delayedRead = repository.listNotifications({ scenarioId: "slow" })
    await repository.reset({ scenarioId: "empty" })
    await expect(delayedRead).rejects.toBeInstanceOf(OperationalNotificationError)

    const slow = await repository.listNotifications({ scenarioId: "slow-read" })
    const delayedMutation = repository.markRead({ id: slow.active[0].id, scenarioId: "slow-read" })
    await repository.reset({ scenarioId: "empty" })
    await expect(delayedMutation).rejects.toMatchObject({ code: "stale" })
  })

  it("resolves only typed allowlisted destinations with opaque identifiers", () => {
    expect(
      resolveNotificationDestination({ kind: "agenda", appointmentId: "appointment-01" }),
    ).toBe("/agenda?appointment=appointment-01")
    expect(resolveNotificationDestination({ kind: "checkout", sessionId: "session-01" })).toBe(
      "/service-desk/session-01/checkout",
    )
    expect(resolveNotificationDestination({ kind: "checkout", sessionId: "../private" })).toBeNull()
  })
})
