import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { OperatorGate } from "@/modules/backstage/operator-gate"

vi.mock("@/modules/backstage/backstage-client", () => ({
  getOperator: vi.fn().mockRejectedValue(new Error("forbidden")),
}))

describe("OperatorGate", () => {
  it("does not render internal content for an identity without Backstage authority", async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <OperatorGate>
          <p>Segredo interno</p>
        </OperatorGate>
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole("heading", { name: "Acesso interno não autorizado" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Segredo interno")).not.toBeInTheDocument()
  })
})
