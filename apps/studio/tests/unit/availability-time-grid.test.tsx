import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"
import {
  AvailabilityTimeGrid,
  selectionInterval,
} from "@/modules/barbershop-setup/availability-time-grid"

it.each([
  [540, 600, "09:00", "10:00"],
  [600, 540, "09:00", "10:00"],
  [540, 540, "09:00", "09:15"],
  [1425, 1425, "23:30", "23:45"],
])("normalizes selection %s–%s", (start, end, from, to) => {
  expect(selectionInterval(Number(start), Number(end))).toEqual({ start: from, end: to })
})

it("opens a prefilled interval after dragging and discards a canceled selection", () => {
  const create = vi.fn()
  render(
    <AvailabilityTimeGrid
      dates={["2026-09-07"]}
      blocks={[]}
      canManage
      onCreate={create}
      onEdit={vi.fn()}
    />,
  )
  const target = screen.getByRole("button", { name: "Selecionar horário em 2026-09-07" })
  target.setPointerCapture = vi.fn()
  target.releasePointerCapture = vi.fn()
  target.hasPointerCapture = () => true
  fireEvent.pointerDown(target, { button: 0, clientY: 864, pointerId: 1 })
  fireEvent.pointerMove(target, { clientY: 960, pointerId: 1 })
  expect(screen.getByText("09:00–10:00")).toBeInTheDocument()
  fireEvent.pointerUp(target, { clientY: 960, pointerId: 1 })
  expect(create).toHaveBeenCalledWith("2026-09-07", { start: "09:00", end: "10:00" })
  fireEvent.click(target, { detail: 1 })
  expect(create).toHaveBeenCalledTimes(1)
  fireEvent.pointerDown(target, { button: 0, clientY: 960, pointerId: 2 })
  fireEvent.keyDown(target, { key: "Escape" })
  fireEvent.pointerUp(target, { clientY: 1008, pointerId: 2 })
  expect(create).toHaveBeenCalledTimes(1)
})

it("keeps overlapping professionals independently accessible and offers keyboard creation", async () => {
  const create = vi.fn(),
    edit = vi.fn()
  const blocks = [
    {
      id: "one",
      date: "2026-09-07",
      start: "09:00",
      end: "10:00",
      kind: "available",
      professionalName: "Ana",
    },
    {
      id: "two",
      date: "2026-09-07",
      start: "09:00",
      end: "10:00",
      kind: "break",
      professionalName: "Bruno",
    },
  ]
  render(
    <AvailabilityTimeGrid
      dates={["2026-09-07"]}
      blocks={blocks}
      canManage
      onCreate={create}
      onEdit={edit}
    />,
  )
  await userEvent.click(screen.getByRole("button", { name: /Intervalo.*Bruno/ }))
  expect(edit).toHaveBeenCalledWith(blocks[1])
  screen.getByRole("button", { name: "Selecionar horário em 2026-09-07" }).focus()
  await userEvent.keyboard("{Enter}")
  expect(create).toHaveBeenCalledWith("2026-09-07")
})

it("leaves scrolling available on touch and does not permit members to create", () => {
  const create = vi.fn()
  const { rerender } = render(
    <AvailabilityTimeGrid
      dates={["2026-09-07"]}
      blocks={[]}
      canManage
      onCreate={create}
      onEdit={vi.fn()}
    />,
  )
  const target = screen.getByRole("button", { name: "Selecionar horário em 2026-09-07" })
  target.setPointerCapture = vi.fn()
  fireEvent.pointerDown(target, { button: 0, pointerType: "touch", clientY: 864 })
  expect(target.setPointerCapture).not.toHaveBeenCalled()
  fireEvent.click(target, { detail: 1, clientY: 864 })
  expect(create).toHaveBeenCalledWith("2026-09-07", { start: "09:00", end: "09:15" })
  rerender(
    <AvailabilityTimeGrid
      dates={["2026-09-07"]}
      blocks={[]}
      canManage={false}
      onCreate={create}
      onEdit={vi.fn()}
    />,
  )
  expect(screen.getByRole("button", { name: "Selecionar horário em 2026-09-07" })).toBeDisabled()
  fireEvent.pointerDown(target, { button: 0, clientY: 864, pointerId: 2 })
  fireEvent.pointerUp(target, { clientY: 960, pointerId: 2 })
  expect(create).toHaveBeenCalledTimes(1)
})

