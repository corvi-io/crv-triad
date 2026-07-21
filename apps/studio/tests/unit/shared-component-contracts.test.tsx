import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CirclePlusIcon, SaveIcon } from "lucide-react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTablePagination,
  DataTableRow,
  DataTableSortableHeaderCell,
  type DataTableSortState,
} from "@/modules/shared/components/data-display/data-table"
import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { Button } from "@/modules/shared/components/ui/button"

describe("documented shared component contracts", () => {
  it("keeps a loading button label and exposes its busy state", () => {
    render(
      <Button isLoading>
        <SaveIcon />
        Salvar alterações
      </Button>,
    )

    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
  })

  it("uses text for status meaning and keeps the empty-state action operable", async () => {
    const onCreate = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <StatusBadge tone="warning">Pausado</StatusBadge>
        <EmptyState
          icon={CirclePlusIcon}
          title="Nenhum registro"
          description="Crie um registro para continuar."
          action={<Button onClick={onCreate}>Criar registro</Button>}
        />
      </>,
    )

    expect(screen.getByText("Pausado")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Nenhum registro" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Criar registro" }))
    expect(onCreate).toHaveBeenCalledOnce()
  })

  it("keeps table sorting and pagination controlled and semantic", async () => {
    const user = userEvent.setup()
    render(<ControlledTable />)

    expect(screen.getByRole("table", { name: "Registros de exemplo" })).toBeVisible()
    const header = screen.getByRole("columnheader", { name: "Título" })
    expect(header).toHaveAttribute("aria-sort", "none")

    await user.click(screen.getByRole("button", { name: "Título" }))
    expect(header).toHaveAttribute("aria-sort", "ascending")
    await user.click(screen.getByRole("button", { name: "Título" }))
    expect(header).toHaveAttribute("aria-sort", "descending")

    await user.click(screen.getByRole("button", { name: "Ir para página 2" }))
    expect(screen.getByText((_, element) => element?.textContent === "Página 2 de 3")).toBeVisible()
  })
})

function ControlledTable() {
  const [sort, setSort] = useState<DataTableSortState<"title">>({
    direction: null,
    key: null,
  })
  const [page, setPage] = useState(1)

  return (
    <DataTable
      aria-label="Registros de exemplo"
      footer={
        <DataTablePagination
          page={page}
          pageSize={10}
          totalCount={24}
          totalPages={3}
          onPageChange={setPage}
          onPageSizeChange={() => undefined}
        />
      }
    >
      <DataTableHead>
        <DataTableRow>
          <DataTableSortableHeaderCell
            sortKey="title"
            sortedBy={sort.key}
            sortDirection={sort.direction}
            onSortChange={setSort}
          >
            Título
          </DataTableSortableHeaderCell>
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        <DataTableRow>
          <DataTableCell>Registro Alpha</DataTableCell>
        </DataTableRow>
      </DataTableBody>
    </DataTable>
  )
}
