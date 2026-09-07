import { describe, expect, it } from "vitest"

import { createBarbershopSlug } from "../../../src/modules/backstage/domain/barbershop-slug.js"

describe("barbershop slug", () => {
  it("normalizes the name and appends a server-generated five-character suffix", () => {
    const values = [0, 1, 2, 26, 35]
    let index = 0

    expect(createBarbershopSlug(" Barbearia do Gábriel! ", () => values[index++] ?? 0)).toBe(
      "barbearia-do-gabriel-abc09",
    )
  })

  it("uses a safe fallback for names without slug characters", () => {
    expect(createBarbershopSlug("✂️", () => 0)).toBe("barbearia-aaaaa")
  })
})
