import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
  pageSize: 20,
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
    const loadingState = screen.getByRole("status", { name: "Carregando clientes" })
    expect(loadingState).toBeVisible()
    expect(loadingState.querySelector("[data-slot=skeleton]")).not.toBeNull()
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

  it("opens a distinct edit drawer and focuses the first localized validation error", async () => {
    const user = userEvent.setup()
    renderDirectory()
    await user.click(await screen.findByRole("button", { name: "Cliente Sintético 05" }))
    const profileDrawer = await screen.findByRole("dialog", {
      name: /Clientes \/ Cliente Sintético 05/,
    })

    await user.click(within(profileDrawer).getByRole("button", { name: "Editar" }))
    const editDrawer = await screen.findByRole("dialog", {
      name: /Clientes \/ Editar cliente/,
    })
    expect(editDrawer).not.toBe(profileDrawer)
    expect(within(editDrawer).queryByRole("tab", { name: "Resumo" })).not.toBeInTheDocument()
    await waitFor(() => expect(profileDrawer).not.toBeInTheDocument())

    const name = within(editDrawer).getByLabelText("Nome")
    await user.clear(name)
    const save = within(editDrawer).getByRole("button", { name: "Salvar alterações" })
    expect(save).toBeDefined()
    if (!save) return
    await user.click(save)

    expect(await within(editDrawer).findByText("Informe o nome do cliente.")).toBeVisible()
    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(name).toHaveFocus()
  })

  it("provides placeholders and adds or removes tags without comma-separated typing", async () => {
    const user = userEvent.setup()
    renderDirectory()

    await user.click(screen.getByRole("button", { name: "Novo cliente" }))
    const drawer = await screen.findByRole("dialog", { name: /Clientes \/ Novo cliente/ })

    expect(within(drawer).getByPlaceholderText("Ex.: Gabriel Silva")).toBeVisible()
    expect(within(drawer).getByPlaceholderText("(81) 99999-9999")).toBeVisible()
    expect(within(drawer).getByPlaceholderText("Ex.: gabriel@email.com")).toBeVisible()
    expect(
      within(drawer).getByPlaceholderText("Ex.: Confirmar o acabamento antes de finalizar"),
    ).toBeVisible()

    const tagInput = within(drawer).getByLabelText("Tags")
    await user.type(tagInput, "Cliente frequente{Enter}")
    expect(within(drawer).getByText("Cliente frequente")).toBeVisible()
    await user.click(within(drawer).getByRole("button", { name: "Remover tag Cliente frequente" }))
    expect(within(drawer).queryByText("Cliente frequente")).not.toBeInTheDocument()
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
    expect(screen.queryByRole("dialog", { name: "Remover nota?" })).not.toBeInTheDocument()
    expect(within(noteArticle).getByText("Essa ação não pode ser desfeita.")).toBeVisible()
    expect(within(noteArticle).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument()
    await user.click(within(noteArticle).getByRole("button", { name: "Cancelar" }))
    expect(within(noteArticle).getByRole("button", { name: "Editar" })).toBeVisible()

    await user.click(within(noteArticle).getByRole("button", { name: "Remover" }))
    await user.click(within(noteArticle).getByRole("button", { name: "Remover nota" }))
    await waitFor(() => expect(note).not.toBeInTheDocument())
  })

  it("opens row actions from the keyboard and moves focus into confirmation", async () => {
    const user = userEvent.setup()
    renderDirectory()
    const trigger = await screen.findByRole("button", { name: "Cliente Sintético 05" })
    const row = trigger.closest("tr")
    expect(row).not.toBeNull()
    if (!row) return
    await act(async () => {
      row.focus()
      fireEvent.keyDown(row, { key: "F10", shiftKey: true })
    })

    const viewAction = await screen.findByRole("menuitem", { name: "Visualizar" })
    await act(async () => viewAction.focus())
    expect(viewAction).toHaveFocus()
    expect(screen.getByRole("menuitem", { name: "Editar" })).toBeVisible()
    const archiveAction = screen.getByRole("menuitem", { name: "Arquivar" })
    await act(async () => archiveAction.focus())
    expect(archiveAction).toHaveFocus()
    await user.keyboard("{Enter}")

    const confirmation = await screen.findByRole("dialog", { name: "Arquivar cliente?" })
    await waitFor(() => expect(confirmation.contains(document.activeElement)).toBe(true))
  })
  it("keeps invalid or rejected notes editable and persists the corrected retry", async () => {
    const repository = new ClientMemoryRepository()
    const add = vi.spyOn(repository, "addNote").mockRejectedValueOnce(new Error("Offline"))
    const update = vi.spyOn(repository, "updateNote").mockRejectedValueOnce(new Error("Offline"))
    renderDirectory({ repository })
    await userEvent.click(await screen.findByRole("button", { name: "Cliente Sintético 05" }))
    const drawer = await screen.findByRole("dialog")
    await userEvent.click(within(drawer).getByRole("tab", { name: "Notas" }))
    await userEvent.click(within(drawer).getByRole("button", { name: "Adicionar nota" }))
    expect(await within(drawer).findByRole("alert")).toBeVisible()
    expect(add).not.toHaveBeenCalled()
    fireEvent.change(within(drawer).getByLabelText("Nova nota"), {
      target: { value: "Confirmar horário por telefone." },
    })
    await userEvent.click(within(drawer).getByRole("button", { name: "Adicionar nota" }))
    await waitFor(() => expect(add).toHaveBeenCalledOnce())
    expect(within(drawer).getByLabelText("Nova nota")).toHaveValue(
      "Confirmar horário por telefone.",
    )
    await userEvent.click(within(drawer).getByRole("button", { name: "Adicionar nota" }))
    const text = await within(drawer).findByText("Confirmar horário por telefone.", {
      selector: "p",
    })
    const article = text.closest("article")
    if (!article) throw new Error("Missing note article")
    await userEvent.click(within(article).getByRole("button", { name: "Editar" }))
    fireEvent.change(within(article).getByLabelText("Editar nota"), { target: { value: "" } })
    await userEvent.click(within(article).getByRole("button", { name: "Salvar nota" }))
    expect(await within(article).findByRole("alert")).toBeVisible()
    expect(update).not.toHaveBeenCalled()
    fireEvent.change(within(article).getByLabelText("Editar nota"), {
      target: { value: "Horário confirmado." },
    })
    await userEvent.click(within(article).getByRole("button", { name: "Salvar nota" }))
    await waitFor(() => expect(update).toHaveBeenCalledOnce())
    expect(within(article).getByLabelText("Editar nota")).toHaveValue("Horário confirmado.")
    await userEvent.click(within(article).getByRole("button", { name: "Salvar nota" }))
    expect(await within(article).findByText("Horário confirmado.", { selector: "p" })).toBeVisible()
    await userEvent.click(within(article).getByRole("button", { name: "Editar" }))
    await userEvent.click(within(article).getByRole("button", { name: "Cancelar" }))
    expect(within(article).queryByLabelText("Editar nota")).not.toBeInTheDocument()
  }, 20000)
  it("retains a note after failed removal and permits a later confirmed retry", async () => {
    const repository = new ClientMemoryRepository()
    const remove = vi.spyOn(repository, "removeNote").mockRejectedValueOnce(new Error("Offline"))
    renderDirectory({ repository })
    await userEvent.click(await screen.findByRole("button", { name: "Cliente Sintético 05" }))
    const drawer = await screen.findByRole("dialog")
    await userEvent.click(within(drawer).getByRole("tab", { name: "Notas" }))
    const text = within(drawer).getByText("Prefere atendimento objetivo e acabamento discreto.")
    const article = text.closest("article")
    if (!article) throw new Error("Missing note article")
    await userEvent.click(within(article).getByRole("button", { name: "Remover" }))
    await userEvent.click(within(article).getByRole("button", { name: "Remover nota" }))
    await waitFor(() => expect(remove).toHaveBeenCalledOnce())
    expect(text).toBeVisible()
    await userEvent.click(within(article).getByRole("button", { name: "Remover nota" }))
    await waitFor(() => expect(text).not.toBeInTheDocument())
  })
  it("keeps the active profile after a rejected archive and recovers its source", async () => {
    const repository = new ClientMemoryRepository()
    const get = vi.spyOn(repository, "get").mockRejectedValueOnce(new Error("Offline"))
    const archive = vi.spyOn(repository, "setArchived").mockRejectedValueOnce(new Error("Offline"))
    renderDirectory({ repository })
    await userEvent.click(await screen.findByRole("button", { name: "Cliente Sintético 05" }))
    const drawer = await screen.findByRole("dialog")
    await userEvent.click(await within(drawer).findByRole("button", { name: "Tentar novamente" }))
    await userEvent.click(await within(drawer).findByRole("button", { name: "Arquivar" }))
    const confirmation = screen.getByRole("dialog", { name: "Arquivar cliente?" })
    await userEvent.click(within(confirmation).getByRole("button", { name: "Arquivar" }))
    await waitFor(() => expect(archive).toHaveBeenCalledOnce())
    expect(within(drawer).getByText("Ativo")).toBeVisible()
    expect(get.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
  it("creates and edits a canonical directory client before returning to the refreshed list", async () => {
    const repository = new ClientMemoryRepository()
    const create = vi.spyOn(repository, "create"),
      update = vi.spyOn(repository, "update")
    renderDirectory({ repository })
    await userEvent.click(screen.getByRole("button", { name: "Novo cliente" }))
    let drawer = await screen.findByRole("dialog")
    fireEvent.change(within(drawer).getByLabelText("Nome"), {
      target: { value: "AAA Cliente Agenda" },
    })
    fireEvent.change(within(drawer).getByLabelText("E-mail"), {
      target: { value: "agenda@example.invalid" },
    })
    await userEvent.click(within(drawer).getAllByRole("button", { name: "Salvar" })[0])
    drawer = await screen.findByRole("dialog", { name: /AAA Cliente Agenda/ })
    expect(create).toHaveBeenCalledOnce()
    await userEvent.click(within(drawer).getByRole("button", { name: "Editar" }))
    drawer = await screen.findByRole("dialog", { name: /Editar cliente/ })
    fireEvent.change(within(drawer).getByLabelText("Nome"), {
      target: { value: "AAA Cliente Revisado" },
    })
    await userEvent.click(within(drawer).getByRole("button", { name: "Salvar alterações" }))
    drawer = await screen.findByRole("dialog", { name: /AAA Cliente Revisado/ })
    expect(update).toHaveBeenCalledOnce()
    await userEvent.click(within(drawer).getByRole("button", { name: "Fechar" }))
    expect(await screen.findByRole("button", { name: "AAA Cliente Revisado" })).toBeVisible()
  }, 20000)
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
