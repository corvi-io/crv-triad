import type { KeyboardCoordinateGetter } from "@dnd-kit/core"
import { describe, expect, it } from "vitest"
import { createAgendaKeyboardCoordinates } from "@/modules/scheduling/agenda-board"
import { booking } from "../fixtures/production-scheduling"

type CoordinatesContext = Parameters<KeyboardCoordinateGetter>[1]
function dndContext({
  activeData = true,
  rectangle = true,
  enabled = true,
} = {}): CoordinatesContext {
  // Third-party DnD sensor boundary: real application coordinate selection consumes these nodes.
  return {
    active: "appointment",
    context: {
      draggableNodes: new Map(
        activeData
          ? [
              [
                "appointment",
                {
                  data: {
                    current: {
                      appointment: booking,
                      kind: "agenda-appointment",
                      professionalIndex: 1,
                      slotIndex: 1,
                    },
                  },
                },
              ],
            ]
          : [],
      ),
      droppableContainers: {
        getEnabled: () =>
          enabled
            ? [
                { data: { current: { kind: "other" } }, rect: { current: null } },
                ...[0, 1, 2].flatMap((professionalIndex) =>
                  [0, 1, 2].map((slotIndex) => ({
                    data: {
                      current: {
                        kind: "agenda-slot",
                        professionalId: `person-${professionalIndex}`,
                        professionalName: `Pessoa ${professionalIndex}`,
                        professionalIndex,
                        slotIndex,
                        start: `09:${String(slotIndex * 15).padStart(2, "0")}`,
                      },
                    },
                    rect: {
                      current: rectangle
                        ? { left: professionalIndex * 100, top: slotIndex * 40 }
                        : null,
                    },
                  })),
                ),
              ]
            : [],
      },
    },
  } as unknown as CoordinatesContext
}
describe("accessible Agenda keyboard coordinate selection", () => {
  it.each([
    ["ArrowDown", { x: 100, y: 80 }],
    ["ArrowUp", { x: 100, y: 0 }],
    ["ArrowLeft", { x: 0, y: 40 }],
    ["ArrowRight", { x: 200, y: 40 }],
  ])("moves %s to the adjacent time/professional rather than an arbitrary target", (code, coordinates) => {
    const cursor = { current: null }
    const getter = createAgendaKeyboardCoordinates(cursor)
    const event = new KeyboardEvent("keydown", { code: String(code), cancelable: true })
    expect(getter(event, dndContext())).toEqual(coordinates)
    expect(event.defaultPrevented).toBe(true)
  })
  it("keeps a cursor across repeated movement and refuses to leave bounded slots", () => {
    const getter = createAgendaKeyboardCoordinates({ current: null })
    expect(getter(new KeyboardEvent("keydown", { code: "ArrowDown" }), dndContext())).toEqual({
      x: 100,
      y: 80,
    })
    expect(
      getter(new KeyboardEvent("keydown", { code: "ArrowDown" }), dndContext()),
    ).toBeUndefined()
    expect(getter(new KeyboardEvent("keydown", { code: "ArrowUp" }), dndContext())).toEqual({
      x: 100,
      y: 40,
    })
  })
  it.each([
    { activeData: false },
    { rectangle: false },
    { enabled: false },
  ])("does not invent coordinates when the DnD boundary is unavailable: %j", (options) => {
    expect(
      createAgendaKeyboardCoordinates({ current: null })(
        new KeyboardEvent("keydown", { code: "ArrowDown" }),
        dndContext(options),
      ),
    ).toBeUndefined()
  })
  it("leaves unrelated keys available to ordinary keyboard controls", () => {
    const event = new KeyboardEvent("keydown", { code: "Tab", cancelable: true })
    expect(createAgendaKeyboardCoordinates({ current: null })(event, dndContext())).toBeUndefined()
    expect(event.defaultPrevented).toBe(false)
  })
})