it("scrolls at either edge while dragging, stays still in the middle, and cleans up on cancel", () => {
  let nextFrame: FrameRequestCallback = () => {}
  const cancelFrame = vi.fn()
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback
      return 1
    }),
  )
  vi.stubGlobal("cancelAnimationFrame", cancelFrame)
  const create = vi.fn()
  const { unmount } = render(
    <AvailabilityTimeGrid
      dates={["2026-09-07"]}
      blocks={[]}
      canManage
      onCreate={create}
      onEdit={vi.fn()}
    />,
  )
  const viewport = screen.getByRole("region", { name: "Grade de horários" })
  const target = screen.getByRole("button", { name: "Selecionar horário em 2026-09-07" })
  viewport.scrollTop = 300
  vi.spyOn(viewport, "getBoundingClientRect").mockImplementation(() => ({
    top: 0,
    bottom: 600,
    left: 0,
    right: 500,
    width: 500,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }))
  vi.spyOn(target, "getBoundingClientRect").mockImplementation(() => ({
    top: 44 - viewport.scrollTop,
    bottom: 2348 - viewport.scrollTop,
    left: 0,
    right: 500,
    width: 500,
    height: 2304,
    x: 0,
    y: 44 - viewport.scrollTop,
    toJSON: () => ({}),
  }))
  target.setPointerCapture = vi.fn()
  fireEvent.pointerDown(target, { button: 0, clientY: 300, pointerId: 1 })
  act(() => nextFrame(0))
  expect(viewport.scrollTop).toBe(300)
  fireEvent.pointerMove(target, { clientY: 598, pointerId: 1 })
  act(() => nextFrame(16))
  expect(viewport.scrollTop).toBeGreaterThan(300)
  fireEvent.pointerMove(target, { clientY: 45, pointerId: 1 })
  const before = viewport.scrollTop
  act(() => nextFrame(32))
  expect(viewport.scrollTop).toBeLessThan(before)
  fireEvent.pointerCancel(target, { pointerId: 1 })
  expect(cancelFrame).toHaveBeenCalled()
  expect(create).not.toHaveBeenCalled()
  act(() => nextFrame(48))
  fireEvent.pointerDown(target, { button: 0, clientY: 300, pointerId: 2 })
  unmount()
  expect(cancelFrame).toHaveBeenCalledTimes(2)
})

it("reuses horizontal space for consecutive unnamed blocks and identifies absences", () => {
  render(
    <AvailabilityTimeGrid
      dates={["2026-09-07"]}
      canManage={false}
      onCreate={vi.fn()}
      onEdit={vi.fn()}
      blocks={[
        { id: "a", date: "2026-09-07", start: "09:00", end: "10:00", kind: "available" },
        { id: "b", date: "2026-09-07", start: "10:00", end: "11:00", kind: "absence" },
      ]}
    />,
  )
  const first = screen.getByRole("button", { name: "Disponível · 09:00–10:00" })
  const second = screen.getByRole("button", { name: "Ausência · 10:00–11:00" })
  expect(first.style.left).toBe(second.style.left)
  expect(first.style.width).toBe(second.style.width)
  expect(second).toHaveClass("bg-feedback-destructive")
})

it("does not create a draft from hovering or repeated pointer cancellation", () => {
  const create = vi.fn()
  render(
    <AvailabilityTimeGrid
      dates={["2026-09-07"]}
      blocks={[]}
      canManage
      onCreate={create}
      onEdit={vi.fn()}
    />,
  )
  const target = screen.getByRole("button", { name: "Selecionar horário em 2026-09-07" })
  fireEvent.pointerMove(target, { clientY: 864 })
  fireEvent.pointerCancel(target)
  fireEvent.pointerCancel(target)
  fireEvent.pointerUp(target, { clientY: 960 })
  expect(create).not.toHaveBeenCalled()
  expect(screen.queryByText("09:00–10:00")).not.toBeInTheDocument()
})
