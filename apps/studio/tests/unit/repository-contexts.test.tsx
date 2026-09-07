import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useBarbershopSetupRepository } from "@/modules/barbershop-setup/repository-context"
import { useClientRepository } from "@/modules/clients/repository-context"
import { useReportingRepository } from "@/modules/reporting/repository-context"
import { useRevenueOperationsRepository } from "@/modules/revenue-operations/repository-context"
import { useSchedulingRepository } from "@/modules/scheduling/repository-context"
import { useServiceDeskRepository } from "@/modules/service-desk/repository-context"

describe("repository context guards", () => {
  it.each([
    ["barbershop setup", useBarbershopSetupRepository],
    ["clients", useClientRepository],
    ["reporting", useReportingRepository],
    ["revenue operations", useRevenueOperationsRepository],
    ["scheduling", useSchedulingRepository],
    ["service desk", useServiceDeskRepository],
  ])("rejects %s consumers outside their provider", (_name, useRepository) => {
    expect(() => renderHook(() => useRepository())).toThrow(/Provider is missing/)
  })
})
