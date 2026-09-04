import { describe, expect, it } from "vitest"
import { validateClientNote } from "../../../src/modules/clients/domain/client-note.js"
import {
  normalizeEmail,
  normalizePhone,
  validateClientProfile,
} from "../../../src/modules/clients/domain/client-profile.js"
import { parseClientListQuery } from "../../../src/modules/clients/domain/client-query.js"
import { ClientValidationError } from "../../../src/modules/clients/domain/errors.js"

describe("client profile", () => {
  it("normalizes contacts and deduplicates bounded lists", () => {
    expect(
      validateClientProfile({
        email: " CLIENTE@EXAMPLE.COM ",
        name: "  Maria Cliente  ",
        phone: "+55 (81) 99999-0000",
        preferenceNote: "  Prefere manhã  ",
        servicePreferences: ["Corte", "Corte"],
        tags: ["VIP", "VIP"],
      }),
    ).toEqual({
      email: "cliente@example.com",
      name: "Maria Cliente",
      normalizedEmail: "cliente@example.com",
      normalizedPhone: "+5581999990000",
      phone: "+55 (81) 99999-0000",
      preferenceNote: "Prefere manhã",
      servicePreferences: ["Corte"],
      tags: ["VIP"],
    })
  })

  it("requires a name and at least one valid contact", () => {
    expect(() => validateClientProfile({ email: "", name: "", phone: "" })).toThrow(
      ClientValidationError,
    )
    expect(() => validateClientProfile({ email: "", name: "Maria", phone: "---" })).toThrow(
      ClientValidationError,
    )
  })

  it("normalizes email and phone independently", () => {
    expect(normalizeEmail(" A@Example.COM ")).toBe("a@example.com")
    expect(normalizePhone("(81) 3333-4444")).toBe("8133334444")
    expect(normalizePhone(" ")).toBeNull()
  })
})

describe("client query", () => {
  it("applies bounded deterministic defaults", () => {
    expect(parseClientListQuery({})).toEqual({
      contact: "all",
      duplicate: "all",
      page: 1,
      pageSize: 20,
      search: "",
      sortBy: "name",
      sortDirection: "asc",
      status: "active",
      tag: "",
    })
  })

  it.each([
    { pageSize: 100 },
    { page: 0 },
    { search: "x".repeat(121) },
    { sortBy: "email" },
  ])("rejects an unbounded or unsupported query: %j", (query) => {
    expect(() => parseClientListQuery(query)).toThrow(ClientValidationError)
  })
})

describe("client note", () => {
  it("trims accepted plain text", () => {
    expect(validateClientNote({ body: "  Cliente prefere horário cedo.  " })).toEqual({
      body: "Cliente prefere horário cedo.",
    })
  })

  it.each(["", "x".repeat(2_001)])("rejects a note outside the bound", (body) => {
    expect(() => validateClientNote({ body })).toThrow(ClientValidationError)
  })
})
