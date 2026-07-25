import { describe, expect, it } from "vitest"
import { OperationalNotificationsMemoryRepository } from "@/dev/operational-notifications/memory-repository"
import { createOperationalNotificationSources } from "@/dev/operational-notifications/scenarios"
import { RevenueOperationsMemoryRepository } from "@/dev/revenue-operations/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import {
  notificationCategories,
  OperationalNotificationError,
} from "@/modules/operational-notifications/contracts"
import { resolveNotificationDestination } from "@/modules/operational-notifications/destinations"
import {
  deriveNotificationSourceFacts,
  projectOperationalNotifications,
  readOperationalNotificationSources,
} from "@/modules/operational-notifications/rules"

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
    const duplicateSource = await readOperationalNotificationSources(
      createOperationalNotificationSources(),
      "duplicates",
    )
    expect(
      projectOperationalNotifications(
        deriveNotificationSourceFacts(duplicateSource),
        new Set(),
      ).filter(({ lifecycle }) => lifecycle === "active"),
    ).toHaveLength(7)
  })

  it("derives all seven conditions from raw scheduling, service, and payment source ports", async () => {
    const source = await readOperationalNotificationSources(
      createOperationalNotificationSources(),
      "normal",
    )
    const facts = deriveNotificationSourceFacts(source)
    expect(new Set(facts.filter(({ applies }) => applies).map(({ category }) => category))).toEqual(
      new Set(notificationCategories),
    )

    const belowThresholds = structuredClone(source)
    belowThresholds.service.queue[0].arrivalAt = "2026-07-24T15:21:00-03:00"
    belowThresholds.service.sessions[0].startedAt = "2026-07-24T14:36:00-03:00"
    belowThresholds.scheduling.appointments = [
      {
        ...belowThresholds.scheduling.appointments[0],
        durationMinutes: 10,
      },
      {
        ...belowThresholds.scheduling.appointments[1],
        start: "16:00",
      },
      {
        ...belowThresholds.scheduling.appointments[2],
        start: "15:46",
      },
    ]
    belowThresholds.scheduling.periods = []
    belowThresholds.scheduling.events = []
    belowThresholds.payments.checkouts = []
    expect(deriveNotificationSourceFacts(belowThresholds)).toEqual([])
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
      resolveNotificationDestination({
        appointmentId: "appointment-01",
        date: "2026-07-19",
        kind: "agenda",
      }),
    ).toEqual({ appointment: "appointment-01", date: "2026-07-19", kind: "agenda" })
    expect(resolveNotificationDestination({ kind: "checkout", sessionId: "session-01" })).toEqual(
      expect.objectContaining({ kind: "checkout", sessionId: "session-01" }),
    )
    expect(resolveNotificationDestination({ kind: "checkout", sessionId: "../private" })).toBeNull()
    expect(
      resolveNotificationDestination({
        appointmentId: "appointment-01",
        date: "not-a-date",
        kind: "agenda",
      }),
    ).toBeNull()
  })

  it("uses session IDs consumed by the real Service Desk and checkout repositories", async () => {
    const scheduling = new SchedulingMemoryRepository("2026-07-24")
    const serviceDesk = new ServiceDeskMemoryRepository(scheduling)
    const revenue = new RevenueOperationsMemoryRepository(serviceDesk, scheduling)
    await expect(
      serviceDesk.getSession("session-walk-in-fulfillment-long-running"),
    ).resolves.toMatchObject({ status: "in-progress" })
    await expect(
      serviceDesk.getSession("session-walk-in-fulfillment-multiple"),
    ).resolves.toMatchObject({ status: "in-progress" })
    await expect(revenue.getCheckout("session-walk-in-fulfillment-ready")).resolves.toMatchObject({
      id: "session-walk-in-fulfillment-ready",
      status: "open",
    })
  })
})
