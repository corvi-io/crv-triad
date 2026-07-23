import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type ReactNode, useEffect, useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { ClientMemoryRepository } from "@/dev/clients/memory-repository"
import { ClientDirectoryPage } from "@/modules/clients/client-directory-page"
import { ClientManagementUnavailableState } from "@/modules/clients/client-management-unavailable-state"
import type { ClientRepository, ClientScenarioId } from "@/modules/clients/contracts"
import { ClientRepositoryProvider } from "@/modules/clients/repository-context"
import type { ClientSearch } from "@/modules/clients/search"

const defaultSearch: ClientSearch = {
  contact: "all",
  duplicate: "all",
  page: 1,
  pageSize: 10,
  scenario: "typical",
  sortDirection: "asc",
  sortField: "name",
  status: "active",
  tag: "",
}

describe("client management pages", () => {
  it("renders the typical directory with textual client status", async () => {
    renderDirectory()

    expect(await screen.findByRole("table", { name: "Diretório de clientes" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Cliente Sintético 05" })).toBeVisible()
    expect(screen.getAllByText("Ativo").length).toBeGreaterThan(0)
  })

  it("resets the URL-backed page when each shared list filter changes", async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    renderDirectory({ onSearchChange })

    await screen.findByRole("table", { name: "Diretório de clientes" })
    await user.click(screen.getByRole("button", { name: "Estado: Ativos" }))
    await user.click(await screen.findByRole("menuitemradio", { name: "Arquivados" }))
    expect(onSearchChange).toHaveBeenCalledWith({ page: 1, status: "archived" })

    await user.click(screen.getByRole("button", { name: "Contato: Todos os contatos" }))
    await user.click(await screen.findByRole("menuitemradio", { name: "Contato completo" }))
    expect(onSearchChange).toHaveBeenCalledWith({ contact: "complete", page: 1 })

    await user.click(screen.getByRole("button", { name: "Duplicidade: Todos" }))
    await user.click(await screen.findByRole("menuitemradio", { name: "Possível duplicidade" }))
    expect(onSearchChange).toHaveBeenCalledWith({ duplicate: "possible", page: 1 })

    await user.click(screen.getByRole("button", { name: "Tag: Todas as tags" }))
    await user.click(await screen.findByRole("menuitemradio", { name: "Frequente" }))
    expect(onSearchChange).toHaveBeenCalledWith({ page: 1, tag: "frequente" })
  })

  it("renders slow loading, empty, and filtered-empty directory states", async () => {
    const slow = renderDirectory({ scenario: "slow" })
    expect(screen.getByRole("status")).toHaveTextContent("Carregando clientes…")
    expect(await screen.findByRole("table", { name: "Diretório de clientes" })).toBeVisible()
    slow.unmount()

    const empty = renderDirectory({ scenario: "empty" })
    expect(await screen.findByText("Nenhum cliente cadastrado")).toBeVisible()
    empty.unmount()

    renderDirectory({ search: { tag: "sem-correspondencia" } })
    expect(await screen.findByText("Nenhum cliente encontrado")).toBeVisible()
  })

  it("retries a recoverable load failure and keeps a persistent failure explicit", async () => {
    const user = userEvent.setup()
    const recoverable = renderDirectory({ scenario: "next-failure" })
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os clientes.",
    )
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(await screen.findByRole("table", { name: "Diretório de clientes" })).toBeVisible()
    recoverable.unmount()

    renderDirectory({ scenario: "persistent-error" })
    const persistentAlert = await screen.findByRole("alert")
    await user.click(within(persistentAlert).getByRole("button", { name: "Tentar novamente" }))
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os clientes."),
    )
    expect(screen.queryByRole("table", { name: "Diretório de clientes" })).not.toBeInTheDocument()
  })

  it("renders the disabled-source presentation with its module context", () => {
    render(<ClientManagementUnavailableState />)

    expect(
      screen.getByText("O gerenciamento de clientes está indisponível neste ambiente."),
    ).toHaveAttribute("role", "status")
    expect(screen.getByRole("heading", { name: "Clientes" })).toBeVisible()
  })

  it("opens a profile and exposes summary, appointments, notes, and duplicate meaning", async () => {
    const user = userEvent.setup()
    renderDirectory({ scenario: "duplicate-candidates" })
    await user.click(await screen.findByRole("button", { name: "Cliente Sintético Duplicado A" }))

    const drawer = await screen.findByRole("dialog", {
      name: /Clientes \/ Cliente Sintético Duplicado A/,
    })
    expect(
      await within(drawer).findByRole("heading", { name: "Possíveis duplicidades" }),
    ).toBeVisible()
    expect(within(drawer).getByText(/Nenhum registro será mesclado\./)).toBeVisible()
    expect(within(drawer).getByText("Ativo")).toBeVisible()

    await user.click(within(drawer).getByRole("tab", { name: "Agendamentos" }))
    expect(
      await within(drawer).findByRole("heading", { name: "Histórico de agendamentos" }),
    ).toBeVisible()
    expect(within(drawer).getAllByText(/Agendado|Concluído/).length).toBeGreaterThan(0)

    await user.click(within(drawer).getByRole("tab", { name: "Notas" }))
    expect(await within(drawer).findByRole("heading", { name: "Notas internas" })).toBeVisible()
    expect(within(drawer).getByText(/Não registre credenciais/)).toBeVisible()

    await user.click(within(drawer).getByRole("tab", { name: "Resumo" }))
    expect(await within(drawer).findByText("Contato e estado")).toBeVisible()
  })

  it("uses explicit edit mode and focuses the first localized validation error", async () => {
    const user = userEvent.setup()
    renderDirectory()
    await user.click(await screen.findByRole("button", { name: "Cliente Sintético 05" }))
    const drawer = await screen.findByRole("dialog", {
      name: /Clientes \/ Cliente Sintético 05/,
    })

    await user.click(within(drawer).getByRole("button", { name: "Editar" }))
    expect(await within(drawer).findByText("Editar cliente")).toBeVisible()
    expect(within(drawer).queryByRole("tab", { name: "Resumo" })).not.toBeInTheDocument()

    const name = within(drawer).getByLabelText("Nome")
    await user.clear(name)
    const save = within(drawer).getAllByRole("button", { name: "Salvar" })[0]
    expect(save).toBeDefined()
    if (!save) return
    await user.click(save)

    expect(await within(drawer).findByText("Informe o nome do cliente.")).toBeVisible()
    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(name).toHaveFocus()
  })

  it("confirms archive, restore, and note removal before mutating", async () => {
    const user = userEvent.setup()
    renderDirectory()
    await user.click(await screen.findByRole("button", { name: "Cliente Sintético 05" }))
    const drawer = await screen.findByRole("dialog", {
      name: /Clientes \/ Cliente Sintético 05/,
    })

    await user.click(within(drawer).getByRole("button", { name: "Arquivar" }))
    const archiveDialog = await screen.findByRole("dialog", { name: "Arquivar cliente?" })
    await user.click(within(archiveDialog).getByRole("button", { name: "Arquivar" }))
    expect(await within(drawer).findByText("Arquivado")).toBeVisible()

    await user.click(within(drawer).getByRole("button", { name: "Restaurar" }))
    const restoreDialog = await screen.findByRole("dialog", { name: "Restaurar cliente?" })
    await user.click(within(restoreDialog).getByRole("button", { name: "Restaurar" }))
    expect(await within(drawer).findByText("Ativo")).toBeVisible()

    await user.click(within(drawer).getByRole("tab", { name: "Notas" }))
    const note = within(drawer).getByText("Prefere atendimento objetivo e acabamento discreto.")
    const noteArticle = note.closest("article")
    expect(noteArticle).not.toBeNull()
    if (!noteArticle) return
    await user.click(within(noteArticle).getByRole("button", { name: "Remover" }))
    const removeDialog = await screen.findByRole("dialog", { name: "Remover nota?" })
    await user.click(within(removeDialog).getByRole("button", { name: "Remover" }))
    await waitFor(() => expect(note).not.toBeInTheDocument())
  })

  it("opens row actions from the keyboard and moves focus into confirmation", async () => {
    const user = userEvent.setup()
    renderDirectory()
    const trigger = await screen.findByRole("button", { name: "Cliente Sintético 05" })
    const row = trigger.closest("tr")
    expect(row).not.toBeNull()
    if (!row) return
    row.focus()
    fireEvent.keyDown(row, { key: "F10", shiftKey: true })

    const viewAction = await screen.findByRole("menuitem", { name: "Visualizar" })
    viewAction.focus()
    expect(viewAction).toHaveFocus()
    const archiveAction = screen.getByRole("menuitem", { name: "Arquivar" })
    archiveAction.focus()
    expect(archiveAction).toHaveFocus()
    await user.keyboard("{Enter}")

    const confirmation = await screen.findByRole("dialog", { name: "Arquivar cliente?" })
    await waitFor(() => expect(confirmation.contains(document.activeElement)).toBe(true))
  })
})

function renderDirectory({
  onSearchChange,
  repository = new ClientMemoryRepository(),
  scenario = "typical",
  search,
}: {
  onSearchChange?: (search: Partial<ClientSearch>) => void
  repository?: ClientRepository
  scenario?: ClientScenarioId
  search?: Partial<ClientSearch>
} = {}) {
  const queryClient = createQueryClient()

  function Harness() {
    const [currentSearch, setCurrentSearch] = useState<ClientSearch>({
      ...defaultSearch,
      ...search,
      scenario,
    })
    return (
      <IsolatedQueryClientProvider queryClient={queryClient}>
        <ClientRepositoryProvider repository={repository}>
          <ClientDirectoryPage
            search={currentSearch}
            onSearchChange={(next) => {
              onSearchChange?.(next)
              setCurrentSearch((previous) => ({ ...previous, ...next }))
            }}
          />
        </ClientRepositoryProvider>
      </IsolatedQueryClientProvider>
    )
  }

  return render(<Harness />)
}

function IsolatedQueryClientProvider({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient: QueryClient
}) {
  useEffect(() => () => queryClient.clear(), [queryClient])
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
}
